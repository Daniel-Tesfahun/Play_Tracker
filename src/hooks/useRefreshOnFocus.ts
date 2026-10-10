import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Reloads when the tab gains focus or the app returns to the foreground,
 * so "today" counts roll over correctly if the app sat open past midnight.
 * `refresh` should be stable (wrapped in useCallback).
 */
export function useRefreshOnFocus(refresh: () => Promise<void>): void {
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);
}
