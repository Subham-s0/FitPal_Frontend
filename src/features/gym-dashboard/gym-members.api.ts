import apiClient from "@/shared/api/client";
import type {
  GymMembersMetricsResponse,
  GymMembersWindow,
  GymRecentSigninResponse,
  GymSavedMembersPage,
  GymSavedMembersSearchParams,
  GymSavedMembersSummaryResponse,
  GymTopVisitorResponse,
  GymVisitorsRange,
} from "@/features/gym-dashboard/gym-members.model";

export async function getGymMembersMetricsApi(window: GymMembersWindow): Promise<GymMembersMetricsResponse> {
  const response = await apiClient.get<GymMembersMetricsResponse>("/gyms/me/members/metrics", {
    params: { window },
  });
  return response.data;
}

export async function getGymTopVisitorsApi(
  range: GymVisitorsRange,
  limit = 5
): Promise<GymTopVisitorResponse[]> {
  const response = await apiClient.get<GymTopVisitorResponse[]>("/gyms/me/members/top-visitors", {
    params: { range, limit },
  });
  return response.data;
}

export async function getGymRecentSigninsApi(limit = 5): Promise<GymRecentSigninResponse[]> {
  const response = await apiClient.get<GymRecentSigninResponse[]>("/gyms/me/members/recent-signins", {
    params: { limit },
  });
  return response.data;
}

export async function getGymSavedMembersSummaryApi(): Promise<GymSavedMembersSummaryResponse> {
  const response = await apiClient.get<GymSavedMembersSummaryResponse>("/gyms/me/members/saved/summary");
  return response.data;
}

export async function getGymSavedMembersApi(
  params?: GymSavedMembersSearchParams
): Promise<GymSavedMembersPage> {
  const response = await apiClient.get<GymSavedMembersPage>("/gyms/me/members/saved", {
    params,
  });
  return response.data;
}
