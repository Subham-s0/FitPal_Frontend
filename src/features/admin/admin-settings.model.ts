export type DoorAccessMode = "AUTOMATIC" | "MANUAL";
export type CheckInAccessMode = "MANUAL" | "DOOR_ACK_REQUIRED";
export type DoorFailsafeMode = "LOCKED" | "UNLOCKED";

export interface ApplicationRuleSummaryResponse {
  currency: string;
  taxRate: number;
  serviceChargeRate: number;
  appCommissionRate: number;
  gymShareRate: number;
  timeZoneId: string;
  doorPollIntervalSeconds: number;
  doorUnlockDurationSeconds: number;
  doorCommandExpirySeconds: number;
  doorAckTimeoutSeconds: number;
  doorDeviceOnlineWindowSeconds: number;
  doorAccessMode: DoorAccessMode;
  checkInAccessMode: CheckInAccessMode;
  doorAutoLockEnabled: boolean;
  doorManualOverrideAllowed: boolean;
  doorFailsafeMode: DoorFailsafeMode;
  khaltiEnabled: boolean;
  esewaEnabled: boolean;
}

export interface ApplicationRuleUpdateRequest {
  currency?: string;
  taxRate?: number;
  serviceChargeRate?: number;
  appCommissionRate?: number;
  timeZoneId?: string;
  doorPollIntervalSeconds?: number;
  doorUnlockDurationSeconds?: number;
  doorCommandExpirySeconds?: number;
  doorAckTimeoutSeconds?: number;
  doorDeviceOnlineWindowSeconds?: number;
  doorAccessMode?: DoorAccessMode;
  checkInAccessMode?: CheckInAccessMode;
  doorAutoLockEnabled?: boolean;
  doorManualOverrideAllowed?: boolean;
  doorFailsafeMode?: DoorFailsafeMode;
  khaltiEnabled?: boolean;
  esewaEnabled?: boolean;
}

export interface CmsFeatureResponse {
  id: string;
  icon: string;
  title: string;
  description: string;
  highlight: boolean;
  active: boolean;
  order: number;
}

export interface CmsFeatureUpsertRequest {
  icon: string;
  title: string;
  description: string;
  highlight?: boolean;
  active?: boolean;
  order?: number;
}

export interface CmsTestimonialResponse {
  id: string;
  name: string;
  role: string | null;
  avatar: string | null;
  content: string;
  rating: number;
  approved: boolean;
  active: boolean;
  order: number;
}

export interface CmsTestimonialUpsertRequest {
  name: string;
  role?: string;
  avatar?: string;
  content?: string;
  rating?: number;
  approved?: boolean;
  active?: boolean;
  order?: number;
}

export interface CmsHowToStepResponse {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  icon: string;
  published: boolean;
  order: number;
}

export interface CmsHowToStepUpsertRequest {
  stepNumber?: string;
  title: string;
  description?: string;
  icon?: string;
  published?: boolean;
  order?: number;
}

export interface CmsFaqResponse {
  id: string;
  question: string;
  answer: string;
  category: string;
  published: boolean;
  order: number;
}

export interface CmsFaqUpsertRequest {
  question: string;
  answer?: string;
  category?: string;
  published?: boolean;
  order?: number;
}

export interface CmsStatResponse {
  id: string;
  label: string;
  value: string;
  icon: string;
  suffix?: string | null;
  active: boolean;
  order: number;
}

export interface CmsStatUpsertRequest {
  label: string;
  value: string;
  icon?: string;
  active?: boolean;
  order?: number;
}

export interface ExerciseEmbeddingIndexingResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface ExerciseEmbeddingStatusResponse {
  totalExercises: number;
  totalEmbeddings: number;
  missing: number;
  fullyIndexed: boolean;
}
