import apiClient from "@/shared/api/client";
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
} from "@/features/workout-sessions/workoutSessionTypes";

export async function getTodayWorkoutSessionApi(): Promise<TodayWorkoutSessionResponse> {
  const response = await apiClient.get<TodayWorkoutSessionResponse>("/users/me/workout-sessions/today");
  return response.data;
}

export async function getWorkoutSessionHistoryApi(): Promise<WorkoutSessionSummaryResponse[]> {
  const response = await apiClient.get<WorkoutSessionSummaryResponse[]>("/users/me/workout-sessions/history");
  return response.data;
}

export async function getWorkoutSessionApi(routineLogId: string): Promise<WorkoutSessionResponse> {
  const response = await apiClient.get<WorkoutSessionResponse>(`/users/me/workout-sessions/${routineLogId}`);
  return response.data;
}

export async function startWorkoutSessionApi(
  request: StartWorkoutSessionRequest
): Promise<WorkoutSessionResponse> {
  const response = await apiClient.post<WorkoutSessionResponse>("/users/me/workout-sessions/start", request);
  return response.data;
}

export async function updateWorkoutSetApi(
  routineLogId: string,
  routineLogExerciseId: string,
  routineLogSetId: string,
  request: UpdateWorkoutSetRequest
): Promise<WorkoutSessionSetResponse> {
  const response = await apiClient.patch<WorkoutSessionSetResponse>(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}/sets/${routineLogSetId}`,
    request
  );
  return response.data;
}

export async function completeWorkoutSessionApi(
  routineLogId: string,
  request: CompleteWorkoutSessionRequest
): Promise<WorkoutSessionResponse> {
  const response = await apiClient.post<WorkoutSessionResponse>(
    `/users/me/workout-sessions/${routineLogId}/complete`,
    request
  );
  return response.data;
}

export async function skipWorkoutSessionApi(
  routineLogId: string,
  request: SkipWorkoutSessionRequest
): Promise<WorkoutSessionResponse> {
  const response = await apiClient.post<WorkoutSessionResponse>(
    `/users/me/workout-sessions/${routineLogId}/skip`,
    request
  );
  return response.data;
}

export async function addWorkoutExerciseApi(
  routineLogId: string,
  request: AddWorkoutExerciseRequest
): Promise<WorkoutSessionExerciseResponse> {
  const response = await apiClient.post<WorkoutSessionExerciseResponse>(
    `/users/me/workout-sessions/${routineLogId}/exercises`,
    request
  );
  return response.data;
}

export async function addWorkoutSetApi(
  routineLogId: string,
  routineLogExerciseId: string,
  request: AddWorkoutSetRequest
): Promise<WorkoutSessionSetResponse> {
  const response = await apiClient.post<WorkoutSessionSetResponse>(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}/sets`,
    request
  );
  return response.data;
}

export async function addExerciseToRoutineApi(
  routineLogId: string,
  routineLogExerciseId: string
): Promise<void> {
  await apiClient.post(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}/add-to-routine`
  );
}

export async function deleteWorkoutSetApi(
  routineLogId: string,
  routineLogExerciseId: string,
  routineLogSetId: string
): Promise<void> {
  await apiClient.delete(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}/sets/${routineLogSetId}`
  );
}

export async function deleteWorkoutExerciseApi(
  routineLogId: string,
  routineLogExerciseId: string
): Promise<void> {
  await apiClient.delete(
    `/users/me/workout-sessions/${routineLogId}/exercises/${routineLogExerciseId}`
  );
}

export async function syncSessionToRoutineApi(
  routineLogId: string
): Promise<WorkoutSessionResponse> {
  const response = await apiClient.post<WorkoutSessionResponse>(
    `/users/me/workout-sessions/${routineLogId}/sync-to-routine`
  );
  return response.data;
}

export async function reorderWorkoutExercisesApi(
  routineLogId: string,
  exerciseIds: string[]
): Promise<WorkoutSessionResponse> {
  const response = await apiClient.patch<WorkoutSessionResponse>(
    `/users/me/workout-sessions/${routineLogId}/exercises/reorder`,
    { exerciseIds }
  );
  return response.data;
}

export const workoutSessionQueryKeys = {
  all: ["workout-sessions"] as const,
  today: () => [...workoutSessionQueryKeys.all, "today"] as const,
  history: () => [...workoutSessionQueryKeys.all, "history"] as const,
  details: () => [...workoutSessionQueryKeys.all, "detail"] as const,
  detail: (routineLogId: string) => [...workoutSessionQueryKeys.details(), routineLogId] as const,
};

