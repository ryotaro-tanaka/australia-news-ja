import glossary from "./glossary.json";
import { extractFullContent, getThumbnail } from "./extractors";
import { cleanHtml, smartTruncate } from "./utils";

export interface Ai {
  run(model: string, input: Record<string, unknown>, options?: { gateway?: { id: string; skipCache: boolean; cacheTtl: number } }): Promise<{ response?: string }>;
}

export interface Env {
  NEWS_TRANSLATIONS: KVNamespace;
  AI: Ai;
  NEWS_QUEUE: Queue;
}

export interface NewsItem {
  id: string;
  title_ja: string;
  bodyJa: string;
  link: string;
  thumbnail: string;
  category: string;
  pubDate: number;
}

export interface NewsMetadata {
  id: string;
  title_ja: string;
  thumbnail: string;
  category: string;
  pubDate: number;
}

export interface RawNewsItem {
  id: string;
  title: string;
  link: string;
  thumbnail: string;
  category: string;
  pubDate: number;
}

export async function generateId(url: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return fullHash.slice(0, 16);
}

export function cleanThumbnailUrl(url: string): string {
  if (!url) return "";
  return url.split('?')[0];
}

export async function generateFullSummary(ai: Ai, text: string): Promise<string | null> {
  if (!text) return null;
  const truncatedText = smartTruncate(text, 3000);
  try {
    const systemPrompt = `あなたはプロの日本人ニュースライターです。提供された英語のニュース情報を基に、オーストラリア在住の日本人向けに、日本の大手ニュースサイトに掲載されるような自然な日本語記事を執筆してください。

### 執筆ルール
1. 段落構成(3段落のみ):
   - 第1段落(リード):最重要情報を150文字で簡潔にまとめる。
   - 第2段落:背景・状況・関係者の短いコメントを250文字で説明する。
   - 第3段落:影響・今後の見通しを250文字で述べる。

2. 禁止事項:
   - 段落番号やラベルを含めない。
   - 見出し・箇条書き・注釈を含めない。
   - 同じ内容を繰り返さない。
   - 引用は1文以内にする。

3. 出力形式:
   - 全体の文字数は **650文字** に収める。
   - 文体は簡潔で事実ベース。
   - 文章は途中で切らず、最後まで書き切る。`;

    const userPrompt = `### 英語ニュース本文
${truncatedText}

### 日本語記事執筆結果（本文のみを出力）:`;

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 800
    }, {
      gateway: {
        id: "default",
        skipCache: false,
        cacheTtl: 3600
      }
    });

    return (response.response as string)?.trim() || null;
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

export async function translateText(ai: Ai, text: string): Promise<string | null> {
  if (!text) return null;
  try {
    const expandedText = applyGlossary(text);
    const systemPrompt = `あなたはプロのニュースエディターです。提供された英語のニュースタイトルを基に、日本のニュースサイト（Yahoo!ニュース等）で目を引くような、簡潔でインパクトのある日本語の見出しを作成してください。

### 執筆ルール
- 30〜40文字程度の「見出し」として作成してください。
- 翻訳調を避け、ニュースらしい体言止めや力強い表現を用いてください。
- 説明的な文章（〜ました、〜困っている等）ではなく、事実や核心を突く表現にしてください。
- 見出しのみを出力し、注釈やメタ情報は一切含めないでください。`;

    const userPrompt = `### 対象タイトル
${expandedText}

### 日本語見出し（見出しのみを出力）:`;

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 300
    }, {
      gateway: {
        id: "default",
        skipCache: false,
        cacheTtl: 3600
      }
    });
    return (response.response as string)?.trim() || null;
  } catch (e) {
    console.error(`Translation error:`, e);
    return null;
  }
}

export function extractTagContent(itemXml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = itemXml.match(regex);
  if (match) return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  return "";
}

export function extractAllCategories(itemXml: string): string[] {
  const categories: string[] = [];
  const regex = /<category[^>]*>([\s\S]*?)<\/category>/gi;
  let match;
  while ((match = regex.exec(itemXml)) !== null) categories.push(cleanHtml(match[1]));
  return categories;
}

export async function processNewsItem(item: RawNewsItem, env: Env): Promise<NewsItem> {
  const title_ja = await translateText(env.AI, item.title) || item.title;
  const fullText = await extractFullContent(item.link);
  const bodyJa = await generateFullSummary(env.AI, fullText) || "要約を生成できませんでした。";

  const newsItem: NewsItem = { 
    id: item.id, 
    title_ja, 
    bodyJa, 
    link: item.link, 
    thumbnail: cleanThumbnailUrl(item.thumbnail), 
    category: item.category, 
    pubDate: item.pubDate 
  };
  
  await env.NEWS_TRANSLATIONS.put(`ja:id:${item.id}`, JSON.stringify(newsItem), { expirationTtl: 259200 });
  return newsItem;
}

export { getThumbnail };
