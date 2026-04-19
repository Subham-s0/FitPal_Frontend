import { act, renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGymsRecommendation } from "@/features/gyms/hooks/useGymsRecommendation";
import type { UserGymDiscoverResponse } from "@/features/gyms/model";

const gymsRecommendationMocks = vi.hoisted(() => ({
  getMySavedGymCountApi: vi.fn(),
  getPublicGymDiscoverApi: vi.fn(),
  getUserGymDiscoverApi: vi.fn(),
  saveMyGymApi: vi.fn(),
  unsaveMyGymApi: vi.fn(),
}));

vi.mock("@/features/gyms/api", () => ({
  getMySavedGymCountApi: gymsRecommendationMocks.getMySavedGymCountApi,
  getPublicGymDiscoverApi: gymsRecommendationMocks.getPublicGymDiscoverApi,
  getUserGymDiscoverApi: gymsRecommendationMocks.getUserGymDiscoverApi,
  saveMyGymApi: gymsRecommendationMocks.saveMyGymApi,
  unsaveMyGymApi: gymsRecommendationMocks.unsaveMyGymApi,
}));

const originalGeolocation = navigator.geolocation;
const originalPermissions = navigator.permissions;

const createGym = (
  overrides: Partial<UserGymDiscoverResponse> = {},
): UserGymDiscoverResponse => ({
  gymId: 1,
  gymName: "Iron Temple",
  addressLine: "Durbar Marg",
  city: "Kathmandu",
  latitude: 27.7172,
  longitude: 85.324,
  distanceMeters: 850,
  currentlyOpen: true,
  occupancyPercent: 42,
  occupancyLabel: "Moderate",
  activeCheckIns: 12,
  maxCapacity: 40,
  rating: 4.8,
  reviewCount: 31,
  minimumAccessTier: "BASIC",
  checkInEnabled: true,
  coverPhotoUrl: null,
  logoUrl: null,
  isSaved: false,
  accessibleByCurrentUser: true,
  ...overrides,
});

const createPage = (items: UserGymDiscoverResponse[]) => ({
  items,
  page: 0,
  size: 100,
  totalItems: items.length,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
});

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

const createWrapper = () => {
  const queryClient = createQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const installLocationEnvironment = ({
  permissionState = "prompt",
  geolocation,
}: {
  permissionState?: "prompt" | "granted" | "denied";
  geolocation?: Geolocation;
}) => {
  Object.defineProperty(window.navigator, "permissions", {
    configurable: true,
    value: {
      query: vi.fn().mockResolvedValue({ state: permissionState }),
    },
  });

  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: geolocation,
  });
};

