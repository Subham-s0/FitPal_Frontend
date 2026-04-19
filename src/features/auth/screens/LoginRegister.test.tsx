import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthResponse } from "@/features/auth/model";

const authScreenMocks = vi.hoisted(() => ({
  authState: {
    accessToken: null,
    accountId: null,
    email: null,
    role: null,
    providers: [],
    profileCompleted: false,
    emailVerified: false,
    submittedForReview: false,
    approved: false,
    hasSubscription: false,
    hasActiveSubscription: false,
    hasDashboardAccess: false,
  },
  loginMutate: vi.fn(),
  registerUserMutate: vi.fn(),
  registerGymMutate: vi.fn(),
  navigate: vi.fn(),
  setAuth: vi.fn(),
  googleOAuthUrl: "https://accounts.google.test/o/oauth2/v2/auth",
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/features/auth/hooks", () => ({
  useAuthState: () => authScreenMocks.authState,
  useLogin: () => ({ mutate: authScreenMocks.loginMutate, isPending: false }),
  useRegisterUser: () => ({ mutate: authScreenMocks.registerUserMutate, isPending: false }),
  useRegisterGym: () => ({ mutate: authScreenMocks.registerGymMutate, isPending: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => authScreenMocks.navigate,
  };
});

vi.mock("@/shared/api/config", async () => {
  const actual = await vi.importActual<typeof import("@/shared/api/config")>("@/shared/api/config");
  return {
    ...actual,
    buildGoogleOAuthStartUrl: () => authScreenMocks.googleOAuthUrl,
  };
});

vi.mock("sonner", () => ({
  toast: authScreenMocks.toast,
}));

vi.mock("@/features/auth/store", () => ({
  authStore: {
    setAuth: authScreenMocks.setAuth,
  },
}));

vi.mock("@/features/profile/components/ProfileSecurityModal", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>FORGOT PASSWORD MODAL</div> : null),
}));

import LoginRegister from "@/features/auth/screens/LoginRegister";

const createAuthResponse = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
  message: "Signed in successfully",
  accessToken: "token-123",
  tokenType: "Bearer",
  expiresIn: 3600,
  accountId: 10,
  email: "member@fitpal.com",
  role: "USER",
  providers: ["LOCAL"],
  profileCompleted: true,
  emailVerified: true,
  submittedForReview: false,
  approved: true,
  hasSubscription: true,
  hasActiveSubscription: true,
  hasDashboardAccess: true,
  ...overrides,
});

const renderScreen = (initialMode?: "login" | "register") =>
  render(
    <MemoryRouter>
      <LoginRegister initialMode={initialMode} />
    </MemoryRouter>,
  );

