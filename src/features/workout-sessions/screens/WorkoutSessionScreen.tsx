import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Clock,
  Plus,
  CheckCircle2,
  SkipForward,
  Dumbbell,
  Weight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

import WorkoutSetRow from "../components/WorkoutSetRow";
import WorkoutSummarySheet from "../components/WorkoutSummarySheet";
import ExerciseDetailSheet from "@/features/routines/components/ExerciseDetailSheet";
import {
  ExerciseLibraryPanel,
  ExerciseLibrarySheet,
  type ExerciseItem,
} from "@/features/exercises/components/ExerciseLibraryPanel";
import {
  createExerciseDetailPreviewFromExerciseItem,
  type ExerciseDetailPreview,
} from "@/features/routines/components/exerciseDetailPreview";

import {
  getWorkoutSessionApi,
  updateWorkoutSetApi,
  addWorkoutSetApi,
  addWorkoutExerciseApi,
  addExerciseToRoutineApi,
  deleteWorkoutSetApi,
  deleteWorkoutExerciseApi,
  completeWorkoutSessionApi,
  skipWorkoutSessionApi,
  syncSessionToRoutineApi,
  reorderWorkoutExercisesApi,
  workoutSessionQueryKeys,
} from "../workoutSessionApi";
import { getRoutineDetailApi, routineQueryKeys } from "@/features/routines/routineApi";
import type {
  WorkoutSessionResponse,
  WorkoutSessionExerciseResponse,
  UpdateWorkoutSetRequest,
} from "../workoutSessionTypes";

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatElapsedTime(startedAt: string | null): string {
  if (!startedAt) return "00:00:00";
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - start) / 1000);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getExerciseInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function createExerciseDetailPreviewFromSessionExercise(
  exercise: WorkoutSessionExerciseResponse
): ExerciseDetailPreview {
  return {
    key: `${exercise.exerciseSource}-${exercise.sourceExerciseId}`,
    source: exercise.exerciseSource,
    id: exercise.sourceExerciseId,
    name: exercise.exerciseName,
    equipmentName: exercise.equipmentName,
    coverUrl: exercise.coverUrl,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
  };
}

// ============================================
// COMPACT SESSION HEADER BAR (TOP BAR)
// ============================================

