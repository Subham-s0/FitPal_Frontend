import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRouter from "@/app/router";

/**
 * Configure React Query with sensible defaults:
 * - Retry failed requests up to 3 times with exponential backoff
 * - Don't retry on 4xx errors (client errors)
 * - Refetch on window focus for stale data
 * - Stale time of 30 seconds for most queries
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx client errors
        if (error && typeof error === "object" && "status" in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppRouter />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