describe("LoginRegister screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authScreenMocks.loginMutate.mockReset();
    authScreenMocks.registerUserMutate.mockReset();
    authScreenMocks.registerGymMutate.mockReset();
    authScreenMocks.navigate.mockReset();
    authScreenMocks.setAuth.mockReset();
    authScreenMocks.googleOAuthUrl = "https://accounts.google.test/o/oauth2/v2/auth";
  });

  it("switches from login to register and supports gym registration mode", async () => {
    const user = userEvent.setup();

    renderScreen("login");

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByRole("heading", { name: "Create Account" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Gym" }));

    expect(screen.getByText("Gym sign-up uses email and password only. Google sign-up is available for member accounts.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("FitZone Gym")).toBeInTheDocument();
  });

  it("shows registration validation errors when required fields are missing", async () => {
    const user = userEvent.setup();

    renderScreen("register");

    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("Username must be at least 3 characters")).toBeInTheDocument();
    expect(screen.getByText("Email must be valid")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  it("submits login credentials through the login mutation", async () => {
    const user = userEvent.setup();

    renderScreen("login");

    await user.type(screen.getByPlaceholderText("you@example.com"), "member@fitpal.com");
    await user.type(document.querySelector('input[type="password"]') as HTMLInputElement, "Password123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(authScreenMocks.loginMutate).toHaveBeenCalledTimes(1);
    expect(authScreenMocks.loginMutate.mock.calls[0]?.[0]).toEqual({
      email: "member@fitpal.com",
      password: "Password123!",
    });
  });

  it("navigates to the post-auth route on successful login", async () => {
    const user = userEvent.setup();
    authScreenMocks.loginMutate.mockImplementation((payload, options) => {
      options?.onSuccess?.(createAuthResponse(), payload, undefined);
    });

    renderScreen("login");

    await user.type(screen.getByPlaceholderText("you@example.com"), "member@fitpal.com");
    await user.type(document.querySelector('input[type="password"]') as HTMLInputElement, "Password123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(authScreenMocks.navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    expect(authScreenMocks.toast.success).toHaveBeenCalledWith("Welcome back!");
  });

  it("shows API errors when login fails", async () => {
    const user = userEvent.setup();
    authScreenMocks.loginMutate.mockImplementation((_payload, options) => {
      options?.onError?.(new Error("Invalid email or password."), undefined, undefined);
    });

    renderScreen("login");

    await user.type(screen.getByPlaceholderText("you@example.com"), "member@fitpal.com");
    await user.type(document.querySelector('input[type="password"]') as HTMLInputElement, "Password123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(authScreenMocks.toast.error).toHaveBeenCalledWith("Invalid email or password.");
    expect(authScreenMocks.navigate).not.toHaveBeenCalled();
  });

  it("navigates to the post-auth route on successful user registration", async () => {
    const user = userEvent.setup();
    authScreenMocks.registerUserMutate.mockImplementation((payload, options) => {
      options?.onSuccess?.(createAuthResponse({
        message: "Account created successfully!",
        profileCompleted: false,
        hasSubscription: false,
        hasActiveSubscription: false,
        hasDashboardAccess: false,
      }), payload, undefined);
    });

    renderScreen("register");

    await user.type(screen.getByPlaceholderText("johndoe123"), "fitpalmember");
    await user.type(screen.getByPlaceholderText("you@example.com"), "member@fitpal.com");
    const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]')) as HTMLInputElement[];
    await user.type(passwordInputs[0], "Password123!");
    await user.type(passwordInputs[1], "Password123!");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(authScreenMocks.registerUserMutate).toHaveBeenCalledTimes(1);
    expect(authScreenMocks.navigate).toHaveBeenCalledWith("/profile-setup", { replace: true });
    expect(authScreenMocks.toast.success).toHaveBeenCalledWith("Account created successfully!");
  });

  it("opens the forgot-password modal from login mode", async () => {
    const user = userEvent.setup();

    renderScreen("login");

    await user.click(screen.getByRole("button", { name: "Forgot password?" }));

    expect(screen.getByText("FORGOT PASSWORD MODAL")).toBeInTheDocument();
  });

  it("starts Google OAuth from the login screen", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      focus: vi.fn(),
    } as unknown as Window);

    renderScreen("login");

    await user.click(screen.getAllByRole("button", { name: /continue with google/i })[0]);

    expect(openSpy).toHaveBeenCalledWith(
      "https://accounts.google.test/o/oauth2/v2/auth",
      "fitpal-google-oauth",
      expect.stringContaining("width=520"),
    );
  });

  it("falls back to full-page redirect when the Google OAuth popup is blocked", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const mockLocation = {
      ...window.location,
      origin: window.location.origin,
      assign: vi.fn(),
    };
    vi.stubGlobal("location", mockLocation);

    renderScreen("login");

    await user.click(screen.getAllByRole("button", { name: /continue with google/i })[0]);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(mockLocation.assign).toHaveBeenCalledWith("https://accounts.google.test/o/oauth2/v2/auth");

    vi.unstubAllGlobals();
  });

  it("handles OAuth success postMessage by persisting auth and navigating", async () => {
    renderScreen("login");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "FITPAL_OAUTH_RESULT",
          auth: createAuthResponse({
            message: "OAuth success",
            providers: ["GOOGLE"],
          }),
        },
      }),
    );

    expect(authScreenMocks.setAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "token-123",
        providers: ["GOOGLE"],
      }),
    );
    expect(authScreenMocks.navigate).toHaveBeenCalledWith("/dashboard");
    await waitFor(() => {
      expect(authScreenMocks.toast.success).toHaveBeenCalledWith("OAuth success");
    });
  });

  it("shows OAuth error and invalid-payload feedback", async () => {
    renderScreen("login");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "FITPAL_OAUTH_RESULT",
          error: {
            message: "Google sign-in failed",
            details: ["Provider rejected login"],
          },
        },
      }),
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "FITPAL_OAUTH_RESULT",
        },
      }),
    );

    expect(authScreenMocks.toast.error).toHaveBeenNthCalledWith(1, "Provider rejected login");
    expect(authScreenMocks.toast.error).toHaveBeenNthCalledWith(2, "Invalid Google authentication response");
  });

});
