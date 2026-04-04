export interface AuthRoutingState {
  role: string | null | undefined;
  profileCompleted: boolean;
  hasSubscription: boolean;
  hasActiveSubscription: boolean;
  hasDashboardAccess: boolean;
}

export const ADMIN_DASHBOARD_ROUTE = "/admin/dashboard";
export const PROFILE_SETUP_ROUTE = "/profile-setup";
export const USER_PROFILE_SETUP_ROUTE = "/user-profile-setup";
export const GYM_PROFILE_SETUP_ROUTE = "/gym-profile-setup";

export function getProfileSetupRoute(role: string | null | undefined) {
  void role;
  return PROFILE_SETUP_ROUTE;
}

export function isProfileSetupRoute(pathname: string) {
  return (
    pathname === PROFILE_SETUP_ROUTE ||
    pathname === USER_PROFILE_SETUP_ROUTE ||
    pathname === GYM_PROFILE_SETUP_ROUTE
  );
}

export function getPostAuthRoute(state: AuthRoutingState) {
  const role = state.role?.toUpperCase();

  if (role === "SUPERADMIN") {
    return ADMIN_DASHBOARD_ROUTE;
  }

  if (role === "GYM") {
    return state.profileCompleted ? "/dashboard" : PROFILE_SETUP_ROUTE;
  }

  if (role === "USER") {
    if (!state.profileCompleted) {
      return PROFILE_SETUP_ROUTE;
    }

    if (!state.hasSubscription) {
      return PROFILE_SETUP_ROUTE;
    }

    if (!state.hasDashboardAccess) {
      return PROFILE_SETUP_ROUTE;
    }
  }

  return "/dashboard";
}
