import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getExerciseLibraryMusclesApi } from "@/features/exercises/api";
import type { MuscleResponse } from "@/features/exercises/model";
import {
  BODY_BACK_IMAGE_URL,
  BODY_FRONT_IMAGE_URL,
} from "@/features/user-dashboard/constants/muscleHeatmapAssets";
import type { RoutineExercise } from "@/features/routines/routineTypes";
import { computeMuscleDistribution } from "@/features/routines/routineTypes";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";

// ============================================
// PROPS
// ============================================

interface MuscleHeatmapProps {
  exercises: Pick<RoutineExercise, "primaryMuscles" | "secondaryMuscles" | "sets">[];
  /** "compact" = small inline version, "full" = larger standalone card */
  variant?: "compact" | "full";
  /** Toggle the horizontal muscle set bars */
  showSetBars?: boolean;
  /** Maximum muscles shown in the horizontal bar chart */
  maxBars?: number;
  /** Toggle the score chips section (full variant only) */
  showScoreLegend?: boolean;
  /** "stacked" (default) = images above bars; "horizontal" = images | bars side-by-side */
  layout?: "stacked" | "horizontal";
  /** Image size: "small" (default), "medium", "large" */
  imageSize?: "small" | "medium" | "large";
  /** Controls extra frame growth for full-image layouts without set bars */
  stretchMode?: "default" | "compact" | "none";
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
function formatSetScore(score: number) {
  return Number.isInteger(score) ? `${score}` : score.toFixed(1).replace(/\.0$/, "");
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function intensityCurve(score: number) {
  return Math.pow(clamp01(score), 0.72);
}

interface HeatToneStop {
  hue: number;
  saturation: number;
  lightness: number;
  overlayOpacity: number;
  filterSaturate: number;
  filterBrightness: number;
  filterContrast: number;
  filterHueRotate: number;
}

const LOW_HEAT_TONE: HeatToneStop = {
  hue: 30,
  saturation: 100,
  lightness: 54,
  overlayOpacity: 1,
  filterSaturate: 410,
  filterBrightness: 1,
  filterContrast: 0.98,
  filterHueRotate: 0,
};

const MID_HEAT_TONE: HeatToneStop = {
  hue: 22,
  saturation: 96,
  lightness: 36,
  overlayOpacity: 1,
  filterSaturate: 520,
  filterBrightness: 0.82,
  filterContrast: 1.1,
  filterHueRotate: -8,
};

const HIGH_HEAT_TONE: HeatToneStop = {
  hue: 8,
  saturation: 88,
  lightness: 24,
  overlayOpacity: 1,
  filterSaturate: 630,
  filterBrightness: 0.66,
  filterContrast: 1.2,
  filterHueRotate: -20,
};

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function interpolateHeatTone(start: HeatToneStop, end: HeatToneStop, amount: number): HeatToneStop {
  return {
    hue: lerp(start.hue, end.hue, amount),
    saturation: lerp(start.saturation, end.saturation, amount),
    lightness: lerp(start.lightness, end.lightness, amount),
    overlayOpacity: lerp(start.overlayOpacity, end.overlayOpacity, amount),
    filterSaturate: lerp(start.filterSaturate, end.filterSaturate, amount),
    filterBrightness: lerp(start.filterBrightness, end.filterBrightness, amount),
    filterContrast: lerp(start.filterContrast, end.filterContrast, amount),
    filterHueRotate: lerp(start.filterHueRotate, end.filterHueRotate, amount),
  };
}

function getHeatTone(score: number) {
  const normalized = intensityCurve(score);
  if (normalized <= 0.72) {
    return interpolateHeatTone(LOW_HEAT_TONE, MID_HEAT_TONE, normalized / 0.72);
  }
  return interpolateHeatTone(MID_HEAT_TONE, HIGH_HEAT_TONE, (normalized - 0.72) / 0.28);
}

function getHslColor(hue: number, saturation: number, lightness: number) {
  return `hsl(${Math.round(hue)} ${Math.round(saturation)}% ${Math.round(lightness)}%)`;
}

function getHslAlphaColor(hue: number, saturation: number, lightness: number, alpha: number) {
  return `hsl(${Math.round(hue)} ${Math.round(saturation)}% ${Math.round(lightness)}% / ${alpha})`;
}

function getHeatColor(score: number) {
  const tone = getHeatTone(score);
  return getHslColor(tone.hue, tone.saturation, tone.lightness);
}

function getHeatAccentColor(score: number) {
  const tone = getHeatTone(score);
  return getHslColor(
    Math.min(34, tone.hue + 4),
    Math.max(82, tone.saturation - 6),
    Math.min(64, tone.lightness + 10)
  );
}

function getHeatShadeColor(score: number) {
  const tone = getHeatTone(score);
  return getHslColor(
    Math.max(6, tone.hue - 3),
    Math.min(100, tone.saturation + 2),
    Math.max(14, tone.lightness - 8)
  );
}

function getHeatChipStyle(score: number) {
  const tone = getHeatTone(score);
  return {
    borderColor: getHslAlphaColor(tone.hue, Math.max(78, tone.saturation - 6), Math.max(26, tone.lightness), 0.32),
    background: `linear-gradient(135deg, ${getHslAlphaColor(
      Math.min(34, tone.hue + 4),
      Math.max(82, tone.saturation - 6),
      Math.min(58, tone.lightness + 8),
      0.18
    )} 0%, ${getHslAlphaColor(
      tone.hue,
      tone.saturation,
      Math.max(16, tone.lightness - 4),
      0.08
    )} 100%)`,
  };
}

function getHeatVisual(score: number) {
  const fillColor = getHeatColor(score);
  const accentColor = getHeatAccentColor(score);
  const shadeColor = getHeatShadeColor(score);

  return {
    fillColor,
    accentColor,
    shadeColor,
    chipStyle: getHeatChipStyle(score),
    barGradient: `linear-gradient(90deg, ${accentColor} 0%, ${fillColor} 52%, ${shadeColor} 100%)`,
  };
}

function getFireTone(score: number) {
  const heatVisual = getHeatVisual(score);
  return {
    gradient: heatVisual.barGradient,
    opacity: 1,
  };
}

function getOverlayOpacity(score: number, _expanded = false) {
  return getHeatTone(score).overlayOpacity;
}

function getOverlayFilter(score: number, isCompact: boolean) {
  const tone = getHeatTone(score);
  const compactSaturateBoost = isCompact ? 12 : 0;
  return `sepia(1) saturate(${tone.filterSaturate + compactSaturateBoost}%) hue-rotate(${tone.filterHueRotate}deg) brightness(${tone.filterBrightness}) contrast(${tone.filterContrast})`;
}

const MuscleHeatmap = ({
  exercises,
  variant = "full",
  showSetBars = true,
  maxBars,
  showScoreLegend = true,
  layout = "stacked",
  imageSize = "small",
  stretchMode = "default",
  className = "",
}: MuscleHeatmapProps) => {
  const exerciseCount = exercises.length;
  const [isHeatmapDialogOpen, setIsHeatmapDialogOpen] = useState(false);
  // Image size configurations
  const imageSizeConfig = {
    small: { compact: 120, full: 200 },
    medium: { compact: 160, full: 260 },
    large: { compact: 200, full: 320 },
  };
  const dynamicFullHeightBoost =
    variant === "full" ? Math.min(Math.max(exerciseCount - 2, 0), 6) * 18 : 0;
  const imageMaxHeight = imageSizeConfig[imageSize][variant] + dynamicFullHeightBoost;

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

  const isCompact = variant === "compact";
  const imgMaxH = imageMaxHeight;
  const containerPad = isCompact ? "p-2" : "p-4";
  const containerRadius = isCompact ? "rounded-xl" : "rounded-3xl";
  const barsToRender = distribution.slice(0, maxBars ?? (isCompact ? 6 : 8));
  const totalWorkoutSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const leadingHeatScore = distribution[0]?.normalizedScore ?? 0.5;
  const leadingHeatVisual = getHeatVisual(leadingHeatScore);
  const supportingHeatVisual = getHeatVisual(Math.max(0.36, Math.min(0.56, leadingHeatScore * 0.6)));
  const shouldStretchFullImages =
    variant === "full" && !showSetBars && stretchMode !== "none";
  const overlayPadding = isCompact ? 8 : 16;
  const stretchBaseHeight = stretchMode === "compact" ? 240 : 320;
  const stretchHeightStep = stretchMode === "compact" ? 22 : 30;
  const stretchMaxHeight = stretchMode === "compact" ? 380 : 500;
  const silhouetteFrameMinHeight = shouldStretchFullImages
    ? Math.min(
        stretchBaseHeight + Math.min(Math.max(exerciseCount - 2, 0), 6) * stretchHeightStep,
        stretchMaxHeight
      )
    : undefined;
  const silhouetteFrameStyle = silhouetteFrameMinHeight
    ? { minHeight: silhouetteFrameMinHeight }
    : undefined;
  const silhouetteImageStyle = shouldStretchFullImages
    ? { maxHeight: "100%" as const }
    : { maxHeight: imgMaxH };
  const dialogImageMaxHeight = Math.min(Math.max(imgMaxH + (isCompact ? 220 : 140), 360), 560);

  const renderSilhouettesBlock = ({
    expanded = false,
    interactive = false,
  }: {
    expanded?: boolean;
    interactive?: boolean;
  } = {}) => {
    const stretchImages = expanded ? false : shouldStretchFullImages;
    const localPad = expanded ? "p-4 sm:p-5" : containerPad;
    const localRadius = expanded ? "rounded-[1.75rem]" : containerRadius;
    const localFrameStyle = expanded ? undefined : silhouetteFrameStyle;
    const localImageClass = stretchImages
      ? "relative z-[1] mx-auto h-full w-auto max-w-full object-contain"
      : "relative z-[1] h-auto w-full object-contain";
    const localImageStyle = expanded
      ? { maxHeight: dialogImageMaxHeight }
      : stretchImages
        ? { maxHeight: "100%" as const }
        : silhouetteImageStyle;
    const localImageOpacityClass =
      overlays.length > 0
        ? expanded
          ? "opacity-[0.84]"
          : "opacity-[0.86]"
        : expanded
          ? "opacity-[0.8]"
          : "opacity-75";

    return (
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? "Open muscle heatmap" : undefined}
        onClick={
          interactive
            ? (event) => {
                event.stopPropagation();
                setIsHeatmapDialogOpen(true);
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsHeatmapDialogOpen(true);
                }
              }
            : undefined
        }
        className={`relative grid grid-cols-2 gap-3 ${
          stretchImages ? "h-full items-stretch" : ""
        } ${
          interactive
            ? "group cursor-zoom-in outline-none transition-transform focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111214]"
            : ""
        }`}
      >
        <div
          className={`relative flex items-center justify-center ${localRadius} border border-white/5 bg-white/[0.025] ${localPad} overflow-hidden ${
            stretchImages ? "h-full" : ""
          } ${
            interactive ? "transition-colors group-hover:border-orange-500/25 group-focus-visible:border-orange-500/25" : ""
          }`}
          style={localFrameStyle}
        >
          {expanded ? (
            <div className="relative mx-auto inline-flex max-w-full items-center justify-center">
              <img
                src={BODY_FRONT_IMAGE_URL}
                alt="Body front"
                className={`relative z-[1] block h-auto w-auto max-w-full object-contain ${localImageOpacityClass}`}
                style={{ maxHeight: dialogImageMaxHeight }}
              />
              {overlays.map(
                (o) =>
                  o.frontUrl && (
                    <img
                      key={`front-${o.name}`}
                      src={o.frontUrl}
                      alt={o.name}
                      className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
                      style={{
                        opacity: getOverlayOpacity(o.normalizedScore, true),
                        mixBlendMode: "normal",
                        filter: getOverlayFilter(o.normalizedScore, false),
                      }}
                    />
                  )
              )}
            </div>
          ) : (
            <>
              <img
                src={BODY_FRONT_IMAGE_URL}
                alt="Body front"
                className={`${localImageClass} ${localImageOpacityClass}`}
                style={localImageStyle}
              />
              {overlays.map(
                (o) =>
                  o.frontUrl && (
                    <img
                      key={`front-${o.name}`}
                      src={o.frontUrl}
                      alt={o.name}
                      className="pointer-events-none absolute z-10 h-full w-full object-contain"
                      style={{
                        inset: 0,
                        padding: overlayPadding,
                        opacity: getOverlayOpacity(o.normalizedScore),
                        mixBlendMode: "normal",
                        filter: getOverlayFilter(o.normalizedScore, isCompact && !expanded),
                      }}
                    />
                  )
              )}
            </>
          )}
        </div>

        <div
          className={`relative flex items-center justify-center ${localRadius} border border-white/5 bg-white/[0.025] ${localPad} overflow-hidden ${
            stretchImages ? "h-full" : ""
          } ${
            interactive ? "transition-colors group-hover:border-orange-500/25 group-focus-visible:border-orange-500/25" : ""
          }`}
          style={localFrameStyle}
        >
          {expanded ? (
            <div className="relative mx-auto inline-flex max-w-full items-center justify-center">
              <img
                src={BODY_BACK_IMAGE_URL}
                alt="Body back"
                className={`relative z-[1] block h-auto w-auto max-w-full object-contain ${localImageOpacityClass}`}
                style={{ maxHeight: dialogImageMaxHeight }}
              />
              {overlays.map(
                (o) =>
                  o.backUrl && (
                    <img
                      key={`back-${o.name}`}
                      src={o.backUrl}
                      alt={o.name}
                      className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
                      style={{
                        opacity: getOverlayOpacity(o.normalizedScore, true),
                        mixBlendMode: "normal",
                        filter: getOverlayFilter(o.normalizedScore, false),
                      }}
                    />
                  )
              )}
            </div>
          ) : (
            <>
              <img
                src={BODY_BACK_IMAGE_URL}
                alt="Body back"
                className={`${localImageClass} ${localImageOpacityClass}`}
                style={localImageStyle}
              />
              {overlays.map(
                (o) =>
                  o.backUrl && (
                    <img
                      key={`back-${o.name}`}
                      src={o.backUrl}
                      alt={o.name}
                      className="pointer-events-none absolute z-10 h-full w-full object-contain"
                      style={{
                        inset: 0,
                        padding: overlayPadding,
                        opacity: getOverlayOpacity(o.normalizedScore),
                        mixBlendMode: "normal",
                        filter: getOverlayFilter(o.normalizedScore, isCompact && !expanded),
                      }}
                    />
                  )
              )}
            </>
          )}
        </div>

        {interactive && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/75 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            View Larger
          </div>
        )}
      </div>
    );
  };

  const silhouettesBlock = renderSilhouettesBlock({ interactive: true });

  const heatmapDialog = (
    <Dialog open={isHeatmapDialogOpen} onOpenChange={setIsHeatmapDialogOpen}>
      <DialogContent className="left-1/2 top-auto bottom-[calc(var(--mobile-bottom-dock-height,80px)+env(safe-area-inset-bottom)+12px)] w-[min(28rem,calc(100vw-1rem))] max-w-[28rem] -translate-x-1/2 translate-y-0 flex max-h-[calc(100dvh-var(--mobile-bottom-dock-height,80px)-env(safe-area-inset-bottom)-1.25rem)] flex-col gap-0 overflow-hidden rounded-[24px] border border-white/10 bg-[#151517] p-0 text-white shadow-[0_32px_90px_rgba(0,0,0,0.6)] sm:bottom-auto sm:top-[50%] sm:w-[min(44rem,calc(100vw-2rem))] sm:max-w-[44rem] sm:translate-y-[-50%] sm:rounded-[26px] sm:max-h-[min(88dvh,48rem)]">
        <DialogTitle className="sr-only">Muscle Heatmap</DialogTitle>

        <div className="shrink-0 border-b border-white/8 px-4 pt-4 sm:px-5 sm:pt-4">
          <div className="pr-10">
            <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              Muscle Heatmap
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Front and back muscle activation overview
            </p>
          </div>

          {exercises.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 pb-4">
              <div
                className="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                style={{
                  ...leadingHeatVisual.chipStyle,
                  color: leadingHeatVisual.accentColor,
                }}
              >
                {totalWorkoutSets} total sets
              </div>
              <div
                className="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                style={{
                  ...supportingHeatVisual.chipStyle,
                  color: supportingHeatVisual.accentColor,
                }}
              >
                {distribution.length} muscle groups
              </div>
            </div>
          ) : (
            <p className="mt-3 pb-4 text-sm text-gray-400">
              Front and back body view
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5">
          {renderSilhouettesBlock({ expanded: true })}

          {distribution.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                Most Targeted Muscles
              </p>
              <div className="flex flex-wrap gap-2">
                {distribution.slice(0, 8).map((muscle) => (
                  <div
                    key={`dialog-${muscle.name}`}
                    className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1"
                    style={getHeatVisual(muscle.normalizedScore).chipStyle}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: getHeatVisual(muscle.normalizedScore).accentColor,
                      }}
                    />
                    <span className="text-[10px] font-bold text-white/85">{muscle.name}</span>
                    <span
                      className="text-[9px] font-bold"
                      style={{ color: getHeatVisual(muscle.normalizedScore).accentColor }}
                    >
                      {formatSetScore(muscle.rawScore)} sets
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  if (exercises.length === 0) {
    return (
      <>
        <div className={className}>
          {silhouettesBlock}
        </div>
        {heatmapDialog}
      </>
    );
  }

  // Build the bars block
  const barsBlock = (
    <>
      {/* Horizontal Set Bars */}
      {showSetBars && barsToRender.length > 0 && (
        <div className={layout === "horizontal" ? "rounded-xl border border-white/5 bg-black/25 p-3" : "mt-3 rounded-xl border border-white/5 bg-black/25 p-3"}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">
              Muscle Set Load
            </p>
            <p className="text-[9px] font-black" style={{ color: leadingHeatVisual.accentColor }}>
              Total Sets = {totalWorkoutSets}
            </p>
          </div>

          <div className={`space-y-2 ${isCompact ? "max-h-[180px] overflow-y-auto pr-1" : ""}`}>
            {barsToRender.map((muscle) => (
              <div key={muscle.name} className="space-y-1">
                {(() => {
                  const heatVisual = getHeatVisual(muscle.normalizedScore);
                  return (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[9px] font-bold uppercase text-gray-300">{muscle.name}</p>
                        <p className="text-[9px] font-black" style={{ color: heatVisual.accentColor }}>
                          {formatSetScore(muscle.rawScore)} sets
                        </p>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/[0.03]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${muscle.normalizedScore * 100}%`,
                            background: heatVisual.barGradient,
                            opacity: 1,
                          }}
                        />
                      </div>
                      <p className="text-right text-[8px] font-bold" style={{ color: heatVisual.accentColor }}>
                        {Math.round(muscle.normalizedScore * 100)}%
                      </p>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score legend (full variant only) */}
      {!isCompact && showScoreLegend && distribution.length > 0 && (
        <div className={layout === "horizontal" ? "mt-3 flex flex-wrap gap-2" : "mt-3 flex flex-wrap gap-2"}>
          {distribution.slice(0, 6).map((m) => (
            <div
              key={m.name}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1"
              style={getHeatVisual(m.normalizedScore).chipStyle}
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: getHeatVisual(m.normalizedScore).accentColor,
                }}
              />
              <span className="text-[10px] font-bold text-white/80">{m.name}</span>
              <span
                className="text-[9px] font-bold"
                style={{ color: getHeatVisual(m.normalizedScore).accentColor }}
              >
                {formatSetScore(m.rawScore)} sets
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (layout === "horizontal") {
    return (
      <>
        <div className={`${className}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Body silhouettes — fixed width, square frames */}
          <div className="w-full flex-shrink-0 sm:w-72">
            {silhouettesBlock}
          </div>
          {/* Bars — fill remaining width */}
            <div className="min-w-0 flex-1">
              {barsBlock}
            </div>
          </div>
        </div>
        {heatmapDialog}
      </>
    );
  }

  // Default stacked layout
  return (
    <>
      <div className={`${className} ${shouldStretchFullImages ? "h-full" : ""}`}>
        {silhouettesBlock}
        {barsBlock}
      </div>
      {heatmapDialog}
    </>
  );
};

export default MuscleHeatmap;

