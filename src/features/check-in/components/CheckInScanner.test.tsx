import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GymCheckInResponse } from "@/features/check-in/model";

const checkInScreenMocks = vi.hoisted(() => ({
  getMyCheckInsApi: vi.fn(),
  scanMyCheckInApi: vi.fn(),
  checkOutMyCheckInApi: vi.fn(),
  refreshCheckInState: vi.fn(),
  syncCheckInVisitCache: vi.fn(),
}));

const zxingMocks = vi.hoisted(() => {
  class MockLuminanceSource {
    variant: "normal" | "inverted";

    constructor(variant: "normal" | "inverted" = "normal") {
      this.variant = variant;
    }

    invert() {
      return new MockLuminanceSource("inverted");
    }
  }

  class MockHTMLCanvasElementLuminanceSource extends MockLuminanceSource {
    constructor(_canvas: HTMLCanvasElement) {
      super("normal");
    }
  }

  class MockHybridBinarizer {
    source: MockLuminanceSource;

    constructor(source: MockLuminanceSource) {
      this.source = source;
    }
  }

  class MockBinaryBitmap {
    source: MockLuminanceSource;

    constructor(binarizer: MockHybridBinarizer) {
      this.source = binarizer.source;
    }
  }

  return {
    decodeFromImageUrl: vi.fn(),
    decodeBitmap: vi.fn(),
    reset: vi.fn(),
    MockLuminanceSource,
    MockHTMLCanvasElementLuminanceSource,
    MockHybridBinarizer,
    MockBinaryBitmap,
  };
});

vi.mock("@/features/check-in/api", () => ({
  getMyCheckInsApi: checkInScreenMocks.getMyCheckInsApi,
  scanMyCheckInApi: checkInScreenMocks.scanMyCheckInApi,
  checkOutMyCheckInApi: checkInScreenMocks.checkOutMyCheckInApi,
}));

vi.mock("@/features/check-in/cache", () => ({
  refreshCheckInState: checkInScreenMocks.refreshCheckInState,
  syncCheckInVisitCache: checkInScreenMocks.syncCheckInVisitCache,
}));

