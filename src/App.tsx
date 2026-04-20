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
      </div>
    </NewsProvider>
  )
}

export default App
