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
      "group/item flex items-center border transition-all duration-300",
      isActive
        ? "mx-auto h-14 w-14 justify-center rounded-2xl border-transparent bg-orange-500 p-0 text-black shadow-[0_14px_32px_-18px_rgba(249,115,22,0.85)] group-hover/sidebar:h-auto group-hover/sidebar:w-full group-hover/sidebar:justify-start group-hover/sidebar:rounded-2xl group-hover/sidebar:px-3 group-hover/sidebar:py-3 group-focus-within/sidebar:h-auto group-focus-within/sidebar:w-full group-focus-within/sidebar:justify-start group-focus-within/sidebar:rounded-2xl group-focus-within/sidebar:px-3 group-focus-within/sidebar:py-3"
        : "w-full justify-center rounded-full border-transparent bg-transparent p-3 text-zinc-500 hover:border-orange-500/15 hover:bg-orange-500/10 hover:text-orange-200 group-hover/sidebar:justify-start group-hover/sidebar:rounded-2xl group-focus-within/sidebar:justify-start group-focus-within/sidebar:rounded-2xl"
    );

  const labelClassName = (isActive: boolean) =>
    cn(
      "ml-4 hidden whitespace-nowrap font-bold opacity-0 transition-opacity duration-200 group-hover/sidebar:block group-hover/sidebar:opacity-100 group-focus-within/sidebar:block group-focus-within/sidebar:opacity-100",
      isActive ? "text-black" : "text-zinc-400 group-hover/item:text-orange-100"
    );

  return (
    <aside className="group/sidebar z-40 flex h-full w-20 flex-col overflow-hidden border-r border-white/10 bg-[#0e0e0e]/90 p-2 backdrop-blur-xl transition-all duration-500 hover:w-72 hover:p-4 focus-within:w-72 focus-within:p-4">
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
                  isActive ? "text-black" : "text-orange-400 group-hover/item:text-orange-300"
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
              active === "settings" ? "text-black" : "text-orange-400 group-hover/item:text-orange-300"
            )}
          />
          <span className={labelClassName(active === "settings")}>Settings</span>
        </button>

        <button
          onClick={() => navigate("/logout")}
          className="group/item flex w-full items-center justify-center rounded-full border border-transparent p-3 text-zinc-500 transition-all duration-300 hover:border-red-500/20 hover:bg-red-500/10 group-hover/sidebar:justify-start group-focus-within/sidebar:justify-start group-hover/sidebar:rounded-2xl group-focus-within/sidebar:rounded-2xl"
        >
          <LogOut className="h-6 w-6 min-w-[24px] text-red-400 group-hover/item:text-red-300" />
          <span className="ml-4 hidden whitespace-nowrap font-bold text-zinc-400 opacity-0 transition-opacity duration-200 group-hover/sidebar:block group-hover/sidebar:opacity-100 group-focus-within/sidebar:block group-focus-within/sidebar:opacity-100 group-hover/item:text-white">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
