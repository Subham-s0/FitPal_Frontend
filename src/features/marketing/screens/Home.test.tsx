import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const homeMocks = vi.hoisted(() => ({
  usePublicCmsHome: vi.fn(),
}));

vi.mock("@/features/marketing/usePublicCmsHome", () => ({
  usePublicCmsHome: () => homeMocks.usePublicCmsHome(),
}));

vi.mock("@/features/marketing/components/Navbar", () => ({
  default: () => <div>NAVBAR</div>,
}));

vi.mock("@/features/marketing/components/Hero", () => ({
  default: () => <div>HERO</div>,
}));

vi.mock("@/features/marketing/components/Stats", () => ({
  default: ({ stats }: { stats: Array<{ label: string }> }) => (
    <div>STATS:{stats.map((item) => item.label).join(",")}</div>
  ),
}));

vi.mock("@/features/marketing/components/HowItWorks", () => ({
  default: ({ howToSteps }: { howToSteps: Array<{ title: string }> }) => (
    <div>HOW:{howToSteps.map((item) => item.title).join(",")}</div>
  ),
}));

vi.mock("@/features/marketing/components/Features", () => ({
  default: ({ features }: { features: Array<{ title: string }> }) => (
    <div>FEATURES:{features.map((item) => item.title).join(",")}</div>
  ),
}));

vi.mock("@/features/plans/components/Pricing", () => ({
  default: () => <div>PRICING</div>,
}));

vi.mock("@/features/marketing/components/Testimonials", () => ({
  default: ({ testimonials }: { testimonials: Array<{ author: string }> }) => (
    <div>TESTIMONIALS:{testimonials.map((item) => item.author).join(",")}</div>
  ),
}));

vi.mock("@/features/marketing/components/Footer", () => ({
  default: () => <div>FOOTER</div>,
}));

import Home from "@/features/marketing/screens/Home";

describe("Home screen (FE-CMS-01)", () => {
  it("renders CMS-backed marketing sections even when some collections are empty", () => {
    homeMocks.usePublicCmsHome.mockReturnValue({
      stats: [{ label: "Members" }],
      howToSteps: [{ title: "Scan to check in" }],
      features: [],
      testimonials: [{ author: "Fit Pal" }],
    });

    render(<Home />);

    expect(screen.getByText("NAVBAR")).toBeInTheDocument();
    expect(screen.getByText("HERO")).toBeInTheDocument();
    expect(screen.getByText("STATS:Members")).toBeInTheDocument();
    expect(screen.getByText("HOW:Scan to check in")).toBeInTheDocument();
    expect(screen.getByText("FEATURES:")).toBeInTheDocument();
    expect(screen.getByText("PRICING")).toBeInTheDocument();
    expect(screen.getByText("TESTIMONIALS:Fit Pal")).toBeInTheDocument();
    expect(screen.getByText("FOOTER")).toBeInTheDocument();
  });
});
