import React from 'react';
import { useNews } from '../../hooks/useNews';
import { NewsCard } from './NewsCard';

export const NewsList: React.FC = () => {
  const { news, loading, error } = useNews();

  if (loading) return <div className="loading">読み込み中...</div>;
  if (error) return <div className="error">エラーが発生しました: {error}</div>;

  return (
    <main className="news-list">
      {news.map((item, index) => (
        <NewsCard key={index} item={item} />
      ))}
    </main>
  );
};
