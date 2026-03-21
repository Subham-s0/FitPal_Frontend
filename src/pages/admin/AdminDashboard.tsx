import { type ReactNode, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  Bell,
  CalendarRange,
  CheckCircle,
  DollarSign,
  Dumbbell,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DefaultLayout from "@/components/DefaultLayout";
import ManageGyms from "@/components/admin/ManageGyms";
import ManagePayments from "@/components/admin/ManagePayments";
import ManagePlans from "@/components/admin/ManagePlans";
import ManageUsers from "@/components/admin/ManageUsers";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

type AdminSection =
  | "home"
  | "users"
  | "gyms"
  | "plans"
  | "payments"
  | "settlements"
  | "notices"
  | "settings";

interface KPICardProps {
  title: string;
  value: string;
  icon: ReactNode;
  change?: string;
  subtext?: string;
}

interface HealthStat {
  label: string;
  count: string | number;
  detail: string;
  color: string;
  icon: ReactNode;
  panelClassName: string;
}

const revenueData = [
  { name: "1", revenue: 4000, refunds: 240 },
  { name: "5", revenue: 3000, refunds: 139 },
  { name: "10", revenue: 2000, refunds: 980 },
  { name: "15", revenue: 2780, refunds: 390 },
  { name: "20", revenue: 1890, refunds: 480 },
  { name: "25", revenue: 2390, refunds: 380 },
  { name: "30", revenue: 3490, refunds: 430 },
];

const checkInData = [
  { name: "Mon", count: 120 },
  { name: "Tue", count: 132 },
  { name: "Wed", count: 101 },
  { name: "Thu", count: 134 },
  { name: "Fri", count: 190 },
  { name: "Sat", count: 230 },
  { name: "Sun", count: 210 },
];

const topGyms = [
  { name: "Iron Paradise", checkins: 1240, trend: "+12%" },
  { name: "FitZone Elite", checkins: 1100, trend: "+8%" },
  { name: "PowerHouse", checkins: 980, trend: "-2%" },
  { name: "Gold's Gym", checkins: 850, trend: "+5%" },
  { name: "Muscle Factory", checkins: 720, trend: "+1%" },
];

const healthStats: HealthStat[] = [
  {
    label: "Payment Success",
    count: "98.2%",
    detail: "Last 7 Days",
    color: "text-orange-300",
    icon: <CheckCircle className="h-5 w-5 text-orange-300" />,
    panelClassName: "border-orange-500/15 bg-orange-500/[0.04]",
  },
  {
    label: "Failed Payments",
    count: 23,
    detail: "Insufficient Funds",
    color: "text-red-400",
    icon: <AlertTriangle className="h-5 w-5 text-red-400" />,
    panelClassName: "border-red-500/15 bg-red-500/[0.04]",
  },
  {
    label: "Gateway Timeouts",
    count: 5,
    detail: "Payment Retry Queue",
    color: "text-orange-400",
    icon: <AlertTriangle className="h-5 w-5 text-orange-400" />,
    panelClassName: "border-orange-500/15 bg-orange-500/[0.04]",
  },
  {
    label: "Refunds Issued",
    count: 12,
    detail: "Rs. 15,000",
    color: "text-amber-400",
    icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
    panelClassName: "border-amber-500/15 bg-amber-500/[0.04]",
  },
];

const settlementRows = [
  { cycle: "Mar 15, 2026", gyms: 18, amount: "Rs. 482,000", status: "Processed" },
  { cycle: "Mar 20, 2026", gyms: 12, amount: "Rs. 318,500", status: "Queued" },
  { cycle: "Mar 25, 2026", gyms: 21, amount: "Rs. 596,200", status: "Pending Review" },
];

const adminNotices = [
  { title: "Scheduled gateway maintenance", audience: "All gyms", status: "Active", time: "Today, 11:30 PM" },
  { title: "Quarterly settlement reconciliation", audience: "Finance team", status: "Draft", time: "Tomorrow, 9:00 AM" },
  { title: "New gym onboarding policy update", audience: "Support & admins", status: "Published", time: "Mar 18, 2026" },
];

const panelClassName =
  "rounded-[1.5rem] border border-white/10 bg-[#0e0e0e]/95 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)] backdrop-blur-xl";

const chartTooltipStyle = {
  backgroundColor: "#0e0e0e",
  borderColor: "rgba(255,255,255,0.09)",
  borderRadius: "16px",
  color: "#fff",
};

const SectionCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn(panelClassName, "p-6", className)}>{children}</div>
);

