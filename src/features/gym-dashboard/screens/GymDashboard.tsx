import { type FC, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DefaultLayout } from "@/shared/layout/dashboard-shell";
import type { GymPageId } from "@/features/gym-dashboard/types";

import GymDashboardHome from "@/features/gym-dashboard/screens/GymDashboardHome";
import GymProfilePage from "@/features/gym-dashboard/screens/GymProfilePage";
import GymQRPage from "@/features/gym-dashboard/screens/GymQRPage";
import GymMembersPage from "@/features/gym-dashboard/screens/GymMembersPage";
import GymRevenuePage from "@/features/gym-dashboard/screens/GymRevenuePage";
import GymReviewsPage from "@/features/gym-dashboard/screens/GymReviewsPage";
import GymSettingsPage from "@/features/gym-dashboard/screens/GymSettingsPage";
import GymAnnouncementsPage from "@/features/announcements/components/GymAnnouncementsPage";

const PAGE_MAP: Record<GymPageId, FC> = {
  home: GymDashboardHome,
  gymProfile: GymProfilePage,
  qr: GymQRPage,
  members: GymMembersPage,
  revenue: GymRevenuePage,
  reviews: GymReviewsPage,
  announcements: GymAnnouncementsPage,
  settings: GymSettingsPage,
};

const ALL_IDS = Object.keys(PAGE_MAP) as GymPageId[];

const resolveSection = (value: string | undefined): GymPageId =>
  ALL_IDS.includes(value as GymPageId) ? (value as GymPageId) : "home";

const GymDashboard = () => {
  const location = useLocation();
  const requestedSection = (location.state as { activeSection?: string } | null)?.activeSection;
  const [activeSection, setActiveSection] = useState<GymPageId>(() => resolveSection(requestedSection));

  useEffect(() => {
    if (!requestedSection) return;
    setActiveSection(resolveSection(requestedSection));
  }, [requestedSection]);

  const Page = PAGE_MAP[activeSection];

  return (
    <DefaultLayout
      role="GYM"
      activeSection={activeSection}
      onSectionChange={(section) => setActiveSection(resolveSection(section))}
      onPrimaryAction={() => setActiveSection("gymProfile")}
      onProfileClick={() => setActiveSection("gymProfile")}
    >
      <Page />
    </DefaultLayout>
  );
};

export default GymDashboard;
