import { useEffect } from 'react'
import './App.css'
import { NewsProvider, useNewsContext } from './state/NewsContext'
import { NewsList } from './components/news/NewsList'

function NewsApp() {
  useEffect(() => {
    const title = '南半球の朝ごはんニュース';
    const description = 'オーストラリアの最新ニュースを日本語で。現地在住者向けの情報を毎朝お届けします。';

    // Update Title
    document.title = title;

    // Update Meta Description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }

    // Update OGP Tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDescription) ogDescription.setAttribute('content', description);

    // Update Twitter Tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterTitle) twitterTitle.setAttribute('content', title);
    if (twitterDescription) twitterDescription.setAttribute('content', description);

  }, []);

  return (
    <div className="container">
      <main>
        <NewsList />
      </main>
    </div>
  );
}

function App() {
  return (
    <NewsProvider>
      <NewsApp />
    </NewsProvider>
  )
}

export default App
