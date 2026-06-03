import { useEffect, useCallback, useRef } from 'react';
import { useNewsContext } from '../state/NewsContext';

export function useNews() {
  const { state, dispatch } = useNewsContext();
  const isInitialized = useRef(false);
  const lastFetchTime = useRef(0);

  const fetchNews = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const response = await fetch('/api/news?limit=5');
      if (!response.ok) throw new Error('Failed to fetch news');
      const data = await response.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, [dispatch]);

  const loadMore = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime.current < 2000) return;
    if (state.loadingMore || !state.hasMore || state.items.length === 0) return;

    lastFetchTime.current = now;
    const lastItem = state.items[state.items.length - 1];
    const cursor = new Date(lastItem.displayDate).getTime();

    dispatch({ type: 'FETCH_MORE_START' });
    try {
      const response = await fetch(`/api/news?limit=5&before=${cursor}`);
      if (!response.ok) throw new Error('Failed to fetch more news');
      const data = await response.json();
      dispatch({ type: 'APPEND_NEWS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error instanceof Error ? error.message : 'Failed to load more' });
    }
  }, [dispatch, state.items, state.hasMore, state.loadingMore]);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      fetchNews();
    }
  }, [fetchNews]);

  return {
    news: state.items,
    loading: state.loading,
    loadingMore: state.loadingMore,
    hasMore: state.hasMore,
    error: state.error,
    refresh: fetchNews,
    loadMore
  };
}
