import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfileResponse } from "@/features/profile/model";

const profileImageMocks = vi.hoisted(() => ({
  uploadProfileImageApi: vi.fn(),
  deleteProfileImageApi: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  getApiErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback),
}));

vi.mock("@/features/profile/api", () => ({
  uploadProfileImageApi: profileImageMocks.uploadProfileImageApi,
  deleteProfileImageApi: profileImageMocks.deleteProfileImageApi,
}));

vi.mock("sonner", () => ({
  toast: profileImageMocks.toast,
}));

vi.mock("@/shared/api/client", () => ({
  getApiErrorMessage: profileImageMocks.getApiErrorMessage,
}));

import { ProfileImageSection } from "@/features/profile/components/ProfileImageSection";

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

describe("ProfileImageSection (FE-PROFILE-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "URL",
      Object.assign(globalThis.URL, {
        createObjectURL: vi.fn(() => "blob:profile-preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
  });

  it("rejects unsupported files and uploads valid images", async () => {
    const onUpdate = vi.fn();
    render(
      <ProfileImageSection profile={buildProfile()} onUpdate={onUpdate} />,
    );

    const input = screen.getAllByLabelText("Upload profile image")[1];
    const invalidFile = new File(["bad"], "avatar.gif", { type: "image/gif" });
    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(profileImageMocks.toast.error).toHaveBeenCalledWith(
      "Upload a JPEG or PNG image",
    );

    const validFile = new File(["ok"], "avatar.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(profileImageMocks.uploadProfileImageApi).toHaveBeenCalledWith(
        validFile,
      );
    });

    expect(profileImageMocks.toast.success).toHaveBeenCalledWith(
      "Profile image updated successfully",
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("removes an existing profile image", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <ProfileImageSection
        profile={buildProfile({
          profileImageUrl: "https://cdn.fitpal.test/profile.jpg",
        })}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole("button", { name: /remove profile image/i }));

    await waitFor(() => {
      expect(profileImageMocks.deleteProfileImageApi).toHaveBeenCalledTimes(1);
    });

    expect(profileImageMocks.toast.success).toHaveBeenCalledWith(
      "Profile image removed successfully",
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