function CompactSessionHeader({
  routineName,
  title,
  elapsedTime,
  completedSets,
  totalSets,
  totalVolume,
  onBack,
  onSkip,
  onComplete,
  onSyncToRoutine,
  isSkipping,
  isSyncing,
  canComplete,
  isRoutineBased,
}: {
  routineName: string | null;
  title: string;
  elapsedTime: string;
  completedSets: number;
  totalSets: number;
  totalVolume: number;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onSyncToRoutine: () => void;
  isSkipping: boolean;
  isSyncing: boolean;
  canComplete: boolean;
  isRoutineBased: boolean;
}) {
  const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const formatVolume = (volume: number): string => {
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k`;
    return volume.toLocaleString();
  };

  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
      {/* Progress bar at very top */}
      <div className="h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        {/* Left: Back + Title */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            onClick={onBack}
            className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-gray-500">{routineName || "Freestyle"}</p>
            <h1 className="truncate text-base font-black text-white md:text-lg">{title}</h1>
          </div>
        </div>

        {/* Center: Stats (desktop only) */}
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
            <Clock className="h-4 w-4 text-orange-400" />
            <span className="font-mono text-sm font-bold text-orange-300">{elapsedTime}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">{completedSets}/{totalSets}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
            <Weight className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-bold text-white">{formatVolume(totalVolume)} kg</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Mobile timer */}
          <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 md:hidden">
            <Clock className="h-3.5 w-3.5 text-orange-400" />
            <span className="font-mono text-xs font-bold text-orange-300">{elapsedTime}</span>
          </div>
          <button
            onClick={onSkip}
            disabled={isSkipping}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {isSkipping ? <Loader2 className="h-4 w-4 animate-spin" /> : "Skip"}
          </button>
          {/* Update Routine button - only for routine-based workouts */}
          {isRoutineBased && (
            <button
              onClick={onSyncToRoutine}
              disabled={isSyncing}
              className="hidden items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/20 disabled:opacity-50 sm:inline-flex"
              title="Update routine template with current workout"
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="hidden md:inline">Update Routine</span>
            </button>
          )}
          <button
            onClick={onComplete}
            disabled={!canComplete}
            className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-1.5 text-xs font-black text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ROUTINE OVERVIEW PANEL (RIGHT SIDEBAR - SCROLLABLE)
// ============================================
// ROUTINE OVERVIEW PANEL (RIGHT SIDEBAR)
// ============================================

function RoutineOverviewPanel({
  routineName,
  routineId,
  currentDayId,
  currentDayName,
}: {
  routineName: string | null;
  routineId: string | null;
  currentDayId: string | null;
  currentDayName: string | null;
}) {
  const { data: routineDetail, isLoading, dataUpdatedAt } = useQuery({
    queryKey: routineQueryKeys.detail(routineId ?? ""),
    queryFn: () => getRoutineDetailApi(routineId!),
    enabled: !!routineId,
  });

  if (!routineId || !routineName) {
    return null;
  }

  // Find current day's exercises for comparison
  const currentDay = routineDetail?.days.find(d => d.routineDayId === currentDayId);
  const currentDayExerciseCount = currentDay?.exercises.length ?? 0;
  const currentDaySetCount = currentDay?.exercises.reduce(
    (sum, ex) => sum + (ex.sets?.length ?? 0), 0
  ) ?? 0;

  return (
    <div className="flow-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flow-label">Routine Overview</h3>
        {dataUpdatedAt && (
          <span className="text-[8px] text-gray-600">
            {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>
      <p className="mb-3 text-sm font-bold text-white">{routineName}</p>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
        </div>
      ) : routineDetail?.days && routineDetail.days.length > 0 ? (
        <div className="space-y-2">
          {routineDetail.days.map((day) => {
            const exerciseCount = day.exercises?.length ?? 0;
            const setCount = day.exercises?.reduce(
              (sum, ex) => sum + (ex.sets?.length ?? 0), 0
            ) ?? 0;
            return (
              <div
                key={day.routineDayId}
                className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${
                  day.routineDayId === currentDayId
                    ? "border border-orange-500/30 bg-orange-500/10"
                    : "bg-white/5"
                }`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                    day.routineDayId === currentDayId
                      ? "bg-orange-500 text-white"
                      : "bg-white/10 text-gray-400"
                  }`}
                >
                  {day.dayOrder}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-xs font-bold ${
                      day.routineDayId === currentDayId ? "text-orange-300" : "text-gray-400"
                    }`}
                  >
                    {day.name}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {exerciseCount} exercises • {setCount} sets
                  </span>
                </div>
                {day.routineDayId === currentDayId && (
                  <span className="ml-auto text-[8px] font-black uppercase tracking-wider text-orange-400">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-500">No days available</p>
      )}
    </div>
  );
}

// ============================================
// EXERCISE CARD COMPONENT
// ============================================

