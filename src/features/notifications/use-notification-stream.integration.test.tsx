import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notificationStreamMocks = vi.hoisted(() => ({
  authState: {
    accessToken: "stream-token",
  },
  clearAuth: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  buildApiUrl: vi.fn((path: string) => `https://api.fitpal.test${path}`),
}));

vi.mock("@/features/auth/hooks", () => ({
  useAuthState: () => notificationStreamMocks.authState,
}));

vi.mock("@/features/auth/store", () => ({
  authStore: {
    clearAuth: notificationStreamMocks.clearAuth,
  },
}));

vi.mock("@/shared/api", async () => {
  const actual = await vi.importActual<typeof import("@/shared/api")>("@/shared/api");
  return {
    ...actual,
    buildApiUrl: notificationStreamMocks.buildApiUrl,
    queryClient: {
      invalidateQueries: notificationStreamMocks.invalidateQueries,
    },
  };
});

vi.mock("sonner", () => ({
  toast: notificationStreamMocks.toast,
}));

import { useNotificationStream } from "@/features/notifications/use-notification-stream";
import { notificationQueryKeys } from "@/features/notifications/queryKeys";

const encoder = new TextEncoder();

const createStreamResponse = (...chunks: string[]) => ({
  ok: true,
  status: 200,
  body: new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  }),
});

describe("useNotificationStream hook (FE-NOTIFY-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("deduplicates repeated notifications and ignores malformed SSE payloads", async () => {
    vi.mocked(fetch).mockResolvedValue(
      createStreamResponse(
        `event: notification\ndata: ${JSON.stringify({
          notificationId: 11,
          title: "Gym approved",
          body: "You can now check in.",
        })}\n\n`,
        "event: notification\ndata: {bad-json}\n\n",
        `event: notification\ndata: ${JSON.stringify({
          notificationId: 11,
          title: "Gym approved",
          body: "You can now check in.",
        })}\n\n`,
      ) as Response,
    );

    const { unmount } = renderHook(() => useNotificationStream(true));

    await waitFor(() => {
      expect(notificationStreamMocks.invalidateQueries).toHaveBeenCalledWith({
        queryKey: notificationQueryKeys.all,
      });
      expect(notificationStreamMocks.toast).toHaveBeenCalledWith("Gym approved", {
        description: "You can now check in.",
      });
    });

    expect(notificationStreamMocks.toast).toHaveBeenCalledTimes(1);
    expect(notificationStreamMocks.invalidateQueries).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("reconnects after a stream failure", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("network lost"))
      .mockResolvedValueOnce(createStreamResponse() as Response);

    const { unmount } = renderHook(() => useNotificationStream(true));
    expect(fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_000);
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(2);

    unmount();
  });

  it("clears auth when the SSE endpoint returns unauthorized", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      body: null,
    } as Response);

    renderHook(() => useNotificationStream(true));

    await waitFor(() => {
      expect(notificationStreamMocks.clearAuth).toHaveBeenCalledTimes(1);
    });
  });
});
