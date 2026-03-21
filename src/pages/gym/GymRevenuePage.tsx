import type { FC } from "react";
import StatCard from "@/components/gym/StatCard";
import BarChart from "@/components/gym/BarChart";
import { StatusBadge } from "@/components/gym/BadgeVariants";
import { PAYOUTS } from "@/components/gym/mock-data";

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const GymRevenuePage: FC = () => (
  <div className="max-w-[1600px] animate-fade-in">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
          <span className="inline-block h-px w-4 bg-orange-500" />Financials
        </p>
        <h1 className="text-xl font-black uppercase tracking-tight">Revenue &amp; <span className="text-gradient-fire">Payouts</span></h1>
        <p className="mt-1 text-[11px] text-zinc-600">FitPal collects from members, deducts the platform fee, and settles net revenue to your bank.</p>
      </div>
      <div className="flex gap-2">
        <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Download Statement</button>
        <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] hover:bg-orange-600">Payout Settings</button>
      </div>
    </div>

    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Gross Revenue (Mar)" value="NPR 2.4L" />
      <StatCard label="Platform Commission" value="NPR 24K" sub="10%" />
      <StatCard label="Net Receivable" value="NPR 2.16L" accent />
      <StatCard label="Pending Payout" value="NPR 61K" sub="Due 25 Mar" down />
    </div>

    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Monthly Revenue Trend</p>
        <BarChart data={[{ label: "Oct", h: 55 }, { label: "Nov", h: 62 }, { label: "Dec", h: 75 }, { label: "Jan", h: 68 }, { label: "Feb", h: 72 }, { label: "Mar", h: 88, today: true }]} />
      </div>
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Revenue by Plan Tier</p>
        {[
          { l: "Pro Plan visits", p: 58, c: "#f97316" },
          { l: "Elite Plan visits", p: 30, c: "#a78bfa" },
          { l: "Basic Plan visits", p: 12, c: "#52525b" },
        ].map((r, i) => (
          <div key={i} className="mb-3">
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="text-zinc-400">{r.l}</span>
              <span className="font-bold" style={{ color: r.c }}>{r.p}%</span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full" style={{ width: `${r.p}%`, background: r.c }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Payout History</p>
        <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Filter by date</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Reference", "Date", "Amount", "Status", ""].map(h => (
              <th key={h} className="pb-2 text-left text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PAYOUTS.map((p, i) => (
            <tr key={i} className="transition-colors hover:bg-white/[0.015]">
              <td className="border-t border-white/[0.03] py-2.5 font-mono text-[10px] text-zinc-600">{p.ref}</td>
              <td className="border-t border-white/[0.03] py-2.5 text-[11px]">{p.date}</td>
              <td className="border-t border-white/[0.03] py-2.5 text-sm font-bold text-orange-500">{p.amount}</td>
              <td className="border-t border-white/[0.03] py-2.5"><StatusBadge status={p.status} /></td>
              <td className="border-t border-white/[0.03] py-2.5">
                <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Receipt</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default GymRevenuePage;
