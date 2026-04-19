import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfileResponse } from "@/features/profile/model";

const profileInfoMocks = vi.hoisted(() => ({
  patchMyProfileDetailsApi: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  getApiErrorCode: vi.fn(() => null),
  getApiErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback),
}));

vi.mock("@/features/profile/api", () => ({
  patchMyProfileDetailsApi: profileInfoMocks.patchMyProfileDetailsApi,
}));

vi.mock("sonner", () => ({
  toast: profileInfoMocks.toast,
}));

vi.mock("@/shared/api/client", () => ({
  getApiErrorCode: profileInfoMocks.getApiErrorCode,
  getApiErrorMessage: profileInfoMocks.getApiErrorMessage,
}));

import { ProfileInfoSection } from "@/features/profile/components/ProfileInfoSection";

const buildProfile = (
  overrides: Partial<UserProfileResponse> = {},
): UserProfileResponse => ({
  accountId: 1,
  userId: 2,
  email: "member@fitpal.com",
  emailVerified: true,
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
  linkedAuthProviders: ["LOCAL"],
  hasSubscription: true,
  hasActiveSubscription: true,
  hasDashboardAccess: true,
  ...overrides,
});

describe("ProfileInfoSection (FE-PROFILE-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates trimmed profile details and notifies the parent refresh callback", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <ProfileInfoSection profile={buildProfile()} onUpdate={onUpdate} />,
    );

    await user.click(screen.getByRole("button", { name: /edit/i }));

    const usernameInput = screen.getByLabelText("Username");
    await user.clear(usernameInput);
    await user.type(usernameInput, "  stronger_member  ");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(profileInfoMocks.patchMyProfileDetailsApi).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: "stronger_member",
          firstName: "Fit",
          lastName: "Pal",
          phoneNo: "9812345678",
          dob: "1998-04-18",
          gender: "MALE",
          height: 175,
          weight: 72,
          fitnessLevel: "INTERMEDIATE",
          primaryFitnessFocus: "STRENGTH_POWER",
        }),
      );
    });

    expect(profileInfoMocks.toast.success).toHaveBeenCalledWith(
      "Profile information updated successfully",
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("surfaces duplicate username feedback from the API", async () => {
    const user = userEvent.setup();
    profileInfoMocks.getApiErrorCode.mockReturnValue("DUPLICATE_USERNAME");
    profileInfoMocks.patchMyProfileDetailsApi.mockRejectedValueOnce(
      new Error("duplicate"),
    );

    render(
      <ProfileInfoSection profile={buildProfile()} onUpdate={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /edit/i }));
    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "duplicate_user");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText("Username is already taken"),
    ).toBeInTheDocument();
    expect(profileInfoMocks.toast.error).toHaveBeenCalledWith(
      "Username is already taken",
    );
  });
});
