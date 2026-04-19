import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/test-utils";

const gymDashboardMocks = vi.hoisted(() => ({
  onSectionChangeSpy: vi.fn(),
  onPrimaryActionSpy: vi.fn(),
  onProfileClickSpy: vi.fn(),
}));

vi.mock("@/shared/layout/dashboard-shell", () => ({
  DefaultLayout: ({
    activeSection,
    onSectionChange,
    onPrimaryAction,
    onProfileClick,
    children,
  }: {
    activeSection: string;
    onSectionChange: (section: string) => void;
    onPrimaryAction: () => void;
    onProfileClick: () => void;
    children: ReactNode;
  }) => (
    <div>
      <div>ACTIVE:{activeSection}</div>
      <button
        type="button"
        onClick={() => {
          gymDashboardMocks.onSectionChangeSpy("members");
          onSectionChange("members");
        }}
      >
        switch-members
      </button>
      <button
        type="button"
        onClick={() => {
          gymDashboardMocks.onPrimaryActionSpy();
          onPrimaryAction();
        }}
      >
        open-profile
      </button>
      <button
        type="button"
        onClick={() => {
          gymDashboardMocks.onProfileClickSpy();
          onProfileClick();
        }}
      >
        profile-home
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@/features/gym-dashboard/screens/GymDashboardHome", () => ({
  default: () => <div>GYM HOME</div>,
}));
vi.mock("@/features/gym-dashboard/screens/GymProfilePage", () => ({
  default: () => <div>GYM PROFILE PAGE</div>,
}));
vi.mock("@/features/gym-dashboard/screens/GymQRPage", () => ({
  default: () => <div>GYM QR PAGE</div>,
}));
vi.mock("@/features/gym-dashboard/screens/GymMembersPage", () => ({
  default: () => <div>GYM MEMBERS PAGE</div>,
}));
vi.mock("@/features/gym-dashboard/screens/GymRevenuePage", () => ({
  default: () => <div>GYM REVENUE PAGE</div>,
}));
vi.mock("@/features/gym-dashboard/screens/GymReviewsPage", () => ({
  default: () => <div>GYM REVIEWS PAGE</div>,
}));
vi.mock("@/features/gym-dashboard/screens/GymSettingsPage", () => ({
  default: () => <div>GYM SETTINGS PAGE</div>,
}));
vi.mock("@/features/announcements/components/GymAnnouncementsPage", () => ({
  default: () => <div>GYM ANNOUNCEMENTS PAGE</div>,
}));

import GymDashboard from "@/features/gym-dashboard/screens/GymDashboard";

describe("GymDashboard (FE-GYM-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the requested section and supports layout-driven section changes", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/gym-dashboard" element={<GymDashboard />} />
      </Routes>,
      {
        route: "/gym-dashboard",
        wrapper: (children) => <div>{children}</div>,
      },
    );

    expect(screen.getByText("GYM HOME")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE:home")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "switch-members" }));
    expect(screen.getByText("GYM MEMBERS PAGE")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE:members")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "open-profile" }));
    expect(screen.getByText("GYM PROFILE PAGE")).toBeInTheDocument();
  });
});
