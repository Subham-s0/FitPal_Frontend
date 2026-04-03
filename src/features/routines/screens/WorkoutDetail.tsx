import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Plus, X, GripVertical, Edit3, Check, MoreVertical, Trash2, Link } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import {
  ExerciseLibraryPanel,
  ExerciseLibrarySheet,
  type ExerciseItem,
} from "@/features/exercises";
import { getExerciseByIdApi } from "@/features/exercises/api";

import type {
  Routine,
  WorkoutDay,
  RoutineExercise,
  RoutineSet,
} from "@/features/routines/routineTypes";
import {
  getExerciseInitials,
  getVisibleSetFields,
  createDefaultSet,
  createExerciseFromPickerItem,
  getWorkoutDayMinimumValidationError,
  getWorkoutDayPersistenceValidationError,
  normalizeDayOrder,
  reconcileWorkoutDaySupersets,
  removeExerciseAndLinkedSupersetExercises,
  removeSupersetFromWorkoutDay,
} from "@/features/routines/routineTypes";
import {
  deleteRoutine,
  getRoutine,
  updateRoutine,
} from "@/features/routines/routineStore";
import MuscleHeatmap from "@/features/routines/components/MuscleHeatmap";
import ExerciseDetailSheet from "@/features/routines/components/ExerciseDetailSheet";
import {
  createExerciseDetailPreviewFromExerciseItem,
  createExerciseDetailPreviewFromRoutineExercise,
  type ExerciseDetailPreview,
} from "@/features/routines/components/exerciseDetailPreview";

// ============================================
// PROPS
// ============================================

interface WorkoutDetailProps {
  routineId: string;
  dayId: string;
  onBack: () => void;
  onEditRoutineDays: (routineId: string, dayId: string) => void;
  startInEditMode?: boolean;
}

