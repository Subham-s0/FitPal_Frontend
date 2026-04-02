import { cn } from "@/shared/lib/utils";
import type { UserProfileResponse } from "@/features/profile/model";

const FITNESS_FOCUS_OPTIONS = [
  { value: "HYPERTROPHY", label: "Hypertrophy" },
  { value: "STRENGTH_POWER", label: "Strength & Power" },
  { value: "ENDURANCE_CARDIO", label: "Endurance & Cardio" },
  { value: "FLEXIBILITY_MOBILITY", label: "Flexibility & Mobility" },
  { value: "WEIGHT_LOSS", label: "Weight Loss" },
];

interface QuickStatsProps {
  profile: UserProfileResponse;
  compact?: boolean;
}

export function QuickStats({ profile, compact = false }: QuickStatsProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/5 bg-[#111] transition-all duration-300",
        compact ? "p-3 sm:p-4" : "p-4 sm:p-6"
      )}
    >
      <p
        className={cn(
          "mb-3 font-bold uppercase tracking-widest text-slate-500",
          compact ? "text-[8px]" : "text-[9px] sm:text-[10px]"
        )}
      >
        Quick Stats
      </p>
      <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 gap-3")}>
        <div
          className={cn(
            "rounded-xl border border-white/5 bg-black/30 text-center transition-all duration-200 hover:border-orange-500/20",
            compact ? "p-2 sm:p-2.5" : "p-3 sm:p-4"
          )}
        >
          <p
            className={cn(
              "font-bold uppercase tracking-widest text-slate-500",
              compact ? "text-[7px]" : "text-[8px]"
            )}
          >
            Weight
          </p>
          <p
            className={cn(
              "font-black text-white",
              compact ? "mt-0.5 text-sm" : "mt-1 text-lg sm:text-xl"
            )}
          >
            {profile.weight ? `${profile.weight}kg` : "—"}
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border border-white/5 bg-black/30 text-center transition-all duration-200 hover:border-orange-500/20",
            compact ? "p-2 sm:p-2.5" : "p-3 sm:p-4"
          )}
        >
          <p
            className={cn(
              "font-bold uppercase tracking-widest text-slate-500",
              compact ? "text-[7px]" : "text-[8px]"
            )}
          >
            Height
          </p>
          <p
            className={cn(
              "font-black text-white",
              compact ? "mt-0.5 text-sm" : "mt-1 text-lg sm:text-xl"
            )}
          >
            {profile.height ? `${profile.height}cm` : "—"}
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border border-white/5 bg-black/30 transition-all duration-200 hover:border-orange-500/20",
            compact ? "p-2 text-center sm:p-2.5" : "col-span-2 p-3 sm:p-4"
          )}
        >
          <p
            className={cn(
              "font-bold uppercase tracking-widest text-slate-500",
              compact ? "text-[7px]" : "text-[8px]"
            )}
          >
            Focus
          </p>
          <p
            className={cn(
              "truncate font-bold text-white",
              compact ? "mt-0.5 text-[10px]" : "mt-1 text-sm"
            )}
          >
            {FITNESS_FOCUS_OPTIONS.find((o) => o.value === profile.primaryFitnessFocus)?.label ||
              "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
