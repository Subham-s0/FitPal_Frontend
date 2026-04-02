export type Gender = "MALE" | "FEMALE";
export type FitnessLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type PrimaryFitnessFocus =
  | "HYPERTROPHY"
  | "STRENGTH_POWER"
  | "ENDURANCE_CARDIO"
  | "FLEXIBILITY_MOBILITY"
  | "WEIGHT_LOSS";
export type GymType =
  | "Commercial"
  | "CrossFit"
  | "Yoga"
  | "Martial Arts"
  | "Pilates"
  | "Functional";
export type AccessTier = "BASIC" | "PRO" | "ELITE";
export type GymApprovalStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type GymDocumentType =
  | "REGISTRATION_CERTIFICATE"
  | "TAX_CERTIFICATE"
  | "OWNER_ID_PROOF"
  | "ADDRESS_PROOF"
  | "LICENSE"
  | "OTHER";

export type GymDocumentStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface ProfileSetupStatusResponse {
  profileCompleted: boolean;
  currentOnboardingStep: number;
  hasSubscription: boolean;
  hasActiveSubscription: boolean;
}

export interface DocumentUploadResponse {
  message: string;
  originalFileName: string;
  extension: string;
  fileCategory: "IMAGE" | "DOCUMENT";
  publicId: string;
  resourceType: string;
  format: string;
  url: string;
  secureUrl: string;
  bytes: number;
  folder: string;
}

export interface DeleteAssetRequest {
  publicId: string;
  resourceType?: string;
  fileUrl?: string;
}

export interface DeleteAssetResponse {
  message: string;
  publicId: string;
  resourceType: string | null;
}

export interface GymProfileSetupStatusResponse {
  profileCompleted: boolean;
  currentOnboardingStep: number;
  hasGymProfile: boolean;
  documentCount: number;
  maxDocuments: number;
  registeredEmailVerified: boolean;
  approvalStatus: GymApprovalStatus;
  submittedForReview: boolean;
  approved: boolean;
  dashboardAccessible: boolean;
  requiredDocumentsUploaded: boolean;
  readyForReviewSubmission: boolean;
  missingRequirements: string[];
}

export interface UpdateGymBasicsStepRequest {
  gymName?: string;
  gymType?: GymType;
  establishedAt?: number;
  registrationNo?: string;
  maxCapacity?: number;
}

export interface UpdateGymLocationStepRequest {
  addressLine?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phoneNo?: string;
  contactEmail?: string;
  description?: string;
  websiteUrl?: string;
  opensAt?: string;
  closesAt?: string;
}

export interface UpdateGymPayoutStepRequest {
  esewaEnabled: boolean;
  esewaWalletId?: string;
  esewaAccountName?: string;
  khaltiEnabled: boolean;
  khaltiWalletId?: string;
  khaltiAccountName?: string;
}

export interface UpsertGymDocumentRequest {
  documentType: GymDocumentType;
  publicId: string;
  resourceType: string;
  fileUrl: string;
}

export interface CreateGymPhotoRequest {
  publicId: string;
  resourceType: string;
  photoUrl: string;
  caption?: string;
  displayOrder?: number;
  cover?: boolean;
}

export interface UpdateGymPhotoRequest {
  caption?: string;
  displayOrder?: number;
  cover?: boolean;
}

