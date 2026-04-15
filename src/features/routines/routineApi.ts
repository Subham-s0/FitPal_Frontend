import { deleteApiData, getApiData, patchApiData, postApiData, putApiData } from "@/shared/api/client";
import type {
  RoutineSummaryResponse,
  RoutineDetailResponse,
  RoutineUpsertRequest,
  UserRoutineSettingsResponse,
} from "@/features/routines/routineTypes";

// ============================================
// ROUTINE CRUD API
// ============================================

/**
 * Get all routines for the current user (list view with day summaries)
 */
export async function getMyRoutinesApi(): Promise<RoutineSummaryResponse[]> {
  return getApiData<RoutineSummaryResponse[]>("/users/me/routines");
}

/**
 * Get all routine details for the current user in one request.
 * Used by the routines workspace to avoid list + N detail requests on initial load.
 */
export async function getMyRoutineDetailsApi(): Promise<RoutineDetailResponse[]> {
  return getApiData<RoutineDetailResponse[]>("/users/me/routines/details");
}

/**
 * Get full routine detail for editing (includes all exercises and sets)
 */
export async function getRoutineDetailApi(routineId: string): Promise<RoutineDetailResponse> {
  return getApiData<RoutineDetailResponse>(`/users/me/routines/${routineId}`);
}

/**
 * Create a new routine
 */
export async function createRoutineApi(request: RoutineUpsertRequest): Promise<RoutineDetailResponse> {
  return postApiData<RoutineDetailResponse>("/users/me/routines", request);
}

/**
 * Update an existing routine (full-tree replacement)
 * - Existing IDs update
 * - Missing IDs delete  
 * - No-ID items create
 * - Order is determined by array position
 */
export async function updateRoutineApi(
  routineId: string,
  request: RoutineUpsertRequest
): Promise<RoutineDetailResponse> {
  return patchApiData<RoutineDetailResponse>(
    `/users/me/routines/${routineId}`,
    request
  );
}

/**
 * Activate a routine (sets it as the current active routine)
 */
export async function activateRoutineApi(routineId: string): Promise<void> {
  await putApiData(`/users/me/routines/${routineId}/activate`);
}

/**
 * Delete a routine
 */
export async function deleteRoutineApi(routineId: string): Promise<void> {
  await deleteApiData(`/users/me/routines/${routineId}`);
}

/**
 * Get user routine settings and active routine progress
 */
export async function getMyRoutineSettingsApi(): Promise<UserRoutineSettingsResponse> {
  return getApiData<UserRoutineSettingsResponse>("/users/me/routine-settings");
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const routineQueryKeys = {
  all: ["routines"] as const,
  list: () => [...routineQueryKeys.all, "list"] as const,
  details: () => [...routineQueryKeys.all, "detail"] as const,
  detail: (routineId: string) => [...routineQueryKeys.details(), routineId] as const,
  settings: () => [...routineQueryKeys.all, "settings"] as const,
};

