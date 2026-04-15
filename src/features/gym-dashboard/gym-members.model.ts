import type { PageResponse } from "@/shared/api/model";

export type GymMembersWindow = "WEEK" | "MONTH";
export type GymVisitorsRange = "WEEK" | "MONTH" | "ALL_TIME";

export interface GymMemberSummary {
  accountId: number | null;
  memberName: string | null;
  profileImageUrl: string | null;
  visitCount: number;
}

export interface GymMembersMetricsResponse {
  uniqueCustomers: number;
  activeCustomers: number;
  repeatCustomers: number;
  repeatRatePct: number;
  totalVisitDays: number;
  mostCheckedInMember: GymMemberSummary | null;
}

export interface GymTopVisitorResponse {
  accountId: number | null;
  memberName: string | null;
  profileImageUrl: string | null;
  visitCount: number;
  lastVisitDate: string | null;
}

export interface GymRecentSigninResponse {
  accountId: number | null;
  memberName: string | null;
  profileImageUrl: string | null;
  checkedInAt: string | null;
}

export interface GymSavedMembersSummaryResponse {
  totalSavedMembers: number;
}

export interface GymSavedMemberResponse {
  accountId: number | null;
  memberName: string | null;
  profileImageUrl: string | null;
  savedAt: string | null;
}

export interface GymSavedMembersSearchParams {
  memberNamePrefix?: string;
  sortBy?: "savedAt" | "memberName";
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export type GymSavedMembersPage = PageResponse<GymSavedMemberResponse>;
