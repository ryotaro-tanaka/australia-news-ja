export interface NewsMetadata {
  id: string;
  title_ja: string;
  thumbnail: string;
  category: string;
  displayDate: string;
}

export interface NewsItem {
  id: string;
  title_ja: string;
  bodyJa: string;
  link: string;
  thumbnail: string;
  category: string;
  pubDate: string;
}
