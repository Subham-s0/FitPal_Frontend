import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountNotificationResponse } from "@/features/notifications/model";
import { notificationQueryKeys } from "@/features/notifications/queryKeys";
import { queryClient } from "@/shared/api";

const notificationPageMocks = vi.hoisted(() => ({
  getNotificationsApi: vi.fn(),
  getNotificationUnreadCountApi: vi.fn(),
  markNotificationReadApi: vi.fn(),
  markAllNotificationsReadApi: vi.fn(),
  navigate: vi.fn(),
  showApiSuccessToast: vi.fn(),
  showApiErrorToast: vi.fn(),
  getNotificationNavigationState: vi.fn(() => ({ focus: "notifications" })),
}));

vi.mock("@/features/notifications/api", () => ({
  getNotificationsApi: notificationPageMocks.getNotificationsApi,
  getNotificationUnreadCountApi: notificationPageMocks.getNotificationUnreadCountApi,
  markNotificationReadApi: notificationPageMocks.markNotificationReadApi,
  markAllNotificationsReadApi: notificationPageMocks.markAllNotificationsReadApi,
}));

vi.mock("@/shared/lib/toast-helpers", () => ({
  showApiSuccessToast: notificationPageMocks.showApiSuccessToast,
  showApiErrorToast: notificationPageMocks.showApiErrorToast,
}));

vi.mock("@/shared/navigation/dashboard-navigation", () => ({
  getNotificationNavigationState: notificationPageMocks.getNotificationNavigationState,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => notificationPageMocks.navigate,
  };
});

import NotificationInboxPage from "@/features/notifications/components/NotificationInboxPage";

const createNotification = (
  overrides: Partial<AccountNotificationResponse> = {},
): AccountNotificationResponse => ({
  notificationId: 1,
  category: "SYSTEM",
  sourceDomain: "SYSTEM",
  sourceEntityId: null,
  title: "Welcome back",
  body: "Your latest check-in was approved.",
  deepLink: "/dashboard/check-in",
  payload: { visitId: "visit-1" },
  actorDisplayName: "FitPal",
  actorGymName: null,
  publishedAt: "2026-04-18T10:00:00.000Z",
  readAt: null,
  unread: true,
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NotificationInboxPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );

describe("NotificationInboxPage (FE-NOTIFY-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("keeps unread list state and mark-read navigation synchronized for a single notification", async () => {
    const user = userEvent.setup();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const unreadNotification = createNotification();

    notificationPageMocks.getNotificationsApi.mockResolvedValue({
      items: [unreadNotification, createNotification({ notificationId: 2, unread: false, readAt: "2026-04-18T10:05:00.000Z", title: "Already read" })],
      page: 0,
      size: 12,
      totalItems: 2,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
    notificationPageMocks.getNotificationUnreadCountApi.mockResolvedValue({
      unreadCount: 1,
    });
    notificationPageMocks.markNotificationReadApi.mockResolvedValue({
      ...unreadNotification,
      unread: false,
      readAt: "2026-04-18T10:06:00.000Z",
    });

    renderPage();

    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /welcome back/i }));

    await waitFor(() => {
      expect(notificationPageMocks.markNotificationReadApi).toHaveBeenCalledWith(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationQueryKeys.all });
    });

    expect(notificationPageMocks.navigate).toHaveBeenCalledWith("/dashboard/check-in", {
      state: { focus: "notifications" },
    });
  });

  it("marks all notifications as read and shows success feedback", async () => {
    const user = userEvent.setup();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    notificationPageMocks.getNotificationsApi.mockResolvedValue({
      items: [
        createNotification(),
        createNotification({ notificationId: 2, title: "Subscription reminder", body: "Renew to keep access." }),
      ],
      page: 0,
      size: 12,
      totalItems: 2,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
    notificationPageMocks.getNotificationUnreadCountApi.mockResolvedValue({
      unreadCount: 2,
    });
    notificationPageMocks.markAllNotificationsReadApi.mockResolvedValue(undefined);

    renderPage();

    expect(await screen.findByText("Subscription reminder")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mark all/i }));

    await waitFor(() => {
      expect(notificationPageMocks.markAllNotificationsReadApi).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationQueryKeys.all });
    });

    expect(notificationPageMocks.showApiSuccessToast).toHaveBeenCalledWith("All notifications marked as read");
  });
});
