async function translateText(text: string): Promise<string> {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json() as any;
    return data[0].map((item: any) => item[0]).join("") || text;
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

function extractThumbnail(itemXml: string): string {
  const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumbMatch) return thumbMatch[1];
  const contentMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*medium=["']image["']/i);
  if (contentMatch) return contentMatch[1];
  return "";
}

export const onRequest: PagesFunction = async (context) => {
  const cache = (caches as any).default;
  const url = new URL(context.request.url);
  
  // キャッシュキーの正規化（nocacheパラメータを除去）
  const isNoCache = url.searchParams.has('nocache');
  const cacheUrl = new URL(url.toString());
  cacheUrl.searchParams.delete('nocache');
  const cacheKey = new Request(cacheUrl.toString(), context.request);
  
  if (!isNoCache) {
    try {
      let cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
    } catch (e) {
      console.warn("Cache match failed:", e);
    }
  }

  const FEEDS = [
    "https://www.abc.net.au/news/feed/51892/rss.xml", // Business
    "https://www.abc.net.au/news/feed/1042/rss.xml"  // Politics
  ];

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
      const category = cleanHtml(extractTagContent(itemXml, "category"));
      const thumbnail = extractThumbnail(itemXml);
      
      const firstLine = cleanHtml(descriptionRaw.split(/[.!?]/)[0] || "") + '.';

      return { 
        title, 
        link, 
        firstLine, 
        pubDate: new Date(pubDate).getTime(),
        displayDate: pubDate,
        category,
        thumbnail
      };
    })
    .filter(item => item.title && item.link)
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 15);

    if (parsedItems.length === 0) throw new Error("No items parsed");

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

    // 30分間キャッシュ (1800秒)
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
    return new Response(JSON.stringify({ error: "Failed to fetch news" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
