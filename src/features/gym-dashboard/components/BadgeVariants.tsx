import type { FC } from "react";

const base = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider";

export const PlanBadge: FC<{ plan: string }> = ({ plan }) => {
  if (plan === "Elite") return <span className={`${base} border-purple-400/20 bg-purple-400/10 text-purple-400`}>Elite</span>;
  if (plan === "Pro")   return <span className={`${base} border-orange-500/20 bg-orange-500/10 text-orange-500`}>Pro</span>;
  return <span className={`${base} border-white/[0.07] bg-white/[0.04] text-zinc-500`}>Basic</span>;
};

export const PassBadge: FC<{ status: string }> = ({ status }) => {
  if (status === "active")   return <span className={`${base} border-green-400/20 bg-green-400/10 text-green-400`}>Active</span>;
  if (status === "expiring") return <span className={`${base} border-yellow-400/20 bg-yellow-400/10 text-yellow-400`}>Expiring</span>;
  if (status === "flagged")  return <span className={`${base} border-red-400/20 bg-red-400/10 text-red-400`}>Flagged</span>;
  return <span className={`${base} border-white/[0.07] bg-white/[0.04] text-zinc-500`}>Expired</span>;
};

export const ConditionBadge: FC<{ condition: string }> = ({ condition }) => {
  if (condition === "excellent")    return <span className={`${base} border-green-400/20 bg-green-400/10 text-green-400`}>Excellent</span>;
  if (condition === "good")         return <span className={`${base} border-orange-500/20 bg-orange-500/10 text-orange-500`}>Good</span>;
  return <span className={`${base} border-red-400/20 bg-red-400/10 text-red-400`}>Needs Repair</span>;
};

export const StatusBadge: FC<{ status: string }> = ({ status }) => {
  if (status === "success" || status === "completed" || status === "sent" || status === "approved")
    return <span className={`${base} border-green-400/20 bg-green-400/10 text-green-400`}>{status}</span>;
  if (status === "failed" || status === "rejected")
    return <span className={`${base} border-red-400/20 bg-red-400/10 text-red-400`}>{status}</span>;
  if (status === "denied" || status === "expiring" || status === "pending" || status === "scheduled")
    return <span className={`${base} border-yellow-400/20 bg-yellow-400/10 text-yellow-400`}>{status}</span>;
  return <span className={`${base} border-white/[0.07] bg-white/[0.04] text-zinc-500`}>{status}</span>;
};

export const Stars: FC<{ n: number }> = ({ n }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className={`text-xs ${i <= n ? "text-yellow-400" : "text-zinc-800"}`}>★</span>
    ))}
  </div>
);
