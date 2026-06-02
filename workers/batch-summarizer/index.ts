import { SOURCES } from "../../functions/api/extractors";
import { 
  generateId, 
  extractTagContent, 
  extractAllCategories, 
  getThumbnail, 
  processNewsItem
} from "../../functions/api/shared";
import type { 
  Env, 
  RawNewsItem,
  NewsMetadata
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
      const pubDate = extractTagContent(itemXml, "pubDate");
      const category = extractAllCategories(itemXml)[0] || "News";
      const thumbnail = getThumbnail(itemXml, link);

      return { id, title, link, category, thumbnail, displayDate: pubDate };
    }));

    // Sort by date and take latest 20 to check
    const latestItems = Array.from(new Map(parsedItems.map(item => [item.link, item])).values())
      .sort((a, b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime())
      .slice(0, 20);

    console.log(`Processing ${latestItems.length} latest items`);

    // 3. Process items that are not in KV
    const processedItems: NewsMetadata[] = [];
    for (const item of latestItems) {
      const cacheKey = `ja:id:${item.id}`;
      const cached = await env.NEWS_TRANSLATIONS.get(cacheKey);
      
      if (!cached) {
        console.log(`Processing new article: ${item.title}`);
        try {
          await processNewsItem(item, env);
        } catch (e) {
          console.error(`Error processing item ${item.id}:`, e);
        }
      }
      
      // Add to metadata list
      processedItems.push({
        id: item.id,
        title_ja: item.title,
        thumbnail: item.thumbnail,
        category: item.category,
        displayDate: item.displayDate
      });
    }
    
    console.log(`Processed ${processedItems.length} items for metadata`);
    
    // 4. Update metadata list in KV
    if (processedItems.length > 0) {
      await env.NEWS_TRANSLATIONS.put("sys:latest-news", JSON.stringify(processedItems));
      console.log('sys:latest-news updated successfully');
    } else {
      console.warn('No items to save in sys:latest-news');
    }
    
    console.log('Batch processing completed successfully.');
  } catch (error) {
    console.error('Batch processing failed:', error);
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
  }
};
