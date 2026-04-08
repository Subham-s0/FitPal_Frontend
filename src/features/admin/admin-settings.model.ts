// Admin Settings & CMS Types

export type DoorAccessMode = "AUTOMATIC" | "MANUAL";
export type CheckInAccessMode = "MANUAL" | "DOOR_ACK_REQUIRED";
export type DoorFailsafeMode = "LOCKED" | "UNLOCKED";
export type AnnouncementType = "INFO" | "WARNING" | "CRITICAL" | "MAINTENANCE";

// ─── Application Rules ───────────────────────────────────────────────────────

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

// ─── CMS Features ────────────────────────────────────────────────────────────

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

// ─── CMS Testimonials ────────────────────────────────────────────────────────

export interface CmsTestimonialResponse {
  id: string;
  name: string;
  role: string | null;
  avatar: string | null;
  content: string;
  rating: number;
  approved: boolean;  // maps to backend 'featured'
  active: boolean;
  order: number;
}

export interface CmsTestimonialUpsertRequest {
  name: string;
  role?: string;
  avatar?: string;
  content?: string;
  rating?: number;
  approved?: boolean;  // maps to backend 'featured'
  active?: boolean;
  order?: number;
}

// ─── CMS How-To Steps ────────────────────────────────────────────────────────

export interface CmsHowToStepResponse {
  id: string;
  stepNumber: string;  // formatted step like "01"
  title: string;
  description: string;
  icon: string;
  published: boolean;  // maps to backend 'active'
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

// ─── CMS FAQs ────────────────────────────────────────────────────────────────

export interface CmsFaqResponse {
  id: string;
  question: string;
  answer: string;
  category: string;
  published: boolean;  // maps to backend 'active'
  order: number;
}

export interface CmsFaqUpsertRequest {
  question: string;
  answer?: string;
  category?: string;
  published?: boolean;
  order?: number;
}

// ─── CMS Announcements ───────────────────────────────────────────────────────

export interface CmsAnnouncementResponse {
  id: string;
  title: string;
  audience: string;  // maps to backend 'content' (we'll use it for audience)
  type: AnnouncementType;
  active: boolean;
  scheduledAt: string | null;  // maps to startsAt
  createdAt: string;
}

export interface CmsAnnouncementUpsertRequest {
  title: string;
  audience?: string;
  type?: AnnouncementType;
  active?: boolean;
  scheduledAt?: string | null;
}

// ─── CMS Stats ───────────────────────────────────────────────────────────────

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
