import React from 'react';

export const NewsCardSkeleton: React.FC = () => {
  return (
    <article className="news-card">
      <div className="card-content">
        <div className="thumbnail-container">
          <div className="skeleton skeleton-img"></div>
        </div>
        <div className="text-container">
          <div className="card-meta">
            <div className="skeleton skeleton-meta"></div>
          </div>
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
        </div>
      </div>
    </article>
  );
};
