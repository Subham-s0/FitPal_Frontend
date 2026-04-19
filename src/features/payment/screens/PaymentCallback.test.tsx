import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const paymentMocks = vi.hoisted(() => ({
  confirmEsewaPaymentApi: vi.fn(),
  lookupEsewaPaymentApi: vi.fn(),
  lookupKhaltiPaymentApi: vi.fn(),
  markEsewaPaymentFailureApi: vi.fn(),
  getMyProfileApi: vi.fn(),
  authStore: {
    getSnapshot: vi.fn(() => ({
      role: "USER",
      profileCompleted: true,
      hasSubscription: false,
      hasActiveSubscription: false,
      hasDashboardAccess: false,
    })),
    updateOnboardingStatus: vi.fn(),
  },
}));

vi.mock("@/features/payment/api", () => ({
  confirmEsewaPaymentApi: paymentMocks.confirmEsewaPaymentApi,
  lookupEsewaPaymentApi: paymentMocks.lookupEsewaPaymentApi,
  lookupKhaltiPaymentApi: paymentMocks.lookupKhaltiPaymentApi,
  markEsewaPaymentFailureApi: paymentMocks.markEsewaPaymentFailureApi,
}));

vi.mock("@/features/profile/api", () => ({
  getMyProfileApi: paymentMocks.getMyProfileApi,
}));

vi.mock("@/features/auth/store", () => ({
  authStore: paymentMocks.authStore,
}));

import PaymentCallback from "@/features/payment/screens/PaymentCallback";

const createPaymentStatus = (overrides: Partial<{
  paymentMethod: "ESEWA" | "KHALTI";
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  subscriptionStatus: string;
  gatewayResponseMessage: string | null;
}>) => ({
  subscriptionId: 11,
  paymentAttemptId: 12,
  paymentMethod: "KHALTI" as const,
  paymentStatus: "COMPLETED" as const,
  subscriptionStatus: "ACTIVE",
  gatewayReference: "gw-ref",
  gatewayTransactionId: "txn-1",
  gatewayResponseCode: "000",
  gatewayResponseMessage: null,
  ...overrides,
});

const renderCallback = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/payments/esewa/success" element={<PaymentCallback gateway="esewa" />} />
        <Route path="/payments/esewa/success/:paymentAttemptId" element={<PaymentCallback gateway="esewa" />} />
        <Route path="/payments/esewa/failure/:paymentAttemptId" element={<PaymentCallback gateway="esewa" />} />
        <Route path="/payments/khalti/return/:paymentAttemptId" element={<PaymentCallback gateway="khalti" />} />
        <Route path="/profile-setup" element={<div>PROFILE SETUP DESTINATION</div>} />
        <Route path="/membership" element={<div>MEMBERSHIP DESTINATION</div>} />
        <Route path="/dashboard" element={<div>DASHBOARD DESTINATION</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("PaymentCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a failure state when payment information is missing", async () => {
    renderCallback("/payments/esewa/success");

    expect(await screen.findByText("Payment unsuccessful")).toBeInTheDocument();
    expect(screen.getByText("Missing payment information.")).toBeInTheDocument();
  });

  it("shows a failure state when the payment attempt id is invalid", async () => {
    renderCallback("/payments/khalti/return/not-a-number");

    expect(await screen.findByText("Payment unsuccessful")).toBeInTheDocument();
    expect(screen.getByText("Invalid payment information.")).toBeInTheDocument();
  });

  it("records an eSewa failure and lets the user return to the membership flow", async () => {
    const user = userEvent.setup();
    paymentMocks.markEsewaPaymentFailureApi.mockResolvedValue(
      createPaymentStatus({
        paymentMethod: "ESEWA",
        paymentStatus: "CANCELLED",
        subscriptionStatus: "PENDING",
        gatewayResponseMessage: "Payment was cancelled in eSewa.",
      }),
    );

    renderCallback("/payments/esewa/failure/12?flow=membership&reason=cancelled");

    expect(await screen.findByText("Payment unsuccessful")).toBeInTheDocument();
    expect(paymentMocks.markEsewaPaymentFailureApi).toHaveBeenCalledWith({
      paymentAttemptId: 12,
      reason: "cancelled",
    });
    expect(screen.getByText("Payment was cancelled in eSewa.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /return to membership/i }));

    expect(await screen.findByText("MEMBERSHIP DESTINATION")).toBeInTheDocument();
  });

  it("activates the membership on successful Khalti verification and redirects to dashboard", async () => {
    paymentMocks.lookupKhaltiPaymentApi.mockResolvedValue(
      createPaymentStatus({
        paymentMethod: "KHALTI",
        paymentStatus: "COMPLETED",
        subscriptionStatus: "ACTIVE",
      }),
    );
    paymentMocks.getMyProfileApi.mockResolvedValue({
      profileCompleted: true,
      hasSubscription: true,
      hasActiveSubscription: true,
      hasDashboardAccess: true,
    });

    renderCallback("/payments/khalti/return/12?pidx=pidx-123");

    expect(await screen.findByText("Membership activated!")).toBeInTheDocument();

    expect(paymentMocks.lookupKhaltiPaymentApi).toHaveBeenCalledWith({
      paymentAttemptId: 12,
      pidx: "pidx-123",
    });

    await waitFor(() => {
      expect(paymentMocks.getMyProfileApi).toHaveBeenCalledTimes(1);
      expect(paymentMocks.authStore.updateOnboardingStatus).toHaveBeenCalledWith({
        profileCompleted: true,
        hasSubscription: true,
        hasActiveSubscription: true,
        hasDashboardAccess: true,
      });
    });

    expect(await screen.findByText("DASHBOARD DESTINATION", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(paymentMocks.authStore.updateOnboardingStatus).toHaveBeenCalledWith({
      profileCompleted: true,
      hasSubscription: true,
      hasActiveSubscription: true,
      hasDashboardAccess: true,
    });
  });
});
