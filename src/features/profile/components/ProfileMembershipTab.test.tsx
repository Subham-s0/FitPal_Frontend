import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { PlanResponse } from "@/features/plans/model";
import { ProfileMembershipTab } from "@/features/profile/components/ProfileMembershipTab";
import type { UserSubscriptionResponse } from "@/features/subscription/model";

const membershipTabMocks = vi.hoisted(() => ({
  viewPlansDialog: vi.fn(
    ({
      open,
      highlightedPlanId,
      defaultBillingCycle,
    }: {
      open: boolean;
      highlightedPlanId?: number | null;
      defaultBillingCycle?: "monthly" | "yearly";
    }) =>
      open ? (
        <div data-testid="view-plans-dialog">
          dialog:{String(highlightedPlanId ?? "")}:{defaultBillingCycle}
        </div>
      ) : null,
  ),
}));

vi.mock("@/features/subscription/components/ViewPlansDialog", () => ({
  default: membershipTabMocks.viewPlansDialog,
}));

const buildPlan = (overrides: Partial<PlanResponse> = {}): PlanResponse => ({
  planId: 101,
  planType: "PRO",
  accessTierGranted: "PRO",
  name: "Pro Monthly",
  description: "Unlimited visits",
  monthlyPrice: 2500,
  currency: "NPR",
  monthlyDurationDays: 30,
  yearlyDurationDays: 365,
  yearlyDiscountPercent: 15,
  yearlyBaseAmount: 30000,
  yearlyBilledAmount: 25500,
  yearlySavingsAmount: 4500,
  mostPopular: true,
  active: true,
  features: ["Door access", "Priority support"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  ...overrides,
});

const buildSubscription = (
  overrides: Partial<UserSubscriptionResponse> = {},
): UserSubscriptionResponse => ({
  accountId: 10,
  userId: 11,
  onboardingStep: 3,
  profileCompleted: true,
  hasSubscription: true,
  hasActiveSubscription: true,
  hasDashboardAccess: true,
  subscriptionId: 501,
  planId: 101,
  planType: "PRO",
  planName: "Pro Monthly",
  billingCycle: "MONTHLY",
  subscriptionStatus: "ACTIVE",
  baseAmount: 2500,
  billedAmount: 2500,
  discountAmount: 0,
  discountPercent: 0,
  taxRate: 0,
  taxAmount: 0,
  serviceChargeRate: 0,
  serviceChargeAmount: 0,
  totalAmount: 2500,
  autoRenew: true,
  pauseCount: 0,
  pauseCountCurrentWindow: 0,
  pauseLimitPerWindow: 2,
  totalPauseLimit: 6,
  scheduledPauseStartAt: null,
  scheduledPauseUntil: null,
  pausedAt: null,
  pauseUntil: null,
  startsAt: "2026-01-01T00:00:00Z",
  endsAt: "2026-01-31T00:00:00Z",
  pauseHistory: [],
  ...overrides,
});

const renderMembershipTab = ({
  subscription = buildSubscription(),
  activePlan = buildPlan(),
  plans = [buildPlan()],
}: {
  subscription?: UserSubscriptionResponse | null;
  activePlan?: PlanResponse | undefined;
  plans?: PlanResponse[];
} = {}) =>
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route
          path="/profile"
          element={
            <ProfileMembershipTab
              subscription={subscription}
              activePlan={activePlan}
              plans={plans}
              isPlansLoading={false}
              isPlansError={false}
            />
          }
        />
        <Route path="/membership" element={<div>MEMBERSHIP PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProfileMembershipTab (FE-MEMBER-02)", () => {
  it("renders the active membership state, opens the plans dialog, and navigates to membership details", async () => {
    const user = userEvent.setup();

    renderMembershipTab();

    expect(screen.getByText("Pro Monthly")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Door access")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /view all available plans/i }),
    );

    expect(screen.getByTestId("view-plans-dialog")).toHaveTextContent(
      "dialog:101:monthly",
    );

    await user.click(
      screen.getByRole("button", { name: /view membership details/i }),
    );

    expect(await screen.findByText("MEMBERSHIP PAGE")).toBeInTheDocument();
  });

  it("renders upcoming, paused, expired, and no-subscription states without remapping the backend status badge", () => {
    const plan = buildPlan();
    const { rerender } = renderMembershipTab({
      subscription: buildSubscription({
        subscriptionStatus: "UPCOMING",
        hasActiveSubscription: false,
        hasDashboardAccess: false,
      }),
      activePlan: plan,
      plans: [plan],
    });

    expect(screen.getByText("UPCOMING")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route
            path="/profile"
            element={
              <ProfileMembershipTab
                subscription={buildSubscription({
                  subscriptionStatus: "PAUSED",
                  pausedAt: "2026-01-10T00:00:00Z",
                  pauseUntil: "2026-01-17T00:00:00Z",
                })}
                activePlan={plan}
                plans={[plan]}
                isPlansLoading={false}
                isPlansError={false}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("PAUSED")).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route
            path="/profile"
            element={
              <ProfileMembershipTab
                subscription={buildSubscription({
                  subscriptionStatus: "EXPIRED",
                  hasActiveSubscription: false,
                  hasDashboardAccess: false,
                  endsAt: "2026-01-31T00:00:00Z",
                })}
                activePlan={plan}
                plans={[plan]}
                isPlansLoading={false}
                isPlansError={false}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("EXPIRED")).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route
            path="/profile"
            element={
              <ProfileMembershipTab
                subscription={null}
                activePlan={undefined}
                plans={[plan]}
                isPlansLoading={false}
                isPlansError={false}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("No Subscription")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view plans/i }),
    ).toBeInTheDocument();
  });
});
