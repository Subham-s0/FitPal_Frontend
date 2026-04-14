import apiClient from "@/shared/api/client";
import type {
  AiRoutineBootstrapResponse,
  AiRoutinePreviewResponse,
  AiRoutineSuggestionsResponse,
  GenerateRoutinePreviewRequest,
  GenerateRoutineSuggestionsRequest,
} from "@/features/routines/aiRoutineTypes";

export async function getAiRoutineBootstrapApi(): Promise<AiRoutineBootstrapResponse> {
  const response = await apiClient.get<AiRoutineBootstrapResponse>("/ai/routines/bootstrap");
  return response.data;
}

export async function prepareAiRoutineSuggestionsApi(
  request: GenerateRoutineSuggestionsRequest
): Promise<AiRoutineSuggestionsResponse> {
  const response = await apiClient.post<AiRoutineSuggestionsResponse>(
    "/ai/routines/suggestions",
    request,
    { timeout: 0 }
  );
  return response.data;
}

export async function generateAiRoutinePreviewApi(
  request: GenerateRoutinePreviewRequest
): Promise<AiRoutinePreviewResponse> {
  const response = await apiClient.post<AiRoutinePreviewResponse>(
    "/ai/routines/preview",
    request,
    { timeout: 0 }
  );
  return response.data;
}

export const aiRoutineQueryKeys = {
  all: ["ai-routines"] as const,
  bootstrap: () => [...aiRoutineQueryKeys.all, "bootstrap"] as const,
};
