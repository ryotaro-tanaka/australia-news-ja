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
            <div className="skeleton skeleton-meta" style={{ width: '80px' }}></div>
          </div>
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-text" style={{ width: '100%' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
        </div>
      </div>
    </article>
  );
};