vi.mock("@yudiel/react-qr-scanner", () => ({
  Scanner: ({
    children,
    onScan,
    styles,
  }: {
    children?: ReactNode;
    onScan: (codes: Array<{ rawValue?: string }>) => void;
    styles?: { video?: { transform?: string } };
  }) => (
    <div
      data-testid="mock-qr-scanner"
      data-video-transform={styles?.video?.transform ?? "none"}
    >
      <button type="button" onClick={() => onScan([{ rawValue: "gym-qr-token" }])}>
        Mock QR Read
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@zxing/library", () => {
  class BrowserQRCodeReader {
    hints: Map<unknown, unknown> | undefined;

    decodeFromImageUrl = zxingMocks.decodeFromImageUrl;
    decodeBitmap = zxingMocks.decodeBitmap;
    reset = zxingMocks.reset;
  }

  return {
    BarcodeFormat: {
      QR_CODE: "QR_CODE",
    },
    BinaryBitmap: zxingMocks.MockBinaryBitmap,
    BrowserQRCodeReader,
    DecodeHintType: {
      POSSIBLE_FORMATS: "POSSIBLE_FORMATS",
      TRY_HARDER: "TRY_HARDER",
    },
    HTMLCanvasElementLuminanceSource: zxingMocks.MockHTMLCanvasElementLuminanceSource,
    HybridBinarizer: zxingMocks.MockHybridBinarizer,
    LuminanceSource: zxingMocks.MockLuminanceSource,
  };
});

import CheckInScanner from "@/features/check-in/components/CheckInScanner";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createVisit = (overrides: Partial<GymCheckInResponse> = {}): GymCheckInResponse => ({
  checkInId: "visit-1",
  gymId: 12,
  gymName: "FitPal Gym",
  gymLogoUrl: null,
  checkInAt: "2026-04-18T10:00:00.000Z",
  checkOutAt: null,
  status: "CHECKED_IN",
  denyReason: null,
  membershipTierAtCheckIn: "PRO",
  withinRadius: true,
  radiusMetersAtCheckIn: 50,
  message: "Door opened",
  ...overrides,
});

const renderScanner = () => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckInScanner />
    </QueryClientProvider>,
  );
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("CheckInScanner frontend flows (FE-CHECKIN-01, FE-CHECKIN-02, FE-CHECKIN-03, FE-CHECKIN-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkInScreenMocks.getMyCheckInsApi.mockResolvedValue([]);
    checkInScreenMocks.refreshCheckInState.mockResolvedValue(undefined);
    checkInScreenMocks.syncCheckInVisitCache.mockImplementation(() => {});
    zxingMocks.decodeFromImageUrl.mockReset();
    zxingMocks.decodeBitmap.mockReset();
    zxingMocks.reset.mockReset();
  });

  it(
    "switches between scanner and image modes while opening, closing, and mirroring the live scanner",
    async () => {
      const user = userEvent.setup();

      renderScanner();

      expect(await screen.findByText("No active session")).toBeInTheDocument();
      expect(screen.getByText("Scanner idle")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /activate scanner/i }));
      expect(screen.getByTestId("mock-qr-scanner")).toHaveAttribute("data-video-transform", "scaleX(-1)");
      expect(screen.getByText("Camera active")).toBeInTheDocument();

      await user.click(screen.getByTitle("Flip camera horizontally"));
      expect(screen.getByTestId("mock-qr-scanner")).toHaveAttribute("data-video-transform", "none");

      await user.click(screen.getByRole("button", { name: /close scanner/i }));
      expect(screen.queryByTestId("mock-qr-scanner")).not.toBeInTheDocument();
      expect(screen.getByText("Scanner idle")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /qr image/i }));
      expect(screen.getByText("Image upload idle")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /qr scanner/i }));
      expect(screen.getByText("Scanner idle")).toBeInTheDocument();
    },
    10000,
  );

  it("shows verification feedback and success state after a QR scan is accepted", async () => {
    const user = userEvent.setup();
    const deferredScan = createDeferred<GymCheckInResponse>();
    checkInScreenMocks.scanMyCheckInApi.mockReturnValue(deferredScan.promise);

    renderScanner();

    expect(await screen.findByText("No active session")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /activate scanner/i }));
    await user.click(screen.getByRole("button", { name: /mock qr read/i }));

    expect(await screen.findByText("Verifying access")).toBeInTheDocument();
    expect(checkInScreenMocks.scanMyCheckInApi).toHaveBeenCalledWith({
      qrToken: "gym-qr-token",
      latitude: null,
      longitude: null,
      deviceInfo: expect.any(String),
    });

    deferredScan.resolve(createVisit({ status: "CHECKED_IN" }));

    expect((await screen.findAllByText("Access Granted")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Door opened").length).toBeGreaterThan(0);
    expect(checkInScreenMocks.syncCheckInVisitCache).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      checkInId: "visit-1",
      status: "CHECKED_IN",
    }));
    expect(checkInScreenMocks.refreshCheckInState).toHaveBeenCalledTimes(1);
  });

  it("renders access-pending, denied, and checked-out visit states with the correct actions and helper text", async () => {
    checkInScreenMocks.getMyCheckInsApi.mockResolvedValueOnce([
      createVisit({
        status: "ACCESS_PENDING",
        message: "Door confirmation required",
      }),
    ]);

    const pendingRender = renderScanner();

    expect(await screen.findByText("Waiting for door confirmation...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scan again/i })).toBeInTheDocument();

    pendingRender.unmount();

    checkInScreenMocks.getMyCheckInsApi.mockResolvedValueOnce([
      createVisit({
        status: "DENIED",
        denyReason: "NO_ACTIVE_SUBSCRIPTION",
        message: null,
      }),
    ]);

    const deniedRender = renderScanner();

    expect(await screen.findByText("Last scan was denied")).toBeInTheDocument();
    expect(screen.getByText("No Active Subscription")).toBeInTheDocument();

    deniedRender.unmount();

    checkInScreenMocks.getMyCheckInsApi.mockResolvedValueOnce([
      createVisit({
        status: "CHECKED_OUT",
        checkOutAt: "2026-04-18T11:15:00.000Z",
      }),
    ]);

    renderScanner();

    expect(await screen.findByText("Checked Out")).toBeInTheDocument();
    expect(screen.getByText("FitPal Gym")).toBeInTheDocument();
    expect(screen.getByText("Out")).toBeInTheDocument();
  });

  it("submits checkout for an active session and refreshes cache-backed visit state", async () => {
    const user = userEvent.setup();
    checkInScreenMocks.getMyCheckInsApi.mockResolvedValueOnce([
      createVisit({ status: "CHECKED_IN" }),
    ]);
    checkInScreenMocks.checkOutMyCheckInApi.mockResolvedValueOnce(
      createVisit({
        status: "CHECKED_OUT",
        checkOutAt: "2026-04-18T11:15:00.000Z",
        message: "Session closed",
      }),
    );

    renderScanner();

    await screen.findByText("FitPal Gym");
    await user.click(screen.getByRole("button", { name: /check out/i }));

    await waitFor(() => {
      expect(checkInScreenMocks.checkOutMyCheckInApi).toHaveBeenCalledWith("visit-1", {
        latitude: null,
        longitude: null,
      });
    });

    expect(await screen.findByText("Checked Out")).toBeInTheDocument();
    expect(screen.getByText("Session closed")).toBeInTheDocument();
    expect(checkInScreenMocks.syncCheckInVisitCache).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      checkInId: "visit-1",
      status: "CHECKED_OUT",
    }));
    expect(checkInScreenMocks.refreshCheckInState).toHaveBeenCalledTimes(1);
  });

  it("uploads a QR image and falls back to inverted decoding before verifying access", async () => {
    const user = userEvent.setup();
    checkInScreenMocks.scanMyCheckInApi.mockResolvedValueOnce(
      createVisit({
        status: "CHECKED_IN",
        message: "Door opened from uploaded image",
      }),
    );

    zxingMocks.decodeFromImageUrl.mockRejectedValueOnce(new Error("Primary decode failed"));
    zxingMocks.decodeBitmap.mockImplementation((bitmap: { source: { variant: string } }) => {
      if (bitmap.source.variant === "normal") {
        throw new Error("Normal luminance decode failed");
      }

      return {
        getText: () => "gym-image-token",
      };
    });

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalImage = globalThis.Image;

    URL.createObjectURL = vi.fn(() => "blob:mock-qr-image");
    URL.revokeObjectURL = vi.fn();
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () =>
        ({
          drawImage: vi.fn(),
        }) as unknown as CanvasRenderingContext2D,
    );

    class MockImage {
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event | string) => void) | null = null;
      decoding = "async";
      naturalWidth = 320;
      naturalHeight = 320;
      width = 320;
      height = 320;

      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.(new Event("load"));
        });
      }
    }

    globalThis.Image = MockImage as unknown as typeof Image;

    try {
      renderScanner();

      expect(await screen.findByText("No active session")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /qr image/i }));

      const fileInput = document.querySelector("input[type='file']");
      expect(fileInput).toBeInstanceOf(HTMLInputElement);

      await user.upload(
        fileInput as HTMLInputElement,
        new File(["mock-qr"], "gym-qr.png", { type: "image/png" }),
      );

      await waitFor(() => {
        expect(checkInScreenMocks.scanMyCheckInApi).toHaveBeenCalledWith({
          qrToken: "gym-image-token",
          latitude: null,
          longitude: null,
          deviceInfo: expect.any(String),
        });
      });

      expect((await screen.findAllByText("Access Granted")).length).toBeGreaterThan(0);
      expect((await screen.findAllByText("Door opened from uploaded image")).length).toBeGreaterThan(0);
      expect(zxingMocks.decodeBitmap).toHaveBeenCalledTimes(2);
      expect(zxingMocks.reset).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-qr-image");
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      globalThis.Image = originalImage;
    }
  });
});
