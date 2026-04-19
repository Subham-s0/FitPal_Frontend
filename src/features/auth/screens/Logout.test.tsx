import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const logoutScreenMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  authStore: {
    getSnapshot: vi.fn(),
    clearAuth: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => logoutScreenMocks.navigate,
  };
});

vi.mock("@/features/auth/store", () => ({
  authStore: logoutScreenMocks.authStore,
}));

import Logout from "@/features/auth/screens/Logout";

const renderScreen = () =>
  render(
    <MemoryRouter>
      <Logout />
    </MemoryRouter>,
  );

describe("Logout screen (FE-AUTH-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears member auth state and redirects to the member login page", async () => {
    logoutScreenMocks.authStore.getSnapshot.mockReturnValue({
      role: "USER",
    });

    renderScreen();

    await waitFor(() => {
      expect(logoutScreenMocks.authStore.clearAuth).toHaveBeenCalledTimes(1);
      expect(logoutScreenMocks.navigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });

  it("clears superadmin auth state and redirects to the admin login page", async () => {
    logoutScreenMocks.authStore.getSnapshot.mockReturnValue({
      role: "SUPERADMIN",
    });

    renderScreen();

    await waitFor(() => {
      expect(logoutScreenMocks.authStore.clearAuth).toHaveBeenCalledTimes(1);
      expect(logoutScreenMocks.navigate).toHaveBeenCalledWith("/admin", { replace: true });
    });
  });
});
