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

  const title = isId 
    ? (item.title_id || (console.log('Using English title_id fallback:', item.title), item.title)) 
    : (item.title_ja || (console.log('Using English title_ja fallback:', item.title), item.title));
  const description = isId 
    ? (item.firstLine_id || (console.log('Using English firstLine_id fallback:', item.firstLine), item.firstLine)) 
    : (item.firstLine_ja || (console.log('Using English firstLine_ja fallback:', item.firstLine), item.firstLine));

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
            <h2>{title}</h2>
            <p className="description">{description}</p>
          </div>
        </div>
      </a>
    </article>
  );
};
