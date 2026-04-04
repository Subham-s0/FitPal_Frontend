export type AdminAccountRole = "USER" | "GYM" | "SUPERADMIN";

export interface AdminUserSummaryResponse {
  accountId: number;
  email: string;
  role: AdminAccountRole;
  active: boolean;
  emailVerified: boolean;
  displayName: string;
  secondaryLine: string;
  /** Member profile photo (USER) */
  profileImageUrl: string | null;
  /** Gym logo from gym profile (GYM) */
  gymLogoUrl: string | null;
  userId: number | null;
  gymId: number | null;
  createdAt: string;
}

export interface AdminUserDetailResponse {
  accountId: number;
  email: string;
  role: AdminAccountRole;
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string | null;
  userId: number | null;
  userName: string | null;
  firstName: string | null;
  lastName: string | null;
  onboardingStep: number | null;
  profileCompleted: boolean | null;
  profileImageUrl: string | null;
  phoneNo: string | null;
  gymId: number | null;
  gymName: string | null;
  gymApprovalStatus: string | null;
  gymLogoUrl: string | null;
}

export interface AdminUserCountsResponse {
  total: number;
  userRole: number;
  gymRole: number;
  superAdminRole: number;
}

export type AdminUserSortField =
  | "accountId"
  | "email"
  | "role"
  | "active"
  | "createdAt"
  | "updatedAt";

export interface AdminUserListParams {
  role?: AdminAccountRole;
  active?: boolean;
  query?: string;
  sortBy?: AdminUserSortField;
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}
