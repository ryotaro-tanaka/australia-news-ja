import './App.css'
import { NewsProvider } from './state/NewsContext'
import { NewsList } from './components/news/NewsList'

function App() {
  return (
    <NewsProvider>
      <div className="container">
        <header>
          <h1>豪州ニュース</h1>
          <p className="subtitle">ABC News (日本語訳)</p>
        </header>

        <NewsList />

        <footer>
          <p>&copy; 2024 豪州生活ニュース</p>
        </footer>
      </div>
    </NewsProvider>
  )
}

export default App
