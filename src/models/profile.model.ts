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
export type StoredPaymentMethod = "ESEWA" | "KHALTI";

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

export interface BillingProfileResponse {
  billingProfileId: number | null;
  accountId: number;
  userId: number;
  fullName: string | null;
  billingEmail: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  preferredPaymentMethod: StoredPaymentMethod | null;
}

export interface UpdateBillingProfileRequest {
  fullName?: string;
  billingEmail?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  preferredPaymentMethod?: StoredPaymentMethod;
}

export interface GymProfileSetupStatusResponse {
  profileCompleted: boolean;
  currentOnboardingStep: number;
  hasGymProfile: boolean;
  documentCount: number;
}

export interface UpdateGymOnboardingRequest {
  step: number;
  gymName?: string;
  gymType?: GymType;
  establishedAt?: number;
  registrationNo?: string;
  maxCapacity?: number;
  addressLine?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phoneNo?: string;
  email?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  openingHours?: string;
}

export interface GymProfileResponse {
  accountId: number;
  gymId: number;
  email: string;
  gymName: string | null;
  gymType: GymType | null;
  establishedAt: number | null;
  registrationNo: string | null;
  maxCapacity: number | null;
  onboardingStep: number;
  profileCompleted: boolean;
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
  websiteUrl: string | null;
  openingHours: string | null;
  documentCount: number;
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

export interface UserProfileResponse {
  accountId: number;
  userId: number;
  email: string;
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
  hasSubscription: boolean;
  hasActiveSubscription: boolean;
}
