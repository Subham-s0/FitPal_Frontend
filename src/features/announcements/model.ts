export type AnnouncementSourceType = "ADMIN" | "GYM";
export type AnnouncementAudienceScope = "ALL_USERS" | "ALL_GYMS" | "SPECIFIC_ACCOUNTS" | "FOLLOWERS_OF_GYM";
export type AnnouncementVisibilityScope = "IN_APP" | "PUBLIC" | "BOTH";
export type AnnouncementReviewStatus = "NOT_REQUIRED" | "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
export type AnnouncementPublishStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "CANCELLED" | "EXPIRED";

export interface AnnouncementPageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface AnnouncementTargetAccountResponse {
  accountId: number;
  role: "USER" | "GYM" | "SUPERADMIN";
  displayName: string;
  secondaryLine: string;
}

export interface AnnouncementSummaryResponse {
  announcementId: number;
  sourceType: AnnouncementSourceType;
  visibilityScope: AnnouncementVisibilityScope;
  creatorAccountId: number | null;
  creatorName: string | null;
  creatorGymId: number | null;
  creatorGymName: string | null;
  title: string;
  excerpt: string;
  audienceScope: AnnouncementAudienceScope;
  reviewStatus: AnnouncementReviewStatus;
  publishStatus: AnnouncementPublishStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  targetAccountCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementDetailResponse {
  announcementId: number;
  sourceType: AnnouncementSourceType;
  visibilityScope: AnnouncementVisibilityScope;
  creatorAccountId: number | null;
  creatorName: string | null;
  creatorGymId: number | null;
  creatorGymName: string | null;
  title: string;
  content: string;
  audienceScope: AnnouncementAudienceScope;
  targetGymId: number | null;
  reviewStatus: AnnouncementReviewStatus;
  publishStatus: AnnouncementPublishStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  targetAccounts: AnnouncementTargetAccountResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminAnnouncementStatsResponse {
  totalAnnouncements: number;
  adminAnnouncementCount: number;
  gymAnnouncementCount: number;
  scheduledCount: number;
  publishedCount: number;
  pendingGymReviewCount: number;
}

export interface GymAnnouncementStatsResponse {
  totalAnnouncements: number;
  draftCount: number;
  pendingApprovalCount: number;
  approvedCount: number;
  scheduledCount: number;
  publishedCount: number;
  rejectedCount: number;
}

export interface AdminAnnouncementUpsertRequest {
  title: string;
  content: string;
  audienceScope: AnnouncementAudienceScope;
  targetAccountIds?: number[];
  scheduledAt?: string | null;
  expiresAt?: string | null;
  visibilityScope?: AnnouncementVisibilityScope;
}

export interface GymAnnouncementUpsertRequest {
  title: string;
  content: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
}

export interface AdminAnnouncementListParams {
  query?: string;
  sourceType?: AnnouncementSourceType;
  reviewStatus?: AnnouncementReviewStatus;
  publishStatus?: AnnouncementPublishStatus;
  sortBy?: "createdAt" | "updatedAt" | "scheduledAt" | "publishedAt" | "title";
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export interface GymAnnouncementListParams {
  query?: string;
  reviewStatus?: AnnouncementReviewStatus;
  publishStatus?: AnnouncementPublishStatus;
  sortBy?: "createdAt" | "updatedAt" | "scheduledAt" | "publishedAt" | "title";
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}
