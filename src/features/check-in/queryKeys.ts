import type { CheckInStatus } from "./model";

/**
 * Centralized query keys for the check-in feature.
 * 
 * Key structure:
 * - checkIn.all: Root key for all check-in queries
 * - checkIn.lists: All check-in list queries
 * - checkIn.active: Active check-in status
 * - checkIn.history: Paginated check-in history with filters
 * - checkIn.historySummary: Summary of check-in history (for stats)
 */
export const checkInQueryKeys = {
  // Root key
  all: ["check-ins"] as const,

  // Lists
  lists: () => [...checkInQueryKeys.all, "list"] as const,
  
  // Active check-in query (for dashboard/current status)
  active: () => [...checkInQueryKeys.all, "active"] as const,

  // Check-in history with filters and pagination
  history: (
    status?: CheckInStatus | "all" | null,
    searchTerm?: string,
    sortDirection?: "asc" | "desc",
    page?: number
  ) => [
    ...checkInQueryKeys.all,
    "history",
    status ?? "all",
    searchTerm ?? "",
    sortDirection ?? "desc",
    page ?? 0,
  ] as const,

  // Check-in history summary (stats/counts)
  historySummary: (
    status?: CheckInStatus | "all" | null,
    searchTerm?: string
  ) => [
    ...checkInQueryKeys.all,
    "history-summary",
    status ?? "all",
    searchTerm ?? "",
  ] as const,
};