const KPICard = ({ title, value, change, subtext, icon }: KPICardProps) => (
  <div className="rounded-[1.5rem] border border-white/10 bg-[#0e0e0e]/95 p-5 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.95)]">
    <div className="mb-2 flex items-start justify-between">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
        {icon}
      </div>
    </div>
    <h3 className="mb-1 text-2xl font-black text-white">{value}</h3>
    {change && (
      <div className="flex items-center gap-1">
        {change.startsWith("+") ? (
          <TrendingUp className="h-3 w-3 text-orange-300" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-400" />
        )}
        <span className={`text-xs font-bold ${change.startsWith("+") ? "text-orange-300" : "text-red-400"}`}>
          {change} vs last month
        </span>
      </div>
    )}
    {subtext && <p className="text-xs font-medium text-zinc-400">{subtext}</p>}
  </div>
);

const AdminDashboard = () => {
  const location = useLocation();
  const requestedSection = (location.state as { activeSection?: string } | null)?.activeSection;
  const resolveSection = (value: string | undefined): AdminSection =>
    value === "users" ||
    value === "gyms" ||
    value === "plans" ||
    value === "payments" ||
    value === "settlements" ||
    value === "notices" ||
    value === "settings"
      ? value
      : "home";

  const [activeSection, setActiveSection] = useState<AdminSection>(() => resolveSection(requestedSection));

  useEffect(() => {
    if (!requestedSection) return;
    setActiveSection(resolveSection(requestedSection));
  }, [requestedSection]);

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <div className="mx-auto max-w-[1600px] space-y-8">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">
                Dashboard <span className="text-gradient-fire">Overview</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Key platform metrics and operational status for FitPal administration.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KPICard title="Total Revenue" value="Rs. 4.2M" change="+12.5%" icon={<DollarSign className="h-5 w-5 text-orange-400" />} />
              <KPICard title="Active Members" value="1,240" change="+5.2%" icon={<Users className="h-5 w-5 text-orange-400" />} />
              <KPICard title="Active Gyms" value="42/45" subtext="93% Active" icon={<Dumbbell className="h-5 w-5 text-orange-400" />} />
              <KPICard title="New Users" value="156" change="+22%" icon={<UserPlus className="h-5 w-5 text-amber-400" />} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <SectionCard className="lg:col-span-2">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                      <TrendingUp className="h-5 w-5 text-orange-400" />
                      Revenue Trend
                    </h3>
                  </div>
                  <select className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400 outline-none transition focus:border-orange-500/40">
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                  </select>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rs. ${value}`} />
                      <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: "#fff" }} />
                      <Legend wrapperStyle={{ color: "#a1a1aa" }} />
                      <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#fb923c" }} name="Revenue" />
                      <Line type="monotone" dataKey="refunds" stroke="#ef4444" strokeWidth={2} dot={false} name="Refunds" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-white">
                      <Activity className="h-5 w-5 text-orange-400" />
                      Check-ins
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">15.4K</span>
                      <span className="text-xs font-bold text-orange-300">+8.1% vs last month</span>
                    </div>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Total Check-ins</p>
                  </div>
                </div>
                <div className="mt-auto h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={checkInData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "rgba(249,115,22,0.08)" }} contentStyle={chartTooltipStyle} itemStyle={{ color: "#fff" }} />
                      <Bar dataKey="count" fill="#fb923c" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <SectionCard>
                <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  System Health
                </h3>
                <div className="space-y-4">
                  {healthStats.map((stat) => (
                    <div
                      key={stat.label}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border p-4",
                        stat.panelClassName
                      )}
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{stat.label}</p>
                        <p className="mt-1 text-sm font-medium text-white">{stat.detail}</p>
                      </div>
                      <div className="text-right">
                        <span className={`block text-xl font-black ${stat.color}`}>{stat.count}</span>
                        <div className="mt-1 flex justify-end">{stat.icon}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard className="lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                      <Award className="h-5 w-5 text-orange-400" />
                      Top Performing Gyms (MTD)
                    </h3>
                  </div>
                  <button className="rounded-full border border-white/10 bg-white/[0.03] p-2 transition hover:border-orange-500/30 hover:bg-orange-500/10">
                    <Activity className="h-4 w-4 text-zinc-400" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        <th className="pb-3 pl-2">Gym Name</th>
                        <th className="pb-3 text-center">Check-ins</th>
                        <th className="pb-3 text-center">Trend</th>
                        <th className="pb-3 pr-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="border-b border-white/10 text-[11px] font-bold">
                      {topGyms.map((gym) => (
                        <tr key={gym.name} className="group transition-colors hover:bg-white/[0.02]">
                          <td className="py-3 pl-2 text-white">{gym.name}</td>
                          <td className="py-3 text-center text-zinc-300">{gym.checkins.toLocaleString()}</td>
                          <td className={`py-3 text-center ${gym.trend.startsWith("+") ? "text-orange-300" : "text-red-400"}`}>{gym.trend}</td>
                          <td className="py-3 pr-2 text-right">
                            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-orange-200">
                              High Activity
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Network Peak Hours (Aggregate)</p>
                    <div className="flex gap-2">
                      <span className="h-2 w-2 rounded-full bg-white/10"></span>
                      <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                    </div>
                  </div>
                  <div className="flex h-12 items-end gap-1">
                    <div className="relative h-[20%] flex-grow rounded-sm bg-white/[0.05] transition-all hover:bg-white/10"></div>
                    <div className="h-[15%] flex-grow rounded-sm bg-white/[0.05] transition-all hover:bg-white/10"></div>
                    <div className="h-[45%] flex-grow rounded-sm bg-orange-500/20 transition-all hover:bg-orange-500/30"></div>
                    <div className="h-[60%] flex-grow rounded-sm bg-orange-500/40 transition-all hover:bg-orange-500/50"></div>
                    <div className="h-[50%] flex-grow rounded-sm bg-orange-500/30 transition-all hover:bg-orange-500/40"></div>
                    <div className="h-[85%] flex-grow rounded-sm bg-orange-500/80 transition-all hover:bg-orange-500/90"></div>
                    <div className="h-[100%] flex-grow rounded-sm bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-400"></div>
                    <div className="h-[70%] flex-grow rounded-sm bg-orange-500/60 transition-all hover:bg-orange-500/70"></div>
                    <div className="h-[30%] flex-grow rounded-sm bg-white/[0.05] transition-all hover:bg-white/10"></div>
                  </div>
                  <div className="mt-2 flex justify-between text-[8px] font-black uppercase text-zinc-600">
                    <span>6 AM</span>
                    <span>9 AM</span>
                    <span>12 PM</span>
                    <span>3 PM</span>
                    <span>6 PM</span>
                    <span>9 PM</span>
                    <span>12 AM</span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        );
      case "users":
        return <ManageUsers />;
      case "gyms":
        return <ManageGyms />;
      case "plans":
        return <ManagePlans />;
      case "payments":
        return <ManagePayments />;
      case "settlements":
        return (
          <div className="mx-auto max-w-[1400px] space-y-6">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">
                Settlement <span className="text-gradient-fire">Center</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Track payout cycles, review pending transfers, and reconcile gym settlement batches.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <KPICard title="Pending Cycles" value="03" subtext="Awaiting finance review" icon={<CalendarRange className="h-5 w-5 text-orange-400" />} />
              <KPICard title="This Week" value="Rs. 1.39M" change="+9.4%" icon={<DollarSign className="h-5 w-5 text-orange-400" />} />
              <KPICard title="Completed" value="51" subtext="Settlement runs this quarter" icon={<CheckCircle className="h-5 w-5 text-orange-300" />} />
            </div>

            <SectionCard>
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                    <DollarSign className="h-5 w-5 text-orange-400" />
                    Upcoming Settlement Runs
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">Latest payout windows across partner gyms.</p>
                </div>
                <button className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 transition hover:border-orange-500/30 hover:text-white">
                  Export
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      <th className="pb-3 pl-2">Cycle</th>
                      <th className="pb-3 text-center">Gyms</th>
                      <th className="pb-3 text-center">Amount</th>
                      <th className="pb-3 pr-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-bold">
                    {settlementRows.map((row) => (
                      <tr key={row.cycle} className="border-b border-white/[0.06] last:border-b-0">
                        <td className="py-3 pl-2 text-white">{row.cycle}</td>
                        <td className="py-3 text-center text-zinc-300">{row.gyms}</td>
                        <td className="py-3 text-center text-zinc-300">{row.amount}</td>
                        <td className="py-3 pr-2 text-right">
                          <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-orange-200">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        );
      case "notices":
        return (
          <div className="mx-auto max-w-[1200px] space-y-6">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">
                Admin <span className="text-gradient-fire">Notices</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Publish platform-wide announcements, finance updates, and operational notices.
              </p>
            </div>

            <SectionCard>
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Bell className="h-5 w-5 text-orange-400" />
                    Notice Board
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">Internal and platform-wide communications.</p>
                </div>
                <button className="rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200 transition hover:bg-orange-500/20">
                  New Notice
                </button>
              </div>

              <div className="space-y-4">
                {adminNotices.map((notice) => (
                  <div key={notice.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{notice.title}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">{notice.audience}</p>
                      </div>
                      <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-orange-200">
                        {notice.status}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-zinc-400">{notice.time}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        );
      case "settings":
        return (
          <div className="mx-auto max-w-4xl">
            <SectionCard>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                Admin <span className="text-gradient-fire">Settings</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Settings now inherit the same original admin palette as the rest of the dashboard shell.
                This section is ready for deeper configuration controls whenever you want to add them.
              </p>
            </SectionCard>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DefaultLayout
      role="ADMIN"
      activeSection={activeSection}
      onSectionChange={(section) => setActiveSection(resolveSection(section))}
      onPrimaryAction={() => setActiveSection("users")}
      onProfileClick={() => setActiveSection("home")}
      contentClassName="px-4 py-6 sm:px-6 lg:px-8"
    >
      {renderContent()}
    </DefaultLayout>
  );
};

export default AdminDashboard;
