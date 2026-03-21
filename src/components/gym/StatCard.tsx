import type { FC } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  up?: boolean;
  down?: boolean;
}

const StatCard: FC<StatCardProps> = ({ label, value, sub, accent, up, down }) => (
  <div
    className={`rounded-xl border p-4 transition-colors hover:border-orange-500/20 ${
      accent
        ? "border-orange-500/20 bg-orange-500/[0.025]"
        : "border-white/[0.07] bg-[#0a0a0a]"
    }`}
  >
    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">
      {label}
    </div>
    <div className={`text-2xl font-black leading-none tracking-tight ${accent ? "text-orange-500" : "text-white"}`}>
      {value}
    </div>
    {sub && (
      <div className={`mt-1 text-[10px] ${up ? "text-green-400" : down ? "text-red-400" : "text-zinc-600"}`}>
        {sub}
      </div>
    )}
  </div>
);

export default StatCard;
