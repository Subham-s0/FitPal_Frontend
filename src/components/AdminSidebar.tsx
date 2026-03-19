import {
  Building2,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

interface SidebarProps {
  active: string;
  onChange: (section: string) => void;
}

const primaryItems = [
  { key: "home", label: "Dashboard", icon: LayoutDashboard },
  { key: "users", label: "Manage Users", icon: Users },
  { key: "gyms", label: "Manage Gyms", icon: Building2 },
  { key: "plans", label: "Subscription Plans", icon: CreditCard },
  { key: "payments", label: "Payments", icon: DollarSign },
] as const;

const AdminSidebar = ({ active, onChange }: SidebarProps) => {
  const navigate = useNavigate();

  const itemClassName = (isActive: boolean) =>
    cn(
      "group/link flex w-full items-center justify-center rounded-full border p-3 transition-all duration-300 group-hover:justify-start group-hover:rounded-2xl",
      isActive
        ? "border-orange-400/50 bg-[linear-gradient(135deg,#FF6A00,#FF9500)] text-white shadow-[0_14px_32px_-18px_rgba(249,115,22,0.9)]"
        : "border-transparent bg-transparent text-zinc-500 hover:border-orange-500/15 hover:bg-orange-500/10 hover:text-orange-200"
    );

  const labelClassName = (isActive: boolean) =>
    cn(
      "ml-4 hidden whitespace-nowrap font-bold opacity-0 transition-opacity group-hover:block group-hover:opacity-100",
      isActive ? "text-white" : "text-zinc-400 group-hover/link:text-orange-100"
    );

  return (
    <aside className="group z-40 flex h-full w-16 flex-col overflow-hidden border-r border-white/10 bg-[#0e0e0e]/90 p-2 backdrop-blur-xl transition-all duration-500 hover:w-72 hover:p-4">
      <div className="mb-4 hidden rounded-2xl border border-orange-500/15 bg-orange-500/[0.04] p-4 group-hover:block">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
          Admin Controls
        </p>
        <p className="mt-2 text-sm font-semibold text-white">
          Original console palette restored.
        </p>
      </div>

      <nav className="scrollbar-hide flex flex-1 flex-col gap-4 overflow-y-auto">
        {primaryItems.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;

          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={itemClassName(isActive)}
            >
              <Icon
                className={cn(
                  "h-6 w-6 min-w-[24px]",
                  isActive ? "text-white" : "text-orange-400 group-hover/link:text-orange-200"
                )}
              />
              <span className={labelClassName(isActive)}>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-4">
        <button onClick={() => onChange("settings")} className={itemClassName(active === "settings")}>
          <Settings
            className={cn(
              "h-6 w-6 min-w-[24px]",
              active === "settings" ? "text-white" : "text-orange-400 group-hover/link:text-orange-200"
            )}
          />
          <span className={labelClassName(active === "settings")}>Settings</span>
        </button>

        <button
          onClick={() => navigate("/logout")}
          className="group/link flex w-full items-center justify-center rounded-full border border-transparent p-3 text-zinc-500 transition-all duration-300 group-hover:justify-start group-hover:rounded-2xl hover:border-red-500/20 hover:bg-red-500/10"
        >
          <LogOut className="h-6 w-6 min-w-[24px] text-red-400 group-hover/link:text-red-300" />
          <span className="ml-4 hidden whitespace-nowrap font-bold text-zinc-400 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 group-hover/link:text-red-100">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
