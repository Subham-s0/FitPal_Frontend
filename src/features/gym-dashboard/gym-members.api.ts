import { getApiData } from "@/shared/api/client";
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
  return getApiData<GymMembersMetricsResponse>("/gyms/me/members/metrics", {
    params: { window },
  });
}

export async function getGymTopVisitorsApi(
  range: GymVisitorsRange,
  limit = 5
): Promise<GymTopVisitorResponse[]> {
  return getApiData<GymTopVisitorResponse[]>("/gyms/me/members/top-visitors", {
    params: { range, limit },
  });
}

export async function getGymRecentSigninsApi(limit = 5): Promise<GymRecentSigninResponse[]> {
  return getApiData<GymRecentSigninResponse[]>("/gyms/me/members/recent-signins", {
    params: { limit },
  });
}

export async function getGymSavedMembersSummaryApi(): Promise<GymSavedMembersSummaryResponse> {
  return getApiData<GymSavedMembersSummaryResponse>("/gyms/me/members/saved/summary");
}

export async function getGymSavedMembersApi(
  params?: GymSavedMembersSearchParams
): Promise<GymSavedMembersPage> {
  return getApiData<GymSavedMembersPage>("/gyms/me/members/saved", {
    params,
  });
}
