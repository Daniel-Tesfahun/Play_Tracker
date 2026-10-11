import { QueryClient } from '@tanstack/react-query';

/**
 * Everything lives in on-device SQLite, so the cache is the source of truth
 * between writes: never stale, never garbage-collected, never retried, and
 * never paused for "offline" (the default networkMode would pause queries
 * with no internet, which this app never needs).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: 'always',
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        networkMode: 'always',
        retry: false,
      },
    },
  });
}
