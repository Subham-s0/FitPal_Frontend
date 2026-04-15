import {
  createAdminDashboardState,
  createUserDashboardState,
  getDashboardPathForRole,
  getNotificationNavigationState,
  getUserDashboardSectionFromPath,
  getUserDashboardSectionPath,
  navigateToAdminCms,
  navigateToCheckInView,
} from "@/shared/navigation/dashboard-navigation";

describe("dashboard-navigation", () => {
  it("creates typed user and admin dashboard states without dropping extras", () => {
    expect(createUserDashboardState("checkin", { checkInView: "scanner" })).toEqual({
      activeSection: "checkin",
      checkInView: "scanner",
    });

    expect(createAdminDashboardState("gyms", { filterPending: true })).toEqual({
      activeSection: "gyms",
      filterPending: true,
    });
  });

  it("routes roles to their dashboard paths", () => {
    expect(getDashboardPathForRole("ADMIN")).toBe("/admin/dashboard");
    expect(getDashboardPathForRole("SUPERADMIN")).toBe("/admin/dashboard");
    expect(getDashboardPathForRole("GYM")).toBe("/gym/dashboard");
    expect(getDashboardPathForRole("USER")).toBe("/dashboard");
  });

  it("maps user dashboard sections to canonical paths", () => {
    expect(getUserDashboardSectionPath("routines")).toBe("/routines");
    expect(getUserDashboardSectionPath("exercises")).toBe("/exercises");
    expect(getUserDashboardSectionPath("gyms")).toBe("/gyms");
    expect(getUserDashboardSectionPath("notifications")).toBe("/notifications");
    expect(getUserDashboardSectionPath("checkin")).toBe("/check-ins");
    expect(getUserDashboardSectionFromPath("/check-ins")).toBe("checkin");
    expect(getUserDashboardSectionFromPath("/checkin")).toBe("checkin");
  });

  it("builds notification navigation state only from supported payload keys", () => {
    expect(
      getNotificationNavigationState({
        activeSection: "checkin",
        checkInView: "logs",
        filterPending: true,
        ignored: "value",
      }),
    ).toEqual({
      activeSection: "checkin",
      checkInView: "logs",
      filterPending: true,
    });

    expect(getNotificationNavigationState({ cmsTab: "features" })).toBeUndefined();
  });

  it("navigates check-in and admin cms routes with stable state payloads", () => {
    const navigate = vi.fn();

    navigateToCheckInView(navigate, "scanner");
    navigateToAdminCms(navigate, "faqs");

    expect(navigate).toHaveBeenNthCalledWith(1, "/check-ins", {
      state: { activeSection: "checkin", checkInView: "scanner" },
    });
    expect(navigate).toHaveBeenNthCalledWith(2, "/admin/dashboard", {
      state: { activeSection: "cms", cmsTab: "faqs" },
    });
  });
});
