import {
  ADMIN_DASHBOARD_ROUTE,
  GYM_DASHBOARD_ROUTE,
  PROFILE_SETUP_ROUTE,
  getPostAuthRoute,
  getProfileSetupRoute,
  isProfileSetupRoute,
} from "@/features/auth/auth-routing";

describe("auth routing (FE-AUTH-01, FE-AUTH-06, FE-PROFILE-01)", () => {
  it("routes each role to the correct post-auth destination", () => {
    expect(
      getPostAuthRoute({
        role: "SUPERADMIN",
        profileCompleted: true,
        hasSubscription: true,
        hasActiveSubscription: true,
        hasDashboardAccess: true,
      }),
    ).toBe(ADMIN_DASHBOARD_ROUTE);

    expect(
      getPostAuthRoute({
        role: "GYM",
        profileCompleted: false,
        hasSubscription: false,
        hasActiveSubscription: false,
        hasDashboardAccess: false,
      }),
    ).toBe(PROFILE_SETUP_ROUTE);

    expect(
      getPostAuthRoute({
        role: "GYM",
        profileCompleted: true,
        hasSubscription: false,
        hasActiveSubscription: false,
        hasDashboardAccess: false,
      }),
    ).toBe(GYM_DASHBOARD_ROUTE);
  });

  it("keeps users in setup flow until they have dashboard access", () => {
    expect(
      getPostAuthRoute({
        role: "USER",
        profileCompleted: false,
        hasSubscription: false,
        hasActiveSubscription: false,
        hasDashboardAccess: false,
      }),
    ).toBe(PROFILE_SETUP_ROUTE);

    expect(
      getPostAuthRoute({
        role: "USER",
        profileCompleted: true,
        hasSubscription: false,
        hasActiveSubscription: false,
        hasDashboardAccess: false,
      }),
    ).toBe(PROFILE_SETUP_ROUTE);

    expect(
      getPostAuthRoute({
        role: "USER",
        profileCompleted: true,
        hasSubscription: true,
        hasActiveSubscription: true,
        hasDashboardAccess: false,
      }),
    ).toBe(PROFILE_SETUP_ROUTE);

    expect(
      getPostAuthRoute({
        role: "USER",
        profileCompleted: true,
        hasSubscription: true,
        hasActiveSubscription: true,
        hasDashboardAccess: true,
      }),
    ).toBe("/dashboard");
  });

  it("detects setup routes consistently", () => {
    expect(isProfileSetupRoute("/profile-setup")).toBe(true);
    expect(isProfileSetupRoute("/user-profile-setup")).toBe(true);
    expect(isProfileSetupRoute("/gym-profile-setup")).toBe(true);
    expect(isProfileSetupRoute("/dashboard")).toBe(false);
  });

  it("uses unified profile setup destination for all roles", () => {
    expect(getProfileSetupRoute("USER")).toBe(PROFILE_SETUP_ROUTE);
    expect(getProfileSetupRoute("GYM")).toBe(PROFILE_SETUP_ROUTE);
    expect(getProfileSetupRoute("SUPERADMIN")).toBe(PROFILE_SETUP_ROUTE);
  });
});
