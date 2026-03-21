import type { FC } from "react";
import StatCard from "@/components/gym/StatCard";
import BarChart from "@/components/gym/BarChart";
import QRPattern from "@/components/gym/QRPattern";
import { PlanBadge, StatusBadge } from "@/components/gym/BadgeVariants";
import { SCANS } from "@/components/gym/mock-data";

const hourlyData = [
  { label: "6am", h: 28 }, { label: "7am", h: 60 }, { label: "8am", h: 88, today: true },
  { label: "9am", h: 72 }, { label: "10am", h: 42 }, { label: "11am", h: 30 },
  { label: "12pm", h: 18 }, { label: "5pm", h: 75 }, { label: "6pm", h: 95, today: true },
  { label: "7pm", h: 68 }, { label: "8pm", h: 38 },
];

const steps = [
  { n: "1", title: "Member pays FitPal",    sub: "Pro/Elite plan on the app. You never handle payment." },
  { n: "2", title: "Platform grants access", sub: "Pass marked valid for gyms matching the plan tier." },
  { n: "3", title: "Member scans your QR",  sub: "Open FitPal → tap Check-in → scan your door QR." },
  { n: "4", title: "Platform validates",    sub: "Checks: valid pass? correct tier? not expired?" },
  { n: "5", title: "Logged to you",         sub: "Check-in appears here: name, plan, time, result." },
];

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const GymQRPage: FC = () => (
  <div className="max-w-[1600px] animate-fade-in">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
          <span className="inline-block h-px w-4 bg-orange-500" />Entry Management
        </p>
        <h1 className="text-xl font-black uppercase tracking-tight">QR &amp; <span className="text-gradient-fire">Check-In</span></h1>
        <p className="mt-1 text-[11px] text-zinc-600">Your QR is the only gate. Members scan → platform validates → logged to your dashboard.</p>
      </div>
      <div className="flex gap-2">
        <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Download QR</button>
        <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] hover:bg-orange-600">Regenerate QR</button>
      </div>
    </div>

    {/* 5-Step Flow */}
    <div className={`${card} mb-4`}>
      <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">How Member Access Works</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((s, i, arr) => (
          <div key={i} className="flex min-w-[130px] flex-1 items-stretch">
            <div className="flex-1 rounded-xl border border-orange-500/[0.08] bg-orange-500/[0.03] p-3">
              <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-orange-500">Step {s.n}</div>
              <div className="mb-1 text-xs font-bold">{s.title}</div>
              <div className="text-[10px] leading-relaxed text-zinc-600">{s.sub}</div>
            </div>
            {i < arr.length - 1 && <div className="flex flex-shrink-0 items-center px-0.5 text-sm text-zinc-600">›</div>}
          </div>
        ))}
      </div>
    </div>

    {/* Stats */}
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Today's Scans" value="84" accent />
      <StatCard label="Successful" value="80" sub="95.2%" />
      <StatCard label="Failed" value="2" sub="badge errors" />
      <StatCard label="Denied" value="2" sub="expired pass" />
    </div>

    {/* QR + Hourly Chart */}
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Active QR Code</p>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-[130px] w-[130px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-orange-500/30 bg-white/[0.03]">
            <QRPattern />
          </div>
          <div className="text-center">
            <div className="mb-1 text-xs font-bold">FitZone Kathmandu</div>
            <div className="mb-2.5 text-[10px] text-zinc-600">Regenerated today 06:00 AM</div>
            <span className="inline-flex items-center gap-1 rounded-full border border-green-400/20 bg-green-400/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-green-400">● Active</span>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Print</button>
            <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Download</button>
            <button className="rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-red-400 hover:bg-red-400/20">Deactivate</button>
          </div>
        </div>
      </div>
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Entry by Hour</p>
        <BarChart data={hourlyData} />
        <div className="mt-2.5 text-[10px] text-zinc-600">Peak: <strong className="text-orange-500">8–9 AM &amp; 6–7 PM</strong></div>
      </div>
    </div>

    {/* Scan Log Table */}
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Recent Scan Log</p>
        <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Export CSV</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Time", "Member", "Plan", "Result", ""].map(h => (
              <th key={h} className="pb-2 text-left text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCANS.map((s, i) => (
            <tr key={i} className="transition-colors hover:bg-white/[0.015]">
              <td className="border-t border-white/[0.03] py-2.5 font-mono text-[11px] text-zinc-600">{s.time}</td>
              <td className="border-t border-white/[0.03] py-2.5 text-xs font-semibold">{s.member}</td>
              <td className="border-t border-white/[0.03] py-2.5">{s.plan !== "—" ? <PlanBadge plan={s.plan} /> : <span className="text-zinc-600">—</span>}</td>
              <td className="border-t border-white/[0.03] py-2.5"><StatusBadge status={s.result} /></td>
              <td className="border-t border-white/[0.03] py-2.5"><button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Detail</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default GymQRPage;
