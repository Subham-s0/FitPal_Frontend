import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const profileSetupMocks = vi.hoisted(() => ({
  authState: {
    accessToken: "token",
    accountId: 1,
    email: "member@fitpal.com",
    role: "USER",
    providers: ["LOCAL"],
    profileCompleted: false,
    emailVerified: true,
    submittedForReview: false,
    approved: true,
    hasSubscription: false,
    hasActiveSubscription: false,
    hasDashboardAccess: false,
  },
  navigate: vi.fn(),
}));

vi.mock("@/features/auth/hooks", () => ({
  useAuthState: () => profileSetupMocks.authState,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => profileSetupMocks.navigate,
  };
});

vi.mock("@/features/profile/screens/UserProfileSetup", () => ({
  default: () => <div>USER SETUP SCREEN</div>,
}));

vi.mock("@/features/profile/screens/GymProfileSetup", () => ({
  default: () => <div>GYM SETUP SCREEN</div>,
}));

import ProfileSetupEntry from "@/pages/ProfileSetupEntry";

const resetAuthState = () => {
  Object.assign(profileSetupMocks.authState, {
    accessToken: "token",
    accountId: 1,
    email: "member@fitpal.com",
    role: "USER",
    providers: ["LOCAL"],
    profileCompleted: false,
    emailVerified: true,
    submittedForReview: false,
    approved: true,
    hasSubscription: false,
    hasActiveSubscription: false,
    hasDashboardAccess: false,
  });
  profileSetupMocks.navigate.mockReset();
};

describe("ProfileSetupEntry", () => {
  beforeEach(() => {
    resetAuthState();
  });

  it("renders the user setup flow for member accounts", () => {
    render(<ProfileSetupEntry />);

    expect(screen.getByText("USER SETUP SCREEN")).toBeInTheDocument();
    expect(profileSetupMocks.navigate).not.toHaveBeenCalled();
  });

  it("renders the gym setup flow for gym accounts", () => {
    Object.assign(profileSetupMocks.authState, {
      role: "GYM",
    });

    render(<ProfileSetupEntry />);

    expect(screen.getByText("GYM SETUP SCREEN")).toBeInTheDocument();
    expect(profileSetupMocks.navigate).not.toHaveBeenCalled();
  });

  it("redirects completed members with dashboard access back to the dashboard", async () => {
    Object.assign(profileSetupMocks.authState, {
      role: "USER",
      profileCompleted: true,
      hasSubscription: true,
      hasActiveSubscription: true,
      hasDashboardAccess: true,
    });

    render(<ProfileSetupEntry />);

    await waitFor(() => {
      expect(profileSetupMocks.navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });
});
