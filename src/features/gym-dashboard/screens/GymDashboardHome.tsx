import type { FC } from "react";
import StatCard from "@/features/gym-dashboard/components/StatCard";
import BarChart from "@/features/gym-dashboard/components/BarChart";
import DonutChart from "@/features/gym-dashboard/components/DonutChart";
import { PlanBadge, StatusBadge } from "@/features/gym-dashboard/components/BadgeVariants";
import { SCANS } from "@/features/gym-dashboard/mock-data";
import { AlertTriangle, Info } from "lucide-react";

const weekly = [
  { label: "Mon", h: 45 }, { label: "Tue", h: 62 }, { label: "Wed", h: 78 }, { label: "Thu", h: 55 },
  { label: "Fri", h: 88 }, { label: "Sat", h: 95, today: true }, { label: "Sun", h: 30 },
];

const GymDashboardHome: FC = () => (
  <div className="max-w-[1600px] animate-fade-in">
    {/* Header */}
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
          <span className="inline-block h-px w-4 bg-orange-500" />
          Overview
        </p>
        <h1 className="text-xl font-black uppercase tracking-tight">
          Gym <span className="text-gradient-fire">Dashboard</span>
        </h1>
        <p className="mt-1 text-[11px] text-zinc-600">FitZone Kathmandu · Saturday, 21 March 2026</p>
      </div>
      <div className="flex gap-2">
        <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 transition-all hover:bg-white/[0.08] hover:text-white">
          Export
        </button>
        <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] transition-all hover:bg-orange-600">
          Manage QR
        </button>
      </div>
    </div>

    {/* Stat Grid */}
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-4">
      <StatCard label="Today's Check-ins" value="84" accent sub="↑ 12 vs yesterday" up />
      <StatCard label="Active Right Now" value="23" sub="of 150 capacity" />
      <StatCard label="Unique Visitors (Mo)" value="284" sub="69.7% return rate" up />
      <StatCard label="Pending Payout" value="NPR 61K" sub="Due 25 Mar" down />
      <StatCard label="Monthly Revenue" value="NPR 2.4L" sub="March 2026" />
      <StatCard label="Avg Rating" value="4.3 ★" sub="32 reviews" up />
      <StatCard label="Failed Scans Today" value="2" sub="Review required" down />
      <StatCard label="Profile Completion" value="72%" sub="Add gallery photos" />
    </div>

    {/* Charts Row */}
    <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5">
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Weekly Check-ins</p>
        <BarChart data={weekly} />
        <div className="mt-3 flex justify-between text-[11px] text-zinc-600">
          <span>Total this week: <strong className="text-white">487</strong></span>
          <span>Peak: <strong className="text-orange-500">Saturday</strong></span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5">
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Live Occupancy</p>
          <DonutChart
            gradient="conic-gradient(#f97316 0% 15%, rgba(255,255,255,0.05) 15% 100%)"
            centerLabel="15%"
            legends={[
              { color: "#f97316", label: "23 inside" },
              { color: "rgba(255,255,255,0.06)", label: "127 free" },
            ]}
          />
        </div>

        <div className="flex-1 rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5">
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Alerts</p>
          <div className="mb-2 flex items-start gap-2.5 rounded-xl border border-yellow-400/[0.15] bg-yellow-400/[0.05] p-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-yellow-400" />
            <div>
              <div className="text-xs font-bold text-yellow-400">License expires in 14 days</div>
              <div className="text-[10px] text-zinc-600">Upload renewal document</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-400/[0.15] bg-blue-400/[0.05] p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
            <div>
              <div className="text-xs font-bold text-blue-400">Payout scheduled 25 Mar</div>
              <div className="text-[10px] text-zinc-600">NPR 61,000 pending</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Scan Activity Table */}
    <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Today's Scan Activity</p>
        <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">
          View All
        </button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="pb-2 text-left text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">Time</th>
            <th className="pb-2 text-left text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">Member</th>
            <th className="pb-2 text-left text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">Plan</th>
            <th className="pb-2 text-left text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">Result</th>
          </tr>
        </thead>
        <tbody>
          {SCANS.slice(0, 6).map((s, i) => (
            <tr key={i} className="transition-colors hover:bg-white/[0.015]">
              <td className="border-t border-white/[0.03] py-2.5 font-mono text-[11px] text-zinc-600">{s.time}</td>
              <td className="border-t border-white/[0.03] py-2.5 text-xs font-semibold">{s.member}</td>
              <td className="border-t border-white/[0.03] py-2.5">
                {s.plan !== "—" ? <PlanBadge plan={s.plan} /> : <span className="text-zinc-600">—</span>}
              </td>
              <td className="border-t border-white/[0.03] py-2.5"><StatusBadge status={s.result} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default GymDashboardHome;
