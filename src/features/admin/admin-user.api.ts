import apiClient from "@/shared/api/client";
import type { PageResponse } from "@/features/admin/admin-gym.model";
import type {
  AdminUserCountsResponse,
  AdminUserDetailResponse,
  AdminUserListParams,
  AdminUserSummaryResponse,
} from "@/features/admin/admin-user.model";

/** GET /api/admin/users/counts */
export async function getAdminUserCountsApi(): Promise<AdminUserCountsResponse> {
  const response = await apiClient.get<AdminUserCountsResponse>("/admin/users/counts");
  return response.data;
}

/** GET /api/admin/users */
export async function getAdminUsersApi(
  params: AdminUserListParams = {}
): Promise<PageResponse<AdminUserSummaryResponse>> {
  const response = await apiClient.get<PageResponse<AdminUserSummaryResponse>>("/admin/users", {
    params,
  });
  return response.data;
}

/** GET /api/admin/users/:accountId */
export async function getAdminUserDetailApi(accountId: number): Promise<AdminUserDetailResponse> {
  const response = await apiClient.get<AdminUserDetailResponse>(`/admin/users/${accountId}`);
  return response.data;
}

/** PUT /api/admin/users/:accountId/suspend — USER role only */
export async function putAdminUserSuspendApi(accountId: number): Promise<AdminUserDetailResponse> {
  const response = await apiClient.put<AdminUserDetailResponse>(`/admin/users/${accountId}/suspend`);
  return response.data;
}

/** PUT /api/admin/users/:accountId/unsuspend — USER role only */
export async function putAdminUserUnsuspendApi(accountId: number): Promise<AdminUserDetailResponse> {
  const response = await apiClient.put<AdminUserDetailResponse>(`/admin/users/${accountId}/unsuspend`);
  return response.data;
}
