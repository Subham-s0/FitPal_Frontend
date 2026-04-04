import { QueryClient } from "@tanstack/react-query";

/**
 * Shared TanStack Query client configuration.
 * 
 * Design decisions based on FitPal requirements:
 * - staleTime: 30s - Balance between freshness and network efficiency
 * - gcTime: 5m - Keep cached data available for back navigation
 * - refetchOnWindowFocus: false - Avoid jarring refetches during normal use
 * - retry: 1 for queries - Single retry for transient failures
 * - retry: 0 for mutations - Never retry mutations (side effects)
 * 
 * Override per-query for volatile data:
 * - Active workout sessions: shorter staleTime, polling
 * - Check-in status: refetchInterval for live updates
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry on 4xx client errors
        if (error && typeof error === "object" && "status" in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        // Single retry for server/network errors
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: false, // Never retry mutations
    },
  },
});

export default queryClient;
