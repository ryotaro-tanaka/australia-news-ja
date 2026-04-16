import { useState, useEffect } from 'react'
import './App.css'

interface NewsItem {
  title: string;
  link: string;
  firstLine: string;
  title_ja: string;
  firstLine_ja: string;
}

function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => {
        setNews(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <header>
        <h1>豪州ニュース</h1>
        <p className="subtitle">ABC News (日本語訳)</p>
      </header>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : (
        <main className="news-list">
          {news.map((item, index) => (
            <article key={index} className="news-card">
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                <h2>{item.title_ja}</h2>
                <p className="original-title">{item.title}</p>
                <p className="description">{item.firstLine_ja}</p>
              </a>
            </article>
          ))}
        </main>
      )}

      <footer>
        <p>&copy; 2024 豪州生活ニュース</p>
      </footer>
    </div>
  )
}

export default App
