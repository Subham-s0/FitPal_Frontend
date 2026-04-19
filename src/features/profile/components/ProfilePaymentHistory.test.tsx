import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserPaymentHistoryItemResponse } from "@/features/payment/model";
import ProfilePaymentHistory from "@/features/profile/components/ProfilePaymentHistory";
import { renderWithProviders } from "@/test/test-utils";

const paymentHistoryMocks = vi.hoisted(() => ({
  getMyPaymentHistoryApi: vi.fn(),
  getMyPaymentHistorySummaryApi: vi.fn(),
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("@/features/payment/api", () => ({
  getMyPaymentHistoryApi: paymentHistoryMocks.getMyPaymentHistoryApi,
  getMyPaymentHistorySummaryApi: paymentHistoryMocks.getMyPaymentHistorySummaryApi,
}));

vi.mock("sonner", () => ({
  toast: paymentHistoryMocks.toast,
}));

const createPayment = (
  overrides: Partial<UserPaymentHistoryItemResponse> = {},
): UserPaymentHistoryItemResponse => ({
  paymentAttemptId: 100,
  subscriptionId: 200,
  planId: 300,
  planType: "PRO",
  planName: "Pro Monthly",
  billingCycle: "MONTHLY",
  invoiceNumber: "INV-100",
  paymentMethod: "ESEWA",
  paymentStatus: "COMPLETED",
  paymentTime: "2026-04-18T10:00:00.000Z",
  startsAt: "2026-04-19T00:00:00.000Z",
  endsAt: "2026-05-19T00:00:00.000Z",
  currency: "NPR",
  subtotalAmount: 2500,
  discountAmount: 0,
  taxAmount: 0,
  serviceChargeAmount: 0,
  vatAmount: 0,
  totalAmount: 2500,
  billingName: "Fit Pal",
  billingEmail: "member@fitpal.com",
  billingPhoneNumber: "9812345678",
  billingAddress: "Kathmandu",
  billingCity: "Kathmandu",
  gatewayReference: "gw-100",
  gatewayTransactionId: "txn-100",
  gatewayResponseCode: "000",
  gatewayResponseMessage: null,
  ...overrides,
});

describe("ProfilePaymentHistory (FE-MEMBER-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentHistoryMocks.getMyPaymentHistoryApi.mockResolvedValue({
      items: [
        createPayment(),
        createPayment({
          paymentAttemptId: 101,
          invoiceNumber: "INV-101",
          paymentMethod: "KHALTI",
          paymentStatus: "FAILED",
          totalAmount: 3200,
          gatewayResponseMessage: "Payment rejected by gateway",
        }),
      ],
      page: 0,
      size: 12,
      totalItems: 2,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
    paymentHistoryMocks.getMyPaymentHistorySummaryApi.mockResolvedValue({
      totalPayments: 2,
      completedPayments: 1,
      failedPayments: 1,
      totalPaidAmount: 2500,
    });
  });

  it("renders summary cards, filters the history list, and opens payment detail fields", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(
      <ProfilePaymentHistory />,
    );

    expect(await screen.findByText("Payment History")).toBeInTheDocument();
    expect(screen.getByText("2 payments")).toBeInTheDocument();
    expect(screen.getAllByText("Pro Monthly").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /filter/i }));
    await user.click(screen.getByRole("button", { name: "Failed" }));
    await user.click(screen.getByRole("button", { name: "Khalti" }));

    await waitFor(() => {
      expect(paymentHistoryMocks.getMyPaymentHistoryApi).toHaveBeenLastCalledWith(
        expect.objectContaining({
          statuses: ["FAILED"],
          paymentMethods: ["KHALTI"],
          sortDirection: "DESC",
        }),
      );
    });

    await user.click(screen.getAllByRole("button", { name: /details/i })[0]);

    expect(await screen.findByText("Payment details")).toBeInTheDocument();
    expect(screen.getByText(/same layout as admin payment review/i)).toBeInTheDocument();

    queryClient.clear();
  });

  it("refreshes both payment queries from the toolbar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePaymentHistory />);

    expect(await screen.findByText("Payment History")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(paymentHistoryMocks.getMyPaymentHistoryApi).toHaveBeenCalledTimes(2);
      expect(paymentHistoryMocks.getMyPaymentHistorySummaryApi).toHaveBeenCalledTimes(2);
    });
  });
});
