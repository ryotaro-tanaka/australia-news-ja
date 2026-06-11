import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { NewsItem } from '../../types/news';
import { NewsDetailSkeleton } from './NewsDetailSkeleton';
import './NewsDetail.css';

export const NewsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(`/api/news?action=detail&id=${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch article');
        }
        const data = await response.json();
        setNews(data);
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [id]);

  if (loading) return <NewsDetailSkeleton />;
  if (!news) return <div className="news-detail"><div className="error">記事が見つかりません。</div></div>;

  const formattedDate = new Date(news.pubDate).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <article className="news-detail">
      <div className="news-meta">
        <span className="category-badge">{news.category}</span>
        <time className="pub-date">{formattedDate}</time>
      </div>

      <h1>{news.title_ja}</h1>

      {news.thumbnail && (
        <div className="main-image">
          <img src={news.thumbnail} alt="" />
        </div>
      )}

      <div className="summary-body">
        {news.bodyJa ? (
          news.bodyJa.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))
        ) : (
          <p>要約を生成できませんでした。</p>
        )}
      </div>

      <div className="action-buttons">
        <Link to="/" className="btn btn-secondary">
          一覧へ戻る
        </Link>
        <a href={news.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          元記事を読む (英語)
        </a>
      </div>
    </article>
  );
};
