import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <a
        href="https://github.com/ryotaro-tanaka/australia-news-ja"
        target="_blank"
        rel="noopener noreferrer"
        className="github-link"
        aria-label="GitHub Repository"
      >
        <svg className="github-icon">
          <use href="/icons.svg#github-icon" />
        </svg>
      </a>
    </footer>
  );
};
