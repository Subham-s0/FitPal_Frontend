import { useMemo, useState } from "react";
import { ArrowDownToLine, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

import ExerciseDetailSheet from "@/features/routines/components/ExerciseDetailSheet";
import { createExerciseDetailPreviewFromRoutineExercise } from "@/features/routines/components/exerciseDetailPreview";
import MuscleHeatmap from "@/features/routines/components/MuscleHeatmap";
import type { AiRoutinePreviewResponse } from "@/features/routines/aiRoutineTypes";
import type { Routine, RoutineExercise, WorkoutDay } from "@/features/routines/routineTypes";
import { getExerciseInitials, getVisibleSetFields } from "@/features/routines/routineTypes";

interface AiRoutinePreviewPanelProps {
  previewRoutine: Routine;
  previewResponse: AiRoutinePreviewResponse;
  onImport: () => void;
  importPending: boolean;
}

function formatRange(values: Array<number | null>, suffix = ""): string | null {
  const definedValues = values.filter((value): value is number => value !== null);
  if (definedValues.length === 0) {
    return null;
  }

  const min = Math.min(...definedValues);
  const max = Math.max(...definedValues);
  if (min === max) {
    return `${min}${suffix}`;
  }
  return `${min}-${max}${suffix}`;
}

function formatDurationRange(values: Array<number | null>): string | null {
  const definedValues = values.filter((value): value is number => value !== null);
  if (definedValues.length === 0) {
    return null;
  }

  const formatSeconds = (value: number) => {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const min = Math.min(...definedValues);
  const max = Math.max(...definedValues);
  if (min === max) {
    return formatSeconds(min);
  }
  return `${formatSeconds(min)}-${formatSeconds(max)}`;
}

function buildExerciseSummary(exercise: RoutineExercise): string {
  const fields = getVisibleSetFields(exercise.exerciseType);
  const parts: string[] = [`${exercise.sets.length} set${exercise.sets.length === 1 ? "" : "s"}`];

  if (fields.reps) {
    const reps = formatRange(exercise.sets.map((set) => set.targetReps));
    if (reps) {
      parts.push(`${reps} reps`);
    }
  }

  if (fields.weight) {
    const weight = formatRange(exercise.sets.map((set) => set.targetWeight), " kg");
    if (weight) {
      parts.push(`${fields.weightLabel || "Weight"} ${weight}`);
    }
  }

  if (fields.duration) {
    const duration = formatDurationRange(exercise.sets.map((set) => set.targetDurationSeconds));
    if (duration) {
      parts.push(`Time ${duration}`);
    }
  }

  if (fields.distance) {
    const distance = formatRange(exercise.sets.map((set) => set.targetDistance), " m");
    if (distance) {
      parts.push(`Distance ${distance}`);
    }
  }

  return parts.join(" • ");
}

function DayExerciseRow({
  exercise,
  index,
  onSelectExercise,
}: {
  exercise: RoutineExercise;
  index: number;
  onSelectExercise: (exercise: RoutineExercise) => void;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/[0.07] bg-black/20 p-3">
      <div className="flex items-start gap-3">
        {exercise.coverUrl ? (
          <button
            type="button"
            onClick={() => onSelectExercise(exercise)}
            className="flex-shrink-0 rounded-xl border border-white/10 transition-colors hover:border-white/20"
            aria-label={`Open ${exercise.name} details`}
          >
            <img
              src={exercise.coverUrl}
              alt={exercise.name}
              className="h-12 w-12 rounded-xl object-cover"
            />
          </button>
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black text-xs font-black text-orange-400">
            {getExerciseInitials(exercise.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/15 text-[10px] font-black text-orange-300">
              {index + 1}
            </span>
            <p className="truncate text-sm font-bold text-white">{exercise.name}</p>
          </div>
          <p className="text-[11px] text-slate-400">
            {exercise.equipmentName || "No equipment"} • {exercise.primaryMuscles.join(", ")}
          </p>
          <p className="mt-1 text-[11px] text-slate-300">{buildExerciseSummary(exercise)}</p>
          {exercise.notes && (
            <p className="mt-2 text-[11px] leading-5 text-slate-400">{exercise.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewDayCard({
  day,
  expanded,
  onToggle,
  onSelectExercise,
}: {
  day: WorkoutDay;
  expanded: boolean;
  onToggle: () => void;
  onSelectExercise: (exercise: RoutineExercise) => void;
}) {
  const totalSets = day.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

  return (
    <div className="rounded-[1.6rem] border border-white/[0.07] user-surface-soft">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-sm font-black text-orange-300">
          {day.dayOrder}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-white">{day.name}</p>
            <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300">
              {day.exercises.length} exercises
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {(day.description || "AI-generated workout day").trim()} • {totalSets} total sets
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3">
          <div className="space-y-2">
            {day.exercises.map((exercise, index) => (
              <DayExerciseRow
                key={exercise.id}
                exercise={exercise}
                index={index}
                onSelectExercise={onSelectExercise}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiRoutinePreviewPanel({
  previewRoutine,
  onImport,
  importPending,
}: AiRoutinePreviewPanelProps) {
  const [expandedDayIds, setExpandedDayIds] = useState<Set<string>>(() => new Set());
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState(
    null as ReturnType<typeof createExerciseDetailPreviewFromRoutineExercise> | null
  );
  const [isExerciseDetailOpen, setIsExerciseDetailOpen] = useState(false);

  const allExercises = useMemo(
    () => previewRoutine.days.flatMap((day) => day.exercises),
    [previewRoutine.days]
  );

  const totalSets = useMemo(
    () => allExercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [allExercises]
  );

  const toggleDay = (dayId: string) => {
    setExpandedDayIds((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  };

  const handleSelectExercise = (exercise: RoutineExercise) => {
    setSelectedExerciseDetail(createExerciseDetailPreviewFromRoutineExercise(exercise));
    setIsExerciseDetailOpen(true);
  };

  return (
    <>
    <section className="flow-panel rounded-[2rem]">
      <div className="flex flex-col gap-4 border-b border-white/5 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-white">{previewRoutine.name}</h3>
            <span className="rounded-lg bg-orange-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-orange-300">
              AI Generated
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            <span className="font-black text-white">{previewRoutine.days.length}</span>{" "}
            day{previewRoutine.days.length === 1 ? "" : "s"} •{" "}
            <span className="font-black text-white">{totalSets}</span> total sets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onImport}
            disabled={importPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-5 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            Import Routine
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="space-y-4">
          <div className="rounded-[1.6rem] border border-white/[0.07] p-4">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">
              Routine Heatmap
            </p>
            <MuscleHeatmap
              exercises={allExercises}
              variant="full"
              showSetBars={false}
              showScoreLegend={false}
              stretchMode="none"
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-3">
          {previewRoutine.days.map((day) => (
            <PreviewDayCard
              key={day.id}
              day={day}
              expanded={expandedDayIds.has(day.id)}
              onToggle={() => toggleDay(day.id)}
              onSelectExercise={handleSelectExercise}
            />
          ))}
        </div>
      </div>
    </section>
    <ExerciseDetailSheet
      exercise={selectedExerciseDetail}
      open={isExerciseDetailOpen}
      onOpenChange={setIsExerciseDetailOpen}
    />
    </>
  );
}
