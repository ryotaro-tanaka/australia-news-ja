import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { NewsItem } from '../../types/news';

export const NewsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(`/api/news/detail?id=${id}`);
        if (!response.ok) throw new Error('Failed to fetch article');
        const data = await response.json();
        setNews(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [id]);

  if (loading) return <div className="loading">読み込み中...</div>;
  if (!news) return <div className="error">記事が見つかりません。</div>;

  return (
    <article className="news-detail">
      <Link to="/" className="back-button">← 一覧へ戻る</Link>
      <h1>{news.title_ja || news.title}</h1>
      <div className="summary-body">
        {news.bodyJa ? (
          <p style={{ whiteSpace: 'pre-wrap' }}>{news.bodyJa}</p>
        ) : (
          <p>要約を生成できませんでした。</p>
        )}
      </div>
      <a href={news.link} target="_blank" rel="noopener noreferrer" className="original-link">
        元記事を読む (英語)
      </a>
    </article>
  );
};
