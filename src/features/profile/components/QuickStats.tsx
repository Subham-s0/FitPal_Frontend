import { cn } from "@/shared/lib/utils";
import type { UserProfileResponse } from "@/features/profile/model";

const FITNESS_LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

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
        "rounded-[22px] border table-border user-surface shadow-sm transition-all duration-300",
        compact ? "p-3 sm:p-4" : "p-5 sm:p-6"
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
      <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 gap-3")}>
        <div
          className={cn(
            "rounded-[14px] border table-border user-surface-soft text-center transition-all duration-200 hover:border-orange-500/20",
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
            "rounded-[14px] border table-border user-surface-soft text-center transition-all duration-200 hover:border-orange-500/20",
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
            "rounded-xl border border-blue-500/20 bg-blue-500/5 text-center transition-all duration-200 hover:border-blue-500/30",
            compact ? "p-2 sm:p-2.5" : "p-3 sm:p-4"
          )}
        >
          <p
            className={cn(
              "font-bold uppercase tracking-widest text-blue-400",
              compact ? "text-[7px]" : "text-[8px]"
            )}
          >
            Level
          </p>
          <p
            className={cn(
              "truncate font-bold text-white",
              compact ? "mt-0.5 text-[10px]" : "mt-1 text-sm"
            )}
          >
            {FITNESS_LEVEL_OPTIONS.find((o) => o.value === profile.fitnessLevel)?.label ||
              "—"}
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border border-green-500/20 bg-green-500/5 text-center transition-all duration-200 hover:border-green-500/30",
            compact ? "p-2 sm:p-2.5" : "p-3 sm:p-4"
          )}
        >
          <p
            className={cn(
              "font-bold uppercase tracking-widest text-green-400",
              compact ? "text-[7px]" : "text-[8px]"
            )}
          >
            Goal
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
