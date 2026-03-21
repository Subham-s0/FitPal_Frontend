import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CalendarRange,
  ChartColumnBig,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  User,
  Users,
} from "lucide-react";

export type DashboardRole = "USER" | "GYM" | "ADMIN";
export type DashboardShellRole = DashboardRole;

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const MEMBER_NAV_ITEMS: DashboardNavItem[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "gyms", label: "Gyms", icon: Building2 },
  { id: "routines", label: "Routines", icon: ClipboardList },
  { id: "exercises", label: "Exercises", icon: Dumbbell },
  { id: "workouts", label: "Workouts", icon: Activity },
  { id: "profile", label: "Profile", icon: User },
];

const GYM_NAV_ITEMS: DashboardNavItem[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "members", label: "Members", icon: Users },
  { id: "classes", label: "Classes", icon: CalendarRange },
  { id: "analytics", label: "Analytics", icon: ChartColumnBig },
  { id: "profile", label: "My Gym", icon: Building2 },
];

const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Manage Users", icon: Users },
  { id: "gyms", label: "Manage Gyms", icon: Building2 },
  { id: "plans", label: "Plans", icon: ClipboardList },
  { id: "payments", label: "Payments", icon: ChartColumnBig },
];

export const getDashboardRole = (role: string | null | undefined): DashboardShellRole => {
  const normalizedRole = role?.toUpperCase();

  if (normalizedRole === "SUPERADMIN" || normalizedRole === "ADMIN") {
    return "ADMIN";
  }

  if (normalizedRole === "GYM") {
    return "GYM";
  }

  return "USER";
};

export const getDashboardNavItems = (role: string | null | undefined) =>
  getDashboardRole(role) === "GYM"
    ? GYM_NAV_ITEMS
    : getDashboardRole(role) === "ADMIN"
      ? ADMIN_NAV_ITEMS
      : MEMBER_NAV_ITEMS;

export const isDashboardSectionForRole = (
  role: string | null | undefined,
  section: string | null | undefined,
) => getDashboardNavItems(role).some((item) => item.id === section);

export const getDashboardDefaultSection = (role: string | null | undefined) =>
  getDashboardNavItems(role)[0]?.id ?? "home";

export const getDashboardRoleLabel = (role: string | null | undefined) =>
  getDashboardRole(role) === "GYM"
    ? "Gym Owner"
    : getDashboardRole(role) === "ADMIN"
      ? "Super Admin"
      : "Gym Member";

export const getDashboardSearchPlaceholder = (role: string | null | undefined) =>
  getDashboardRole(role) === "GYM"
    ? "Search members or classes..."
    : getDashboardRole(role) === "ADMIN"
      ? "Search admin tools..."
      : "Search routines...";

export const getDashboardPrimaryActionLabel = (role: string | null | undefined) =>
  getDashboardRole(role) === "GYM"
    ? "Manage Gym"
    : getDashboardRole(role) === "ADMIN"
      ? "Manage Users"
      : "Check In";

export const getDisplayNameFromEmail = (email: string | null | undefined, role: string | null | undefined) => {
  const fallback =
    getDashboardRole(role) === "GYM"
      ? "Gym Owner"
      : getDashboardRole(role) === "ADMIN"
        ? "Admin"
        : "Member";
  if (!email) return fallback;

  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return fallback;

  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
};
