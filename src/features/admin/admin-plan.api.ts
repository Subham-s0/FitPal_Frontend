import { deleteApiData, getApiData, patchApiData, postApiData } from "@/shared/api/client";
import type { PlanResponse } from "@/features/plans/model";
import type { ApplicationRuleSummaryResponse, PlanUpsertPayload } from "@/features/admin/admin-plan.model";

/** GET /api/admin/plans */
export async function getAdminPlansApi(): Promise<PlanResponse[]> {
  return getApiData<PlanResponse[]>("/admin/plans");
}

/** GET /api/admin/application-rules/summary */
export async function getAdminApplicationRulesSummaryApi(): Promise<ApplicationRuleSummaryResponse> {
  return getApiData<ApplicationRuleSummaryResponse>("/admin/application-rules/summary");
}

/** POST /api/admin/plans */
export async function createPlanApi(payload: PlanUpsertPayload): Promise<PlanResponse> {
  return postApiData<PlanResponse>("/admin/plans", payload);
}

/** PATCH /api/admin/plans/:planId */
export async function updatePlanApi(planId: number, payload: PlanUpsertPayload): Promise<PlanResponse> {
  return patchApiData<PlanResponse>(`/admin/plans/${planId}`, payload);
}

/** DELETE /api/admin/plans/:planId */
export async function deletePlanApi(planId: number): Promise<void> {
  await deleteApiData(`/admin/plans/${planId}`);
}
