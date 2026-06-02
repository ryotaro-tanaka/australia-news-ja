import React from 'react';
import { Link } from 'react-router-dom';
import type { NewsMetadata } from '../../types/news';

interface NewsCardProps {
  item: NewsMetadata;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  const formattedDate = new Date(item.displayDate).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <article className="news-card">
      <Link to={item.id === "wise-ad" ? item.bodyJa?.split('\n')[0].includes('http') ? item.bodyJa.split('\n')[0] : '#' : `/news/${item.id}`}>
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
            <h2>{item.title_ja}</h2>
            {item.bodyJa && <p className="description">{item.bodyJa.split('\n')[0]}</p>}
          </div>
        </div>
      </Link>
    </article>
  );
};
