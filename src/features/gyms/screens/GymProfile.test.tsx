import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  PublicGymProfileResponse,
  PublicGymReviewPageResponse,
  UserGymProfileViewResponse,
} from "@/features/gyms/model";
import { renderWithProviders } from "@/test/test-utils";

const gymProfileMocks = vi.hoisted(() => ({
  useAuthState: vi.fn(),
  getPublicGymProfileApi: vi.fn(),
  getPublicGymReviewsApi: vi.fn(),
  getUserGymProfileViewApi: vi.fn(),
  getMyGymReviewApi: vi.fn(),
  createGymReviewApi: vi.fn(),
  updateMyGymReviewApi: vi.fn(),
  deleteMyGymReviewApi: vi.fn(),
  saveMyGymApi: vi.fn(),
  unsaveMyGymApi: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/auth/hooks", () => ({
  useAuthState: () => gymProfileMocks.useAuthState(),
}));

vi.mock("@/features/gyms/api", () => ({
  getPublicGymProfileApi: gymProfileMocks.getPublicGymProfileApi,
  getPublicGymReviewsApi: gymProfileMocks.getPublicGymReviewsApi,
  getUserGymProfileViewApi: gymProfileMocks.getUserGymProfileViewApi,
  getMyGymReviewApi: gymProfileMocks.getMyGymReviewApi,
  createGymReviewApi: gymProfileMocks.createGymReviewApi,
  updateMyGymReviewApi: gymProfileMocks.updateMyGymReviewApi,
  deleteMyGymReviewApi: gymProfileMocks.deleteMyGymReviewApi,
  saveMyGymApi: gymProfileMocks.saveMyGymApi,
  unsaveMyGymApi: gymProfileMocks.unsaveMyGymApi,
}));

vi.mock("@/features/marketing/components/Navbar", () => ({
  default: () => <div data-testid="marketing-navbar" />,
}));

vi.mock("@/features/user-dashboard/components/UserLayout", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

vi.mock("@/shared/layout/dashboard-shell", () => ({
  DefaultLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
  getDashboardRole: (role: string | null | undefined) => {
    const normalized = role?.toUpperCase();
    if (normalized === "GYM") return "GYM";
    if (normalized === "ADMIN" || normalized === "SUPERADMIN") return "ADMIN";
    return "USER";
  },
}));

vi.mock("sonner", () => ({
  toast: gymProfileMocks.toast,
}));

import GymProfile from "@/features/gyms/screens/GymProfile";

const buildPublicGymProfile = (
  overrides: Partial<PublicGymProfileResponse> = {},
): PublicGymProfileResponse => ({
  gymId: 101,
  gymName: "FitPal Arena",
  addressLine: "Durbar Marg",
  city: "Kathmandu",
  country: "Nepal",
  postalCode: "44600",
  latitude: null,
  longitude: null,
  establishedAt: 2021,
  description: "Strength and conditioning hub",
  phoneNo: "9812345678",
  contactEmail: "hello@fitpalarena.com",
  websiteUrl: null,
  logoUrl: null,
  currentlyOpen: true,
  opensAt: null,
  closesAt: null,
  activeCheckIns: 14,
  maxCapacity: 120,
  occupancyPercent: 35,
  occupancyLabel: "Comfortable",
  rating: 4.7,
  reviewCount: 0,
  minimumAccessTier: "PRO",
  checkInEnabled: true,
  checkInAccessMode: "MANUAL",
  allowedCheckInRadiusMeters: 150,
  photos: [],
  ...overrides,
});

const buildReviewPage = (
  overrides: Partial<PublicGymReviewPageResponse> = {},
): PublicGymReviewPageResponse => ({
  items: [],
  page: 0,
  size: 8,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
  ...overrides,
});

const buildMemberProfileView = (
  overrides: Partial<UserGymProfileViewResponse> = {},
): UserGymProfileViewResponse => ({
  profile: buildPublicGymProfile(),
  isSaved: false,
  accessibleByCurrentUser: true,
  distanceMeters: null,
  ...overrides,
});

const renderGymProfile = (route = "/gyms/101") =>
  renderWithProviders(
    <Routes>
      <Route path="/gyms/:id" element={<GymProfile />} />
    </Routes>,
    { route },
  );

describe("GymProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gymProfileMocks.getPublicGymReviewsApi.mockResolvedValue(buildReviewPage());
    gymProfileMocks.getMyGymReviewApi.mockResolvedValue(null);
  });

  it("renders public gym profile and detail fallbacks safely when optional data is missing", async () => {
    gymProfileMocks.useAuthState.mockReturnValue({
      accessToken: null,
      role: null,
    });
    gymProfileMocks.getPublicGymProfileApi.mockResolvedValue(
      buildPublicGymProfile(),
    );

    renderGymProfile();

    expect(await screen.findByText("Gym Reviews")).toBeInTheDocument();
    expect(screen.getByText("Schedule unavailable")).toBeInTheDocument();
    expect(screen.getAllByText("No location")).toHaveLength(2);
    expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("No community reviews on this page."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /get started/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search reviews..."),
    ).toBeInTheDocument();
  });

  it("renders member gym profile details with check-in and review affordances", async () => {
    gymProfileMocks.useAuthState.mockReturnValue({
      accessToken: "member-token",
      role: "USER",
    });
    gymProfileMocks.getUserGymProfileViewApi.mockResolvedValue(
      buildMemberProfileView(),
    );

    renderGymProfile();

    expect(
      await screen.findByRole("button", { name: /check in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /write review/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search reviews..."),
    ).toBeInTheDocument();
  });
});
