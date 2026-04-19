import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanResponse } from "@/features/plans/model";

const planBrowserMocks = vi.hoisted(() => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
  useIsMobile: () => planBrowserMocks.useIsMobile(),
}));

import PlanBrowser from "@/features/plans/components/PlanBrowser";

const buildPlan = (overrides: Partial<PlanResponse> = {}): PlanResponse => ({
  planId: 1,
  planType: "PRO",
  accessTierGranted: "PRO",
  name: "Pro",
  description: "Unlimited visits",
  monthlyPrice: 2999,
  currency: "NPR",
  monthlyDurationDays: 30,
  yearlyDurationDays: 365,
  yearlyDiscountPercent: 15,
  yearlyBaseAmount: 35988,
  yearlyBilledAmount: 30590,
  yearlySavingsAmount: 5398,
  mostPopular: false,
  active: true,
  features: ["Door access", "Priority booking"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  ...overrides,
});

describe("PlanBrowser (FE-MEMBER-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    planBrowserMocks.useIsMobile.mockReturnValue(false);
  });

  it("switches billing cycles, surfaces the selection notice, and selects an active plan", async () => {
    const user = userEvent.setup();
    const onBillingChange = vi.fn();
    const onSelectPlan = vi.fn();

    render(
      <PlanBrowser
        plans={[
          buildPlan({
            planId: 1,
            name: "Starter",
            planType: "BASIC",
          }),
          buildPlan({
            planId: 2,
            name: "Elite",
            planType: "ELITE",
            mostPopular: true,
          }),
        ]}
        billingCycle="monthly"
        onBillingChange={onBillingChange}
        onSelectPlan={onSelectPlan}
        selectionNotice="Upgrade keeps your current access until the next cycle."
      />,
    );

    expect(
      screen.getByText(
        "Upgrade keeps your current access until the next cycle.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yearly" }));
    expect(onBillingChange).toHaveBeenCalledWith("yearly");

    await user.click(screen.getByRole("button", { name: /select elite/i }));

    expect(onSelectPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: 2,
        name: "Elite",
      }),
      "monthly",
    );
  });

  it("renders the mobile carousel controls and selected badge state", async () => {
    const user = userEvent.setup();
    planBrowserMocks.useIsMobile.mockReturnValue(true);

    render(
      <PlanBrowser
        plans={[
          buildPlan({
            planId: 10,
            name: "Starter",
            planType: "BASIC",
          }),
          buildPlan({
            planId: 11,
            name: "Pro Max",
            planType: "PRO",
          }),
        ]}
        billingCycle="yearly"
        onBillingChange={vi.fn()}
        footerMode="status"
        selectedPlanKey="pro"
        selectionKeyType="planType"
        selectedBadgeLabel="Selected"
      />,
    );

    expect(screen.getByText("Selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next plan/i }));

    expect(
      screen.getByRole("button", { name: /go to starter/i }),
    ).toBeInTheDocument();
  });
});
