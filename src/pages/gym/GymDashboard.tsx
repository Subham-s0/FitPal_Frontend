import { type FC, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DefaultLayout from "@/components/DefaultLayout";
import type { GymPageId } from "@/components/gym/types";

import GymDashboardHome from "@/pages/gym/GymDashboardHome";
import GymProfilePage from "@/pages/gym/GymProfilePage";
import GymQRPage from "@/pages/gym/GymQRPage";
import GymMembersPage from "@/pages/gym/GymMembersPage";
import GymRevenuePage from "@/pages/gym/GymRevenuePage";
import GymInsightsPage from "@/pages/gym/GymInsightsPage";
import GymEquipmentPage from "@/pages/gym/GymEquipmentPage";
import GymReviewsPage from "@/pages/gym/GymReviewsPage";
import GymNoticesPage from "@/pages/gym/GymNoticesPage";
import GymSettingsPage from "@/pages/gym/GymSettingsPage";

const PAGE_MAP: Record<GymPageId, FC> = {
  home: GymDashboardHome,
  gymProfile: GymProfilePage,
  qr: GymQRPage,
  members: GymMembersPage,
  revenue: GymRevenuePage,
  insights: GymInsightsPage,
  equipment: GymEquipmentPage,
  reviews: GymReviewsPage,
  notices: GymNoticesPage,
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
