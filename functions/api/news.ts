async function translateText(text: string): Promise<string> {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    // Explicit type for Google Translate response
    const data = await response.json() as unknown as [string[][], null, string];
    return data[0].map((item: string[]) => item[0]).join("") || text;
  } catch (e) {
    console.error("Translation error:", e);
    return text;
  }
}

function cleanHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTagContent(itemXml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = itemXml.match(regex);
  if (match) {
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }
  return "";
}

function extractAllCategories(itemXml: string): string[] {
  const categories: string[] = [];
  const regex = /<category[^>]*>([\s\S]*?)<\/category>/gi;
  let match;
  while ((match = regex.exec(itemXml)) !== null) {
    categories.push(cleanHtml(match[1]));
  }
  return categories;
}

function extractThumbnail(itemXml: string): string {
  const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumbMatch) return thumbMatch[1];
  const contentMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*medium=["']image["']/i);
  if (contentMatch) return contentMatch[1];
  return "";
}

export const onRequest: PagesFunction = async (context) => {
  const cache = (caches as { default: Cache }).default;
  const url = new URL(context.request.url);
  const isNoCache = url.searchParams.has('nocache');
  const cacheUrl = new URL(url.toString());
  cacheUrl.searchParams.delete('nocache');
  const cacheKey = new Request(cacheUrl.toString(), context.request);
  
  if (!isNoCache) {
    try {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) return cachedResponse;
    } catch (e) {
      console.warn("Cache match failed:", e);
    }
  }

  const FEEDS = [
    "https://www.abc.net.au/news/feed/51892/rss.xml", // Business
    "https://www.abc.net.au/news/feed/1042/rss.xml"  // Politics
  ];

  const EXCLUDED_KEYWORDS = ["music", "arts", "fiction", "book", "movie", "film", "statue", "entertainment", "culture", "festival", "sculpture", "theatre"];
  const CRITICAL_KEYWORDS = ["visa", "immigration", "inflation", "rba", "interest rate", "medicare", "housing", "rent", "permanent resid", "working holiday"];

  try {
    const rssResponses = await Promise.all(FEEDS.map(f => fetch(f, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })));

    const allItemsXml: string[] = [];
    for (const res of rssResponses) {
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];
      allItemsXml.push(...items);
    }

    const parsedItems = allItemsXml.map(itemXml => {
      const title = cleanHtml(extractTagContent(itemXml, "title"));
      const link = extractTagContent(itemXml, "link");
      const descriptionRaw = extractTagContent(itemXml, "description");
      const pubDate = extractTagContent(itemXml, "pubDate");
      const categories = extractAllCategories(itemXml);
      const thumbnail = extractThumbnail(itemXml);
      
      const fullDescription = cleanHtml(descriptionRaw);
      const firstLine = fullDescription.length > 300 ? fullDescription.substring(0, 300) + "..." : fullDescription;

      const lowercaseTitle = title.toLowerCase();
      const lowercaseCats = categories.map(c => c.toLowerCase());
      
      const isCritical = CRITICAL_KEYWORDS.some(k => lowercaseTitle.includes(k));
      
      if (!isCritical) {
        const isExcluded = EXCLUDED_KEYWORDS.some(k => 
          lowercaseCats.some(cat => cat.includes(k)) || lowercaseTitle.includes(k)
        );
        if (isExcluded) return null;
      }

      return { 
        title, 
        link, 
        firstLine, 
        pubDate: new Date(pubDate).getTime(),
        displayDate: pubDate,
        category: categories[0] || "News",
        thumbnail
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.title !== "" && item.link !== "")
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 15);

    if (parsedItems.length === 0) throw new Error("No items passed the filter");

    const translatedNews = await Promise.all(
      parsedItems.map(async (item) => {
        const [titleJa, lineJa] = await Promise.all([
          translateText(item.title),
          translateText(item.firstLine)
        ]);

        return {
          title: item.title,
          link: item.link,
          firstLine: item.firstLine,
          title_ja: titleJa,
          firstLine_ja: lineJa,
          thumbnail: item.thumbnail,
          category: item.category,
          pubDate: item.displayDate
        };
      })
    );

    const resultResponse = new Response(JSON.stringify(translatedNews), {
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=1800"
      }
    });

    if (translatedNews.length > 0) {
      try {
        context.waitUntil(cache.put(cacheKey, resultResponse.clone()));
      } catch (e) {
        console.warn("Cache put failed:", e);
      }
    }

    return resultResponse;

  } catch (error) {
    console.error("Backend error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch or filter news" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