const createGeolocation = ({
  onGetCurrentPosition,
}: {
  onGetCurrentPosition?: Geolocation["getCurrentPosition"];
} = {}): Geolocation =>
  ({
    getCurrentPosition:
      onGetCurrentPosition ??
      ((success) =>
        success({
          coords: {
            latitude: 27.7172,
            longitude: 85.324,
            accuracy: 1,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        } as GeolocationPosition)),
    watchPosition: vi.fn(() => 77),
    clearWatch: vi.fn(),
  }) as Geolocation;

describe("useGymsRecommendation hook (FE-DISC-02, FE-DISC-03, FE-DISC-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: originalGeolocation,
    });
    Object.defineProperty(window.navigator, "permissions", {
      configurable: true,
      value: originalPermissions,
    });
  });

  it("opens the location prompt for best-match mode, applies the requested mode after grant, and fails closed when geolocation is unsupported", async () => {
    installLocationEnvironment({
      permissionState: "prompt",
      geolocation: createGeolocation(),
    });
    gymsRecommendationMocks.getUserGymDiscoverApi.mockResolvedValue(
      createPage([createGym()]),
    );
    gymsRecommendationMocks.getMySavedGymCountApi.mockResolvedValue({
      count: 0,
    });

    const { result, unmount } = renderHook(() => useGymsRecommendation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.locationPermission).toBe("prompt");
      expect(gymsRecommendationMocks.getUserGymDiscoverApi).toHaveBeenCalled();
    });

    act(() => {
      result.current.setMode("best-match");
    });

    expect(result.current.mode).toBe("show-all");
    expect(result.current.isLocationPopupOpen).toBe(true);
    expect(result.current.requestedLocationMode).toBe("best-match");

    await act(async () => {
      const granted = await result.current.requestLocation();
      expect(granted).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.locationPermission).toBe("granted");
      expect(result.current.mode).toBe("best-match");
      expect(result.current.userCoords).toEqual({
        lat: 27.7172,
        lng: 85.324,
      });
    });

    expect(result.current.isLocationPopupOpen).toBe(false);
    expect(result.current.requestedLocationMode).toBeNull();

    unmount();

    installLocationEnvironment({
      permissionState: "prompt",
      geolocation: undefined,
    });

    const { result: unsupportedResult } = renderHook(
      () => useGymsRecommendation(),
      {
        wrapper: createWrapper(),
      },
    );

    await act(async () => {
      const granted = await unsupportedResult.current.requestLocation();
      expect(granted).toBe(false);
    });

    expect(unsupportedResult.current.locationPermission).toBe("unsupported");
    expect(unsupportedResult.current.mode).toBe("show-all");
  });

  it("keeps filter state in sync with discovery queries and clears a selected gym when refreshed results no longer contain it", async () => {
    installLocationEnvironment({
      permissionState: "prompt",
      geolocation: createGeolocation(),
    });

    const firstGym = createGym({ gymId: 1, gymName: "Iron Temple" });
    const secondGym = createGym({
      gymId: 2,
      gymName: "Summit Fitness",
      city: "Lalitpur",
      isSaved: true,
    });

    gymsRecommendationMocks.getMySavedGymCountApi.mockResolvedValue({
      count: 1,
    });
    gymsRecommendationMocks.getUserGymDiscoverApi.mockImplementation(
      async (request: {
        query?: string;
        savedOnly?: boolean;
        status?: string;
        sort?: string;
      }) =>
        request.query === "Iron"
          ? createPage([firstGym])
          : createPage([firstGym, secondGym]),
    );

    const { result } = renderHook(() => useGymsRecommendation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.gyms).toHaveLength(2);
      expect(result.current.savedGymCount).toBe(1);
    });

    act(() => {
      result.current.selectGym(secondGym);
    });

    expect(result.current.selectedGym?.gymId).toBe(2);
    expect(result.current.sheetSnap).toBe("compact");

    act(() => {
      result.current.toggleSavedOnly();
      result.current.setStatusFilter("open");
      result.current.setSortMode("alphabetical");
      result.current.setSearchQuery("Iron");
    });

    await waitFor(() => {
      expect(
        gymsRecommendationMocks.getUserGymDiscoverApi,
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: "Iron",
          savedOnly: true,
          status: "open",
          sort: "alphabetical",
        }),
      );
      expect(result.current.showSavedOnly).toBe(true);
      expect(result.current.statusFilter).toBe("open");
      expect(result.current.sortMode).toBe("alphabetical");
      expect(result.current.selectedGym).toBeNull();
      expect(result.current.sheetSnap).toBe("closed");
    });
  });

  it("applies optimistic saved-state updates, keeps the count in sync, and rolls back after a failed unsave mutation", async () => {
    installLocationEnvironment({
      permissionState: "prompt",
      geolocation: createGeolocation(),
    });

    let savedCount = 0;
    let serverGyms = [createGym({ gymId: 1, gymName: "Iron Temple" })];

    gymsRecommendationMocks.getMySavedGymCountApi.mockImplementation(
      async () => ({ count: savedCount }),
    );
    gymsRecommendationMocks.getUserGymDiscoverApi.mockImplementation(
      async () => createPage(serverGyms),
    );
    gymsRecommendationMocks.saveMyGymApi.mockImplementation(async () => {
      savedCount = 1;
      serverGyms = [createGym({ gymId: 1, gymName: "Iron Temple", isSaved: true })];
      return {
        savedGymId: 200,
        gymId: 1,
        gymName: "Iron Temple",
        addressLine: "Durbar Marg",
        city: "Kathmandu",
        country: "Nepal",
        latitude: 27.7172,
        longitude: 85.324,
        minimumAccessTier: "BASIC",
        checkInEnabled: true,
        logoUrl: null,
        savedAt: "2026-04-18T00:00:00Z",
      };
    });
    gymsRecommendationMocks.unsaveMyGymApi.mockRejectedValue(
      new Error("Gateway timeout"),
    );

    const { result } = renderHook(() => useGymsRecommendation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.gyms[0]?.isSaved).toBe(false);
      expect(result.current.savedGymCount).toBe(0);
    });

    act(() => {
      result.current.toggleSavedGym(1);
    });

    expect(result.current.gyms[0]?.isSaved).toBe(true);
    expect(result.current.savedGymCount).toBe(1);

    await waitFor(() => {
      expect(gymsRecommendationMocks.saveMyGymApi).toHaveBeenCalledWith(1);
    });

    act(() => {
      result.current.toggleSavedGym(1);
    });

    expect(result.current.gyms[0]?.isSaved).toBe(false);
    expect(result.current.savedGymCount).toBe(0);

    await waitFor(() => {
      expect(gymsRecommendationMocks.unsaveMyGymApi).toHaveBeenCalledWith(1);
      expect(result.current.gyms[0]?.isSaved).toBe(true);
      expect(result.current.savedGymCount).toBe(1);
    });
  });
});
