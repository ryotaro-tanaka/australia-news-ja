import React from 'react';
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

  return (
    <article className="news-card">
      <a href={item.link} target="_blank" rel="noopener noreferrer">
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
            <p className="description">{item.firstLine_ja}</p>
          </div>
        </div>
      </a>
    </article>
  );
};
