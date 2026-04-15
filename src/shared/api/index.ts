// Shared API module - centralized HTTP client and TanStack Query setup
//
// Usage:
// - Import `apiClient` for HTTP requests
// - Import `queryClient` for TanStack Query provider
// - Import invalidation helpers for cross-feature cache management
// - Import `getApiErrorMessage` for user-friendly error messages

// HTTP client
export { default as apiClient, getApiErrorMessage, AUTH_STORAGE_KEY } from "./client";

// API configuration
export { apiBaseUrl, apiBasePath, backendOrigin, buildApiUrl, buildGoogleOAuthStartUrl } from "./config";

// API contracts
export type { ApiErrorResponse, ApiResponse, PageResponse } from "./model";

// TanStack Query client
export { queryClient } from "./queryClient";

// Cache invalidation helpers
export {
  invalidateWorkoutSessionRelated,
  invalidateRoutineRelated,
  invalidateSyncToRoutine,
  invalidateCheckInRelated,
  invalidateSubscriptionRelated,
  invalidateExerciseRelated,
  invalidateProfileRelated,
  clearAllQueries,
  refetchQuery,
  setQueryData,
  getQueryData,
  QUERY_KEYS,
} from "./queryHelpers";
