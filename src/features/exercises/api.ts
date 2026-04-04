import apiClient from "@/shared/api/client";
import type {
  ExerciseEquipmentResponse,
  ExerciseHistorySource,
  ExerciseLibraryResponse,
  ExerciseLibrarySearchRequest,
  ExerciseLibrarySummaryResponse,
  ExerciseTrendRange,
  PageResponse,
  MuscleResponse,
  CustomExerciseRequest,
  CustomExerciseResponse,
  UserExerciseHistoryItemResponse,
  UserExerciseHistorySearchRequest,
  UserExerciseStatsResponse,
} from "@/features/exercises/model";

function buildExerciseLibraryParams(request?: ExerciseLibrarySearchRequest) {
  if (!request) {
    return undefined;
  }

  return {
    query: request.query?.trim() || undefined,
    equipmentIds: request.equipmentIds?.length ? request.equipmentIds.join(",") : undefined,
    muscleIds: request.muscleIds?.length ? request.muscleIds.join(",") : undefined,
  };
}

function buildExerciseHistoryParams(request: UserExerciseHistorySearchRequest) {
  return {
    exerciseSource: request.exerciseSource,
    sourceExerciseId: request.sourceExerciseId,
    page: request.page,
    size: request.size,
  };
}

export async function getExerciseLibraryApi(
  request?: ExerciseLibrarySearchRequest
): Promise<ExerciseLibrarySummaryResponse[]> {
  const response = await apiClient.get<ExerciseLibrarySummaryResponse[]>(
    "/exercise-library",
    {
      params: buildExerciseLibraryParams(request),
    }
  );
  return response.data;
}

export async function getExerciseLibraryEquipmentApi(): Promise<ExerciseEquipmentResponse[]> {
  const response = await apiClient.get<ExerciseEquipmentResponse[]>(
    "/exercise-library/equipment"
  );
  return response.data;
}

export async function getExerciseLibraryMusclesApi(): Promise<MuscleResponse[]> {
  const response = await apiClient.get<MuscleResponse[]>(
    "/exercise-library/muscles"
  );
  return response.data;
}

export async function getExerciseByIdApi(exerciseId: number): Promise<ExerciseLibraryResponse> {
  const response = await apiClient.get<ExerciseLibraryResponse>(
    `/exercise-library/${exerciseId}`
  );
  return response.data;
}

export async function createCustomExerciseApi(request: CustomExerciseRequest): Promise<CustomExerciseResponse> {
  const formData = new FormData();
  formData.append("name", request.name);
  formData.append("exerciseType", request.exerciseType);
  formData.append("primaryMuscleId", request.primaryMuscleId.toString());
  
  if (request.equipmentId) {
    formData.append("equipmentId", request.equipmentId.toString());
  }
  
  if (request.secondaryMuscleIds && request.secondaryMuscleIds.length > 0) {
    request.secondaryMuscleIds.forEach(id => {
      formData.append("secondaryMuscleIds", id.toString());
    });
  }
  
  if (request.coverImage) {
    formData.append("coverImage", request.coverImage);
  }

  const response = await apiClient.post<CustomExerciseResponse>(
    "/users/me/custom-exercises",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

export async function getMyCustomExercisesApi(): Promise<CustomExerciseResponse[]> {
  const response = await apiClient.get<CustomExerciseResponse[]>(
    "/users/me/custom-exercises"
  );
  return response.data;
}

export async function getMyCustomExerciseByIdApi(
  customExerciseId: number
): Promise<CustomExerciseResponse> {
  const response = await apiClient.get<CustomExerciseResponse>(
    `/users/me/custom-exercises/${customExerciseId}`
  );
  return response.data;
}

export async function deleteCustomExerciseApi(customExerciseId: number): Promise<void> {
  await apiClient.delete(`/users/me/custom-exercises/${customExerciseId}`);
}

export async function getMyExerciseHistoryApi(
  request: UserExerciseHistorySearchRequest
): Promise<PageResponse<UserExerciseHistoryItemResponse>> {
  const response = await apiClient.get<PageResponse<UserExerciseHistoryItemResponse>>(
    "/users/me/exercises/history",
    {
      params: buildExerciseHistoryParams(request),
    }
  );
  return response.data;
}

export async function getMyExerciseStatsApi(
  exerciseSource: ExerciseHistorySource,
  sourceExerciseId: number,
  trendRange: ExerciseTrendRange
): Promise<UserExerciseStatsResponse> {
  const response = await apiClient.get<UserExerciseStatsResponse>(
    "/users/me/exercises/history/summary",
    {
      params: {
        exerciseSource,
        sourceExerciseId,
        trendRange,
      },
    }
  );
  return response.data;
}
