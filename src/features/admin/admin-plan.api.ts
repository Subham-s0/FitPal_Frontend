import apiClient from "@/shared/api/client";
import type { PlanResponse } from "@/features/plans/model";
import type { ApplicationRuleSummaryResponse, PlanUpsertPayload } from "@/features/admin/admin-plan.model";

/** GET /api/admin/plans */
export async function getAdminPlansApi(): Promise<PlanResponse[]> {
  const response = await apiClient.get<PlanResponse[]>("/admin/plans");
  return response.data;
}

/** GET /api/admin/application-rules/summary */
export async function getAdminApplicationRulesSummaryApi(): Promise<ApplicationRuleSummaryResponse> {
  const response = await apiClient.get<ApplicationRuleSummaryResponse>("/admin/application-rules/summary");
  return response.data;
}

/** POST /api/admin/plans */
export async function createPlanApi(payload: PlanUpsertPayload): Promise<PlanResponse> {
  const response = await apiClient.post<PlanResponse>("/admin/plans", payload);
  return response.data;
}

/** PATCH /api/admin/plans/:planId */
export async function updatePlanApi(planId: number, payload: PlanUpsertPayload): Promise<PlanResponse> {
  const response = await apiClient.patch<PlanResponse>(`/admin/plans/${planId}`, payload);
  return response.data;
}

/** DELETE /api/admin/plans/:planId */
export async function deletePlanApi(planId: number): Promise<void> {
  await apiClient.delete(`/admin/plans/${planId}`);
}
