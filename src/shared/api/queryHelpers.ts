import { queryClient } from "./queryClient";

/**
 * Cross-feature cache invalidation helpers.
 * 
 * These helpers provide coordinated invalidation across features that share
 * related data. Use them instead of manually invalidating multiple query keys.
 * 
 * Design principles:
 * - Group invalidations by business action, not by feature
 * - Include all affected query keys in a single batch
 * - Document which features are affected
 */

// ============================================
// QUERY KEY IMPORTS
// Import these from feature modules to maintain single source of truth
// ============================================

import { checkInQueryKeys } from "@/features/check-in/queryKeys";

// Feature query key namespaces (root keys)
const QUERY_KEYS = {
  dashboard: ["dashboard"],
  routines: ["routines"],
  workoutSessions: ["workout-sessions"],
  checkIns: checkInQueryKeys.all,
  exercises: ["exercises"],
  profile: ["profile"],
  subscription: ["subscription"],
  plans: ["plans"],
  gyms: ["gyms"],
} as const;

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Invalidate after workout session mutations (start, update, complete, skip).
 * 
 * Affects:
 * - workout-sessions: today, detail, history
 * - dashboard: summary (workout card, activity)
 * - routines: settings (next workout info)
 */
export async function invalidateWorkoutSessionRelated(routineLogId?: string) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workoutSessions }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.routines, "settings"] }),
  ];

  // Also invalidate specific routine if session is routine-based
  // (routine detail may show last workout info)
  
  await Promise.all(invalidations);
}

/**
 * Invalidate after routine mutations (create, update, delete, reorder).
 * 
 * Affects:
 * - routines: all (list, detail, settings)
 * - dashboard: summary (upcoming workout card, heatmap)
 * - workout-sessions: today (if upcoming workout changed)
 */
export async function invalidateRoutineRelated(routineId?: string) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.routines }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.workoutSessions, "today"] }),
  ];

  await Promise.all(invalidations);
}

/**
 * Invalidate after sync-to-routine (workout session updates routine template).
 * 
 * Affects:
 * - routines: detail, settings (template changed)
 * - workout-sessions: detail (session may show routine link)
 * - dashboard: summary (upcoming workout may change)
 */
export async function invalidateSyncToRoutine(routineLogId: string, routineId?: string) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.routines }),
    queryClient.invalidateQueries({ 
      queryKey: [...QUERY_KEYS.workoutSessions, "detail", routineLogId] 
    }),
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.dashboard, "summary"] }),
  ];

  await Promise.all(invalidations);
}

/**
 * Invalidate after check-in/check-out.
 * 
 * Affects:
 * - check-ins: active, history, summary
 * - dashboard: summary (visit stats, activity)
 */
export async function invalidateCheckInRelated() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkIns }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
  ]);
}

/**
 * Invalidate after subscription/payment changes.
 * 
 * Affects:
 * - subscription: status, history
 * - profile: membership info
 * - dashboard: plan card
 */
export async function invalidateSubscriptionRelated() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscription }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
  ]);
}

/**
 * Invalidate after exercise library changes (custom exercise CRUD).
 * 
 * Affects:
 * - exercises: library, filters, detail
 * - routines: detail (if exercise was in a routine)
 */
export async function invalidateExerciseRelated() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exercises }),
    // Don't invalidate all routines - too broad
    // Individual routine detail will refetch when accessed
  ]);
}

/**
 * Invalidate after profile updates.
 * 
 * Affects:
 * - profile: all
 * - dashboard: plan card (if membership changed)
 */
export async function invalidateProfileRelated() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile }),
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.dashboard, "summary"] }),
  ]);
}

/**
 * Full cache clear - use sparingly (logout, account switch).
 */
export function clearAllQueries() {
  queryClient.clear();
}

/**
 * Reset specific query to refetch immediately.
 * Use when you need fresh data regardless of stale state.
 */
export async function refetchQuery(queryKey: readonly unknown[]) {
  await queryClient.refetchQueries({ queryKey, exact: true });
}

// ============================================
// OPTIMISTIC UPDATE HELPERS
// ============================================

/**
 * Set query data directly (for optimistic updates from mutation responses).
 * Use when mutation returns the full updated entity.
 */
export function setQueryData<T>(queryKey: readonly unknown[], data: T) {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Get current cached data for a query.
 */
export function getQueryData<T>(queryKey: readonly unknown[]): T | undefined {
  return queryClient.getQueryData<T>(queryKey);
}

// ============================================
// EXPORTS
// ============================================

export { QUERY_KEYS };
