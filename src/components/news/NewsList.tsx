import React, { useEffect, useRef } from 'react';
import { useNews } from '../../hooks/useNews';
import { NewsCard } from './NewsCard';
import { NewsCardSkeleton } from './NewsCardSkeleton';
import { WiseCard } from './WiseCard';

export const NewsList: React.FC = () => {
  const { news, loading, loadingMore, hasMore, error, loadMore } = useNews();
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore, loadingMore, loading]);

  if (loading && news.length === 0) {
    return (
      <main className="news-list">
        {[...Array(5)].map((_, i) => (
          <NewsCardSkeleton key={i} />
        ))}
      </main>
    );
  }

  if (error && news.length === 0) {
    return <div className="error">エラーが発生しました: {error}</div>;
  }

  return (
    <main className="news-list">
      {news.map((item, index) => (
        <React.Fragment key={`${item.id}-${index}`}>
          <NewsCard item={item} />
          {index === 6 && <WiseCard />}
        </React.Fragment>
      ))}

      {/* Sentinel for Infinite Scroll */}
      <div ref={observerTarget} style={{ height: '20px' }}>
        {loadingMore && (
          <div style={{ marginTop: '1.5rem' }}>
            <NewsCardSkeleton />
          </div>
        )}
      </div>
    </main>
  );
};
