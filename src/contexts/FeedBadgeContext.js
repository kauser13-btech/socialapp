import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SEEN_KEY = 'feed_last_seen_id';

const FeedBadgeContext = createContext({
  newFeedCount: 0,
  setFeedBadge: () => {},
  clearFeedBadge: async () => {},
  getLastSeenId: async () => null,
  saveLastSeenId: async () => {},
});

export function FeedBadgeProvider({ children }) {
  const [newFeedCount, setNewFeedCount] = useState(0);

  const setFeedBadge = useCallback((count) => {
    setNewFeedCount(count);
  }, []);

  const clearFeedBadge = useCallback(async (latestId) => {
    setNewFeedCount(0);
    if (latestId != null) {
      await AsyncStorage.setItem(LAST_SEEN_KEY, String(latestId));
    }
  }, []);

  const getLastSeenId = useCallback(async () => {
    const val = await AsyncStorage.getItem(LAST_SEEN_KEY);
    return val ? Number(val) : null;
  }, []);

  const saveLastSeenId = useCallback(async (id) => {
    await AsyncStorage.setItem(LAST_SEEN_KEY, String(id));
  }, []);

  return (
    <FeedBadgeContext.Provider value={{ newFeedCount, setFeedBadge, clearFeedBadge, getLastSeenId, saveLastSeenId }}>
      {children}
    </FeedBadgeContext.Provider>
  );
}

export function useFeedBadge() {
  return useContext(FeedBadgeContext);
}
