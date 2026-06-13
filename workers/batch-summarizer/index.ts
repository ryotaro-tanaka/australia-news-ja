import { SOURCES } from "../../functions/api/extractors";
import { 
  generateId, 
  extractTagContent, 
  extractAllCategories, 
  getThumbnail, 
  processNewsItem,
  cleanThumbnailUrl
} from "../../functions/api/shared";
import type { 
  Env, 
  RawNewsItem,
  NewsMetadata,
  NewsItem
} from "../../functions/api/shared";
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
    // ここでは一覧(sys:latest-news)の更新は行わない。
    // 日本語化が完了した記事から順次、queueハンドラ内で一覧へ追加される。
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
    for (const message of batch.messages) {
      const item = message.body;
      const cacheKey = `ja:id:${item.id}`;
      const cached = await env.NEWS_TRANSLATIONS.get(cacheKey);
      
      if (!cached) {
        console.log(`Processing new article from queue: ${item.title}`);
        try {
          const { newsItem, snippet_ja } = await processNewsItem(item, env);
          
          // 日本語化が完了した記事を一覧(sys:latest-news)にデビューさせる
          const threeDaysAgo = Date.now() - (259200 * 1000);
          const listRaw = await env.NEWS_TRANSLATIONS.get("sys:latest-news");
          const list: NewsMetadata[] = listRaw ? JSON.parse(listRaw) : [];
          
          // メタデータの作成
          const metadata: NewsMetadata = {
            id: newsItem.id,
            title_ja: newsItem.title_ja,
            thumbnail: newsItem.thumbnail,
            category: newsItem.category,
            pubDate: newsItem.pubDate,
            snippet_ja: snippet_ja
          };

          // マージ、重複排除、フィルタリング、ソート
          // Keep only latest 100 items as a safety cap to stay well within 1MB KV limit and maintain frontend performance.
          const newList = [metadata, ...list];
          const uniqueList = Array.from(new Map(newList.map(m => [m.id, m])).values())
            .filter(m => m.pubDate > threeDaysAgo)
            .sort((a, b) => b.pubDate - a.pubDate)
            .slice(0, 100);

          await env.NEWS_TRANSLATIONS.put("sys:latest-news", JSON.stringify(uniqueList));
          console.log(`Article debuted in list: ${newsItem.id}`);
          
          message.ack();
        } catch {
          console.error(`Error processing queued item ${item.id}`);
          message.retry(); // 失敗したらリトライ
        }
      } else {
        // すでに詳細がある場合でも、一覧に含まれていない可能性（再構築中など）を考慮してマージを試みる
        try {
          const newsItem: NewsItem = JSON.parse(cached);
          const listRaw = await env.NEWS_TRANSLATIONS.get("sys:latest-news");
          const list: NewsMetadata[] = listRaw ? JSON.parse(listRaw) : [];
          
          if (!list.some(m => m.id === newsItem.id)) {
            // ここでの修正: cachedには snippet_ja が含まれていないため、
            // もしsnippetが必須であれば再生成が必要だが、ここではシンプルにマージのみ行う
            // (本来は再生成すべき)
            const metadata: NewsMetadata = {
              id: newsItem.id,
              title_ja: newsItem.title_ja,
              thumbnail: newsItem.thumbnail,
              category: newsItem.category,
              pubDate: newsItem.pubDate,
              snippet_ja: "" // 古い記事には一旦空文字列を入れる
            };
            // Keep only latest 100 items as a safety cap to stay well within 1MB KV limit and maintain frontend performance.
            const newList = [metadata, ...list]
              .filter(m => m.pubDate > (Date.now() - 259200 * 1000))
              .sort((a, b) => b.pubDate - a.pubDate);
            const uniqueList = Array.from(new Map(newList.map(m => [m.id, m])).values())
              .slice(0, 100);
            await env.NEWS_TRANSLATIONS.put("sys:latest-news", JSON.stringify(uniqueList));
            console.log(`Existing article added back to list: ${newsItem.id}`);
          }
          message.ack();
        } catch {
          message.ack(); // パースエラーなどは無視
        }
      }
    }
  }
};