export interface GymProfileResponse {
  accountId: number;
  gymId: number;
  registeredEmail: string;
  registeredEmailVerified: boolean;
  gymName: string | null;
  gymType: GymType | null;
  minimumAccessTier: AccessTier;
  checkInEnabled: boolean;
  allowedCheckInRadiusMeters: number | null;
  establishedAt: number | null;
  registrationNo: string | null;
  maxCapacity: number | null;
  onboardingStep: number;
  profileCompleted: boolean;
  approvalStatus: GymApprovalStatus;
  submittedForReview: boolean;
  approved: boolean;
  dashboardAccessible: boolean;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phoneNo: string | null;
  contactEmail: string | null;
  description: string | null;
  logoUrl: string | null;
  logoPublicId: string | null;
  logoResourceType: string | null;
  websiteUrl: string | null;
  opensAt: string | null;
  closesAt: string | null;
  esewaWalletId: string | null;
  esewaAccountName: string | null;
  esewaWalletVerified: boolean;
  khaltiWalletId: string | null;
  khaltiAccountName: string | null;
  khaltiWalletVerified: boolean;
  documentCount: number;
  maxDocuments: number;
  requiredDocumentsUploaded: boolean;
  readyForReviewSubmission: boolean;
}

export interface GymDocumentResponse {
  documentId: number;
  documentType: GymDocumentType;
  status: GymDocumentStatus;
  publicId: string;
  resourceType: string;
  fileUrl: string;
  createdAt: string;
}

export interface GymPhotoResponse {
  photoId: number;
  publicId: string;
  resourceType: string;
  photoUrl: string;
  caption: string | null;
  displayOrder: number | null;
  cover: boolean;
  createdAt: string;
}

export interface UpdateUserOnboardingRequest {
  step: number;
  userName?: string;
  firstName?: string;
  lastName?: string;
  phoneNo?: string;
  dob?: string;
  gender?: Gender;
  height?: number;
  weight?: number;
  fitnessLevel?: FitnessLevel;
  primaryFitnessFocus?: PrimaryFitnessFocus;
  profileImageUrl?: string;
  profileImagePublicId?: string;
  profileImageResourceType?: string;
}

export interface UpdateUserProfileDetailsRequest {
  userName: string;
  firstName: string | null;
  lastName: string | null;
  phoneNo: string | null;
  dob: string | null;
  gender: Gender | null;
  height: number | null;
  weight: number | null;
  fitnessLevel: FitnessLevel | null;
  primaryFitnessFocus: PrimaryFitnessFocus | null;
}

export interface ProfileImageUpdateRequest {
  profileImageUrl: string;
  profileImagePublicId: string;
  profileImageResourceType: string;
}

export interface ProfileImageUpdateResponse {
  profileImageUrl: string | null;
  profileImagePublicId: string | null;
  profileImageResourceType: string | null;
}

export interface ProfileInfoUpdateRequest {
  userName: string;
  firstName: string | null;
  lastName: string | null;
  phoneNo: string | null;
  dob: string | null;
  gender: Gender | null;
  height: number | null;
  weight: number | null;
}

export interface ProfileInfoUpdateResponse {
  userName: string;
  firstName: string | null;
  lastName: string | null;
  phoneNo: string | null;
  dob: string | null;
  gender: Gender | null;
  height: number | null;
  weight: number | null;
}

export interface ProfileGoalsUpdateRequest {
  fitnessLevel: FitnessLevel | null;
  primaryFitnessFocus: PrimaryFitnessFocus | null;
}

export interface ProfileGoalsUpdateResponse {
  fitnessLevel: FitnessLevel | null;
  primaryFitnessFocus: PrimaryFitnessFocus | null;
}

export interface ConfirmEmailVerificationRequest {
  otp: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfileResponse {
  accountId: number;
  userId: number;
  email: string;
  emailVerified: boolean;
  userName: string | null;
  firstName: string | null;
  lastName: string | null;
  onboardingStep: number;
  profileCompleted: boolean;
  phoneNo: string | null;
  dob: string | null;
  gender: Gender | null;
  height: number | null;
  weight: number | null;
  fitnessLevel: FitnessLevel | null;
  primaryFitnessFocus: PrimaryFitnessFocus | null;
  profileImageUrl: string | null;
  profileImagePublicId: string | null;
  profileImageResourceType: string | null;
  linkedAuthProviders: string[];
  hasSubscription: boolean;
  hasActiveSubscription: boolean;
}
