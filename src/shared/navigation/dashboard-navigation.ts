import type { NavigateFunction } from "react-router-dom";

export type DashboardCheckInView = "scanner" | "logs";
export type DashboardCmsTab = "features" | "testimonials" | "how-to" | "stats" | "faqs";

export interface DashboardRouteState {
  activeSection: string;
  checkInView?: DashboardCheckInView;
  cmsTab?: DashboardCmsTab;
  filterPending?: boolean;
  [key: string]: unknown;
}

type DashboardRole = "USER" | "GYM" | "ADMIN" | "SUPERADMIN";

export const createDashboardState = (
  activeSection: string,
  extras: Omit<DashboardRouteState, "activeSection"> = {},
): DashboardRouteState => ({
  activeSection,
  ...extras,
});

export const createUserDashboardState = (
  activeSection: string,
  extras: Omit<DashboardRouteState, "activeSection"> = {},
) => createDashboardState(activeSection, extras);

export const createAdminDashboardState = (
  activeSection: string,
  extras: Omit<DashboardRouteState, "activeSection"> = {},
) => createDashboardState(activeSection, extras);

export const getDashboardPathForRole = (role: DashboardRole | string | null | undefined) => {
  const normalizedRole = role?.toUpperCase();
  return normalizedRole === "ADMIN" || normalizedRole === "SUPERADMIN"
    ? "/admin/dashboard"
    : "/dashboard";
};

export const navigateToUserDashboardSection = (
  navigate: NavigateFunction,
  activeSection: string,
  extras: Omit<DashboardRouteState, "activeSection"> = {},
) => navigate("/dashboard", { state: createUserDashboardState(activeSection, extras) });

export const navigateToAdminDashboardSection = (
  navigate: NavigateFunction,
  activeSection: string,
  extras: Omit<DashboardRouteState, "activeSection"> = {},
) => navigate("/admin/dashboard", { state: createAdminDashboardState(activeSection, extras) });

export const navigateToDashboardSectionForRole = (
  navigate: NavigateFunction,
  role: DashboardRole | string | null | undefined,
  activeSection: string,
  extras: Omit<DashboardRouteState, "activeSection"> = {},
) => {
  const path = getDashboardPathForRole(role);
  navigate(path, { state: createDashboardState(activeSection, extras) });
};

export const navigateToCheckInView = (
  navigate: NavigateFunction,
  checkInView: DashboardCheckInView,
) => navigateToUserDashboardSection(navigate, "checkin", { checkInView });

export const navigateToAdminCms = (
  navigate: NavigateFunction,
  cmsTab?: DashboardCmsTab,
) => navigateToAdminDashboardSection(navigate, "cms", cmsTab ? { cmsTab } : {});

export const getNotificationNavigationState = (
  payload: Record<string, unknown> | null | undefined,
) => {
  if (!payload || typeof payload.activeSection !== "string") {
    return undefined;
  }

  const state: DashboardRouteState = {
    activeSection: payload.activeSection,
  };

  if (payload.checkInView === "scanner" || payload.checkInView === "logs") {
    state.checkInView = payload.checkInView;
  }

  if (
    payload.cmsTab === "features" ||
    payload.cmsTab === "testimonials" ||
    payload.cmsTab === "how-to" ||
    payload.cmsTab === "stats" ||
    payload.cmsTab === "faqs"
  ) {
    state.cmsTab = payload.cmsTab;
  }

  if (typeof payload.filterPending === "boolean") {
    state.filterPending = payload.filterPending;
  }

  return state;
};
