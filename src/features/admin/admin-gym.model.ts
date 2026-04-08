import type {
  AccessTier,
  CheckInAccessMode,
  GymApprovalStatus,
  GymDocumentResponse,
  GymDocumentStatus,
  GymPhotoResponse,
  GymProfileResponse,
  GymType,
} from "@/features/profile/model";

export type GymPayoutProvider = "ESEWA" | "KHALTI";

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type AdminGymSortBy =
  | "gymId"
  | "gymName"
  | "city"
  | "country"
  | "approvalStatus"
  | "onboardingStep"
  | "createdAt";

export type SortDirection = "ASC" | "DESC";

export interface AdminGymSummaryResponse {
  gymId: number;
  accountId: number;
  registeredEmail: string;
  contactEmail: string | null;
  gymName: string | null;
  gymType: GymType | null;
  approvalStatus: GymApprovalStatus;
  minimumAccessTier: AccessTier;
  checkInEnabled: boolean;
  allowedCheckInRadiusMeters: number | null;
  onboardingStep: number | null;
  registeredEmailVerified: boolean;
  submittedForReview: boolean;
  approved: boolean;
  dashboardAccessible: boolean;
  logoUrl: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  documentCount: number;
  maxDocuments: number;
  requiredDocumentsUploaded: boolean;
  readyForReviewSubmission: boolean;
  esewaWalletId: string | null;
  esewaAccountName: string | null;
  esewaWalletVerified: boolean;
  khaltiWalletId: string | null;
  khaltiAccountName: string | null;
  khaltiWalletVerified: boolean;
  registeredAt: string;
}

export interface GymPayoutAccountResponse {
  payoutAccountId: number;
  provider: GymPayoutProvider;
  walletIdentifier: string | null;
  accountName: string | null;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGymReviewResponse {
  profile: GymProfileResponse;
  documents: GymDocumentResponse[];
  payoutAccounts: GymPayoutAccountResponse[];
  photos: GymPhotoResponse[];
}

export interface AdminGymListParams {
  approvalStatus?: GymApprovalStatus;
  city?: string;
  country?: string;
  query?: string;
  sortBy?: AdminGymSortBy;
  sortDirection?: SortDirection;
  page?: number;
  size?: number;
}

export interface AdminGymLocationReviewRequest {
  addressLine?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AdminGymAccessReviewRequest {
  minimumAccessTier?: AccessTier;
  checkInEnabled?: boolean;
  allowedCheckInRadiusMeters?: number | null;
}

export interface AdminGymDocumentReviewRequest {
  documentId: number;
  status: GymDocumentStatus;
}

export interface AdminGymDocumentsReviewRequest {
  documentUpdates: AdminGymDocumentReviewRequest[];
}

export interface AdminGymPayoutReviewRequest {
  provider: GymPayoutProvider;
  verified: boolean;
}

export interface AdminGymPayoutReviewBatchRequest {
  payoutAccountUpdates: AdminGymPayoutReviewRequest[];
}

export interface AdminGymPhotoReviewRequest {
  photoId: number;
  caption?: string | null;
}

export interface AdminGymPhotosReviewRequest {
  photoUpdates: AdminGymPhotoReviewRequest[];
}

export interface UpdateGymApprovalRequest {
  approved: boolean;
}

export interface UpdateGymCheckInAccessModeRequest {
  checkInAccessMode: CheckInAccessMode;
}

export interface AdminGymStatusCounts {
  pendingReview: number;
  approved: number;
  rejected: number;
}
