import React from 'react';
import type { NewsItem } from '../../types/news';
import { useNewsContext } from '../../state/NewsContext';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  const { state: { language } } = useNewsContext();
  const isId = language === 'id';

  const formattedDate = new Date(item.pubDate).toLocaleDateString(isId ? 'id-ID' : 'ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const title = isId ? item.title_id : item.title_ja;
  const description = isId ? item.firstLine_id : item.firstLine_ja;

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
            <h2 className="news-title">{title}</h2>
            <p className="description">{description}</p>
          </div>
        </div>
      </a>
    </article>
  );
};
