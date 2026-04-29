import glossary from "./glossary.json";

interface Env {
  NEWS_TRANSLATIONS: KVNamespace;
}

function applyGlossary(text: string): string {
  let processed = text;
  for (const [short, full] of Object.entries(glossary)) {
    const regex = new RegExp(`\\b${short}\\b`, 'g');
    processed = processed.replace(regex, full);
  }
  return processed;
}

async function translateText(text: string, targetLang: string = 'ja'): Promise<string | null> {
  if (!text) return null;
  try {
    const expandedText = applyGlossary(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(expandedText)}`;
    const response = await fetch(url);
    const data = await response.json() as unknown as [string[][], null, string];
    return data[0].map((item: string[]) => item[0]).join("") || null;
  } catch (e) {
    console.error(`Translation error (${targetLang}):`, e);
    return null;
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
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
    "https://www.abc.net.au/news/feed/51892/rss.xml",
    "https://www.abc.net.au/news/feed/1042/rss.xml"
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
    .sort((a, b) => b.pubDate - a.pubDate);

    const limit = parseInt(url.searchParams.get('limit') || '5', 10);
    const before = parseInt(url.searchParams.get('before') || '0', 10);

    const seenLinks = new Set<string>();
    let pool = parsedItems.filter(item => {
      if (seenLinks.has(item.link)) return false;
      seenLinks.add(item.link);
      return true;
    });

    if (before > 0) {
      pool = pool.filter(item => item.pubDate < before);
    }

    const uniqueItems = pool.slice(0, limit);

    if (uniqueItems.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Phase 1: Parallel KV Lookup
    const kvData = await Promise.all(
      uniqueItems.map(async (item) => {
        const cacheKeyJa = `ja:${item.link}`;
        const cacheKeyId = `id:${item.link}`;
        const [cachedJa, cachedId] = await Promise.all([
          env.NEWS_TRANSLATIONS.get(cacheKeyJa),
          env.NEWS_TRANSLATIONS.get(cacheKeyId)
        ]);

        return {
          item,
          ja: cachedJa ? JSON.parse(cachedJa) : null,
          id: cachedId ? JSON.parse(cachedId) : null
        };
      })
    );

    // Phase 2: Identify items needing translation
    const results = new Array(uniqueItems.length);
    const toTranslateIndices: number[] = [];

    kvData.forEach((data, index) => {
      if (data.ja && data.id) {
        // Fully cached in KV
        results[index] = {
          title: data.item.title,
          link: data.item.link,
          firstLine: data.item.firstLine,
          title_ja: data.ja.title,
          firstLine_ja: data.ja.line,
          title_id: data.id.title,
          firstLine_id: data.id.line,
          thumbnail: data.item.thumbnail,
          category: data.item.category,
          pubDate: data.item.displayDate
        };
      } else {
        toTranslateIndices.push(index);
      }
    });

    // Phase 3: Chunked Translation (5 items per chunk to stay within API limits)
    const CHUNK_SIZE = 5;
    for (let i = 0; i < toTranslateIndices.length; i += CHUNK_SIZE) {
      const chunk = toTranslateIndices.slice(i, i + CHUNK_SIZE);
      
      // Parallel within chunk
      await Promise.all(chunk.map(async (index) => {
        const data = kvData[index];
        const item = data.item;

        let titleJa = data.ja?.title || null;
        let lineJa = data.ja?.line || null;
        let titleId = data.id?.title || null;
        let lineId = data.id?.line || null;

        // Translate JA if missing
        if (!titleJa || !lineJa) {
          titleJa = await translateText(item.title, 'ja');
          lineJa = await translateText(item.firstLine, 'ja');
          if (titleJa && lineJa) {
            await env.NEWS_TRANSLATIONS.put(`ja:${item.link}`, JSON.stringify({ title: titleJa, line: lineJa }), { expirationTtl: 259200 });
          }
        }

        // Translate ID if missing
        if (!titleId || !lineId) {
          titleId = await translateText(item.title, 'id');
          lineId = await translateText(item.firstLine, 'id');
          if (titleId && lineId) {
            await env.NEWS_TRANSLATIONS.put(`id:${item.link}`, JSON.stringify({ title: titleId, line: lineId }), { expirationTtl: 259200 });
          }
        }

        results[index] = {
          title: item.title,
          link: item.link,
          firstLine: item.firstLine,
          title_ja: titleJa || "",
          firstLine_ja: lineJa || "",
          title_id: titleId || "",
          firstLine_id: lineId || "",
          thumbnail: item.thumbnail,
          category: item.category,
          pubDate: item.displayDate
        };
      }));

      // Wait if there are more chunks to process
      if (i + CHUNK_SIZE < toTranslateIndices.length) {
        await sleep(1000);
      }
    }

    const resultResponse = new Response(JSON.stringify(results), {
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=1800"
      }
    });

    if (results.length > 0) {
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
