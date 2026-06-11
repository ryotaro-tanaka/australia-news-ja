import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { NewsMetadata } from '../types/news';

interface NewsState {
  items: NewsMetadata[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  language: 'ja';
  hasMore: boolean;
}

type NewsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_MORE_START' }
  | { type: 'FETCH_SUCCESS'; payload: NewsMetadata[] }
  | { type: 'APPEND_NEWS'; payload: NewsMetadata[] }
  | { type: 'FETCH_ERROR'; payload: string };

const initialState: NewsState = {
  items: [],
  loading: false,
  loadingMore: false,
  error: null,
  language: 'ja',
  hasMore: true,
};

function newsReducer(state: NewsState, action: NewsAction): NewsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null, hasMore: true };
    case 'FETCH_MORE_START':
      return { ...state, loadingMore: true, error: null };
    case 'FETCH_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        items: action.payload, 
        hasMore: action.payload.length >= 5 
      };
    case 'APPEND_NEWS': {
      const existingIds = new Set(state.items.map(item => item.id));
      const newItems = action.payload.filter(item => !existingIds.has(item.id));
      return { 
        ...state, 
        loadingMore: false, 
        items: [...state.items, ...newItems], 
        hasMore: action.payload.length >= 5 
      };
    }
    case 'FETCH_ERROR':
      return { ...state, loading: false, loadingMore: false, error: action.payload };
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

// eslint-disable-next-line react-refresh/only-export-components
export function useNewsContext() {
  const context = useContext(NewsContext);
  if (!context) throw new Error('useNewsContext must be used within NewsProvider');
  return context;
}
