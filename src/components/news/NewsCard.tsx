import React from 'react';
import { Link } from 'react-router-dom';
import type { NewsItem } from '../../types/news';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  const formattedDate = new Date(item.pubDate).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const title = item.title_ja;
  const description = item.bodyJa?.split('\n')[0] || '';

  return (
    <article className="news-card">
      <Link to={`/news/${item.id}`}>
        <div className="card-content">
          {item.thumbnail && (
            <div className="thumbnail-container">
              <img src={item.thumbnail} alt="" loading="lazy" />
            </div>
          )}
          <div className="text-container">
            <div className="card-meta">
              <span className="category-badge">{item.category}</span>
              <time className="pub-date">{formattedDate}</time>
            </div>
            <h2>{title}</h2>
            <p className="description">{description}</p>
          </div>
        </div>
      </Link>
    </article>
  );
};
