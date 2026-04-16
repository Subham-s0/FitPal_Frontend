import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getExerciseByIdApi, getMyCustomExerciseByIdApi } from "@/features/exercises/api";
import type {
  ExerciseHowToSectionResponse,
  ExerciseLibraryResponse,
} from "@/features/exercises/model";
import { exerciseQueryKeys } from "@/features/exercises/queryKeys";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import type { ExerciseDetailPreview } from "@/features/routines/components/exerciseDetailPreview";

interface ExerciseDetailSheetProps {
  exercise: ExerciseDetailPreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getMuscleNamesByType(
  assignments: ExerciseLibraryResponse["muscleAssignments"] | undefined,
  muscleType: "PRIMARY" | "SECONDARY"
): string[] {
  if (!assignments?.length) return [];
  return assignments
    .filter((a) => a.muscleType === muscleType && a.muscleName)
    .map((a) => a.muscleName as string);
}

function DetailCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <p className="mb-0.5 text-[8px] font-black uppercase text-gray-500 sm:mb-1 sm:text-[9px]">
        {label}
      </p>
      <p className={`text-xs font-bold sm:text-sm ${accent ? "text-orange-400" : "text-gray-100"}`}>
        {value}
      </p>
    </div>
  );
}

export default function ExerciseDetailSheet({
  exercise,
  open,
  onOpenChange,
}: ExerciseDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "howto">("summary");

  useEffect(() => {
    if (open) setActiveTab("summary");
  }, [open, exercise?.id]);

  const libraryExerciseQuery = useQuery({
    queryKey: exerciseQueryKeys.libraryDetail(exercise?.source === "library" ? exercise.id : null),
    queryFn: () => getExerciseByIdApi(exercise!.id),
    enabled: open && exercise?.source === "library",
  });

  const customExerciseQuery = useQuery({
    queryKey: exerciseQueryKeys.customDetail(exercise?.source === "custom" ? exercise.id : null),
    queryFn: () => getMyCustomExerciseByIdApi(exercise!.id),
    enabled: open && exercise?.source === "custom",
  });

  const libraryExercise = libraryExerciseQuery.data ?? null;
  const customExercise = customExerciseQuery.data ?? null;
  const isLoading = libraryExerciseQuery.isLoading || customExerciseQuery.isLoading;

  const detailError = libraryExerciseQuery.error ?? customExerciseQuery.error;
  const detailErrorMessage = detailError instanceof Error
    ? detailError.message
    : detailError
      ? "Failed to load exercise details."
      : null;

  const exerciseName = libraryExercise?.name ?? customExercise?.name ?? exercise?.name ?? "Exercise Details";
  const exerciseEquipment = libraryExercise?.equipment?.name ?? customExercise?.equipment?.name ?? exercise?.equipmentName ?? "None";
  const exerciseCoverUrl = libraryExercise?.coverUrl ?? customExercise?.coverImgUrl ?? exercise?.coverUrl ?? null;
  const exerciseVideoUrl = libraryExercise?.videoUrl ?? null;

  const primaryMuscles: string[] =
    getMuscleNamesByType(libraryExercise?.muscleAssignments, "PRIMARY").length > 0
      ? getMuscleNamesByType(libraryExercise?.muscleAssignments, "PRIMARY")
      : customExercise?.primaryMuscle?.name
        ? [customExercise.primaryMuscle.name]
        : exercise?.primaryMuscles ?? [];

  const secondaryMuscles: string[] = libraryExercise
    ? getMuscleNamesByType(libraryExercise.muscleAssignments, "SECONDARY")
    : customExercise?.secondaryMuscles.map((m) => m.name) ?? exercise?.secondaryMuscles ?? [];

  const howToSections: ExerciseHowToSectionResponse[] = libraryExercise?.howToSections ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(700px,calc(100vw-1rem))] max-w-[700px] overflow-hidden border border-white/10 bg-[#151517] p-0 text-white shadow-[0_32px_90px_rgba(0,0,0,0.6)] sm:rounded-[26px]">
        <DialogTitle className="sr-only">{exerciseName}</DialogTitle>

        <div className="border-b border-white/8 px-4 pt-4 sm:px-5 sm:pt-4">
          <div className="pr-10">
            <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              {exerciseName}
            </h2>
          </div>

          <div className="mt-3 flex items-center gap-5">
            {(["summary", "howto"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 pb-2.5 text-sm font-semibold capitalize transition-colors ${
                  activeTab === tab
                    ? "border-orange-500 text-orange-400"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {tab === "howto" ? "How to" : "Summary"}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto px-4 py-3 pb-10 sm:max-h-[min(86vh,860px)] sm:px-5 sm:py-4 sm:pb-6">
          {activeTab === "summary" ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-[1.5rem] bg-black shadow-2xl">
                {exerciseVideoUrl ? (
                  <video
                    key={exerciseVideoUrl}
                    src={exerciseVideoUrl}
                    poster={exerciseCoverUrl ?? undefined}
                    className="aspect-video h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : exerciseCoverUrl ? (
                  <img
                    src={exerciseCoverUrl}
                    alt={exerciseName}
                    className="aspect-video h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-[#f4f4f4] text-sm font-semibold text-gray-500">
                    No media available
                  </div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <DetailCard label="Equipment" value={exerciseEquipment} />
                <DetailCard
                  label="Primary Muscles"
                  value={primaryMuscles.length > 0 ? primaryMuscles.join(", ") : "--"}
                  accent
                />
                <DetailCard
                  label="Secondary Muscles"
                  value={secondaryMuscles.length > 0 ? secondaryMuscles.join(", ") : "--"}
                />
              </div>

              {isLoading && (
                <p className="text-sm font-medium text-gray-400">Loading exercise details...</p>
              )}
              {detailErrorMessage && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                  {detailErrorMessage}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                How To
              </p>

              <div className="rounded-[18px] border border-white/5 bg-[#101012] p-4">
                {isLoading ? (
                  <p className="text-sm font-medium text-gray-400">Loading instructions...</p>
                ) : detailErrorMessage ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                    {detailErrorMessage}
                  </div>
                ) : howToSections.length > 0 ? (
                  <div className="space-y-4">
                    {howToSections.map((section, index) => (
                      <div key={section.howToSectionId} className="flex items-start gap-2.5 sm:gap-4">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-orange-500/20 bg-orange-500/10 text-xs sm:text-sm font-black text-orange-400">
                          {String(section.displayOrder ?? index + 1).padStart(2, "0")}
                        </div>
                        <div className="space-y-1 pt-0.5 sm:pt-1">
                          {section.title && (
                            <p className="text-sm font-semibold text-white">{section.title}</p>
                          )}
                          <p className="text-[13px] sm:text-sm leading-6 sm:leading-7 text-gray-300">
                            {section.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-300">
                    {exercise?.source === "custom"
                      ? "How-to instructions are not available for custom exercises yet."
                      : "How-to instructions are not available for this exercise yet."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