type ExerciseSummaryStat = {
  label: string;
  value: string;
  valueClassName?: string;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getRange(values: Array<number | null>): { min: number; max: number } | null {
  const definedValues = values.filter((value): value is number => value !== null);
  if (definedValues.length === 0) return null;

  return {
    min: Math.min(...definedValues),
    max: Math.max(...definedValues),
  };
}

function formatRange(
  values: Array<number | null>,
  formatValue: (value: number) => string = (value) => `${value}`
): string | null {
  const range = getRange(values);
  if (!range) return null;
  if (range.min === range.max) return formatValue(range.min);
  return `${formatValue(range.min)}-${formatValue(range.max)}`;
}

function getExerciseSummaryStats(
  exercise: RoutineExercise,
  fields: ReturnType<typeof getVisibleSetFields>
): ExerciseSummaryStat[] {
  const stats: ExerciseSummaryStat[] = [
    {
      label: "Sets",
      value: `${exercise.sets.length}`,
      valueClassName: "text-orange-400",
    },
  ];

  if (fields.reps) {
    const repsRange = formatRange(exercise.sets.map((set) => set.targetReps));
    if (repsRange) {
      stats.push({
        label: "Reps",
        value: repsRange,
      });
    }
  }

  if (fields.weight) {
    const weightRange = formatRange(exercise.sets.map((set) => set.targetWeight));
    if (weightRange) {
      stats.push({
        label: fields.weightLabel || "Weight",
        value: `${weightRange} kg`,
        valueClassName: "text-cyan-300",
      });
    }
  }

  if (fields.duration) {
    const durationRange = formatRange(
      exercise.sets.map((set) => set.targetDurationSeconds),
      formatDuration
    );
    if (durationRange) {
      stats.push({
        label: "Time",
        value: durationRange,
        valueClassName: "text-emerald-300",
      });
    }
  }

  if (fields.distance) {
    const distanceRange = formatRange(exercise.sets.map((set) => set.targetDistance));
    if (distanceRange) {
      stats.push({
        label: "Distance",
        value: `${distanceRange} m`,
        valueClassName: "text-sky-300",
      });
    }
  }

  return stats;
}

// ============================================
// SORTABLE EXERCISE WRAPPER
// ============================================

function SortableExerciseWrapper({
  exercise,
  children,
}: {
  exercise: RoutineExercise;
  children: (dragHandleProps: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
    >
      {children({ attributes, listeners })}
    </div>
  );
}

// ============================================
// EXERCISE CARD
// ============================================

interface ExerciseCardProps {
  exercise: RoutineExercise;
  exerciseNumber: number;
  editMode: boolean;
  allExercises?: RoutineExercise[];
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown> | undefined;
  };
  onOpenDetails?: (exercise: RoutineExercise) => void;
  onUpdateSet?: (exerciseId: string, setId: string, updates: Partial<RoutineSet>) => void;
  onRemoveSet?: (exerciseId: string, setId: string) => void;
  onAddSet?: (exerciseId: string) => void;
  onRemoveExercise?: (exerciseId: string) => void;
  onUpdateNotes?: (exerciseId: string, notes: string) => void;
  onLinkSuperset?: (exerciseId: string, partnerId: string) => void;
  onRemoveSuperset?: (exerciseId: string) => void;
}

const ExerciseCard = ({
  exercise,
  exerciseNumber,
  editMode,
  allExercises = [],
  dragHandleProps,
  onOpenDetails,
  onUpdateSet,
  onRemoveSet,
  onAddSet,
  onRemoveExercise,
  onUpdateNotes,
  onLinkSuperset,
  onRemoveSuperset,
}: ExerciseCardProps) => {
  const fields = getVisibleSetFields(exercise.exerciseType);
  const totalSets = exercise.sets.length;
  const summaryStats = getExerciseSummaryStats(exercise, fields);
  const [showExMenu, setShowExMenu] = useState(false);
  const [showSupersetPicker, setShowSupersetPicker] = useState(false);
  const exMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [exMenuPos, setExMenuPos] = useState({ top: 0, right: 0 });
  const supersetKey = exercise.supersetGroupId?.trim() || exercise.supersetTag?.trim() || null;
  const isInSuperset = supersetKey !== null;
  const supersetCandidates = allExercises.filter(
    (ex) => ex.id !== exercise.id && !(ex.supersetGroupId?.trim() || ex.supersetTag?.trim())
  );

  return (
    <div className="flow-panel rounded-[1.75rem] border border-white/10 bg-[rgba(10,10,10,0.88)] p-4 transition-colors hover:border-orange-500/30 hover:bg-[rgba(14,14,14,0.92)]">
      {/* Superset tag */}
      {exercise.supersetTag && (
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-purple-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-400">
            Superset
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        {/* Drag Handle - inside the card */}
        {editMode && dragHandleProps && (
          <div
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          className="mt-2 flex-shrink-0 cursor-grab rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-300 active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onOpenDetails?.(exercise);
          }}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-1.5 text-left transition-colors hover:bg-white/[0.04]"
        >
          {/* Larger image */}
          {exercise.coverUrl ? (
            <img
              src={exercise.coverUrl}
              alt={exercise.name}
              className="h-14 w-14 flex-shrink-0 rounded-xl border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black text-sm font-black text-orange-600">
              {getExerciseInitials(exercise.name)}
            </div>
          )}

          <div className="min-w-0 flex-1 py-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-orange-600/20 text-[11px] font-black text-orange-600">
                {exerciseNumber}
              </span>
              <h4 className="text-base font-bold text-white">{exercise.name}</h4>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>{exercise.equipmentName || exercise.primaryMuscles.join(", ")}</span>
              {editMode && (
                <>
              <span className="text-white/20">•</span>
              <span className="font-bold text-orange-500">
                {totalSets} set{totalSets !== 1 ? "s" : ""}
              </span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Three-dot Menu (edit mode) */}
        {editMode && (
          <div className="relative mt-2 flex-shrink-0">
            <button
              ref={exMenuBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                if (!showExMenu && exMenuBtnRef.current) {
                  const rect = exMenuBtnRef.current.getBoundingClientRect();
                  setExMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                }
                setShowExMenu(!showExMenu);
              }}
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showExMenu && createPortal(
              <div className="fitpal-portal-root">
                <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setShowExMenu(false); }} />
                <div
                  className="fixed z-[9999] w-48 rounded-2xl border border-white/10 bg-[#181818] py-2 shadow-xl"
                  style={{ top: exMenuPos.top, right: exMenuPos.right }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isInSuperset ? (
                    <button
                      onClick={() => {
                        setShowExMenu(false);
                        onRemoveSuperset?.(exercise.id);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/10"
                    >
                      <X className="h-4 w-4" />
                      Remove Superset
                    </button>
                  ) : supersetCandidates.length > 0 ? (
                    <button
                      onClick={() => { setShowExMenu(false); setShowSupersetPicker(true); }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-white/5"
                    >
                      <Link className="h-4 w-4 text-purple-400" />
                      Add to Superset
                    </button>
                  ) : null}
                  <button
                    onClick={() => { setShowExMenu(false); onRemoveExercise?.(exercise.id); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Exercise
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}
      </div>

      {/* Superset Picker Modal */}
      {showSupersetPicker && createPortal(
        <div className="fitpal-portal-root">
          <div className="fixed inset-0 z-[9998] bg-black/60" onClick={(e) => { e.stopPropagation(); setShowSupersetPicker(false); }} />
          <div 
            className="fixed inset-x-4 top-1/2 z-[9999] mx-auto max-w-sm -translate-y-1/2 rounded-3xl border border-white/10 bg-[#141414] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Select Superset Partner
              </h3>
              <button
                onClick={() => setShowSupersetPicker(false)}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-[11px] text-gray-500">
              Pair <span className="font-bold text-orange-400">{exercise.name}</span> with another exercise to create a superset.
            </p>
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {supersetCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  onClick={() => {
                    onLinkSuperset?.(exercise.id, candidate.id);
                    setShowSupersetPicker(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-left transition-all hover:border-purple-500/30 hover:bg-purple-500/5"
                >
                  {candidate.coverUrl ? (
                    <img
                      src={candidate.coverUrl}
                      alt={candidate.name}
                      className="h-10 w-10 flex-shrink-0 rounded-lg border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black text-[9px] font-black text-orange-600">
                      {getExerciseInitials(candidate.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{candidate.name}</p>
                    <p className="text-[10px] text-gray-500">
                      {candidate.primaryMuscles.join(", ")} • {candidate.sets.length} sets
                    </p>
                  </div>
                  <Link className="h-4 w-4 flex-shrink-0 text-purple-400/50" />
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Notes */}
      {editMode ? (
        <textarea
          value={exercise.notes}
          onChange={(e) => onUpdateNotes?.(exercise.id, e.target.value)}
          placeholder="Add notes..."
          rows={1}
          className="flow-input mb-2 w-full px-2.5 py-1 text-[11px] placeholder:text-gray-600"
        />
      ) : (
        exercise.notes && (
          <div className="flow-panel-subtle mb-2 rounded-xl px-2.5 py-1.5">
            <p className="text-xs text-gray-400">{exercise.notes}</p>
          </div>
        )
      )}

      {/* Sets Table */}
      {editMode ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-1.5 pr-2 text-left font-bold text-gray-500">Set</th>
                {fields.weight && (
                  <th className="px-1.5 pb-1.5 text-left font-bold text-gray-500">
                    {fields.weightLabel || "Weight"}
                  </th>
                )}
                {fields.reps && (
                  <th className="px-1.5 pb-1.5 text-left font-bold text-gray-500">Reps</th>
                )}
                {fields.duration && (
                  <th className="px-1.5 pb-1.5 text-left font-bold text-gray-500">Time</th>
                )}
                {fields.distance && (
                  <th className="px-1.5 pb-1.5 text-left font-bold text-gray-500">Dist</th>
                )}
                {editMode && <th className="w-7 pb-1.5"></th>}
              </tr>
            </thead>
            <tbody>
              {exercise.sets.map((set, index) => (
                <tr key={set.id} className="border-b border-white/[0.02]">
                  <td className="py-1 pr-2 font-bold text-white">{index + 1}</td>
                  {fields.weight && (
                    <td className="px-1.5 py-1">
                      {editMode ? (
                        <input
                          type="number"
                          value={set.targetWeight ?? ""}
                          onChange={(e) =>
                            onUpdateSet?.(exercise.id, set.id, {
                              targetWeight: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          placeholder="-"
                          className="flow-input w-14 rounded-lg px-1.5 py-0.5 text-[11px]"
                        />
                      ) : (
                        <span className="text-gray-400">
                          {set.targetWeight ? `${set.targetWeight} kg` : "-"}
                        </span>
                      )}
                    </td>
                  )}
                  {fields.reps && (
                    <td className="px-1.5 py-1">
                      {editMode ? (
                        <input
                          type="number"
                          value={set.targetReps ?? ""}
                          onChange={(e) =>
                            onUpdateSet?.(exercise.id, set.id, {
                              targetReps: e.target.value ? parseInt(e.target.value, 10) : null,
                            })
                          }
                          placeholder="-"
                          className="flow-input w-12 rounded-lg px-1.5 py-0.5 text-[11px]"
                        />
                      ) : (
                        <span className="text-gray-400">{set.targetReps || "-"}</span>
                      )}
                    </td>
                  )}
                  {fields.duration && (
                    <td className="px-1.5 py-1">
                      {editMode ? (
                        <input
                          type="number"
                          value={set.targetDurationSeconds ?? ""}
                          onChange={(e) =>
                            onUpdateSet?.(exercise.id, set.id, {
                              targetDurationSeconds: e.target.value
                                ? parseInt(e.target.value, 10)
                                : null,
                            })
                          }
                          placeholder="-"
                          className="flow-input w-14 rounded-lg px-1.5 py-0.5 text-[11px]"
                        />
                      ) : (
                        <span className="text-gray-400">
                          {set.targetDurationSeconds
                            ? `${Math.floor(set.targetDurationSeconds / 60)}:${(
                                set.targetDurationSeconds % 60
                              )
                                .toString()
                                .padStart(2, "0")}`
                            : "-"}
                        </span>
                      )}
                    </td>
                  )}
                  {fields.distance && (
                    <td className="px-1.5 py-1">
                      {editMode ? (
                        <input
                          type="number"
                          value={set.targetDistance ?? ""}
                          onChange={(e) =>
                            onUpdateSet?.(exercise.id, set.id, {
                              targetDistance: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          placeholder="-"
                          className="flow-input w-14 rounded-lg px-1.5 py-0.5 text-[11px]"
                        />
                      ) : (
                        <span className="text-gray-400">
                          {set.targetDistance ? `${set.targetDistance} m` : "-"}
                        </span>
                      )}
                    </td>
                  )}
                  {editMode && (
                    <td className="py-1 pl-1.5">
                      <button
                        type="button"
                        onClick={() => onRemoveSet?.(exercise.id, set.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap gap-2">
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              className="min-w-[112px] flex-1 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                {stat.label}
              </p>
              <p className={`mt-1 text-base font-black ${stat.valueClassName || "text-white"}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {editMode && (
        <button
          onClick={() => onAddSet?.(exercise.id)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-orange-300 transition-colors hover:border-orange-500/35 hover:bg-orange-500/14 hover:text-white sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Set
        </button>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const WorkoutDetail = ({
  routineId,
  dayId,
  onBack,
  onEditRoutineDays,
  startInEditMode = false,
}: WorkoutDetailProps) => {
  const [editMode, setEditMode] = useState(startInEditMode);
  const [showLibrarySheet, setShowLibrarySheet] = useState(false);
  const [librarySecondaryLookup, setLibrarySecondaryLookup] = useState<Record<number, string[]>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<ExerciseDetailPreview | null>(null);
  const [isExerciseDetailOpen, setIsExerciseDetailOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [routine, setRoutine] = useState<Routine | null>(() => getRoutine(routineId));
  const [localDay, setLocalDay] = useState<WorkoutDay | null>(() => {
    const initialRoutine = getRoutine(routineId);
    const initialDay = initialRoutine?.days.find((d) => d.id === dayId) ?? null;
    return initialDay ? { ...initialDay } : null;
  });
  const day = useMemo(
    () => routine?.days.find((d) => d.id === dayId) || null,
    [routine, dayId]
  );

  useEffect(() => {
    setRoutine(getRoutine(routineId));
  }, [routineId]);

  useEffect(() => {
    setLocalDay(day ? { ...day } : null);
  }, [day]);

  useEffect(() => {
    setEditMode(startInEditMode);
    setIsEditingName(false);
  }, [routineId, dayId, startInEditMode]);

  const handleUpdateNotes = useCallback(
    (exerciseId: string, notes: string) => {
      setLocalDay((prev) =>
        prev
          ? { ...prev, exercises: prev.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, notes } : ex)) }
          : prev
      );
    },
    []
  );

  const handleUpdateSet = useCallback(
    (exerciseId: string, setId: string, updates: Partial<RoutineSet>) => {
      setLocalDay((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((ex) =>
                ex.id === exerciseId
                  ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)) }
                  : ex
              ),
            }
          : prev
      );
    },
    []
  );

  const handleRemoveSet = useCallback((exerciseId: string, setId: string) => {
    setLocalDay((prev) =>
      prev
        ? (() => {
            const exercise = prev.exercises.find((ex) => ex.id === exerciseId);
            if (!exercise) {
              return prev;
            }

            return {
              ...prev,
              exercises: prev.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
              ),
            };
          })()
        : prev
    );
  }, []);

  const handleAddSet = useCallback((exerciseId: string) => {
    setLocalDay((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const nextRestSeconds = ex.sets[ex.sets.length - 1]?.targetRestSeconds ?? 90;
          return { ...ex, sets: [...ex.sets, createDefaultSet(ex.sets.length + 1, nextRestSeconds)] };
        }),
      };
    });
  }, []);

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    setLocalDay((prev) =>
      prev
        ? (() => {
            const exercise = prev.exercises.find((ex) => ex.id === exerciseId);
            if (!exercise) {
              return prev;
            }

            return removeExerciseAndLinkedSupersetExercises(prev, exerciseId);
          })()
        : prev
    );
  }, []);

  const handleLinkSuperset = useCallback((exerciseId: string, partnerId: string) => {
    setLocalDay((prev) => {
      if (!prev) return prev;
      // Generate a unique superset tag letter
      const usedTags = new Set(
        prev.exercises.map((ex) => ex.supersetTag).filter(Boolean) as string[]
      );
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let tag = "A";
      for (const l of letters) {
        if (!usedTags.has(l)) { tag = l; break; }
      }
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId || ex.id === partnerId
            ? { ...ex, supersetTag: tag }
            : ex
        ),
      };
    });
  }, []);

  const handleRemoveSuperset = useCallback((exerciseId: string) => {
    setLocalDay((prev) => {
      if (!prev) return prev;
      return removeSupersetFromWorkoutDay(prev, exerciseId);
    });
  }, []);

  const handleAddExercise = useCallback((exerciseItem: ExerciseItem) => {
    setShowLibrarySheet(false);

    const appendExercise = (secondaryMuscles: string[]) => {
      setLocalDay((prev) => {
        if (!prev) return prev;
        const newExercise = createExerciseFromPickerItem(
          { ...exerciseItem, secondaryMuscles },
          prev.exercises.length
        );
        return { ...prev, exercises: [...prev.exercises, newExercise] };
      });
    };

    if (exerciseItem.source !== "library") {
      appendExercise(exerciseItem.secondaryMuscles);
      return;
    }

    void getExerciseByIdApi(exerciseItem.id)
      .then((detail) => {
        const secondaryMuscles = Array.from(
          new Set(
            detail.muscleAssignments
              .filter((a) => a.muscleType === "SECONDARY" && a.muscleName)
              .map((a) => a.muscleName as string)
          )
        );
        appendExercise(secondaryMuscles);
      })
      .catch(() => appendExercise(exerciseItem.secondaryMuscles));
  }, []);

  const handleExerciseDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalDay((prev) => {
      if (!prev) return prev;
      const oldIndex = prev.exercises.findIndex((ex) => ex.id === active.id);
      const newIndex = prev.exercises.findIndex((ex) => ex.id === over.id);
      return { ...prev, exercises: arrayMove(prev.exercises, oldIndex, newIndex) };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!routine || !localDay) return;
    const dayToPersist = reconcileWorkoutDaySupersets(localDay);

    const validationError =
      getWorkoutDayPersistenceValidationError(dayToPersist) || getWorkoutDayMinimumValidationError(dayToPersist);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const updatedRoutine = await updateRoutine(routineId, {
        ...routine,
        days: routine.days.map((d) => (d.id === dayId ? dayToPersist : d)),
      }, { throwOnSyncError: true });
      setRoutine(updatedRoutine);
      const updatedDay = updatedRoutine.days.find((item) => item.id === dayId) ?? null;
      setLocalDay(updatedDay ? { ...updatedDay } : dayToPersist);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save workout day.");
      return;
    }

    setEditMode(false);
    setIsEditingName(false);
    toast.success("Workout saved successfully.");
  }, [routine, localDay, routineId, dayId]);

  const discardUnsavedDraftDay = useCallback(async () => {
    const currentRoutine = getRoutine(routineId);
    const currentDay = currentRoutine?.days.find((item) => item.id === dayId) ?? null;

    if (!currentRoutine || !currentDay || currentDay.backendId) {
      return "not_needed" as const;
    }

    const remainingDays = normalizeDayOrder(
      currentRoutine.days.filter((item) => item.id !== dayId)
    );

    try {
      if (!currentRoutine.backendId && remainingDays.length === 0) {
        await deleteRoutine(routineId);
      } else {
        await updateRoutine(
          routineId,
          {
            ...currentRoutine,
            days: remainingDays,
          },
          { sync: "none" }
        );
      }
      return "discarded" as const;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to discard workout day draft.");
      return "error" as const;
    }
  }, [routineId, dayId]);

  const handleCancel = useCallback(async () => {
    const discardResult = await discardUnsavedDraftDay();
    if (discardResult === "error") {
      return;
    }
    if (discardResult === "discarded") {
      onBack();
      return;
    }

    if (day) setLocalDay({ ...day });
    setEditMode(false);
    setIsEditingName(false);
  }, [day, discardUnsavedDraftDay, onBack]);

  const handleBack = useCallback(async () => {
    const discardResult = await discardUnsavedDraftDay();
    if (discardResult === "error") {
      return;
    }
    onBack();
  }, [discardUnsavedDraftDay, onBack]);

  const handleCommitNameEdit = useCallback(async () => {
    setIsEditingName(false);
    if (!editMode && routine && localDay) {
      try {
        const updatedRoutine = await updateRoutine(routineId, {
          ...routine,
          days: routine.days.map((d) => (d.id === dayId ? localDay : d)),
        }, { throwOnSyncError: true });
        setRoutine(updatedRoutine);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to rename workout day.");
      }
    }
  }, [editMode, routine, localDay, routineId, dayId]);

  const exercisesToShow = useMemo(
    () => (editMode ? localDay?.exercises ?? [] : day?.exercises ?? []),
    [editMode, localDay, day]
  );
  const selectedExerciseKey = selectedExerciseDetail?.key ?? null;

  const handleSelectExerciseFromLibrary = useCallback((exerciseItem: ExerciseItem) => {
    setShowLibrarySheet(false);
    setSelectedExerciseDetail(createExerciseDetailPreviewFromExerciseItem(exerciseItem));
    setIsExerciseDetailOpen(true);
  }, []);

  const handleOpenExerciseDetails = useCallback((exercise: RoutineExercise) => {
    setSelectedExerciseDetail(createExerciseDetailPreviewFromRoutineExercise(exercise));
    setIsExerciseDetailOpen(true);
  }, []);

  const missingLibrarySecondaryIds = useMemo(() => {
    const ids = new Set<number>();
    for (const ex of exercisesToShow) {
      if (ex.source === "library" && ex.secondaryMuscles.length === 0 && librarySecondaryLookup[ex.sourceExerciseId] === undefined) {
        ids.add(ex.sourceExerciseId);
      }
    }
    return Array.from(ids);
  }, [exercisesToShow, librarySecondaryLookup]);

  useEffect(() => {
    if (missingLibrarySecondaryIds.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missingLibrarySecondaryIds.map(async (exerciseId) => {
        try {
          const detail = await getExerciseByIdApi(exerciseId);
          const secondaryMuscles = Array.from(
            new Set(
              detail.muscleAssignments
                .filter((a) => a.muscleType === "SECONDARY" && a.muscleName)
                .map((a) => a.muscleName as string)
            )
          );
          return { exerciseId, secondaryMuscles };
        } catch {
          return { exerciseId, secondaryMuscles: [] as string[] };
        }
      })
    ).then((resolved) => {
      if (cancelled) return;
      setLibrarySecondaryLookup((prev) => {
        const next = { ...prev };
        for (const item of resolved) next[item.exerciseId] = item.secondaryMuscles;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [missingLibrarySecondaryIds]);

  const heatmapExercises = useMemo(
    () =>
      exercisesToShow.map((ex) => {
        if (ex.source !== "library" || ex.secondaryMuscles.length > 0) return ex;
        const hydrated = librarySecondaryLookup[ex.sourceExerciseId];
        return hydrated && hydrated.length > 0 ? { ...ex, secondaryMuscles: hydrated } : ex;
      }),
    [exercisesToShow, librarySecondaryLookup]
  );

  if (!routine || !day || !localDay) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Workout not found</p>
        <button onClick={() => void handleBack()} className="mt-4 text-sm text-orange-600 hover:text-orange-500">
          ← Back to Routines
        </button>
      </div>
    );
  }

  const totalSets = exercisesToShow.reduce((sum, ex) => sum + ex.sets.length, 0);
  const workoutDayDescription = (editMode ? localDay.description : day.description)?.trim() ?? "";

  // ============================================
  // RENDER — two-column layout
  //   LEFT:  scrollable area with header, exercises (view) or muscle dist + exercises (edit)
  //   RIGHT: sticky sidebar with day summary + muscle dist (view) or add exercises (edit)
  // ============================================
  return (
    <div className="flow-shell flex h-full min-h-0 flex-col overflow-y-auto text-white lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 flow-grid" />
      <div className="relative z-10 flex min-h-full flex-col gap-6 px-5 pt-7 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-10 md:pt-10 md:pb-9 lg:min-h-0 lg:flex-1 lg:flex-row lg:pb-8">

      {/* ══ LEFT COLUMN — Scrollable, full width ══ */}
      <div className="min-w-0 lg:flex-1 lg:overflow-y-auto lg:pr-4 xl:pr-6">
        <div className="space-y-4 pb-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flow-label mb-1">{routine.name}</p>
              {editMode || isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={localDay.name}
                    onChange={(e) => setLocalDay({ ...localDay, name: e.target.value })}
                    onBlur={handleCommitNameEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCommitNameEdit();
                      if (e.key === "Escape") {
                        setLocalDay({ ...localDay, name: day.name });
                        setIsEditingName(false);
                      }
                    }}
                    autoFocus
                    className="flow-input min-w-0 px-3 py-1 text-xl font-black placeholder:text-gray-500"
                    placeholder="Day name..."
                  />
                  {!editMode && (
                    <button
                      onClick={handleCommitNameEdit}
                      className="flow-button-secondary flex-shrink-0 px-2.5 py-2 text-orange-400"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="group/name flex items-center gap-2 rounded-2xl px-1 py-1 text-left transition-colors hover:bg-white/[0.03]"
                  title="Click to rename"
                >
                  <h2 className="text-2xl font-black text-white transition-colors group-hover/name:text-orange-400">
                    {localDay.name}
                  </h2>
                  <Edit3 className="h-4 w-4 text-gray-600 opacity-0 transition-opacity group-hover/name:opacity-100" />
                </button>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {editMode ? (
                <>
                  <button onClick={() => void handleCancel()} className="flow-button-secondary">
                    Cancel
                  </button>
                  <button onClick={handleSave} className="flow-button-primary">
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => void handleBack()}
                    className="flow-button-secondary px-3 py-2 text-[11px] text-gray-300"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button onClick={() => setEditMode(true)} className="flow-button-primary">
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Muscle Distribution (Edit Mode Only - at top) ── */}
          {editMode && exercisesToShow.length > 0 && (
            <div className="flow-panel rounded-[1.75rem] p-4">
              <p className="flow-label mb-3">
                Muscle Distribution
              </p>
              <MuscleHeatmap
                exercises={heatmapExercises}
                variant="compact"
                showSetBars={true}
                showScoreLegend={false}
                layout="horizontal"
                imageSize="medium"
                maxBars={5}
              />
            </div>
          )}

          {/* ── Exercise list ── */}
          <div>
            <p className="flow-label mb-3">
              Exercises ({exercisesToShow.length})
            </p>
            {exercisesToShow.length === 0 ? (
              <div className="flow-panel rounded-[1.75rem] p-12 text-center">
                <p className="mb-4 text-sm text-gray-500">No exercises yet</p>
                {editMode ? (
                  <button
                    onClick={() => setShowLibrarySheet(true)}
                    className="flow-button-primary lg:hidden"
                  >
                    <Plus className="h-4 w-4" />
                    Add Exercise
                  </button>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-400 transition-colors hover:text-orange-300"
                  >
                    Add Exercises
                  </button>
                )}
              </div>
            ) : editMode ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleExerciseDragEnd}
              >
              <SortableContext
                items={exercisesToShow.map((ex) => ex.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {exercisesToShow.map((exercise, index) => (
                    <SortableExerciseWrapper key={exercise.id} exercise={exercise}>
                      {(dragHandleProps) => (
                        <ExerciseCard
                          exercise={exercise}
                          exerciseNumber={index + 1}
                          editMode
                          allExercises={exercisesToShow}
                          dragHandleProps={dragHandleProps}
                          onOpenDetails={handleOpenExerciseDetails}
                          onUpdateSet={handleUpdateSet}
                          onRemoveSet={handleRemoveSet}
                          onAddSet={handleAddSet}
                          onRemoveExercise={handleRemoveExercise}
                          onUpdateNotes={handleUpdateNotes}
                          onLinkSuperset={handleLinkSuperset}
                          onRemoveSuperset={handleRemoveSuperset}
                        />
                      )}
                    </SortableExerciseWrapper>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-3">
              {exercisesToShow.map((exercise, index) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  exerciseNumber={index + 1}
                  editMode={false}
                  onOpenDetails={handleOpenExerciseDetails}
                />
              ))}
            </div>
          )}
          </div>

          {/* Mobile: Add Exercise button at bottom for better UX */}
          {editMode && exercisesToShow.length > 0 && (
            <button
              onClick={() => setShowLibrarySheet(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm font-bold text-gray-400 transition-all hover:border-orange-600/30 hover:bg-orange-600/5 hover:text-orange-400 lg:hidden"
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </button>
          )}
        </div>
      </div>

      {/* ══ RIGHT COLUMN — Sticky Sidebar ══ */}
      <div className="w-full flex-shrink-0 space-y-4 lg:w-80 lg:self-start">

        {/* Day Summary */}
        <div className="flow-panel rounded-[1.75rem] p-4">
          <h3 className="flow-label mb-3">
            Day Summary
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flow-panel-subtle rounded-[1.25rem] p-3 text-center">
              <p className="text-2xl font-black text-white">{exercisesToShow.length}</p>
              <p className="text-[9px] font-bold uppercase text-gray-500">Exercises</p>
            </div>
            <div className="flow-panel-subtle rounded-[1.25rem] p-3 text-center">
              <p className="text-2xl font-black text-white">{totalSets}</p>
              <p className="text-[9px] font-bold uppercase text-gray-500">Total Sets</p>
            </div>
          </div>
        </div>

        {/* Muscle Distribution (View Mode Only - in sidebar) */}
        {!editMode && exercisesToShow.length > 0 && (
          <div className="flow-panel rounded-[1.75rem] p-4">
            <p className="flow-label mb-3">
              Muscle Distribution
            </p>
            <MuscleHeatmap
              exercises={heatmapExercises}
              variant="compact"
              showSetBars={true}
              showScoreLegend={false}
              imageSize="medium"
              maxBars={5}
            />
          </div>
        )}

        {/* Add Exercise Library — edit mode, desktop only */}
        {editMode && (
          <div className="flow-panel hidden rounded-[1.75rem] lg:block">
            <div className="border-b border-white/5 px-4 py-3">
              <h3 className="flow-label">
                Add Exercises
              </h3>
            </div>
            <div className="max-h-[calc(100vh-320px)] min-h-[300px] overflow-y-auto p-3">
              <ExerciseLibraryPanel
                onAddExercise={handleAddExercise}
                onSelectExercise={handleSelectExerciseFromLibrary}
                selectedExerciseKey={selectedExerciseKey}
                showAddButton
                showCustomButton
              />
            </div>
          </div>
        )}

      </div>

      {/* Mobile Exercise Library Sheet */}
      {editMode && (
        <ExerciseLibrarySheet
          isOpen={showLibrarySheet}
          onClose={() => setShowLibrarySheet(false)}
          onAddExercise={handleAddExercise}
          onSelectExercise={handleSelectExerciseFromLibrary}
          selectedExerciseKey={selectedExerciseKey}
          showAddButton
        />
      )}

      <ExerciseDetailSheet
        exercise={selectedExerciseDetail}
        open={isExerciseDetailOpen}
        onOpenChange={setIsExerciseDetailOpen}
      />
      </div>
    </div>
  );
};

export default WorkoutDetail;

