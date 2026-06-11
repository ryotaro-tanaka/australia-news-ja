import type { 
  Env,
  NewsMetadata
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
    
    // Fetch latest news list from KV
    const cachedList = await env.NEWS_TRANSLATIONS.get("sys:latest-news");
    if (!cachedList) {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json; charset=utf-8" } });
    }

    const allItems: NewsMetadata[] = JSON.parse(cachedList);
    
    // Pagination logic (numeric cursor)
    const before = url.searchParams.get('before');
    let results = allItems;
    
    if (before) {
      const cursorTime = parseInt(before);
      if (!isNaN(cursorTime)) {
        // Filter: only items older than the cursor time
        results = allItems.filter(item => item.pubDate < cursorTime);
      }
    }

    const pagedResults = results.slice(0, limit);

    return new Response(JSON.stringify(pagedResults), { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch news list" }), { status: 500 });
  }
};
