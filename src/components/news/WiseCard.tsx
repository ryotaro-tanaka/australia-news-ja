import React from 'react';

export const WiseCard: React.FC = () => {
  const formattedDate = new Date().toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <article className="news-card">
      <a 
        href="https://wise.prf.hn/click/camref:1110lEYXd/creativeref:1011l101111" 
        target="_blank" 
        rel="sponsored noopener noreferrer"
        className="wise-card-link"
      >
        <div className="card-content">
          <div className="thumbnail-container">
            <img 
              src="https://wise-creative.prf.hn/source/camref:1110lEYXd/creativeref:1011l101111" 
              alt="Wise - 本当の為替レートと公平な手数料" 
              loading="lazy" 
            />
          </div>
          <div className="text-container">
            <div className="card-meta">
              <span className="category-badge">PR</span>
              <time className="pub-date">{formattedDate}</time>
            </div>
            <h2>本当の為替レートと公平な手数料</h2>
          </div>
        </div>
      </a>
    </article>
  );
};
