import React from 'react';
import { NewsItem } from '../../state/NewsContext';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  return (
    <article className="news-card">
      <a href={item.link} target="_blank" rel="noopener noreferrer">
        <h2>{item.title_ja}</h2>
        <p className="original-title">{item.title}</p>
        <p className="description">{item.firstLine_ja}</p>
      </a>
    </article>
  );
};
