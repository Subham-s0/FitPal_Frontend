import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CalendarRange,
  ChartColumnBig,
  ClipboardList,
  DollarSign,
  Dumbbell,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  QrCode,
  Settings,
  Users,
} from "lucide-react";
import { getDisplayNameFromEmail as getDisplayNameFromEmailFromAvatar } from "@/shared/lib/avatar";

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
];

const GYM_NAV_ITEMS: DashboardNavItem[] = [
  { id: "home",      label: "Dashboard",      icon: LayoutDashboard },
  { id: "qr",        label: "QR & Check-In",  icon: QrCode },
  { id: "members",   label: "Members",        icon: Users },
  { id: "revenue",   label: "Revenue",        icon: DollarSign },
  { id: "reviews",   label: "Reviews",        icon: MessageSquare },
  { id: "announcements", label: "Announcements", icon: Megaphone },
];

const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "gyms", label: "Gyms", icon: Building2 },
  { id: "plans", label: "Plans", icon: ClipboardList },
  { id: "payments", label: "Payments", icon: ChartColumnBig },
  { id: "settlements", label: "Settlements", icon: CalendarRange },
  { id: "announcements", label: "Announcements", icon: Megaphone },
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

export const getDashboardRoleBadgeLabel = (role: string | null | undefined) =>
  getDashboardRole(role) === "GYM"
    ? "Gym"
    : getDashboardRole(role) === "ADMIN"
      ? "Admin"
      : "Member";

export const getDashboardSearchPlaceholder = (role: string | null | undefined) =>
  getDashboardRole(role) === "GYM"
    ? "Jump to gym pages..."
    : getDashboardRole(role) === "ADMIN"
      ? "Jump to admin pages..."
      : "Jump to pages...";

export const getDashboardPrimaryActionLabel = (role: string | null | undefined) =>
  getDashboardRole(role) === "GYM"
    ? "Manage Gym"
    : getDashboardRole(role) === "ADMIN"
      ? "Users"
      : "Check In";

export const getDisplayNameFromEmail = (email: string | null | undefined, role: string | null | undefined) =>
  getDisplayNameFromEmailFromAvatar(email, role);
