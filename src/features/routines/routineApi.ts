import apiClient from "@/shared/api/client";
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
  const response = await apiClient.get<RoutineSummaryResponse[]>("/users/me/routines");
  return response.data;
}

/**
 * Get full routine detail for editing (includes all exercises and sets)
 */
export async function getRoutineDetailApi(routineId: string): Promise<RoutineDetailResponse> {
  const response = await apiClient.get<RoutineDetailResponse>(`/users/me/routines/${routineId}`);
  return response.data;
}

/**
 * Create a new routine
 */
export async function createRoutineApi(request: RoutineUpsertRequest): Promise<RoutineDetailResponse> {
  const response = await apiClient.post<RoutineDetailResponse>("/users/me/routines", request);
  return response.data;
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
  const response = await apiClient.patch<RoutineDetailResponse>(
    `/users/me/routines/${routineId}`,
    request
  );
  return response.data;
}

/**
 * Activate a routine (sets it as the current active routine)
 */
export async function activateRoutineApi(routineId: string): Promise<void> {
  await apiClient.put(`/users/me/routines/${routineId}/activate`);
}

/**
 * Delete a routine
 */
export async function deleteRoutineApi(routineId: string): Promise<void> {
  await apiClient.delete(`/users/me/routines/${routineId}`);
}

/**
 * Get user routine settings and active routine progress
 */
export async function getMyRoutineSettingsApi(): Promise<UserRoutineSettingsResponse> {
  const response = await apiClient.get<UserRoutineSettingsResponse>("/users/me/routine-settings");
  return response.data;
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

