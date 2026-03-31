import apiClient from "@/shared/api/client";
import type { PlanResponse } from "@/features/plans/model";

/** GET /api/plans */
export async function getPlansApi(): Promise<PlanResponse[]> {
  const response = await apiClient.get<PlanResponse[]>("/plans");
  return response.data;
}
