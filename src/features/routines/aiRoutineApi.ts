import { getApiData, postApiData } from "@/shared/api/client";
import type {
  AiRoutineBootstrapResponse,
  AiRoutinePreviewResponse,
  AiRoutineSuggestionsResponse,
  GenerateRoutinePreviewRequest,
  GenerateRoutineSuggestionsRequest,
} from "@/features/routines/aiRoutineTypes";

export async function getAiRoutineBootstrapApi(): Promise<AiRoutineBootstrapResponse> {
  return getApiData<AiRoutineBootstrapResponse>("/ai/routines/bootstrap");
}

export async function prepareAiRoutineSuggestionsApi(
  request: GenerateRoutineSuggestionsRequest
): Promise<AiRoutineSuggestionsResponse> {
  return postApiData<AiRoutineSuggestionsResponse>(
    "/ai/routines/suggestions",
    request,
    { timeout: 0 }
  );
}

export async function generateAiRoutinePreviewApi(
  request: GenerateRoutinePreviewRequest
): Promise<AiRoutinePreviewResponse> {
  return postApiData<AiRoutinePreviewResponse>(
    "/ai/routines/preview",
    request,
    { timeout: 0 }
  );
}

export const aiRoutineQueryKeys = {
  all: ["ai-routines"] as const,
  bootstrap: () => [...aiRoutineQueryKeys.all, "bootstrap"] as const,
};
