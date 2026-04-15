import { deleteApiData, getApiData, patchApiData, postApiData } from "@/shared/api/client";
import type {
  AddWorkoutExerciseRequest,
  AddWorkoutSetRequest,
  CompleteWorkoutSessionRequest,
  SkipWorkoutSessionRequest,
  StartWorkoutSessionRequest,
  TodayWorkoutSessionResponse,
  UpdateWorkoutSetRequest,
  WorkoutSessionExerciseResponse,
  WorkoutSessionResponse,
  WorkoutSessionSetResponse,
  WorkoutSessionSummaryResponse,
  WorkoutSessionHistoryPageResponse,
  WorkoutInsightRange,
  WorkoutInsightsResponse,
} from "@/features/workout-sessions/workoutSessionTypes";

export async function getTodayWorkoutSessionApi(): Promise<TodayWorkoutSessionResponse> {
  return getApiData<TodayWorkoutSessionResponse>("/users/me/workout-sessions/today");
}

export async function getWorkoutSessionHistoryApi(): Promise<WorkoutSessionSummaryResponse[]> {
  return getApiData<WorkoutSessionSummaryResponse[]>("/users/me/workout-sessions/history");
}

export async function getWorkoutSessionHistoryPaginatedApi(
  page: number = 0,
  size: number = 10
): Promise<WorkoutSessionHistoryPageResponse> {
  return getApiData<WorkoutSessionHistoryPageResponse>(
    `/users/me/workout-sessions/history/paginated?page=${page}&size=${size}`
  );
}

export async function getWorkoutInsightsApi(
  range: WorkoutInsightRange = "7d"
): Promise<WorkoutInsightsResponse> {
  return getApiData<WorkoutInsightsResponse>(
    `/users/me/workout-sessions/insights?range=${range}`
  );
}

export async function getWorkoutSessionApi(routineLogId: string): Promise<WorkoutSessionResponse> {
  return getApiData<WorkoutSessionResponse>(`/users/me/workout-sessions/${routineLogId}`);
}

export async function deleteWorkoutSessionApi(routineLogId: string): Promise<void> {
  await deleteApiData(`/users/me/workout-sessions/${routineLogId}`);
}

export async function startWorkoutSessionApi(
  request: StartWorkoutSessionRequest
): Promise<WorkoutSessionResponse> {
  return postApiData<WorkoutSessionResponse>("/users/me/workout-sessions/start", request);
}

export async function updateWorkoutSetApi(
  routineLogId: string,
  routineLogExerciseId: string,
  routineLogSetId: string,
  request: UpdateWorkoutSetRequest
): Promise<WorkoutSessionSetResponse> {
  return patchApiData<WorkoutSessionSetResponse>(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}/sets/${routineLogSetId}`,
    request
  );
}

export async function completeWorkoutSessionApi(
  routineLogId: string,
  request: CompleteWorkoutSessionRequest
): Promise<WorkoutSessionResponse> {
  return postApiData<WorkoutSessionResponse>(
    `/users/me/workout-sessions/${routineLogId}/complete`,
    request
  );
}

export async function skipWorkoutSessionApi(
  routineLogId: string,
  request: SkipWorkoutSessionRequest
): Promise<WorkoutSessionResponse> {
  return postApiData<WorkoutSessionResponse>(
    `/users/me/workout-sessions/${routineLogId}/skip`,
    request
  );
}

export async function addWorkoutExerciseApi(
  routineLogId: string,
  request: AddWorkoutExerciseRequest
): Promise<WorkoutSessionExerciseResponse> {
  return postApiData<WorkoutSessionExerciseResponse>(
    `/users/me/workout-sessions/${routineLogId}/exercises`,
    request
  );
}

export async function addWorkoutSetApi(
  routineLogId: string,
  routineLogExerciseId: string,
  request: AddWorkoutSetRequest
): Promise<WorkoutSessionSetResponse> {
  return postApiData<WorkoutSessionSetResponse>(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}/sets`,
    request
  );
}

export async function addExerciseToRoutineApi(
  routineLogId: string,
  routineLogExerciseId: string
): Promise<void> {
  await postApiData(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}/add-to-routine`
  );
}

export async function deleteWorkoutSetApi(
  routineLogId: string,
  routineLogExerciseId: string,
  routineLogSetId: string
): Promise<void> {
  await deleteApiData(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}/sets/${routineLogSetId}`
  );
}

export async function deleteWorkoutExerciseApi(
  routineLogId: string,
  routineLogExerciseId: string
): Promise<void> {
  await deleteApiData(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}`
  );
}

export async function syncSessionToRoutineApi(
  routineLogId: string
): Promise<WorkoutSessionResponse> {
  return postApiData<WorkoutSessionResponse>(
    `/users/me/workout-sessions/${routineLogId}/sync-to-routine`
  );
}

export async function reorderWorkoutExercisesApi(
  routineLogId: string,
  exerciseIds: string[]
): Promise<WorkoutSessionResponse> {
  return patchApiData<WorkoutSessionResponse>(
    `/users/me/workout-sessions/${routineLogId}/exercises/reorder`,
    { exerciseIds }
  );
}

export const workoutSessionQueryKeys = {
  all: ["workout-sessions"] as const,
  today: () => [...workoutSessionQueryKeys.all, "today"] as const,
  history: () => [...workoutSessionQueryKeys.all, "history"] as const,
  insights: (range: WorkoutInsightRange) => [...workoutSessionQueryKeys.all, "insights", range] as const,
  historyPaginated: (page: number, size: number) => [...workoutSessionQueryKeys.all, "history", "paginated", page, size] as const,
  details: () => [...workoutSessionQueryKeys.all, "detail"] as const,
  detail: (routineLogId: string) => [...workoutSessionQueryKeys.details(), routineLogId] as const,
};
