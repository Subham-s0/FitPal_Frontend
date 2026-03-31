import type { FC } from "react";
import StatCard from "@/features/gym-dashboard/components/StatCard";
import { Stars } from "@/features/gym-dashboard/components/BadgeVariants";
import { REVIEWS } from "@/features/gym-dashboard/mock-data";

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const GymReviewsPage: FC = () => (
  <div className="max-w-[1600px] animate-fade-in">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
          <span className="inline-block h-px w-4 bg-orange-500" />Reputation
        </p>
        <h1 className="text-xl font-black uppercase tracking-tight">Reviews &amp; <span className="text-gradient-fire">Feedback</span></h1>
        <p className="mt-1 text-[11px] text-zinc-600">Monitor and respond to member feedback</p>
      </div>
    </div>

    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Average Rating" value="4.3 ★" up />
      <StatCard label="Total Reviews" value="32" />
      <StatCard label="Positive" value="28" sub="87.5%" />
      <StatCard label="Needs Attention" value="1" down />
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">All Reviews</p>
        {REVIEWS.map((r, i) => (
          <div key={i} className="border-b border-white/[0.035] py-3 last:border-b-0">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-orange-500/20 bg-orange-500/10 text-[9px] font-extrabold text-orange-500">{r.name[0]}</div>
                <div>
                  <div className="text-xs font-bold">{r.name}</div>
                  <div className="text-[9px] text-zinc-600">{r.date}</div>
                </div>
              </div>
              <Stars n={r.rating} />
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-zinc-400">{r.text}</p>
            <div className="flex gap-2">
              <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Reply</button>
              {r.rating <= 2 && (
                <button className="rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-red-400 hover:bg-red-400/20">Escalate</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className={card}>
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Distribution</p>
          {[5, 4, 3, 2, 1].map(r => {
            const c = [45, 35, 12, 5, 3][5 - r];
            return (
              <div key={r} className="mb-2 flex items-center gap-2">
                <span className="w-3.5 text-[10px]" style={{ color: r >= 4 ? "#4ade80" : r === 3 ? "#fbbf24" : "#ef4444" }}>{r}★</span>
                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${c}%`, background: r >= 4 ? "#4ade80" : r === 3 ? "#fbbf24" : "#ef4444" }} />
                </div>
                <span className="w-6 text-right text-[9px] text-zinc-600">{c}%</span>
              </div>
            );
          })}
        </div>
        <div className={card}>
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Complaints</p>
          {[{ issue: "Waiting times", count: 3 }, { issue: "Scanner errors", count: 2 }, { issue: "Equipment", count: 1 }].map((c, i) => (
            <div key={i} className="flex items-center justify-between border-b border-white/[0.03] py-2 last:border-b-0">
              <span className="text-[11px] text-zinc-400">{c.issue}</span>
              <span className="inline-flex rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[9px] font-extrabold text-red-400">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default GymReviewsPage;
