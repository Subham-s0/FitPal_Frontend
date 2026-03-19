import { type ReactNode, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
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

import AdminNavbar from "@/components/AdminNavbar";
import AdminSidebar from "@/components/AdminSidebar";
import ManageGyms from "@/components/admin/ManageGyms";
import ManagePayments from "@/components/admin/ManagePayments";
import ManagePlans from "@/components/admin/ManagePlans";
import ManageUsers from "@/components/admin/ManageUsers";
import { cn } from "@/lib/utils";

type AdminSection = "home" | "users" | "gyms" | "plans" | "payments" | "settings";

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

const panelClassName =
  "overflow-hidden rounded-[2rem] border border-white/10 bg-[#0e0e0e]/95 shadow-[0_30px_80px_-32px_rgba(0,0,0,0.92)] backdrop-blur-xl";

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
  <div className={cn(panelClassName, className)}>
    <div className="h-[3px] bg-[linear-gradient(90deg,#FF6A00,#FF9500,#FFBB00)]" />
    <div className="p-6">{children}</div>
  </div>
);

const KPICard = ({ title, value, change, subtext, icon }: KPICardProps) => (
  <div className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0e0e0e]/95 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] transition-all hover:-translate-y-0.5 hover:border-orange-500/30">
    <div className="h-[2px] bg-[linear-gradient(90deg,#FF6A00,#FF9500,#FFBB00)] opacity-70" />
    <div className="p-5">
      <div className="mb-2 flex items-start justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{title}</p>
        <div className="rounded-xl border border-orange-500/15 bg-orange-500/10 p-2 transition-colors group-hover:bg-orange-500/15">
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
  </div>
);

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>("home");

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <div className="mx-auto max-w-[1600px] space-y-8">
            <SectionCard>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="mb-4 inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-orange-200">
                    Admin Dashboard
                  </span>
                  <h1 className="mb-3 text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">
                    Command <span className="text-gradient-fire">Center</span>
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                    The admin dashboard now follows the original console palette: deep charcoal surfaces,
                    muted zinc text, and orange-to-amber accents for every key action.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-orange-500/15 bg-orange-500/[0.05] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Access State</p>
                    <p className="mt-2 text-lg font-black text-white">Restricted</p>
                    <p className="mt-1 text-xs text-orange-200">Authorized personnel only</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Visual Theme</p>
                    <p className="mt-2 text-lg font-black text-white">Original Admin</p>
                    <p className="mt-1 text-xs text-zinc-400">Orange accent system restored</p>
                  </div>
                </div>
              </div>
            </SectionCard>

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
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Orange-primary performance view
                    </p>
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
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                      High-activity partner network
                    </p>
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
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#030303] font-sans text-white selection:bg-orange-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,hsla(30,100%,20%,0.2),transparent)]" />
        <div className="absolute -left-[10%] -top-[18%] h-[70vw] w-[70vw] rounded-full bg-[hsla(30,100%,50%,0.08)] blur-[100px] animate-pulse [animation-duration:8s]" />
        <div className="absolute -right-[20%] top-[38%] h-[60vw] w-[60vw] rounded-full bg-[hsla(15,100%,60%,0.05)] blur-[120px] animate-pulse [animation-duration:10s]" />
        <div className="absolute -bottom-[20%] left-[20%] h-[50vw] w-[50vw] rounded-full bg-[hsla(40,100%,50%,0.05)] blur-[80px] animate-pulse [animation-duration:12s]" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <AdminNavbar />
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar active={activeSection} onChange={setActiveSection} />
          <main className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
