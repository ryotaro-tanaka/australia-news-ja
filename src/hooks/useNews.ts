import { useEffect, useCallback } from 'react';
import { useNewsContext } from '../state/NewsContext';

export function useNews() {
  const { state, dispatch } = useNewsContext();

  const fetchNews = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const response = await fetch('/api/news');
      if (!response.ok) throw new Error('Failed to fetch news');
      const data = await response.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, [dispatch]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return {
    news: state.items,
    loading: state.loading,
    error: state.error,
    refresh: fetchNews
  };
}
