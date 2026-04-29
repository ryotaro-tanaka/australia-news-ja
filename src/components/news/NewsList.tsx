import React, { useEffect, useRef } from 'react';
import { useNews } from '../../hooks/useNews';
import { NewsCard } from './NewsCard';
import { NewsCardSkeleton } from './NewsCardSkeleton';
import { useNewsContext } from '../../state/NewsContext';
import type { NewsItem } from '../../types/news';

export const NewsList: React.FC = () => {
  const { news, loading, loadingMore, hasMore, error, loadMore } = useNews();
  const { state: { language } } = useNewsContext();
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
    const errorPrefix = language === 'id' ? 'Terjadi kesalahan:' : 'エラーが発生しました:';
    return <div className="error">{errorPrefix} {error}</div>;
  }

  // Native ad for Wise
  const wiseAd: NewsItem = {
    title: "Overseas Remittance with Wise",
    link: "https://wise.prf.hn/click/camref:1110lEYXd",
    firstLine: "Save on fees for money transfers to Japan.",
    title_ja: "海外送金なら Wise (ワイズ) - 手数料を節約",
    firstLine_ja: "銀行よりも安く、速い海外送金。オーストラリアから日本への送金や、外貨管理に最適。現地在住者の必須ツールです。",
    title_id: "Kirim Uang ke Luar Negeri with Wise - Hemat Biaya",
    firstLine_id: "Pengiriman uang internasional yang lebih murah dan cepat daripada bank. Ideal untuk mengirim uang from Australia ke Indonesia.",
    thumbnail: "https://wise-creative.prf.hn/source/camref:1110lEYXk/creativeref:1100l100085",
    category: "PR",
    pubDate: new Date().toISOString()
  };

  // Insert ad after 7th item (index 7) only if we have enough items
  const displayItems = [...news];
  if (displayItems.length >= 7) {
    displayItems.splice(7, 0, wiseAd);
  } else if (displayItems.length > 0 && !hasMore) {
    // If no more items to load and we never reached 7, push it to the end
    displayItems.push(wiseAd);
  }

  return (
    <main className="news-list">
      {displayItems.map((item, index) => (
        <NewsCard key={`${item.link}-${index}`} item={item} />
      ))}

      {/* Sentinel for Infinite Scroll */}
      <div ref={observerTarget} style={{ height: '20px' }}>
        {loadingMore && (
          <div style={{ marginTop: '1.5rem' }}>
            <NewsCardSkeleton />
          </div>
        )}
      </div>

      {!hasMore && news.length > 0 && (
        <p style={{ textAlign: 'center', color: '#888', margin: '2rem 0' }}>
          {language === 'id' ? 'Tidak ada berita lagi.' : 'これ以上のニュースはありません。'}
        </p>
      )}
    </main>
  );
};
