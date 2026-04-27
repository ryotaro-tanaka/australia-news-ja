import './App.css'
import { NewsProvider } from './state/NewsContext'
import { NewsList } from './components/news/NewsList'

function NewsApp() {
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
