import apiClient from "@/shared/api/client";
import type {
  ApiHealthRange,
  DashboardApiHealthResponse,
  DashboardMemberActivityResponse,
  DashboardMembersResponse,
  DashboardPeakActivityResponse,
  DashboardRecentPayoutResponse,
  DashboardRecentSignupResponse,
  DashboardRevenueResponse,
  DashboardRevenueTrendResponse,
  DashboardSnapshotResponse,
  DashboardTopGymResponse,
  PeakActivityRange,
  RevenueTrendRange,
  TopGymsRange,
} from "@/features/admin/admin-dashboard.model";

export async function getDashboardSnapshotApi(): Promise<DashboardSnapshotResponse> {
  const response = await apiClient.get<DashboardSnapshotResponse>("/admin/dashboard/snapshot");
  return response.data;
}

export async function getDashboardRevenueApi(): Promise<DashboardRevenueResponse> {
  const response = await apiClient.get<DashboardRevenueResponse>("/admin/dashboard/revenue");
  return response.data;
}

export async function getDashboardRevenueTrendApi(range: RevenueTrendRange): Promise<DashboardRevenueTrendResponse> {
  const response = await apiClient.get<DashboardRevenueTrendResponse>("/admin/dashboard/revenue-trend", {
    params: { range },
  });
  return response.data;
}

export async function getDashboardPeakActivityApi(range: PeakActivityRange): Promise<DashboardPeakActivityResponse> {
  const response = await apiClient.get<DashboardPeakActivityResponse>("/admin/dashboard/peak-activity", {
    params: { range },
  });
  return response.data;
}

export async function getDashboardMembersApi(): Promise<DashboardMembersResponse> {
  const response = await apiClient.get<DashboardMembersResponse>("/admin/dashboard/members");
  return response.data;
}

export async function getDashboardRecentSignupsApi(): Promise<DashboardRecentSignupResponse[]> {
  const response = await apiClient.get<DashboardRecentSignupResponse[]>("/admin/dashboard/recent-signups");
  return response.data;
}

export async function getDashboardMemberActivityApi(): Promise<DashboardMemberActivityResponse> {
  const response = await apiClient.get<DashboardMemberActivityResponse>("/admin/dashboard/member-activity");
  return response.data;
}

export async function getDashboardTopGymsApi(range: TopGymsRange): Promise<DashboardTopGymResponse[]> {
  const response = await apiClient.get<DashboardTopGymResponse[]>("/admin/dashboard/top-gyms", {
    params: { range },
  });
  return response.data;
}

export async function getDashboardRecentPayoutsApi(): Promise<DashboardRecentPayoutResponse[]> {
  const response = await apiClient.get<DashboardRecentPayoutResponse[]>("/admin/dashboard/recent-payouts");
  return response.data;
}

export async function getDashboardApiHealthApi(range: ApiHealthRange): Promise<DashboardApiHealthResponse> {
  const response = await apiClient.get<DashboardApiHealthResponse>("/admin/dashboard/api-health", {
    params: { range },
  });
  return response.data;
}
