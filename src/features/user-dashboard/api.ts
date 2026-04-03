import apiClient from "@/shared/api/client";
import type {
  DashboardMemberStatsResponse,
  DashboardMonthlyActivityRequest,
  DashboardMonthlyActivityResponse,
  DashboardSummaryResponse,
  DashboardVisitStatsRequest,
} from "@/features/user-dashboard/model";

function buildDashboardParams(request?: Record<string, string | number | undefined>) {
  if (!request) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== undefined)
  );
}

export async function getDashboardSummaryApi(): Promise<DashboardSummaryResponse> {
  const response = await apiClient.get<DashboardSummaryResponse>("/users/me/dashboard/summary");
  return response.data;
}

export async function getDashboardMonthlyActivityApi(
  request: DashboardMonthlyActivityRequest
): Promise<DashboardMonthlyActivityResponse> {
  const response = await apiClient.get<DashboardMonthlyActivityResponse>(
    "/users/me/dashboard/activity/monthly",
    {
      params: buildDashboardParams({
        year: request.year,
        month: request.month,
      }),
    }
  );
  return response.data;
}

export async function getDashboardVisitStatsApi(
  request: DashboardVisitStatsRequest
): Promise<DashboardMemberStatsResponse> {
  const response = await apiClient.get<DashboardMemberStatsResponse>("/users/me/dashboard/visits", {
    params: buildDashboardParams({
      rangeType: request.rangeType,
      year: request.year,
      month: request.month,
      weekStart: request.weekStart,
    }),
  });
  return response.data;
}

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardQueryKeys.all, "summary"] as const,
  monthlyActivity: (year: number, month: number) =>
    [...dashboardQueryKeys.all, "monthly-activity", year, month] as const,
  visits: (request: DashboardVisitStatsRequest) =>
    [
      ...dashboardQueryKeys.all,
      "visits",
      request.rangeType,
      request.year ?? null,
      request.month ?? null,
      request.weekStart ?? null,
    ] as const,
};
