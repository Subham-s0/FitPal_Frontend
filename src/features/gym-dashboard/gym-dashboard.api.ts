import { getApiData } from "@/shared/api/client";
import type {
  GymDashboardCheckInTrendRange,
  GymDashboardCountTrendResponse,
  GymDashboardOverviewParams,
  GymDashboardOverviewResponse,
  GymDashboardRevenueTrendRange,
  GymDashboardRevenueTrendResponse,
} from "@/features/gym-dashboard/gym-dashboard.model";

export async function getGymDashboardOverviewApi(
  params: GymDashboardOverviewParams = {}
): Promise<GymDashboardOverviewResponse> {
  return getApiData<GymDashboardOverviewResponse>("/gyms/me/dashboard/overview", {
    params,
  });
}

export async function getGymDashboardCheckInTrendApi(
  range: GymDashboardCheckInTrendRange
): Promise<GymDashboardCountTrendResponse> {
  return getApiData<GymDashboardCountTrendResponse>("/gyms/me/dashboard/charts/check-in-trend", {
    params: { range },
  });
}

export async function getGymDashboardRevenueTrendApi(
  range: GymDashboardRevenueTrendRange
): Promise<GymDashboardRevenueTrendResponse> {
  return getApiData<GymDashboardRevenueTrendResponse>("/gyms/me/dashboard/charts/revenue-trend", {
    params: { range },
  });
}
