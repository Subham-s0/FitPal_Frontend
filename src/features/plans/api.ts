import { getApiData } from "@/shared/api/client";
import type { PlanResponse } from "@/features/plans/model";

/** GET /api/plans */
export async function getPlansApi(): Promise<PlanResponse[]> {
  return getApiData<PlanResponse[]>("/plans");
}
