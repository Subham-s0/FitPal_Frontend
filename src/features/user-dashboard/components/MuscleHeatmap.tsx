import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getExerciseLibraryMusclesApi } from "@/features/exercises/api";
import type { MuscleResponse } from "@/features/exercises/model";
import type { RoutineExercise } from "@/features/user-dashboard/routineTypes";
import { computeMuscleDistribution } from "@/features/user-dashboard/routineTypes";

// ============================================
// BODY SILHOUETTE BASE IMAGES
// ============================================

const BODY_FRONT_IMAGE =
  "https://res.cloudinary.com/dahnl97zc/image/upload/v1774873783/male_front_base_kj9xwd.png";
const BODY_BACK_IMAGE =
  "https://res.cloudinary.com/dahnl97zc/image/upload/v1774873782/male_back_base_a10mxz.png";

// ============================================
// PROPS
// ============================================

interface MuscleHeatmapProps {
  exercises: Pick<RoutineExercise, "primaryMuscles" | "secondaryMuscles" | "sets">[];
  /** "compact" = small inline version, "full" = larger standalone card */
  variant?: "compact" | "full";
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * MuscleHeatmap renders front/back body silhouettes with
 * per-muscle overlays at opacity proportional to their score.
 *
 * Scoring:
 *  - Primary muscle: +1 per set
 *  - Secondary muscle: +0.5 per set
 *  - Highest scored muscle → 100% opacity, others proportional
 */
const MuscleHeatmap = ({ exercises, variant = "full", className = "" }: MuscleHeatmapProps) => {
  // Fetch all muscles with their image URLs (cached globally)
  const musclesQuery = useQuery({
    queryKey: ["exercise-library", "muscles"],
    queryFn: getExerciseLibraryMusclesApi,
    staleTime: Infinity,
  });

  // Build name → { frontUrl, backUrl } lookup
  const muscleLookup = useMemo(() => {
    const map = new Map<string, MuscleResponse>();
    for (const m of musclesQuery.data ?? []) {
      map.set(m.name.toLowerCase(), m);
    }
    return map;
  }, [musclesQuery.data]);

  // Compute distribution
  const distribution = useMemo(
    () => computeMuscleDistribution(exercises),
    [exercises]
  );

  // Only show muscles that have image URLs
  const overlays = useMemo(() => {
    return distribution
      .map((score) => {
        const muscle = muscleLookup.get(score.name.toLowerCase());
        if (!muscle) return null;
        return {
          ...score,
          frontUrl: muscle.frontUrl ?? null,
          backUrl: muscle.backUrl ?? null,
        };
      })
      .filter(Boolean) as Array<{
      name: string;
      rawScore: number;
      normalizedScore: number;
      frontUrl: string | null;
      backUrl: string | null;
    }>;
  }, [distribution, muscleLookup]);

  // No data state
  if (exercises.length === 0) {
    return (
      <div className={`flex items-center justify-center gap-4 ${className}`}>
        <div className="relative flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-3">
          <img
            src={BODY_FRONT_IMAGE}
            alt="Body front"
            className="h-auto w-full object-contain opacity-30"
            style={{ maxHeight: variant === "compact" ? 120 : 280 }}
          />
        </div>
        <div className="relative flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-3">
          <img
            src={BODY_BACK_IMAGE}
            alt="Body back"
            className="h-auto w-full object-contain opacity-30"
            style={{ maxHeight: variant === "compact" ? 120 : 280 }}
          />
        </div>
      </div>
    );
  }

  const isCompact = variant === "compact";
  const imgMaxH = isCompact ? 140 : 320;
  const containerPad = isCompact ? "p-2" : "p-4";
  const containerRadius = isCompact ? "rounded-xl" : "rounded-3xl";

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-2 gap-3">
        {/* Front view */}
        <div className={`relative flex items-center justify-center ${containerRadius} border border-white/5 bg-white/[0.025] ${containerPad} overflow-hidden`}>
          {/* Base image */}
          <img
            src={BODY_FRONT_IMAGE}
            alt="Body front"
            className="relative z-0 h-auto w-full object-contain opacity-60"
            style={{ maxHeight: imgMaxH }}
          />
          {/* Muscle overlays */}
          {overlays.map(
            (o) =>
              o.frontUrl && (
                <img
                  key={`front-${o.name}`}
                  src={o.frontUrl}
                  alt={o.name}
                  className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
                  style={{
                    opacity: Math.max(0.15, o.normalizedScore),
                    padding: isCompact ? 8 : 16,
                    filter: `saturate(1.4) brightness(1.1)`,
                  }}
                />
              )
          )}
        </div>

        {/* Back view */}
        <div className={`relative flex items-center justify-center ${containerRadius} border border-white/5 bg-white/[0.025] ${containerPad} overflow-hidden`}>
          {/* Base image */}
          <img
            src={BODY_BACK_IMAGE}
            alt="Body back"
            className="relative z-0 h-auto w-full object-contain opacity-60"
            style={{ maxHeight: imgMaxH }}
          />
          {/* Muscle overlays */}
          {overlays.map(
            (o) =>
              o.backUrl && (
                <img
                  key={`back-${o.name}`}
                  src={o.backUrl}
                  alt={o.name}
                  className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
                  style={{
                    opacity: Math.max(0.15, o.normalizedScore),
                    padding: isCompact ? 8 : 16,
                    filter: `saturate(1.4) brightness(1.1)`,
                  }}
                />
              )
          )}
        </div>
      </div>

      {/* Score legend (full variant only) */}
      {!isCompact && distribution.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {distribution.slice(0, 6).map((m) => (
            <div
              key={m.name}
              className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1"
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: `rgba(234, 88, 12, ${Math.max(0.2, m.normalizedScore)})`,
                  boxShadow: `0 0 6px rgba(234, 88, 12, ${m.normalizedScore * 0.5})`,
                }}
              />
              <span className="text-[10px] font-bold text-white/70">{m.name}</span>
              <span className="text-[9px] font-bold text-orange-600">
                {Math.round(m.normalizedScore * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MuscleHeatmap;
