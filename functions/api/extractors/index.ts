import { AbcExtractor } from "./abc";

export interface NewsExtractor {
  canHandle(url: string): boolean;
  extract(url: string): Promise<string>;
}

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
