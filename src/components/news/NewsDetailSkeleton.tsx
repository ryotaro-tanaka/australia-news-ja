import React from 'react';
import './NewsDetail.css';

export const NewsDetailSkeleton: React.FC = () => {
  return (
    <article className="news-detail">
      <div className="news-meta">
        <div className="skeleton skeleton-meta" style={{ width: '60px', height: '1.5rem' }}></div>
        <div className="skeleton skeleton-meta" style={{ width: '100px', height: '1rem' }}></div>
      </div>

      <div className="skeleton skeleton-title" style={{ height: '2.5rem', marginBottom: '1.5rem' }}></div>
      <div className="skeleton skeleton-title" style={{ height: '2.5rem', width: '60%', marginBottom: '2rem' }}></div>

      <div className="main-image">
        <div className="skeleton" style={{ width: '100%', aspectRatio: '16/9' }}></div>
      </div>

      <div className="summary-body">
        <div className="skeleton skeleton-text" style={{ width: '100%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '95%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '98%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: '2rem' }}></div>
        
        <div className="skeleton skeleton-text" style={{ width: '100%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '92%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '96%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '30%' }}></div>
      </div>

      <div className="action-buttons">
        <div className="skeleton" style={{ flex: 1, height: '48px', borderRadius: '12px' }}></div>
        <div className="skeleton" style={{ flex: 1, height: '48px', borderRadius: '12px' }}></div>
      </div>
    </article>
  );
};
