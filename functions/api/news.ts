import glossary from "./glossary.json";
import { extractFullContent, SOURCES, getThumbnail } from "./extractors";
import { cleanHtml, smartTruncate } from "./utils";

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

async function generateFullSummary(ai: Ai, text: string): Promise<string | null> {
  if (!text) return null;
  const truncatedText = smartTruncate(text, 4000);
  console.log("--- AI INPUT START ---");
  console.log(truncatedText);
  console.log("--- AI INPUT END ---");
  try {
    const prompt = `### 役割
あなたはプロの日本人ニュースライターです。提供された英語のニュース情報を基に、オーストラリア在住の日本人向けに、日本の大手ニュースサイトに掲載されるような自然な日本語記事を執筆してください。

### 執筆ルール
1. 段落構成:
   - 第1段落（リード）：最重要情報・結論を150〜250文字で簡潔に。
   - 第2〜4段落：背景、具体的な状況、関係者の発言や引用。
   - 第5段落以降：追加情報、社会的影響、補足説明。
2. 禁止事項:
   - 「[1段落]」や「[N段落]」といった段落番号やラベルは一切含めないください。
   - 見出し、箇条書き、注釈、解説は一切含めないでください。
3. 出力形式:
   - 全体の文字数は 1800〜2000 文字を目指して詳細に執筆してください。
   - 冗長な表現を避け、プロフェッショナルな文体（です・ます調またはだ・である調を自然に使い分ける）で構成してください。
   - 文章は途中で切らず、必ず最後まで書き切ってください。

### 英語ニュース本文
${truncatedText}

### 日本語記事執筆結果（本文のみを出力）:`;

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 900
    }, {
      gateway: {
        id: "default",
        skipCache: false,
        cacheTtl: 3600
      }
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
    const prompt = `### 役割
あなたはプロの日本人ニュース翻訳者です。オーストラリア在住の日本人向けに、ニューステキストを自然な日本語に翻訳します。

### 執筆ルール
- 翻訳結果のみを出力してください。
- 注釈や元の英語、メタ情報は一切含めないでください。
- 日本語として自然で読みやすい表現を心がけてください。

### 対象テキスト
${expandedText}

### 翻訳結果（本文のみを出力）:`;

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 900
    }, {
      gateway: {
        id: "default",
        skipCache: false,
        cacheTtl: 3600
      }
    });
    return response.response?.trim() || null;
  } catch (e) {
    console.error(`Translation error:`, e);
    return null;
  }
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
    const rssResponses = await Promise.all(SOURCES.map(s => fetch(s.url, { headers: { "User-Agent": "Mozilla/5.0" } })));
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
      const thumbnail = getThumbnail(itemXml, link);
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
