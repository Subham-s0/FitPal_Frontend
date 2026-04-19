import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/test-utils";

const adminDashboardMocks = vi.hoisted(() => ({
  getDashboardSnapshotApi: vi.fn(),
  getDashboardRevenueApi: vi.fn(),
  getDashboardRevenueTrendApi: vi.fn(),
  getDashboardPeakActivityApi: vi.fn(),
  getDashboardMembersApi: vi.fn(),
  getDashboardRecentSignupsApi: vi.fn(),
  getDashboardMemberActivityApi: vi.fn(),
  getDashboardTopGymsApi: vi.fn(),
  getDashboardRecentPayoutsApi: vi.fn(),
  getDashboardApiHealthApi: vi.fn(),
}));

vi.mock("@/shared/layout/dashboard-shell", () => ({
  DefaultLayout: ({
    activeSection,
    onSectionChange,
    onPrimaryAction,
    onProfileClick,
    children,
  }: {
    activeSection: string;
    onSectionChange: (section: string) => void;
    onPrimaryAction: () => void;
    onProfileClick: () => void;
    children: ReactNode;
  }) => (
    <div>
      <div>ACTIVE:{activeSection}</div>
      <button type="button" onClick={() => onSectionChange("users")}>
        users-section
      </button>
      <button type="button" onClick={() => onSectionChange("settings")}>
        settings-section
      </button>
      <button type="button" onClick={onPrimaryAction}>
        primary-action
      </button>
      <button type="button" onClick={onProfileClick}>
        profile-action
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@/features/admin/components/ManageGyms", () => ({
  default: () => <div>MANAGE GYMS</div>,
}));
vi.mock("@/features/admin/components/ManagePayments", () => ({
  default: () => <div>MANAGE PAYMENTS</div>,
}));
vi.mock("@/features/admin/components/ManagePlans", () => ({
  default: () => <div>MANAGE PLANS</div>,
}));
vi.mock("@/features/admin/components/ManageSettlements", () => ({
  default: () => <div>MANAGE SETTLEMENTS</div>,
}));
vi.mock("@/features/admin/components/ManageUsers", () => ({
  default: () => <div>MANAGE USERS</div>,
}));
vi.mock("@/features/admin/components/AdminSettings", () => ({
  default: () => <div>ADMIN SETTINGS</div>,
}));
vi.mock("@/features/admin/components/AdminCmsView", () => ({
  default: () => <div>ADMIN CMS VIEW</div>,
}));
vi.mock("@/features/announcements/components/AdminAnnouncementsPage", () => ({
  default: () => <div>ADMIN ANNOUNCEMENTS</div>,
}));

vi.mock("@/features/admin/admin-dashboard.api", () => ({
  getDashboardSnapshotApi: adminDashboardMocks.getDashboardSnapshotApi,
  getDashboardRevenueApi: adminDashboardMocks.getDashboardRevenueApi,
  getDashboardRevenueTrendApi: adminDashboardMocks.getDashboardRevenueTrendApi,
  getDashboardPeakActivityApi: adminDashboardMocks.getDashboardPeakActivityApi,
  getDashboardMembersApi: adminDashboardMocks.getDashboardMembersApi,
  getDashboardRecentSignupsApi: adminDashboardMocks.getDashboardRecentSignupsApi,
  getDashboardMemberActivityApi: adminDashboardMocks.getDashboardMemberActivityApi,
  getDashboardTopGymsApi: adminDashboardMocks.getDashboardTopGymsApi,
  getDashboardRecentPayoutsApi: adminDashboardMocks.getDashboardRecentPayoutsApi,
  getDashboardApiHealthApi: adminDashboardMocks.getDashboardApiHealthApi,
}));

import AdminDashboard from "@/features/admin/screens/AdminDashboard";

describe("AdminDashboard (FE-ADMIN-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminDashboardMocks.getDashboardSnapshotApi.mockResolvedValue({
      totalGyms: 12,
      onlineGyms: 9,
      offlineGyms: 3,
      activeCheckIns: 27,
      checkInsToday: 84,
      checkInsYesterday: 70,
      totalMembers: 420,
      newMembersThisMonth: 18,
    });
    adminDashboardMocks.getDashboardRevenueApi.mockResolvedValue({
      currency: "NPR",
      totalCollected: 125000,
      baseAmount: 100000,
      taxAmount: 0,
      serviceChargeAmount: 0,
      vatAmount: 0,
      taxRate: 0,
      serviceChargeRate: 0,
      effectiveTaxRate: 0,
      effectiveServiceChargeRate: 0,
      subscriptionCount: 90,
      totalCollectedPrevPeriod: 110000,
      allTimeTotalCollected: 500000,
      allTimeBaseAmount: 400000,
      allTimeTaxAmount: 0,
      allTimeServiceChargeAmount: 0,
      allTimeVatAmount: 0,
      allTimeCompletedCount: 320,
      dueToGyms: 100000,
      paidToGyms: 350000,
    });
    adminDashboardMocks.getDashboardRevenueTrendApi.mockResolvedValue({
      subtitle: "Weekly revenue",
      points: [{ timestamp: "2026-04-18T00:00:00Z", amount: 12000 }],
    });
    adminDashboardMocks.getDashboardPeakActivityApi.mockResolvedValue({
      subtitle: "Peak hours",
      points: [{ label: "6 AM", count: 11 }],
    });
    adminDashboardMocks.getDashboardMembersApi.mockResolvedValue({
      totalPlatformUsers: 420,
      newThisMonth: 18,
      churned: 2,
      churnedGyms: 1,
      verifiedPercent: 0.92,
      planDistribution: [{ planType: "PRO", billingCycle: "MONTHLY", count: 50, percent: 60 }],
      mostPopularPlan: "PRO",
      mostPopularCount: 50,
      gymsPendingApproval: 2,
      gymsRejected: 1,
      gymsApproved: 9,
    });
    adminDashboardMocks.getDashboardRecentSignupsApi.mockResolvedValue([
      {
        accountId: 1,
        name: "Fit Pal",
        email: "member@fitpal.com",
        profileImageUrl: null,
        role: "USER",
        gymApprovalStatus: null,
        planName: "Pro Monthly",
        billingCycle: "MONTHLY",
        createdAt: "2026-04-18T08:00:00Z",
      },
    ]);
    adminDashboardMocks.getDashboardMemberActivityApi.mockResolvedValue({
      checkedInToday: 84,
      avgSessionsPerWeek: 3.8,
      suspendedAccounts: 4,
      avgSessionMinutes: 61,
    });
    adminDashboardMocks.getDashboardTopGymsApi.mockResolvedValue([
      {
        gymId: 1,
        name: "FitPal Central",
        logoUrl: null,
        checkIns: 130,
        trendPercent: 12,
        joinedAt: "2026-01-01T00:00:00Z",
        accessMode: "QR",
        eligibleTier: "PRO",
        allowedCheckInRadiusMeters: 150,
        eligible: true,
      },
    ]);
    adminDashboardMocks.getDashboardRecentPayoutsApi.mockResolvedValue([
      {
        payoutSettlementId: 1,
        gymName: "FitPal Central",
        netAmount: 42000,
        currency: "NPR",
        status: "PAID",
        createdAt: "2026-04-17T10:00:00Z",
      },
    ]);
    adminDashboardMocks.getDashboardApiHealthApi.mockResolvedValue({
      totalRequests: 5000,
      totalRequestsPrev: 4500,
      avgResponseMs: 140,
      p95ResponseMs: 280,
      errorRate: 0.01,
      errorCount: 50,
      slowestMs: 620,
      slowestEndpoint: "GET /api/check-ins",
      volumePoints: [{ label: "09:00", count: 320 }],
      slowestEndpoints: [{ method: "GET", endpoint: "/api/check-ins", avgMs: 620, hits: 44 }],
      errorBreakdown: [{ category: "5XX", count: 50 }],
    });
  });

  it("renders the admin home dashboard and supports management-section switching", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>,
      { route: "/admin" },
    );

    expect(await screen.findByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE:home")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "users-section" }));
    expect(screen.getByText("MANAGE USERS")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE:users")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "settings-section" }));
    expect(screen.getByText("ADMIN SETTINGS")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "profile-action" }));
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });
});
