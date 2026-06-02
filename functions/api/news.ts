/// <reference types="@cloudflare/workers-types" />
import { SOURCES } from "./extractors";
import { 
  Env, 
  generateId, 
  extractTagContent,
  NewsItem
} from "./shared";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);

  // Detail endpoint (parameter-based)
  if (url.searchParams.get('action') === 'detail') {
    const id = url.searchParams.get('id');
    const cached = await env.NEWS_TRANSLATIONS.get(`ja:id:${id}`);
    if (cached) {
      return new Response(cached, { headers: { "Content-Type": "application/json; charset=utf-8" } });
    }
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  // List endpoint
  try {
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const before = parseInt(url.searchParams.get('before') || Date.now().toString());

    // 1. Fetch RSS from all sources
    const rssResponses = await Promise.all(SOURCES.map(s => fetch(s.url, { headers: { "User-Agent": "Mozilla/5.0" } })));
    const allItemsXml: string[] = [];
    for (const res of rssResponses) {
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];
      allItemsXml.push(...items);
    }

    // 2. Parse items and generate IDs
    const parsedItems = await Promise.all(allItemsXml.map(async itemXml => {
      const link = extractTagContent(itemXml, "link");
      const id = await generateId(link);
      const pubDate = extractTagContent(itemXml, "pubDate");
      return { id, link, pubDate: new Date(pubDate).getTime() };
    }));

    // 3. Filter and Sort
    const uniqueItems = Array.from(new Map(parsedItems.map(item => [item.link, item])).values())
      .sort((a, b) => b.pubDate - a.pubDate)
      .filter(item => item.pubDate < before);

    // 4. Fetch from KV (Only return what has been batch-processed)
    const results: NewsItem[] = [];
    for (const item of uniqueItems) {
      if (results.length >= limit) break;
      
      const cached = await env.NEWS_TRANSLATIONS.get(`ja:id:${item.id}`);
      if (cached) {
        results.push(JSON.parse(cached) as NewsItem);
      }
    }

    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch news list" }), { status: 500 });
  }
};
