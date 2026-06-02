import { AbcExtractor } from "./abc";

export interface NewsExtractor {
  canHandle(url: string): boolean;
  getThumbnail(itemXml: string): string;
  extract(url: string): Promise<string>;
}

export interface NewsSource {
  name: string;
  url: string;
}

export const SOURCES: NewsSource[] = [
  { name: "ABC News - Business", url: "https://www.abc.net.au/news/feed/51892/rss.xml" },
  { name: "ABC News - Politics", url: "https://www.abc.net.au/news/feed/1042/rss.xml" }
];

export const extractors: NewsExtractor[] = [
  AbcExtractor
];

export async function extractFullContent(url: string): Promise<string> {
  const extractor = extractors.find(e => e.canHandle(url));
  
  if (extractor) {
    const content = await extractor.extract(url);
    console.log(`Extracted content length (${url}): ${content.length}`);
    return content;
  }

  // デフォルト処理（現状は空文字を返すが、必要に応じて汎用抽出を追加可能）
  console.warn(`No extractor found for URL: ${url}`);
  return "";
}

export function getThumbnail(itemXml: string, link: string): string {
  const extractor = extractors.find(e => e.canHandle(link));
  return extractor ? extractor.getThumbnail(itemXml) : "";
}
