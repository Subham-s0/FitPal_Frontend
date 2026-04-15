import { getApiData, putApiData } from "@/shared/api/client";
import type { PageResponse } from "@/shared/api/model";
import type {
  AdminUserCountsResponse,
  AdminUserDetailResponse,
  AdminUserListParams,
  AdminUserSummaryResponse,
} from "@/features/admin/admin-user.model";

/** GET /api/admin/users/counts */
export async function getAdminUserCountsApi(): Promise<AdminUserCountsResponse> {
  return getApiData<AdminUserCountsResponse>("/admin/users/counts");
}

/** GET /api/admin/users */
export async function getAdminUsersApi(
  params: AdminUserListParams = {}
): Promise<PageResponse<AdminUserSummaryResponse>> {
  return getApiData<PageResponse<AdminUserSummaryResponse>>("/admin/users", {
    params,
  });
}

/** GET /api/admin/users/:accountId */
export async function getAdminUserDetailApi(accountId: number): Promise<AdminUserDetailResponse> {
  return getApiData<AdminUserDetailResponse>(`/admin/users/${accountId}`);
}

/** PUT /api/admin/users/:accountId/suspend — USER role only */
export async function putAdminUserSuspendApi(accountId: number): Promise<AdminUserDetailResponse> {
  return putApiData<AdminUserDetailResponse>(`/admin/users/${accountId}/suspend`);
}

/** PUT /api/admin/users/:accountId/unsuspend — USER role only */
export async function putAdminUserUnsuspendApi(accountId: number): Promise<AdminUserDetailResponse> {
  return putApiData<AdminUserDetailResponse>(`/admin/users/${accountId}/unsuspend`);
}
