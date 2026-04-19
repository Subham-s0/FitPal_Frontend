import type { ReactNode } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfileResponse } from "@/features/profile/model";
import { renderWithProviders } from "@/test/test-utils";

const settingsMocks = vi.hoisted(() => ({
  getMyProfileApi: vi.fn(),
  requestMyEmailVerificationApi: vi.fn(),
  confirmMyEmailVerificationApi: vi.fn(),
  updateOnboardingStatus: vi.fn(),
  successToast: vi.fn(),
  errorToast: vi.fn(),
  useAuthState: vi.fn(),
  otpCountdown: {
    isActive: true,
    formattedTime: "05:00",
    start: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock("@/features/profile/api", () => ({
  getMyProfileApi: settingsMocks.getMyProfileApi,
  requestMyEmailVerificationApi: settingsMocks.requestMyEmailVerificationApi,
  confirmMyEmailVerificationApi: settingsMocks.confirmMyEmailVerificationApi,
}));

vi.mock("@/features/auth/hooks", () => ({
  useAuthState: () => settingsMocks.useAuthState(),
}));

vi.mock("@/features/auth/store", () => ({
  authStore: {
    updateOnboardingStatus: settingsMocks.updateOnboardingStatus,
  },
}));

vi.mock("@/shared/hooks/useOtpCountdown", () => ({
  useOtpCountdown: () => settingsMocks.otpCountdown,
}));

vi.mock("@/shared/lib/toast-helpers", () => ({
  showApiSuccessToast: settingsMocks.successToast,
  showApiErrorToast: settingsMocks.errorToast,
}));

vi.mock("@/features/user-dashboard/components/UserLayout", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

vi.mock("@/features/user-dashboard/components/UserSectionShell", () => ({
  default: ({
    title,
    description,
    children,
  }: {
    title: ReactNode;
    description: string;
    children: ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

vi.mock("@/features/profile/components/ProfileRoutineSettings", () => ({
  default: () => <div>ROUTINE SETTINGS PANEL</div>,
}));

vi.mock("@/features/profile/components/ProfileSecurityModal", () => ({
  default: ({
    open,
    mode,
  }: {
    open: boolean;
    mode: "change" | "forgot";
  }) => (open ? <div>{mode === "change" ? "CHANGE PASSWORD" : "RESET PASSWORD"}</div> : null),
}));

import SettingsScreen from "@/features/profile/screens/Settings";

const buildProfile = (
  overrides: Partial<UserProfileResponse> = {},
): UserProfileResponse => ({
  accountId: 1,
  userId: 2,
  email: "member@fitpal.com",
  emailVerified: false,
  userName: "fitpalmember",
  firstName: "Fit",
  lastName: "Pal",
  onboardingStep: 3,
  profileCompleted: true,
  phoneNo: "9812345678",
  dob: "1998-04-18",
  gender: "MALE",
  height: 175,
  weight: 72,
  fitnessLevel: "INTERMEDIATE",
  primaryFitnessFocus: "STRENGTH_POWER",
  profileImageUrl: null,
  profileImagePublicId: null,
  profileImageResourceType: null,
  linkedAuthProviders: ["LOCAL", "GOOGLE"],
  hasSubscription: true,
  hasActiveSubscription: true,
  hasDashboardAccess: true,
  ...overrides,
});

const renderSettings = (route = "/settings") =>
  renderWithProviders(
    <Routes>
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/payments" element={<div>PAYMENTS DESTINATION</div>} />
      <Route path="/membership" element={<div>MEMBERSHIP DESTINATION</div>} />
    </Routes>,
    { route },
  );

describe("Settings screen (FE-PROFILE-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsMocks.useAuthState.mockReturnValue({
      providers: ["LOCAL", "GOOGLE"],
    });
  });

  it("requests email verification, confirms the OTP, and syncs auth state", async () => {
    const user = userEvent.setup();
    settingsMocks.getMyProfileApi
      .mockResolvedValueOnce(buildProfile())
      .mockResolvedValueOnce(buildProfile({ emailVerified: true }));
    settingsMocks.requestMyEmailVerificationApi.mockResolvedValue({
      expiresInSeconds: 300,
    });
    settingsMocks.confirmMyEmailVerificationApi.mockResolvedValue({
      profileCompleted: true,
      hasSubscription: true,
      hasActiveSubscription: true,
      hasDashboardAccess: true,
      emailVerified: true,
      linkedAuthProviders: ["LOCAL", "GOOGLE"],
    });

    renderSettings();

    await user.click(
      await screen.findByRole("button", { name: /security/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /verify email/i }),
    );

    await waitFor(() => {
      expect(settingsMocks.requestMyEmailVerificationApi).toHaveBeenCalledTimes(
        1,
      );
    });
    expect(settingsMocks.otpCountdown.start).toHaveBeenCalledWith(300);

    await user.type(screen.getByPlaceholderText("Enter 6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: /confirm otp/i }));

    await waitFor(() => {
      expect(settingsMocks.confirmMyEmailVerificationApi).toHaveBeenCalledWith({
        otp: "123456",
      });
      expect(settingsMocks.updateOnboardingStatus).toHaveBeenCalledWith({
        profileCompleted: true,
        hasSubscription: true,
        hasActiveSubscription: true,
        hasDashboardAccess: true,
        providers: ["LOCAL", "GOOGLE"],
        emailVerified: true,
      });
    });

    expect(settingsMocks.successToast).toHaveBeenCalledWith(
      "Email verified successfully",
    );
    expect(screen.getByText("Email & Password")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
  });

  it("redirects the payments querystring shortcut to the payments page", async () => {
    settingsMocks.getMyProfileApi.mockResolvedValue(buildProfile());

    renderSettings("/settings?tab=payments");

    expect(await screen.findByText("PAYMENTS DESTINATION")).toBeInTheDocument();
  });
});
