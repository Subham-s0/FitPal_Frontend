import { LayoutGrid, Lock, MapPin, Sparkles } from "lucide-react";
import type { RecommendationMode } from "./gyms.types";

interface RecommendationModeBarProps {
  active: RecommendationMode;
  onChange: (mode: RecommendationMode) => void;
  locationEnabled?: boolean;
}

const modes: { id: RecommendationMode; label: string; icon: typeof MapPin; requiresLocation: boolean }[] = [
  { id: "nearest", label: "Nearest", icon: MapPin, requiresLocation: true },
  { id: "best-match", label: "Best Match", icon: Sparkles, requiresLocation: true },
  { id: "show-all", label: "Show All", icon: LayoutGrid, requiresLocation: false },
];

const RecommendationModeBar = ({
  active,
  onChange,
  locationEnabled = false,
}: RecommendationModeBarProps) => (
  <div className="grid w-full max-w-[380px] grid-cols-3 gap-1.5 rounded-[20px] border border-white/10 bg-[rgba(10,10,10,0.92)] p-1.5 shadow-2xl backdrop-blur-xl md:max-w-none">
    {modes.map(({ id, label, icon: Icon, requiresLocation }) => {
      const isLocked = requiresLocation && !locationEnabled;
      const isActive = active === id;

      return (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] leading-none transition-all sm:px-3 ${
            isActive
              ? "bg-orange-600 text-white shadow-[0_0_16px_rgba(234,88,12,0.3)]"
              : isLocked
                ? "text-slate-500 hover:bg-white/[0.03] hover:text-slate-200"
                : "text-slate-400 hover:bg-white/[0.03] hover:text-white"
          }`}
        >
          <Icon size={13} className="shrink-0" />
          <span className="truncate whitespace-nowrap">{label}</span>
          {isLocked && !isActive && <Lock size={11} className="shrink-0 opacity-70" />}
        </button>
      );
    })}
  </div>
);

export default RecommendationModeBar;
