import { SOURCES } from "../../functions/api/extractors";
import { 
  Env, 
  generateId, 
  extractTagContent, 
  extractAllCategories, 
  getThumbnail, 
  processNewsItem 
} from "../../functions/api/shared";
import { cleanHtml } from "../../functions/api/utils";

export default {
  async scheduled(event: any, env: Env, ctx: any) {
    console.log(`Running scheduled task: ${event.cron}`);
    
    ctx.waitUntil((async () => {
      try {
        // 1. Fetch RSS from all sources
        const rssResponses = await Promise.all(
          SOURCES.map(s => fetch(s.url, { headers: { "User-Agent": "Mozilla/5.0" } }))
        );
        
        const allItemsXml: string[] = [];
        for (const res of rssResponses) {
          if (!res.ok) continue;
          const xml = await res.text();
          const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];
          allItemsXml.push(...items);
        }

        // 2. Parse and filter items
        const parsedItems = await Promise.all(allItemsXml.map(async itemXml => {
          const title = cleanHtml(extractTagContent(itemXml, "title"));
          const link = extractTagContent(itemXml, "link");
          const id = await generateId(link);
          const pubDate = extractTagContent(itemXml, "pubDate");
          const category = extractAllCategories(itemXml)[0] || "News";
          const thumbnail = getThumbnail(itemXml, link);

          return { id, title, link, pubDate: new Date(pubDate).getTime(), displayDate: pubDate, category, thumbnail };
        }));

        // Sort by date and take latest 20 to check
        const latestItems = Array.from(new Map(parsedItems.map(item => [item.link, item])).values())
          .sort((a, b) => b.pubDate - a.pubDate)
          .slice(0, 20);

        // 3. Process items that are not in KV
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
        }
        
        console.log('Batch processing completed successfully.');
      } catch (error) {
        console.error('Batch processing failed:', error);
      }
    })());
  },
};
