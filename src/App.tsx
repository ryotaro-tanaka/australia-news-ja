import './App.css'
import { NewsProvider } from './state/NewsContext'
import { NewsList } from './components/news/NewsList'

function App() {
  return (
    <NewsProvider>
      <div className="container">
        <main>
          <NewsList />
        </main>

        <footer>
          <p>&copy; 2024 豪州生活ニュース</p>
        </footer>
      </div>
    </NewsProvider>
  )
}

export default App
