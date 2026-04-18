import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { NewsItem } from '../types/news';

interface NewsState {
  items: NewsItem[];
  loading: boolean;
  error: string | null;
}

type NewsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: NewsItem[] }
  | { type: 'FETCH_ERROR'; payload: string };

const initialState: NewsState = {
  items: [],
  loading: false,
  error: null,
};

function newsReducer(state: NewsState, action: NewsAction): NewsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, items: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

const NewsContext = createContext<{
  state: NewsState;
  dispatch: React.Dispatch<NewsAction>;
} | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(newsReducer, initialState);
  return (
    <NewsContext.Provider value={{ state, dispatch }}>
      {children}
    </NewsContext.Provider>
  );
}

export function useNewsContext() {
  const context = useContext(NewsContext);
  if (!context) throw new Error('useNewsContext must be used within NewsProvider');
  return context;
}
