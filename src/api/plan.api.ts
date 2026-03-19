import apiClient from "./client";
import type { PlanResponse } from "@/models/plan.model";

/** GET /api/plans */
export async function getPlansApi(): Promise<PlanResponse[]> {
  const response = await apiClient.get<PlanResponse[]>("/plans");
  return response.data;
}
