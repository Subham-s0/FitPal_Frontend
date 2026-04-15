import { deleteApiData, getApiData, postApiData } from "@/shared/api/client";
import type { PageResponse } from "@/shared/api/model";
import type {
  ExerciseEquipmentResponse,
  ExerciseHistorySource,
  ExerciseLibraryResponse,
  ExerciseLibrarySearchRequest,
  ExerciseLibrarySummaryResponse,
  ExerciseTrendRange,
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
  return getApiData<ExerciseLibrarySummaryResponse[]>(
    "/exercise-library",
    {
      params: buildExerciseLibraryParams(request),
    }
  );
}

export async function getExerciseLibraryEquipmentApi(): Promise<ExerciseEquipmentResponse[]> {
  return getApiData<ExerciseEquipmentResponse[]>(
    "/exercise-library/equipment"
  );
}

export async function getExerciseLibraryMusclesApi(): Promise<MuscleResponse[]> {
  return getApiData<MuscleResponse[]>(
    "/exercise-library/muscles"
  );
}

export async function getExerciseByIdApi(exerciseId: number): Promise<ExerciseLibraryResponse> {
  return getApiData<ExerciseLibraryResponse>(
    `/exercise-library/${exerciseId}`
  );
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

  return postApiData<CustomExerciseResponse>(
    "/users/me/custom-exercises",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
}

export async function getMyCustomExercisesApi(): Promise<CustomExerciseResponse[]> {
  return getApiData<CustomExerciseResponse[]>(
    "/users/me/custom-exercises"
  );
}

export async function getMyCustomExerciseByIdApi(
  customExerciseId: number
): Promise<CustomExerciseResponse> {
  return getApiData<CustomExerciseResponse>(
    `/users/me/custom-exercises/${customExerciseId}`
  );
}

export async function deleteCustomExerciseApi(customExerciseId: number): Promise<void> {
  await deleteApiData(`/users/me/custom-exercises/${customExerciseId}`);
}

export async function getMyExerciseHistoryApi(
  request: UserExerciseHistorySearchRequest
): Promise<PageResponse<UserExerciseHistoryItemResponse>> {
  return getApiData<PageResponse<UserExerciseHistoryItemResponse>>(
    "/users/me/exercises/history",
    {
      params: buildExerciseHistoryParams(request),
    }
  );
}

export async function getMyExerciseStatsApi(
  exerciseSource: ExerciseHistorySource,
  sourceExerciseId: number,
  trendRange: ExerciseTrendRange
): Promise<UserExerciseStatsResponse> {
  return getApiData<UserExerciseStatsResponse>(
    "/users/me/exercises/history/summary",
    {
      params: {
        exerciseSource,
        sourceExerciseId,
        trendRange,
      },
    }
  );
}
