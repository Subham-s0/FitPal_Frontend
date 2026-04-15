import { getApiData } from "@/shared/api/client";
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
  return getApiData<DashboardSnapshotResponse>("/admin/dashboard/snapshot");
}

export async function getDashboardRevenueApi(): Promise<DashboardRevenueResponse> {
  return getApiData<DashboardRevenueResponse>("/admin/dashboard/revenue");
}

export async function getDashboardRevenueTrendApi(range: RevenueTrendRange): Promise<DashboardRevenueTrendResponse> {
  return getApiData<DashboardRevenueTrendResponse>("/admin/dashboard/revenue-trend", {
    params: { range },
  });
}

export async function getDashboardPeakActivityApi(range: PeakActivityRange): Promise<DashboardPeakActivityResponse> {
  return getApiData<DashboardPeakActivityResponse>("/admin/dashboard/peak-activity", {
    params: { range },
  });
}

export async function getDashboardMembersApi(): Promise<DashboardMembersResponse> {
  return getApiData<DashboardMembersResponse>("/admin/dashboard/members");
}

export async function getDashboardRecentSignupsApi(): Promise<DashboardRecentSignupResponse[]> {
  return getApiData<DashboardRecentSignupResponse[]>("/admin/dashboard/recent-signups");
}

export async function getDashboardMemberActivityApi(): Promise<DashboardMemberActivityResponse> {
  return getApiData<DashboardMemberActivityResponse>("/admin/dashboard/member-activity");
}

export async function getDashboardTopGymsApi(range: TopGymsRange): Promise<DashboardTopGymResponse[]> {
  return getApiData<DashboardTopGymResponse[]>("/admin/dashboard/top-gyms", {
    params: { range },
  });
}

export async function getDashboardRecentPayoutsApi(): Promise<DashboardRecentPayoutResponse[]> {
  return getApiData<DashboardRecentPayoutResponse[]>("/admin/dashboard/recent-payouts");
}

export async function getDashboardApiHealthApi(range: ApiHealthRange): Promise<DashboardApiHealthResponse> {
  return getApiData<DashboardApiHealthResponse>("/admin/dashboard/api-health", {
    params: { range },
  });
}
