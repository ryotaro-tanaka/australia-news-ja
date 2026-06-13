export interface NewsMetadata {
  id: string;
  title_ja: string;
  thumbnail: string;
  category: string;
  pubDate: number;
  snippet_ja: string;
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
