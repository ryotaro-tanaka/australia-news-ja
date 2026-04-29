import { useEffect, useCallback } from 'react';
import { useNewsContext } from '../state/NewsContext';

export function useNews() {
  const { state, dispatch } = useNewsContext();

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
    if (state.loadingMore || !state.hasMore || state.items.length === 0) return;

    const lastItem = state.items[state.items.length - 1];
    const cursor = new Date(lastItem.pubDate).getTime();

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
    if (state.items.length === 0 && !state.loading && !state.error) {
      fetchNews();
    }
  }, [fetchNews, state.items.length, state.loading, state.error]);

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
