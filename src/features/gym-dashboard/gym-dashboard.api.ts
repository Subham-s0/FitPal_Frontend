import apiClient from "@/shared/api/client";
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
  const response = await apiClient.get<GymDashboardOverviewResponse>("/gyms/me/dashboard/overview", {
    params,
  });
  return response.data;
}

export async function getGymDashboardCheckInTrendApi(
  range: GymDashboardCheckInTrendRange
): Promise<GymDashboardCountTrendResponse> {
  const response = await apiClient.get<GymDashboardCountTrendResponse>("/gyms/me/dashboard/charts/check-in-trend", {
    params: { range },
  });
  return response.data;
}

export async function getGymDashboardRevenueTrendApi(
  range: GymDashboardRevenueTrendRange
): Promise<GymDashboardRevenueTrendResponse> {
  const response = await apiClient.get<GymDashboardRevenueTrendResponse>("/gyms/me/dashboard/charts/revenue-trend", {
    params: { range },
  });
  return response.data;
}
