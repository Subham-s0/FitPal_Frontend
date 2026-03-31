import type { FC } from "react";
import StatCard from "@/features/gym-dashboard/components/StatCard";
import { PlanBadge, PassBadge } from "@/features/gym-dashboard/components/BadgeVariants";
import { MEMBERS } from "@/features/gym-dashboard/mock-data";
import { Info } from "lucide-react";

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const GymMembersPage: FC = () => (
  <div className="max-w-[1600px] animate-fade-in">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
          <span className="inline-block h-px w-4 bg-orange-500" />Visitors
        </p>
        <h1 className="text-xl font-black uppercase tracking-tight">Members &amp; <span className="text-gradient-fire">Visitors</span></h1>
        <p className="mt-1 text-[11px] text-zinc-600">Visitors appear here because they scanned your QR. Data sourced from FitPal check-in logs — read only.</p>
      </div>
      <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Export</button>
    </div>

    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-400/[0.15] bg-blue-400/[0.05] p-3">
      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
      <div>
        <div className="text-xs font-bold text-blue-400">How you see your members</div>
        <div className="text-[10px] text-zinc-600">Members pay FitPal directly — you see them here only after they scan your QR. You can view name, plan type, and visit count at your gym. Email, phone, and payment details remain with FitPal.</div>
      </div>
    </div>

    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Unique Visitors" value="284" sub="This month" />
      <StatCard label="Repeat" value="198" sub="69.7%" />
      <StatCard label="First-Time" value="86" sub="This month" />
      <StatCard label="Flagged" value="3" sub="Needs attention" />
    </div>

    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Visitor List</p>
        <input
          className="w-[180px] rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-orange-500/40"
          placeholder="Search by name…"
        />
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Member", "Plan", "Visits Here", "Last Visit", "Pass Status", ""].map(h => (
              <th key={h} className="pb-2 text-left text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEMBERS.map((m, i) => (
            <tr key={i} className="transition-colors hover:bg-white/[0.015]">
              <td className="border-t border-white/[0.03] py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-orange-500/20 bg-orange-500/10 text-[10px] font-extrabold text-orange-500">{m.avatar}</div>
                  <span className="text-xs font-semibold">{m.name}</span>
                </div>
              </td>
              <td className="border-t border-white/[0.03] py-2.5"><PlanBadge plan={m.plan} /></td>
              <td className="border-t border-white/[0.03] py-2.5 text-sm font-bold text-orange-500">{m.visits}</td>
              <td className="border-t border-white/[0.03] py-2.5 text-[11px] text-zinc-600">{m.last}</td>
              <td className="border-t border-white/[0.03] py-2.5"><PassBadge status={m.passStatus} /></td>
              <td className="border-t border-white/[0.03] py-2.5">
                <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">History</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-[10px] text-zinc-600">
        🔒 <strong className="text-zinc-400">Privacy:</strong> Visit counts and plan tiers only. Email, phone, and payment info stay with FitPal.
      </div>
    </div>
  </div>
);

export default GymMembersPage;