function SessionExerciseCard({
  exercise,
  exerciseIndex,
  routineLogId,
  hasRoutine,
  templateSetCounts,
  onSetUpdate,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onAddToRoutine,
  isAddingToRoutine,
  isExpanded,
  onToggleExpand,
  onOpenDetails,
}: {
  exercise: WorkoutSessionExerciseResponse;
  exerciseIndex: number;
  routineLogId: string;
  hasRoutine: boolean;
  templateSetCounts: Map<string, number>;
  onSetUpdate: (exerciseId: string, setId: string, updates: UpdateWorkoutSetRequest) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onAddToRoutine: (exerciseId: string) => void;
  isAddingToRoutine: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenDetails: () => void;
}) {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;
  const allCompleted = completedSets === totalSets && totalSets > 0;
  
  // Ad-hoc exercise = not part of the routine template (routineDayExerciseId is null)
  const isAdHocExercise = hasRoutine && exercise.routineDayExerciseId === null;
  
  // Check if set count differs from template (modified from routine)
  const templateSetCount = exercise.routineDayExerciseId 
    ? templateSetCounts.get(exercise.routineDayExerciseId) ?? totalSets
    : totalSets;
  const isModifiedFromTemplate = hasRoutine && exercise.routineDayExerciseId !== null && totalSets !== templateSetCount;

  return (
    <div
      className={`flow-panel overflow-hidden rounded-2xl transition-all ${
        allCompleted
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isAdHocExercise
          ? "border-blue-500/40 bg-blue-500/5"
          : isModifiedFromTemplate
          ? "border-amber-500/30 bg-amber-500/5"
          : ""
      }`}
    >
      {/* Modified from routine indicator */}
      {isModifiedFromTemplate && (
        <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
            Modified from routine ({totalSets > templateSetCount ? "+" : ""}{totalSets - templateSetCount} sets)
          </span>
        </div>
      )}
      
      {/* Ad-hoc Exercise Tag */}
      {isAdHocExercise && (
        <div className="flex items-center justify-between border-b border-blue-500/20 bg-blue-500/10 px-4 py-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
            Added during session
          </span>
          <button
            type="button"
            onClick={() => onAddToRoutine(exercise.routineLogExerciseId)}
            disabled={isAddingToRoutine}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-2.5 py-1 text-[10px] font-bold text-blue-300 transition-colors hover:bg-blue-500/30 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAddingToRoutine ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Add to Routine
          </button>
        </div>
      )}

      {/* Header - Clickable for details */}
      <div className="flex w-full items-center gap-4 p-4">
        {/* Cover image/initials - Click opens detail */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
          className="flex-shrink-0 transition-transform hover:scale-105"
        >
          {exercise.coverUrl ? (
            <img
              src={exercise.coverUrl}
              alt={exercise.exerciseName}
              className={`h-14 w-14 rounded-xl object-cover ${
                isAdHocExercise ? "border-2 border-blue-500/50" 
                : isModifiedFromTemplate ? "border-2 border-amber-500/50"
                : "border border-white/10"
              }`}
            />
          ) : (
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-black font-black ${
              isAdHocExercise ? "border-2 border-blue-500/50 text-blue-400" 
              : isModifiedFromTemplate ? "border-2 border-amber-500/50 text-amber-400"
              : "border border-white/10 text-orange-400"
            }`}>
              {getExerciseInitials(exercise.exerciseName)}
            </div>
          )}
        </button>

        {/* Exercise Info - Click toggles expand */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white">{exercise.exerciseName}</p>
            <p className="text-xs text-gray-500">
              {exercise.equipmentName || exercise.primaryMuscles?.join(", ") || ""}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-bold ${
                allCompleted ? "text-emerald-400" : "text-orange-400"
              }`}
            >
              {completedSets}/{totalSets}
            </p>
            <p className="text-xs text-gray-500">sets</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-500" />
          )}
        </button>
      </div>

      {/* Sets Table (expandable) */}
      {isExpanded && (
        <div className="border-t border-white/5 px-4 pb-4">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500">
                <th className="w-10 px-2 py-2 text-left">Done</th>
                <th className="w-12 px-2 py-2 text-center">Set</th>
                <th className="px-2 py-2 text-left">Weight</th>
                <th className="px-2 py-2 text-left">Reps</th>
                <th className="px-2 py-2 text-right">Target</th>
                {totalSets > 1 && <th className="w-10 px-2 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {exercise.sets.map((set) => (
                <WorkoutSetRow
                  key={set.routineLogSetId}
                  set={set}
                  exerciseType={exercise.exerciseType}
                  onUpdateSet={(setId, updates) =>
                    onSetUpdate(exercise.routineLogExerciseId, setId, updates)
                  }
                  onRemoveSet={(setId) => onRemoveSet(exercise.routineLogExerciseId, setId)}
                  canRemove={totalSets > 1}
                />
              ))}
            </tbody>
          </table>

          {/* Action Buttons */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddSet(exercise.routineLogExerciseId)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-gray-400 transition-colors hover:border-white/20 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Set
            </button>
            <button
              type="button"
              onClick={() => onRemoveExercise(exercise.routineLogExerciseId)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Exercise
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SORTABLE EXERCISE CARD WRAPPER
// ============================================

interface SortableExerciseCardProps {
  exercise: WorkoutSessionExerciseResponse;
  exerciseIndex: number;
  routineLogId: string;
  hasRoutine: boolean;
  templateSetCounts: Map<string, number>;
  onSetUpdate: (exerciseId: string, setId: string, updates: UpdateWorkoutSetRequest) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onAddToRoutine: (exerciseId: string) => void;
  isAddingToRoutine: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenDetails: () => void;
}

function SortableExerciseCard(props: SortableExerciseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.exercise.routineLogExerciseId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-4 flex-shrink-0 cursor-grab text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        {/* Exercise Card */}
        <div className="min-w-0 flex-1">
          <SessionExerciseCard {...props} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function WorkoutSessionScreen() {
  const { routineLogId } = useParams<{ routineLogId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [showSummary, setShowSummary] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<ExerciseDetailPreview | null>(null);
  const [isExerciseDetailOpen, setIsExerciseDetailOpen] = useState(false);
  const [addingToRoutineId, setAddingToRoutineId] = useState<string | null>(null);

  // Fetch session data
  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: workoutSessionQueryKeys.detail(routineLogId ?? ""),
    queryFn: () => getWorkoutSessionApi(routineLogId!),
    enabled: !!routineLogId,
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  });

  // Fetch routine detail for template set counts (only if routine-based)
  const { data: routineDetail } = useQuery({
    queryKey: routineQueryKeys.detail(session?.routineId ?? ""),
    queryFn: () => getRoutineDetailApi(session!.routineId!),
    enabled: !!session?.routineId,
  });

  // Build template set count map from routine
  const templateSetCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (routineDetail && session?.routineDayId) {
      const day = routineDetail.days.find(d => d.backendId === session.routineDayId);
      if (day) {
        day.exercises.forEach(ex => {
          if (ex.backendId) {
            map.set(ex.backendId, ex.sets.length);
          }
        });
      }
    }
    return map;
  }, [routineDetail, session?.routineDayId]);

  // Initialize expanded exercises when session loads
  useEffect(() => {
    if (session?.exercises) {
      setExpandedExercises(new Set(session.exercises.map((e) => e.routineLogExerciseId)));
    }
  }, [session?.routineLogId]);

  // Live timer
  useEffect(() => {
    if (!session?.startedAt) return;
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(session.startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.startedAt]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!session) {
      return { totalSets: 0, completedSets: 0, totalVolume: 0, exerciseCount: 0 };
    }

    let totalSets = 0;
    let completedSets = 0;
    let totalVolume = 0;

    session.exercises.forEach((ex) => {
      totalSets += ex.sets.length;
      ex.sets.forEach((set) => {
        if (set.completed) {
          completedSets++;
          const weight = set.actualWeight ?? set.targetWeight ?? 0;
          const reps = set.actualReps ?? set.targetReps ?? 0;
          totalVolume += weight * reps;
        }
      });
    });

    return {
      totalSets,
      completedSets,
      totalVolume,
      exerciseCount: session.exercises.length,
    };
  }, [session?.exercises]);

  // Toggle exercise expansion
  const toggleExercise = useCallback((exerciseId: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }, []);

  // Update set mutation
  const updateSetMutation = useMutation({
    mutationFn: ({
      exerciseId,
      setId,
      updates,
    }: {
      exerciseId: string;
      setId: string;
      updates: UpdateWorkoutSetRequest;
    }) => updateWorkoutSetApi(routineLogId!, exerciseId, setId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.detail(routineLogId!) });
    },
    onError: (error: Error) => {
      toast.error("Failed to update set", { description: error.message });
    },
  });

  // Add set mutation
  const addSetMutation = useMutation({
    mutationFn: (exerciseId: string) =>
      addWorkoutSetApi(routineLogId!, exerciseId, { warmup: false, completed: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.detail(routineLogId!) });
      toast.success("Set added");
    },
    onError: (error: Error) => {
      toast.error("Failed to add set", { description: error.message });
    },
  });

  // Add exercise mutation
  const addExerciseMutation = useMutation({
    mutationFn: (exercise: ExerciseItem) =>
      addWorkoutExerciseApi(routineLogId!, {
        exerciseSource: exercise.source,
        sourceExerciseId: exercise.id,
      }),
    onSuccess: (_, exercise) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.detail(routineLogId!) });
      setShowExercisePicker(false);
      toast.success(`${exercise.name} added to workout`);
    },
    onError: (error: Error) => {
      toast.error("Failed to add exercise", { description: error.message });
    },
  });

  // Add exercise to routine mutation
  const addToRoutineMutation = useMutation({
    mutationFn: (exerciseId: string) => {
      setAddingToRoutineId(exerciseId);
      return addExerciseToRoutineApi(routineLogId!, exerciseId);
    },
    onSuccess: () => {
      // Force refetch the session detail immediately
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.detail(routineLogId!) });
      // Also invalidate routine queries since the routine template was modified
      if (session?.routineId) {
        queryClient.invalidateQueries({ queryKey: routineQueryKeys.detail(session.routineId) });
        queryClient.invalidateQueries({ queryKey: routineQueryKeys.all });
      }
      toast.success("Exercise added to routine! 🎯");
      setAddingToRoutineId(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to add to routine", { description: error.message });
      setAddingToRoutineId(null);
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: (notes: string) => completeWorkoutSessionApi(routineLogId!, { notes: notes || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.all });
      toast.success("Workout completed! 💪");
      setShowSummary(false);
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast.error("Failed to complete session", { description: error.message });
    },
  });

  // Skip session mutation
  const skipSessionMutation = useMutation({
    mutationFn: () => skipWorkoutSessionApi(routineLogId!, { notes: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.all });
      toast.info("Session skipped. You can still start another workout today.");
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast.error("Failed to skip session", { description: error.message });
    },
  });

  // Sync session to routine mutation
  const syncToRoutineMutation = useMutation({
    mutationFn: () => syncSessionToRoutineApi(routineLogId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.detail(routineLogId!) });
      if (session?.routineId) {
        queryClient.invalidateQueries({ queryKey: routineQueryKeys.detail(session.routineId) });
        queryClient.invalidateQueries({ queryKey: routineQueryKeys.list() });
        queryClient.invalidateQueries({ queryKey: routineQueryKeys.all });
      }
      toast.success("Routine updated with current workout! 🔄", {
        description: "All exercises and sets have been synced to your routine template.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to update routine", { description: error.message });
    },
  });

  // Reorder exercises mutation
  const reorderExercisesMutation = useMutation({
    mutationFn: (exerciseIds: string[]) => reorderWorkoutExercisesApi(routineLogId!, exerciseIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.detail(routineLogId!) });
    },
    onError: (error: Error) => {
      toast.error("Failed to reorder exercises", { description: error.message });
    },
  });

  // Drag sensors for exercise reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for exercise reordering
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !session) return;

      const oldIndex = session.exercises.findIndex(
        (e) => e.routineLogExerciseId === active.id
      );
      const newIndex = session.exercises.findIndex(
        (e) => e.routineLogExerciseId === over.id
      );

      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistically reorder locally via cache update
      const reorderedExercises = arrayMove(session.exercises, oldIndex, newIndex);
      const exerciseIds = reorderedExercises.map((e) => e.routineLogExerciseId);

      // Update cache optimistically
      queryClient.setQueryData(
        workoutSessionQueryKeys.detail(routineLogId!),
        (old: WorkoutSessionResponse | undefined) =>
          old ? { ...old, exercises: reorderedExercises } : old
      );

      // Persist to backend
      reorderExercisesMutation.mutate(exerciseIds);
    },
    [session, routineLogId, queryClient, reorderExercisesMutation]
  );

  // Delete set mutation
  const deleteSetMutation = useMutation({
    mutationFn: ({ exerciseId, setId }: { exerciseId: string; setId: string }) =>
      deleteWorkoutSetApi(routineLogId!, exerciseId, setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.detail(routineLogId!) });
      toast.success("Set removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove set", { description: error.message });
    },
  });

  // Delete exercise mutation
  const deleteExerciseMutation = useMutation({
    mutationFn: (exerciseId: string) => deleteWorkoutExerciseApi(routineLogId!, exerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.detail(routineLogId!) });
      toast.success("Exercise removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove exercise", { description: error.message });
    },
  });

  // Handlers
  const handleSetUpdate = useCallback(
    (exerciseId: string, setId: string, updates: UpdateWorkoutSetRequest) => {
      updateSetMutation.mutate({ exerciseId, setId, updates });
    },
    [updateSetMutation]
  );

  const handleAddSet = useCallback(
    (exerciseId: string) => {
      addSetMutation.mutate(exerciseId);
    },
    [addSetMutation]
  );

  const handleAddExercise = useCallback(
    (exercise: ExerciseItem) => {
      addExerciseMutation.mutate(exercise);
    },
    [addExerciseMutation]
  );

  const handleAddToRoutine = useCallback(
    (exerciseId: string) => {
      addToRoutineMutation.mutate(exerciseId);
    },
    [addToRoutineMutation]
  );

  const handleSummaryComplete = useCallback(
    (notes: string) => {
      completeSessionMutation.mutate(notes);
    },
    [completeSessionMutation]
  );

  const handleSkip = useCallback(() => {
    skipSessionMutation.mutate();
  }, [skipSessionMutation]);

  const handleRemoveSet = useCallback(
    (exerciseId: string, setId: string) => {
      deleteSetMutation.mutate({ exerciseId, setId });
    },
    [deleteSetMutation]
  );

  const handleRemoveExercise = useCallback(
    (exerciseId: string) => {
      if (session && session.exercises.length <= 1) {
        toast.error("Cannot remove the last exercise. Skip the session instead.");
        return;
      }
      deleteExerciseMutation.mutate(exerciseId);
    },
    [deleteExerciseMutation, session]
  );

  const handleOpenExerciseDetails = useCallback((exercise: WorkoutSessionExerciseResponse) => {
    setSelectedExerciseDetail(createExerciseDetailPreviewFromSessionExercise(exercise));
    setIsExerciseDetailOpen(true);
  }, []);

  const handleSelectExerciseFromLibrary = useCallback((exerciseItem: ExerciseItem) => {
    setSelectedExerciseDetail(createExerciseDetailPreviewFromExerciseItem(exerciseItem));
    setIsExerciseDetailOpen(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <div>
          <p className="text-lg font-bold text-white">Session not found</p>
          <p className="mt-1 text-sm text-gray-400">
            The workout session could not be loaded.
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="flow-button-secondary mt-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Check if session is already completed or skipped
  if (session.status !== "IN_PROGRESS") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <div>
          <p className="text-lg font-bold text-white">Session {session.status.toLowerCase()}</p>
          <p className="mt-1 text-sm text-gray-400">
            This workout session has already been {session.status.toLowerCase()}.
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="flow-button-secondary mt-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#050505] text-white">
      {/* ══ COMPACT TOP BAR ══ */}
      <CompactSessionHeader
        routineName={session.routineName}
        title={session.title}
        elapsedTime={elapsedTime}
        completedSets={stats.completedSets}
        totalSets={stats.totalSets}
        totalVolume={stats.totalVolume}
        onBack={() => navigate("/dashboard")}
        onSkip={handleSkip}
        onComplete={() => setShowSummary(true)}
        onSyncToRoutine={() => syncToRoutineMutation.mutate()}
        isSkipping={skipSessionMutation.isPending}
        isSyncing={syncToRoutineMutation.isPending}
        canComplete={stats.completedSets > 0}
        isRoutineBased={!!session.routineId}
      />

      {/* ══ MAIN CONTENT AREA ══ */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Background grid (subtle) */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(234,88,12,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(234,88,12,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* ══ LEFT COLUMN — Scrollable Exercises ══ */}
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-4 py-4 pb-[calc(84px+env(safe-area-inset-bottom))] md:px-6 md:pb-8 lg:px-8 lg:py-6 lg:pb-8">
            {/* ── Mobile Stats Row ── */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 lg:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">
                  {stats.completedSets}/{stats.totalSets} sets
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-bold text-white">
                    {stats.totalVolume >= 1000
                      ? `${(stats.totalVolume / 1000).toFixed(1)}k`
                      : stats.totalVolume.toLocaleString()}{" "}
                    kg
                  </span>
                </div>
                {/* Mobile Update Routine button */}
                {session.routineId && (
                  <button
                    onClick={() => syncToRoutineMutation.mutate()}
                    disabled={syncToRoutineMutation.isPending}
                    className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/20 disabled:opacity-50"
                    title="Update routine"
                  >
                    {syncToRoutineMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* ── Exercises ── */}
            <div>
              <p className="flow-label mb-3">Exercises ({session.exercises.length})</p>
              {session.exercises.length === 0 ? (
                <div className="flow-panel rounded-2xl p-12 text-center">
                  <p className="mb-4 text-sm text-gray-500">No exercises yet</p>
                  <button
                    onClick={() => setShowExercisePicker(true)}
                    className="flow-button-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Add Exercise
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={session.exercises.map((e) => e.routineLogExerciseId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {session.exercises.map((exercise, idx) => (
                        <SortableExerciseCard
                          key={exercise.routineLogExerciseId}
                          exercise={exercise}
                          exerciseIndex={idx}
                          routineLogId={session.routineLogId}
                          hasRoutine={!!session.routineId}
                          templateSetCounts={templateSetCounts}
                          onSetUpdate={handleSetUpdate}
                          onAddSet={handleAddSet}
                          onRemoveSet={handleRemoveSet}
                          onRemoveExercise={handleRemoveExercise}
                          onAddToRoutine={handleAddToRoutine}
                          isAddingToRoutine={addingToRoutineId === exercise.routineLogExerciseId}
                          isExpanded={expandedExercises.has(exercise.routineLogExerciseId)}
                          onToggleExpand={() => toggleExercise(exercise.routineLogExerciseId)}
                          onOpenDetails={() => handleOpenExerciseDetails(exercise)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* ── Add Exercise Button (Mobile) ── */}
            {session.exercises.length > 0 && (
              <button
                onClick={() => setShowExercisePicker(true)}
                disabled={addExerciseMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-500/30 bg-orange-500/5 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-orange-300 transition-all hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
              >
                {addExerciseMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                Add Exercise
              </button>
            )}

            {/* Warning when no sets completed */}
            {stats.completedSets === 0 && session.exercises.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Complete at least one set to finish the workout</span>
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT COLUMN — Full Height Sidebar (Desktop Only) ══ */}
        <div className="relative z-10 hidden w-80 flex-shrink-0 border-l border-white/5 lg:flex lg:flex-col xl:w-96">
          <div className="flex h-full min-h-0 flex-col gap-4 p-4">
            {/* Routine Overview - Compact, scrollable if needed */}
            {session.routineId && (
              <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight: "35%" }}>
                <RoutineOverviewPanel
                  routineName={session.routineName}
                  routineId={session.routineId}
                  currentDayId={session.routineDayId}
                  currentDayName={session.routineDayName}
                />
              </div>
            )}

            {/* Exercise Library Panel - Takes remaining space, fully scrollable */}
            <div className="flow-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
              <div className="flex-shrink-0 border-b border-white/5 px-4 py-3">
                <h3 className="flow-label">Add Exercises</h3>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-1">
                <ExerciseLibraryPanel
                  onAddExercise={handleAddExercise}
                  onSelectExercise={handleSelectExerciseFromLibrary}
                  showAddButton={true}
                  showCustomButton={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Library Sheet (Mobile) */}
      <ExerciseLibrarySheet
        isOpen={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onAddExercise={handleAddExercise}
        showAddButton={true}
        showCustomButton={false}
      />

      {/* Workout Summary Sheet */}
      <WorkoutSummarySheet
        open={showSummary}
        onOpenChange={setShowSummary}
        session={session}
        onComplete={handleSummaryComplete}
        isCompleting={completeSessionMutation.isPending}
      />

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        exercise={selectedExerciseDetail}
        open={isExerciseDetailOpen}
        onOpenChange={setIsExerciseDetailOpen}
      />
    </div>
  );
}
