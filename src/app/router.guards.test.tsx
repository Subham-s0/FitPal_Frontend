import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerMocks = vi.hoisted(() => ({
  authState: {
    accessToken: null,
    accountId: null,
    email: null,
    role: null,
    providers: [],
    profileCompleted: false,
    emailVerified: false,
    submittedForReview: false,
    approved: false,
    hasSubscription: false,
    hasActiveSubscription: false,
    hasDashboardAccess: false,
  },
}));

vi.mock("@/features/auth", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth")>("@/features/auth");
  return {
    ...actual,
    useAuthState: () => routerMocks.authState,
  };
});

vi.mock("@/pages/Index", () => ({ default: () => <div>INDEX PAGE</div> }));
vi.mock("@/pages/Dashboard", () => ({ default: () => <div>DASHBOARD PAGE</div> }));
vi.mock("@/pages/PublicGyms", () => ({ default: () => <div>PUBLIC GYMS PAGE</div> }));
vi.mock("@/pages/NotFound", () => ({ default: () => <div>NOT FOUND PAGE</div> }));
vi.mock("@/pages/LoginRegister", () => ({ default: () => <div>LOGIN PAGE</div> }));
vi.mock("@/pages/gym/GymProfile", () => ({ default: () => <div>GYM PROFILE PAGE</div> }));
vi.mock("@/pages/user/Payments", () => ({ default: () => <div>PAYMENTS PAGE</div> }));
vi.mock("@/pages/user/Profile", () => ({ default: () => <div>PROFILE PAGE</div> }));
vi.mock("@/pages/user/Settings", () => ({ default: () => <div>SETTINGS PAGE</div> }));
vi.mock("@/pages/user/Membership", () => ({ default: () => <div>MEMBERSHIP PAGE</div> }));
vi.mock("@/pages/admin/AdminDashboard", () => ({ default: () => <div>ADMIN DASHBOARD PAGE</div> }));
vi.mock("@/pages/OAuthCallback", () => ({ default: () => <div>OAUTH CALLBACK PAGE</div> }));
vi.mock("@/pages/Logout", () => ({ default: () => <div>LOGOUT PAGE</div> }));
vi.mock("@/pages/EsewaPaymentCallback", () => ({ default: () => <div>ESEWA CALLBACK PAGE</div> }));
vi.mock("@/pages/KhaltiPaymentCallback", () => ({ default: () => <div>KHALTI CALLBACK PAGE</div> }));
vi.mock("@/pages/user/UserProfileSetup", () => ({ default: () => <div>USER PROFILE SETUP PAGE</div> }));
vi.mock("@/pages/gym/GymProfileSetup", () => ({ default: () => <div>GYM PROFILE SETUP PAGE</div> }));
vi.mock("@/pages/ProfileSetupEntry", () => ({ default: () => <div>PROFILE SETUP ENTRY PAGE</div> }));
vi.mock("@/pages/admin/AdminLoginPortal", () => ({ default: () => <div>ADMIN LOGIN PAGE</div> }));
vi.mock("@/pages/user/WorkoutSession", () => ({ default: () => <div>WORKOUT SESSION PAGE</div> }));

import AppRouter from "@/app/router";

const resetAuthState = () => {
  Object.assign(routerMocks.authState, {
    accessToken: null,
    accountId: null,
    email: null,
    role: null,
    providers: [],
    profileCompleted: false,
    emailVerified: false,
    submittedForReview: false,
    approved: false,
    hasSubscription: false,
    hasActiveSubscription: false,
    hasDashboardAccess: false,
  });
};

const renderPath = (path: string) => {
  window.history.replaceState({}, "", path);
  return render(<AppRouter />);
};

describe("router guard flows", () => {
  beforeEach(() => {
    resetAuthState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects guests from dashboard routes to login", async () => {
    renderPath("/dashboard");

    expect(await screen.findByText("LOGIN PAGE")).toBeInTheDocument();
  });

  it("redirects incomplete user accounts to profile setup", async () => {
    Object.assign(routerMocks.authState, {
      accessToken: "user-token",
      role: "USER",
    });

    renderPath("/dashboard");

    expect(await screen.findByText("PROFILE SETUP ENTRY PAGE")).toBeInTheDocument();
  });

  it("redirects subscribed users away from setup once dashboard access exists", async () => {
    Object.assign(routerMocks.authState, {
      accessToken: "user-token",
      role: "USER",
      profileCompleted: true,
      hasSubscription: true,
      hasActiveSubscription: true,
      hasDashboardAccess: true,
    });

    renderPath("/profile-setup");

    expect(await screen.findByText("DASHBOARD PAGE")).toBeInTheDocument();
  });

  it("redirects superadmins to the admin dashboard from protected user routes", async () => {
    Object.assign(routerMocks.authState, {
      accessToken: "admin-token",
      role: "SUPERADMIN",
    });

    renderPath("/dashboard");

    expect(await screen.findByText("ADMIN DASHBOARD PAGE")).toBeInTheDocument();
  });

  it("redirects non-superadmin accounts away from the admin dashboard route", async () => {
    Object.assign(routerMocks.authState, {
      accessToken: "user-token",
      role: "USER",
      profileCompleted: true,
      hasSubscription: true,
      hasActiveSubscription: true,
      hasDashboardAccess: true,
    });

    renderPath("/admin/dashboard");

    expect(await screen.findByText("DASHBOARD PAGE")).toBeInTheDocument();
  });

  it("shows public gyms to guests and the dashboard to authenticated members", async () => {
    const guestRender = renderPath("/gyms");
    expect(await screen.findByText("PUBLIC GYMS PAGE")).toBeInTheDocument();
    guestRender.unmount();
    cleanup();

    resetAuthState();
    Object.assign(routerMocks.authState, {
      accessToken: "user-token",
      role: "USER",
      profileCompleted: true,
      hasSubscription: true,
      hasActiveSubscription: true,
      hasDashboardAccess: true,
    });

    renderPath("/gyms");
    const dashboards = await screen.findAllByText("DASHBOARD PAGE");
    expect(dashboards).toHaveLength(1);
  });
});
