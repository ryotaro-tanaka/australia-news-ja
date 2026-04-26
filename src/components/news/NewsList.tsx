import React from 'react';
import { useNews } from '../../hooks/useNews';
import { NewsCard } from './NewsCard';
import type { NewsItem } from '../../types/news';

export const NewsList: React.FC = () => {
  const { news, loading, error } = useNews();

  if (loading) return <div className="loading">読み込み中...</div>;
  if (error) return <div className="error">エラーが発生しました: {error}</div>;

  // Native ad for Wise
  const wiseAd: NewsItem = {
    title: "Overseas Remittance with Wise",
    link: "https://wise.prf.hn/click/camref:1110lEYXd",
    firstLine: "Save on fees for money transfers to Japan.",
    title_ja: "海外送金なら Wise (ワイズ) - 手数料を節約",
    firstLine_ja: "銀行よりも安く、速い海外送金。オーストラリアから日本への送金や、外貨管理に最適。現地在住者の必須ツールです。",
    thumbnail: "/favicon.png",
    category: "PR",
    pubDate: new Date().toISOString()
  };

  // Insert ad after 7th item (index 7)
  const displayItems = [...news];
  if (displayItems.length >= 7) {
    displayItems.splice(7, 0, wiseAd);
  } else if (displayItems.length > 0) {
    displayItems.push(wiseAd);
  }

  return (
    <main className="news-list">
      {displayItems.map((item, index) => (
        <NewsCard key={`${item.link}-${index}`} item={item} />
      ))}
    </main>
  );
};
