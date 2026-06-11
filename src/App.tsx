import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import { NewsProvider } from './state/NewsContext'
import { NewsList } from './components/news/NewsList'
import { NewsDetail } from './components/news/NewsDetail'
import { Footer } from './components/ui/Footer'

function Layout({ children }: { children: React.ReactNode }) {
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
      <main>{children}</main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <NewsProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<NewsList />} />
            <Route path="/news/:id" element={<NewsDetail />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </NewsProvider>
  )
}

export default App
