import './App.css'
import { NewsProvider, useNewsContext } from './state/NewsContext'
import { NewsList } from './components/news/NewsList'

function NewsApp() {
  const { state: { language } } = useNewsContext();
  const title = language === 'id' ? 'Berita Australia' : '南半球の朝ごはんニュース';
  
  return (
    <div className="container">
      <header>
        <h1>{title}</h1>
      </header>
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
