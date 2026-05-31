import glossary from "./glossary.json";

interface Ai {
  run(model: string, input: Record<string, unknown>): Promise<{ response?: string }>;
}

interface Env {
  NEWS_TRANSLATIONS: KVNamespace;
  AI: Ai;
}

async function generateId(url: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function isNoise(text: string): boolean {
  const NOISE_KEYWORDS = [
    "live coverage",
    "Thank you for joining us",
    "seen by the ABC",
    "asked that the ABC use",
    "Follow our live",
    "Read more",
    "More to come",
    "Loading..."
  ];
  if (NOISE_KEYWORDS.some(kw => text.includes(kw))) return true;
  if (text.length < 20) return true;
  return false;
}

async function extractFullContent(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await response.text();
  const paragraphs: string[] = [];
  let currentParagraph = "";

  await new HTMLRewriter()
    .on('p[class*="paragraph_paragraph"]', {
      element(el) {
        el.onEndTag(() => {
          const cleaned = currentParagraph.trim().replace(/\s+/g, ' ');
          if (cleaned && !isNoise(cleaned)) {
            paragraphs.push(cleaned);
          }
          currentParagraph = "";
        });
      },
      text(text) {
        currentParagraph += text.text;
      }
    })
    .transform(new Response(html))
    .text();
  
  const content = decodeHtmlEntities(paragraphs.join('\n\n'));
  console.log(`Extracted content length: ${content.length}`);
  console.log(`Extracted content snippet: ${content.substring(0, 200)}...`);
  return content;
}

async function generateFullSummary(ai: Ai, text: string): Promise<string | null> {
  if (!text) return null;
  const truncatedText = text.substring(0, 3000);
  console.log("--- AI INPUT START ---");
  console.log(truncatedText);
  console.log("--- AI INPUT END ---");
  try {
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "あなたはプロの日本人ニュースライターです。提供された英語のニュース本文を基に、日本のニュースサイトに掲載されるような自然で読みやすい日本語の本文（3〜6段落）を再構成してください。見出しや箇条書き、解説、注釈は一切含めず、本文のみを出力してください。" },
        { role: "user", content: `以下のニュース本文を日本のニュースサイトに掲載される自然な本文として再構成してください。文章は途中で切らず、最後まで書き切ること。\n\n本文:  \n${truncatedText}` }
      ],
      max_tokens: 900
    });

    return response.response?.trim() || null;
  } catch (e) {
    console.error("Summary generation error:", e);
    return null;
  }
}

function applyGlossary(text: string): string {
  let processed = text;
  for (const [short, full] of Object.entries(glossary)) {
    const regex = new RegExp(`\\b${short}\\b`, 'g');
    processed = processed.replace(regex, full);
  }
  return processed;
}

async function translateText(ai: Ai, text: string): Promise<string | null> {
  if (!text) return null;
  try {
    const expandedText = applyGlossary(text);
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "あなたはプロの日本人ニュース翻訳者です。オーストラリア在住の日本人向けに、ニューステキストを自然な日本語に翻訳します。翻訳結果のみを出力し、注釈や元の英語は含めないでください。" },
        { role: "user", content: `以下のテキストを翻訳してください:\n\n${expandedText}` }
      ],
      max_tokens: 900
    });
    return response.response?.trim() || null;
  } catch (e) {
    console.error(`Translation error:`, e);
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function cleanHtml(html: string): string {
  if (!html) return "";
  const withoutCdata = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const withoutTags = withoutCdata.replace(/<[^>]*>?/gm, '');
  return decodeHtmlEntities(withoutTags).trim();
}

function extractTagContent(itemXml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = itemXml.match(regex);
  if (match) return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  return "";
}

function extractAllCategories(itemXml: string): string[] {
  const categories: string[] = [];
  const regex = /<category[^>]*>([\s\S]*?)<\/category>/gi;
  let match;
  while ((match = regex.exec(itemXml)) !== null) categories.push(cleanHtml(match[1]));
  return categories;
}

function extractThumbnail(itemXml: string): string {
  const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumbMatch) return thumbMatch[1];
  const contentMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*medium=["']image["']/i);
  if (contentMatch) return contentMatch[1];
  return "";
}

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
  const FEEDS = [
    "https://www.abc.net.au/news/feed/51892/rss.xml",
    "https://www.abc.net.au/news/feed/1042/rss.xml"
  ];

  try {
    const rssResponses = await Promise.all(FEEDS.map(f => fetch(f, { headers: { "User-Agent": "Mozilla/5.0" } })));
    const allItemsXml: string[] = [];
    for (const res of rssResponses) {
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];
      allItemsXml.push(...items);
    }

    const parsedItems = await Promise.all(allItemsXml.map(async itemXml => {
      const title = cleanHtml(extractTagContent(itemXml, "title"));
      const link = extractTagContent(itemXml, "link");
      const id = await generateId(link);
      const descriptionRaw = extractTagContent(itemXml, "description");
      const pubDate = extractTagContent(itemXml, "pubDate");
      const category = extractAllCategories(itemXml)[0] || "News";
      const thumbnail = extractThumbnail(itemXml);
      const firstLine = cleanHtml(descriptionRaw).substring(0, 300);

      return { id, title, link, firstLine, pubDate: new Date(pubDate).getTime(), displayDate: pubDate, category, thumbnail };
    }));

    const uniqueItems = Array.from(new Map(parsedItems.map(item => [item.link, item])).values()).sort((a, b) => b.pubDate - a.pubDate).slice(0, 5);

    const results = await Promise.all(uniqueItems.map(async (item) => {
      const cacheKey = `ja:id:${item.id}`;
      const cached = await env.NEWS_TRANSLATIONS.get(cacheKey);
      
      if (cached) return JSON.parse(cached);

      // New translation & summary
      const title_ja = await translateText(env.AI, item.title) || item.title;
      const line_ja = await translateText(env.AI, item.firstLine) || item.firstLine;
      const fullText = await extractFullContent(item.link);
      const bodyJa = await generateFullSummary(env.AI, fullText) || "要約を生成できませんでした。";

      const newsItem = { id: item.id, title: item.title, link: item.link, firstLine: item.firstLine, title_ja, firstLine_ja: line_ja, bodyJa, thumbnail: item.thumbnail, category: item.category, pubDate: item.displayDate };
      await env.NEWS_TRANSLATIONS.put(cacheKey, JSON.stringify(newsItem), { expirationTtl: 259200 });
      return newsItem;
    }));

    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch {
    return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
  }
};
