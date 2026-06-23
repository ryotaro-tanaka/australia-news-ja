import { SOURCES } from "../../functions/api/extractors";
import { 
  generateId, 
  extractTagContent, 
  extractAllCategories, 
  getThumbnail, 
  processNewsItem,
  cleanThumbnailUrl
} from "../../functions/api/shared";
import type { Env, RawNewsItem, NewsMetadata } from "../../functions/api/shared";
import { cleanHtml } from "../../functions/api/utils";

async function runTask(env: Env) {
  console.log('runTask started');
  try {
    // 1. Fetch RSS from all sources
    const rssResponses = await Promise.all(
      SOURCES.map(s => fetch(s.url, { headers: { "User-Agent": "Mozilla/5.0" } }))
    );
    
    const allItemsXml: string[] = [];
    for (const res of rssResponses) {
      if (!res.ok) {
        console.error(`RSS fetch failed for ${res.url}`);
        continue;
      }
      const xml = await res.text();
      const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];
      console.log(`Found ${items.length} items`);
      allItemsXml.push(...items);
    }

    // 2. Parse and filter items
    const parsedItems: RawNewsItem[] = await Promise.all(allItemsXml.map(async itemXml => {
      const title = cleanHtml(extractTagContent(itemXml, "title"));
      const link = extractTagContent(itemXml, "link");
      const id = await generateId(link);
      const pubDateStr = extractTagContent(itemXml, "pubDate");
      const pubDate = new Date(pubDateStr).getTime();
      const category = extractAllCategories(itemXml)[0] || "News";
      const thumbnail = cleanThumbnailUrl(getThumbnail(itemXml, link));

      return { id, title, link, category, thumbnail, pubDate };
    }));

    // Sort by date and take latest to check
    // Keep only latest 100 items as a safety cap to stay well within 1MB KV limit and maintain frontend performance.
    const latestItems = Array.from(new Map(parsedItems.map(item => [item.link, item])).values())
      .sort((a, b) => b.pubDate - a.pubDate)
      .slice(0, 100);

    console.log(`Processing ${latestItems.length} latest items`);

    // 3. 既存のリストのメンテナンス（3日以上前の記事を除去）
    const threeDaysAgo = Date.now() - (259200 * 1000);
    const listRaw = await env.NEWS_TRANSLATIONS.get("sys:latest-news");
    if (listRaw) {
        const currentList: NewsMetadata[] = JSON.parse(listRaw);
        const filteredList = currentList.filter(item => item.pubDate > threeDaysAgo);
        if (filteredList.length !== currentList.length) {
            await env.NEWS_TRANSLATIONS.put("sys:latest-news", JSON.stringify(filteredList));
            console.log('Maintained sys:latest-news: removed expired items');
        }
    }

    // 4. キューへ詳細記事生成ジョブを投入
    // バッチプロデューサーは一覧 (`sys:latest-news`) の更新を行わず、
    // 完了した記事はキュー処理側で一覧にデビューさせる。
    for (const item of latestItems) {
        await env.NEWS_QUEUE.send(item);
        console.log(`Queued article for processing: ${item.id}`);
    }
    
    console.log('Batch Producer completed successfully.');
  } catch (error) {
    console.error('Batch Producer failed:', error);
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log(`Running scheduled task: ${event.cron}`);
    ctx.waitUntil(runTask(env));
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === '/run-batch') {
      ctx.waitUntil(runTask(env));
      return new Response('Batch triggered', { status: 202 });
    }
    return new Response('Not found', { status: 404 });
  },
  async queue(batch: MessageBatch<RawNewsItem>, env: Env): Promise<void> {
    const threeDaysAgo = Date.now() - (259200 * 1000);
    const pendingUpdates: NewsMetadata[] = [];

    for (const message of batch.messages) {
      const item = message.body;
      const cacheKey = `ja:id:${item.id}`;
      const cached = await env.NEWS_TRANSLATIONS.get(cacheKey);

      if (!cached) {
        console.log(`Processing new article from queue: ${item.title}`);
        try {
          const { newsItem, snippet_ja } = await processNewsItem(item, env);
          // Prepare metadata for later batch update
            pendingUpdates.push({
              id: newsItem.id,
              title_ja: newsItem.title_ja,
              thumbnail: newsItem.thumbnail,
              category: newsItem.category,
              pubDate: newsItem.pubDate,
              snippet_ja,
            });
            message.ack();
        } catch (e) {
          console.error(`Error processing queued item ${item.id}`, e);
          message.retry();
          continue;
        }
      } else {
        // Cache hit: ensure snippet_ja is present in the list metadata
        console.log(`Cache hit for article ${item.id}`);
        try {
          const listRaw = await env.NEWS_TRANSLATIONS.get("sys:latest-news");
          const list: NewsMetadata[] = listRaw ? JSON.parse(listRaw) : [];
          const existing = list.find(m => m.id === item.id);
          if (existing && !("snippet_ja" in existing)) {
            const { snippet_ja } = await processNewsItem(item, env);
            pendingUpdates.push({ ...(existing as NewsMetadata), snippet_ja });
            message.ack();
          }
        } catch (e) {
          console.error(`Error handling cache hit for ${item.id}`, e);
          message.retry();
        }
      }
    }
    // After processing all messages, merge pending updates into KV
    try {
      const listRaw = await env.NEWS_TRANSLATIONS.get("sys:latest-news");
      const currentList: NewsMetadata[] = listRaw ? JSON.parse(listRaw) : [];
      const merged = [...pendingUpdates, ...currentList];
      const uniqueList = Array.from(new Map(merged.map(m => [m.id, m])).values())
        .filter(m => m.pubDate > threeDaysAgo)
        .sort((a, b) => b.pubDate - a.pubDate)
        .slice(0, 100);
      await env.NEWS_TRANSLATIONS.put("sys:latest-news", JSON.stringify(uniqueList));
      console.log(`Batch metadata update completed with ${pendingUpdates.length} items`);
    } catch (e) {
      console.error("Error updating latest-news list after batch processing", e);
    }
  }
};
