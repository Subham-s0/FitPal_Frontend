import { Suspense, lazy, useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  Dumbbell,
  Star,
  Edit2,
  Trash2,
  Copy,
  Play,
  Loader2,
  Sparkles,
} from "lucide-react";
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
import { DragHandle } from "@/shared/ui/DragHandle";

import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { getExerciseByIdApi } from "@/features/exercises/api";
import type { Routine, WorkoutDay } from "@/features/routines/routineTypes";
import {
  normalizeDayOrder,
  getExerciseInitials,
  createDefaultRoutine,
  createDefaultDay,
  generateDefaultWorkoutDayName,
  generateUniqueWorkoutDayName,
} from "@/features/routines/routineTypes";
import { createUuid } from "@/shared/lib/uuid";
import {
  loadRoutines,
  deleteRoutine,
  updateRoutine,
  setActiveRoutine,
  addRoutine,
  resolveRoutineStartIds,
  refreshRoutineStore,
} from "@/features/routines/routineStore";
import {
  getMyRoutineSettingsApi,
  routineQueryKeys,
} from "@/features/routines/routineApi";
import {
  generateAiRoutinePreviewApi,
  prepareAiRoutineSuggestionsApi,
} from "@/features/routines/aiRoutineApi";
import type {
  AiRoutinePreviewResponse,
  AiRoutineSuggestionsResponse,
  EquipmentPreference,
  GenerateRoutineSuggestionsRequest,
} from "@/features/routines/aiRoutineTypes";
import { mapAiRoutinePreviewToRoutine } from "@/features/routines/aiRoutinePreview";
import type { PrimaryFitnessFocus } from "@/features/profile/model";
import {
  startWorkoutSessionApi,
  workoutSessionQueryKeys,
} from "@/features/workout-sessions/workoutSessionApi";
import { getApiErrorMessage } from "@/shared/api/client";

const MuscleHeatmap = lazy(() => import("@/features/routines/components/MuscleHeatmap"));
const InlineRoutineEditor = lazy(() => import("@/features/routines/components/InlineRoutineEditor"));
const AiRoutineGenerationDialog = lazy(() => import("@/features/routines/components/AiRoutineGenerationDialog"));
const AiRoutinePreviewPanel = lazy(() => import("@/features/routines/components/AiRoutinePreviewPanel"));
const StartWorkoutDayDialog = lazy(() => import("@/features/routines/components/StartWorkoutDayDialog"));

const RoutinePanelFallback = ({ label }: { label: string }) => (
  <div className="flex min-h-[220px] items-center justify-center rounded-[2rem] border border-white/10 user-surface-soft p-6 text-center text-sm font-bold uppercase tracking-[0.12em] text-white/50">
    <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
    {label}
  </div>
);

// ============================================
// SORTABLE DAY ROW (for reordering inside the card)
// ============================================

interface SortableDayRowProps {
  day: WorkoutDay;
  routineId: string;
  routineName: string;
  routines: Routine[];
  isUpcomingDay?: boolean;
  onViewDay: (routineId: string, dayId: string) => void;
  onEditDay: (routineId: string, dayId: string) => void;
  onDeleteDay: (routineId: string, dayId: string) => void;
  onCopyDay: (routineId: string, dayId: string, targetRoutineId: string) => void;
  onStartWorkout: (routineId: string, dayId: string, dayName: string, routineName: string) => void;
}

function SortableDayRow({ 
  day, 
  routineId, 
  routineName,
  routines,
  isUpcomingDay,
  onViewDay, 
  onEditDay,
  onDeleteDay,
  onCopyDay,
  onStartWorkout,
}: SortableDayRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: day.id,
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 80 : showMenu || showCopyDialog ? 70 : undefined,
  };

  const exerciseCount = day.exercises.length;
  const setCount = day.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu && !showCopyDialog) return;
    const handleClickOutside = () => {
      setShowMenu(false);
      setShowCopyDialog(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showMenu, showCopyDialog]);

  return (
    <div ref={setNodeRef} style={style} className="group relative flex items-center gap-2">
      <DragHandle attributes={attributes} listeners={listeners} />

      {/* Day Card - Click to View */}
      <div
        onClick={() => onViewDay(routineId, day.id)}
        className={`flex flex-1 items-center gap-3 rounded-[1.5rem] border border-white/[0.07] user-surface-soft p-3 transition-all duration-200 hover:border-white/15 hover:bg-[#191919] ${
          isUpcomingDay ? "border-emerald-500/40 bg-emerald-500/5" : ""
        }`}
      >
        {/* Clickable Day Info Area */}
        <div 
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
        >
          {/* Day Order Badge */}
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-black ${
            isUpcomingDay 
              ? "bg-emerald-500/20 text-emerald-400" 
              : "bg-orange-600/20 text-orange-600"
          }`}>
            {day.dayOrder}
          </div>

          {/* Day Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <p className="text-sm font-bold text-white">{day.name}</p>
              {isUpcomingDay && (
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400">
                  Upcoming
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500">
              {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} •{" "}
              {setCount} set{setCount !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Exercise thumbnails - Bigger images */}
          <div className="hidden items-center gap-1.5 sm:flex">
            {day.exercises.slice(0, 4).map((ex) =>
              ex.coverUrl ? (
                <img
                  key={ex.id}
                  src={ex.coverUrl}
                  alt={ex.name}
                  onClick={(e) => e.stopPropagation()}
                  className="h-10 w-10 rounded-lg border border-white/10 object-cover"
                />
              ) : (
                <div
                  key={ex.id}
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black text-[8px] font-black text-orange-600"
                >
                  {getExerciseInitials(ex.name)}
                </div>
              )
            )}
            {day.exercises.length > 4 && (
              <span className="ml-1 text-[10px] font-bold text-gray-500">
                +{day.exercises.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Start Workout Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartWorkout(routineId, day.id, day.name, routineName);
          }}
          className="flex-shrink-0 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300"
        >
          <Play className="h-4 w-4" />
        </button>

        {/* Three-dot Menu - Same style as routine card */}
        <div className={`relative flex-shrink-0 ${showMenu || showCopyDialog ? "z-[60]" : ""}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {showMenu && (
            <div 
              className="absolute right-0 top-full z-[70] mt-2 w-56 rounded-2xl border border-white/10 bg-[#181818] py-2 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
            <button
              onClick={() => {
                onEditDay(routineId, day.id);
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              <Edit2 className="h-4 w-4" />
              Edit Workout
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowCopyDialog(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              <Copy className="h-4 w-4" />
              Copy Workout
            </button>
            <div className="my-1 border-t border-white/5" />
            <button
              onClick={() => {
                onDeleteDay(routineId, day.id);
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete Workout
            </button>
          </div>
        )}

        {/* Copy Dialog */}
        {showCopyDialog && (
          <div 
            className="absolute right-0 top-full z-[80] mt-1 w-64 rounded-2xl border border-white/10 bg-[#181818] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-bold text-white">Copy to Routine</p>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {routines.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onCopyDay(routineId, day.id, r.id);
                    setShowCopyDialog(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-white/5 ${
                    r.id === routineId ? "text-orange-500" : "text-white"
                  }`}
                >
                  {r.name}
                  {r.id === routineId && (
                    <span className="text-[10px] text-gray-500">(same)</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCopyDialog(false)}
              className="flow-button-secondary mt-3 w-full text-sm text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {/* End of menu relative div */}
      </div>
      {/* End of card div */}
    </div>
  );
}

// ============================================
// PROPS
// ============================================

interface RoutinesSectionProps {
  onViewDay?: (routineId: string, dayId: string) => void;
  onEditDay?: (routineId: string, dayId: string) => void;
  initialInlineEditRoutineId?: string | null;
  /** Routine to auto-expand when mounting (e.g. returning from WorkoutDetail) */
  initialExpandedRoutineId?: string | null;
}

function formatGeneratedGoal(value: PrimaryFitnessFocus | null | undefined): string {
  switch (value) {
    case "HYPERTROPHY":
      return "Hypertrophy";
    case "STRENGTH_POWER":
      return "Strength & Power";
    case "ENDURANCE_CARDIO":
      return "Endurance & Cardio";
    case "FLEXIBILITY_MOBILITY":
      return "Flexibility & Mobility";
    case "WEIGHT_LOSS":
      return "Weight Loss";
    default:
      return "";
  }
}

function formatGeneratedEquipment(value: EquipmentPreference): string {
  switch (value) {
    case "ALL":
      return "All equipment";
    case "NONE":
      return "No equipment";
    case "DUMBBELL":
      return "Dumbbell";
    case "MACHINE":
      return "Machine";
    case "BARBELL":
      return "Barbell";
    default:
      return value;
  }
}

function buildGeneratedRoutineSummary(
  daysPerWeek: number,
  goal: PrimaryFitnessFocus | null | undefined,
  equipmentPreferences: EquipmentPreference[]
): string {
  const parts: string[] = [];

  if (daysPerWeek > 0) {
    parts.push(`${daysPerWeek} day${daysPerWeek === 1 ? "" : "s"}`);
  }

  const goalLabel = formatGeneratedGoal(goal);
  if (goalLabel) {
    parts.push(goalLabel);
  }

  if (equipmentPreferences.length > 0) {
    parts.push(equipmentPreferences.map(formatGeneratedEquipment).join(", "));
  }

  return parts.join(" | ") || "AI-generated split suggestions";
}

// ============================================
// MAIN COMPONENT
// ============================================

const RoutinesSection = ({
  onViewDay,
  onEditDay,
  initialInlineEditRoutineId = null,
  initialExpandedRoutineId = null,
}: RoutinesSectionProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [routines, setRoutines] = useState<Routine[]>(() => loadRoutines());
  // Initialise expanded set: include the routine we just came back from
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(
    () => new Set(initialExpandedRoutineId ? [initialExpandedRoutineId] : [])
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingRoutineDeleteId, setPendingRoutineDeleteId] = useState<string | null>(null);
  const [pendingDayDelete, setPendingDayDelete] = useState<{
    routineId: string;
    dayId: string;
  } | null>(null);

  // Start workout dialog state
  const [startWorkoutDialog, setStartWorkoutDialog] = useState<{
    routineId: string;
    dayId: string;
    dayName: string;
    routineName: string;
  } | null>(null);

  // Inline editing state
  const [inlineEditRoutineId, setInlineEditRoutineId] = useState<string | null>(initialInlineEditRoutineId);
  const [isCreatingNewRoutine, setIsCreatingNewRoutine] = useState(false);
  const [librarySecondaryLookup, setLibrarySecondaryLookup] = useState<Record<number, string[]>>({});
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [generatedRoutineResult, setGeneratedRoutineResult] =
    useState<AiRoutineSuggestionsResponse | null>(null);
  const [generatedRoutineRequest, setGeneratedRoutineRequest] =
    useState<GenerateRoutineSuggestionsRequest | null>(null);
  const [generatedRoutineError, setGeneratedRoutineError] = useState<string | null>(null);
  const [generatedRoutineExpanded, setGeneratedRoutineExpanded] = useState(true);
  const [activeGeneratedSuggestionIndex, setActiveGeneratedSuggestionIndex] = useState(0);
  const [rejectedGeneratedSuggestionIds, setRejectedGeneratedSuggestionIds] = useState<string[]>([]);
  const [generatedPreviewResult, setGeneratedPreviewResult] =
    useState<AiRoutinePreviewResponse | null>(null);
  const [generatedPreviewRoutine, setGeneratedPreviewRoutine] = useState<Routine | null>(null);
  const [generatedPreviewError, setGeneratedPreviewError] = useState<string | null>(null);

  // Fetch active routine settings to identify the upcoming day
  const { data: routineSettings } = useQuery({
    queryKey: routineQueryKeys.settings(),
    queryFn: getMyRoutineSettingsApi,
    staleTime: 30000,
  });

  // Subscribe to routine list query to trigger refresh when invalidated
  // This ensures the local store is refreshed when sync-to-routine updates the backend
  const routinesListQuery = useQuery({
    queryKey: routineQueryKeys.list(),
    queryFn: refreshRoutineStore,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!routinesListQuery.data) return;
    setRoutines(routinesListQuery.data);
  }, [routinesListQuery.data]);

  // Get the upcoming day ID from active routine settings
  const upcomingDayId = routineSettings?.activeSetting?.currentDayId ?? null;
  const activeRoutineBackendId = routineSettings?.activeSetting?.routineId ?? null;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Start workout session mutation
  const startWorkoutMutation = useMutation({
    mutationFn: async ({ routineId, dayId }: { routineId: string; dayId: string }) => {
      const resolvedIds = await resolveRoutineStartIds(routineId, dayId);
      return startWorkoutSessionApi({
        mode: "ROUTINE",
        routineId: resolvedIds.routineId,
        routineDayId: resolvedIds.routineDayId,
      });
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() });
      toast.success("Workout started! 💪");
      setStartWorkoutDialog(null);
      navigate(`/workout-session/${session.routineLogId}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to start workout", { description: error.message });
    },
  });

  const generateAiRoutineMutation = useMutation({
    mutationFn: prepareAiRoutineSuggestionsApi,
    onSuccess: (response) => {
      setGeneratedRoutineResult(response);
      setGeneratedRoutineError(null);
      setGeneratedRoutineExpanded(true);
      setActiveGeneratedSuggestionIndex(0);
      toast.success("AI routine suggestions generated.");
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, "Failed to generate AI routine suggestions.");
      setGeneratedRoutineResult(null);
      setGeneratedRoutineError(message);
      setGeneratedRoutineExpanded(true);
      toast.error("AI routine generation failed", { description: message });
    },
  });

  const generateAiRoutinePreviewMutation = useMutation({
    mutationFn: generateAiRoutinePreviewApi,
    onSuccess: (response) => {
      setGeneratedPreviewResult(response);
      setGeneratedPreviewRoutine(mapAiRoutinePreviewToRoutine(response));
      setGeneratedPreviewError(null);
      setGeneratedRoutineResult(null);
      toast.success("AI routine preview generated.");
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, "Failed to generate AI routine preview.");
      setGeneratedPreviewResult(null);
      setGeneratedPreviewRoutine(null);
      setGeneratedPreviewError(message);
      toast.error("AI routine preview failed", { description: message });
    },
  });

  const importGeneratedRoutineMutation = useMutation({
    mutationFn: async () => {
      if (!generatedPreviewResult) {
        throw new Error("No AI routine preview is available to import.");
      }

      return addRoutine(mapAiRoutinePreviewToRoutine(generatedPreviewResult), {
        sync: "force",
        throwOnSyncError: true,
      });
    },
    onSuccess: async (importedRoutine) => {
      await refreshRoutinesFromBackend();
      setGeneratedPreviewResult(null);
      setGeneratedPreviewRoutine(null);
      setGeneratedPreviewError(null);
      setGeneratedRoutineResult(null);
      setGeneratedRoutineRequest(null);
      setGeneratedRoutineError(null);
      setRejectedGeneratedSuggestionIds([]);
      setActiveGeneratedSuggestionIndex(0);
      setExpandedRoutines((prev) => {
        const next = new Set(prev);
        next.add(importedRoutine.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: routineQueryKeys.list() });
      toast.success("Routine imported.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to import AI routine.";
      toast.error("Routine import failed", { description: message });
    },
  });

  // Note: Routine loading is handled by the useQuery with routineQueryKeys.list()
  // which refreshes from backend and updates local state when invalidated

  useEffect(() => {
    if (!initialInlineEditRoutineId) return;
    setInlineEditRoutineId(initialInlineEditRoutineId);
    setIsCreatingNewRoutine(false);
    setExpandedRoutines((prev) => {
      const next = new Set(prev);
      next.add(initialInlineEditRoutineId);
      return next;
    });
  }, [initialInlineEditRoutineId]);

  const missingLibrarySecondaryIds = useMemo(() => {
    const ids = new Set<number>();
    for (const routine of routines) {
      for (const day of routine.days) {
        for (const exercise of day.exercises) {
          if (
            exercise.source === "library" &&
            exercise.secondaryMuscles.length === 0 &&
            librarySecondaryLookup[exercise.sourceExerciseId] === undefined
          ) {
            ids.add(exercise.sourceExerciseId);
          }
        }
      }
    }
    return Array.from(ids);
  }, [routines, librarySecondaryLookup]);

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
                .filter((assignment) => assignment.muscleType === "SECONDARY" && assignment.muscleName)
                .map((assignment) => assignment.muscleName as string)
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
        for (const item of resolved) {
          next[item.exerciseId] = item.secondaryMuscles;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [missingLibrarySecondaryIds]);

  // Refresh routines
  const refreshRoutines = useCallback(() => {
    setRoutines(loadRoutines());
  }, []);

  const refreshRoutinesFromBackend = useCallback(async () => {
    try {
      const nextRoutines = await refreshRoutineStore();
      setRoutines(nextRoutines);
    } catch (error) {
      console.error("Failed to refresh routines:", error);
      setRoutines(loadRoutines());
    }
  }, []);

  const handleGenerateRoutineRequest = useCallback(
    (request: GenerateRoutineSuggestionsRequest) => {
      setGeneratedRoutineRequest(request);
      setGeneratedRoutineResult(null);
      setGeneratedRoutineError(null);
      setGeneratedRoutineExpanded(true);
      setActiveGeneratedSuggestionIndex(0);
      setRejectedGeneratedSuggestionIds([]);
      setGeneratedPreviewResult(null);
      setGeneratedPreviewRoutine(null);
      setGeneratedPreviewError(null);
      generateAiRoutineMutation.mutate(request);
    },
    [generateAiRoutineMutation]
  );

  // Toggle routine expansion
  const toggleRoutineExpanded = useCallback((routineId: string) => {
    setExpandedRoutines((prev) => {
      const next = new Set(prev);
      if (next.has(routineId)) next.delete(routineId);
      else next.add(routineId);
      return next;
    });
  }, []);

  const toggleGeneratedRoutineExpanded = useCallback(() => {
    setGeneratedRoutineExpanded((prev) => !prev);
  }, []);

  // Toggle menu
  const toggleMenu = useCallback((routineId: string) => {
    if (openMenuId === routineId) {
      setOpenMenuId(null);
    } else {
      setOpenMenuId(routineId);
    }
  }, [openMenuId]);

  // Handlers
  const handleEditRoutine = useCallback(
    (routineId: string) => {
      setOpenMenuId(null);
      // Use inline editor instead of navigating away
      setInlineEditRoutineId(routineId);
      setIsCreatingNewRoutine(false);
    },
    []
  );

  const handleAddWorkoutDay = useCallback(
    async (routineId: string) => {
      setOpenMenuId(null);
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;

      const newDayOrder = routine.days.length + 1;
      const newDay = createDefaultDay(
        generateDefaultWorkoutDayName(routine.days),
        newDayOrder
      );
      
      try {
        await updateRoutine(routineId, {
          ...routine,
          days: [...routine.days, newDay],
        }, { throwOnSyncError: true });
        refreshRoutines();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add workout day.");
        await refreshRoutinesFromBackend();
        return;
      }

      // Clear inline editor so Back doesn't reopen the new-routine editor
      setInlineEditRoutineId(null);
      setIsCreatingNewRoutine(false);

      onEditDay?.(routineId, newDay.id);
    },
    [routines, refreshRoutines, refreshRoutinesFromBackend, onEditDay]
  );

  const handleNewRoutine = useCallback(async () => {
    // Create new routine and open inline editor
    const newRoutine = createDefaultRoutine();
    try {
      await addRoutine(newRoutine, { sync: "none" });
      refreshRoutines();
      setInlineEditRoutineId(newRoutine.id);
      setIsCreatingNewRoutine(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create routine.");
    }
  }, [refreshRoutines]);

  const handleInlineEditorSave = useCallback(() => {
    setInlineEditRoutineId(null);
    setIsCreatingNewRoutine(false);
    refreshRoutines();
  }, [refreshRoutines]);

  const handleInlineEditorCancel = useCallback(async () => {
    // If it was a new routine that was cancelled, delete it
    if (isCreatingNewRoutine && inlineEditRoutineId) {
      try {
        await deleteRoutine(inlineEditRoutineId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to discard routine draft.");
      }
    }
    setInlineEditRoutineId(null);
    setIsCreatingNewRoutine(false);
    refreshRoutines();
  }, [isCreatingNewRoutine, inlineEditRoutineId, refreshRoutines]);

  const handleSetActive = useCallback(
    async (routineId: string) => {
      try {
        await setActiveRoutine(routineId);
        refreshRoutines();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to activate routine.");
        await refreshRoutinesFromBackend();
      } finally {
        setOpenMenuId(null);
      }
    },
    [refreshRoutines, refreshRoutinesFromBackend]
  );

  const handleDeleteRoutine = useCallback(
    (routineId: string) => {
      setOpenMenuId(null);
      setPendingRoutineDeleteId(routineId);
    },
    []
  );

  const handleConfirmDeleteRoutine = useCallback(async () => {
    if (!pendingRoutineDeleteId) return;
    try {
      await deleteRoutine(pendingRoutineDeleteId);
      refreshRoutines();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete routine.");
      await refreshRoutinesFromBackend();
    } finally {
      setPendingRoutineDeleteId(null);
    }
  }, [pendingRoutineDeleteId, refreshRoutines, refreshRoutinesFromBackend]);

  // Day reorder via drag
  const handleDayDragEnd = useCallback(
    (routineId: string) => (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Find the routine
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;

      const oldIndex = routine.days.findIndex((d) => d.id === active.id);
      const newIndex = routine.days.findIndex((d) => d.id === over.id);
      const reordered = normalizeDayOrder(arrayMove(routine.days, oldIndex, newIndex));

      const updatedRoutine = { ...routine, days: reordered };
      void updateRoutine(routineId, updatedRoutine, {
        throwOnSyncError: true,
        rollbackOnSyncError: true,
      })
        .then(() => refreshRoutines())
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "Failed to reorder workout days.");
          void refreshRoutinesFromBackend();
        });
    },
    [routines, refreshRoutines, refreshRoutinesFromBackend]
  );

  const handleDayClick = useCallback(
    (rId: string, dId: string) => {
      // If the user navigates away while creating a new routine, discard it
      if (isCreatingNewRoutine && inlineEditRoutineId) {
        void deleteRoutine(inlineEditRoutineId);
      }
      setInlineEditRoutineId(null);
      setIsCreatingNewRoutine(false);
      onViewDay?.(rId, dId);
    },
    [onViewDay, isCreatingNewRoutine, inlineEditRoutineId]
  );

  const handleDayEdit = useCallback(
    (rId: string, dId: string) => {
      // Same cleanup
      if (isCreatingNewRoutine && inlineEditRoutineId) {
        void deleteRoutine(inlineEditRoutineId);
      }
      setInlineEditRoutineId(null);
      setIsCreatingNewRoutine(false);
      onEditDay?.(rId, dId);
    },
    [onEditDay, isCreatingNewRoutine, inlineEditRoutineId]
  );

  const handleDayDelete = useCallback(
    (routineId: string, dayId: string) => {
      setPendingDayDelete({ routineId, dayId });
    },
    []
  );

  const handleConfirmDeleteDay = useCallback(async () => {
    if (!pendingDayDelete) return;
    const routine = routines.find((r) => r.id === pendingDayDelete.routineId);
    if (!routine) {
      setPendingDayDelete(null);
      return;
    }

    const updatedDays = normalizeDayOrder(routine.days.filter((d) => d.id !== pendingDayDelete.dayId));
    try {
      await updateRoutine(pendingDayDelete.routineId, { ...routine, days: updatedDays }, { throwOnSyncError: true });
      refreshRoutines();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete workout day.");
      await refreshRoutinesFromBackend();
    } finally {
      setPendingDayDelete(null);
    }
  }, [pendingDayDelete, routines, refreshRoutines, refreshRoutinesFromBackend]);

  const pendingRoutineDelete = routines.find((routine) => routine.id === pendingRoutineDeleteId) ?? null;
  const pendingDayDeleteDetails = pendingDayDelete
    ? (() => {
        const routine = routines.find((item) => item.id === pendingDayDelete.routineId);
        const day = routine?.days.find((item) => item.id === pendingDayDelete.dayId) ?? null;
        return routine && day ? { routine, day } : null;
      })()
    : null;

  const handleDayCopy = useCallback(
    async (sourceRoutineId: string, dayId: string, targetRoutineId: string) => {
      const sourceRoutine = routines.find((r) => r.id === sourceRoutineId);
      if (!sourceRoutine) return;
      const dayToCopy = sourceRoutine.days.find((d) => d.id === dayId);
      if (!dayToCopy) return;

      const targetRoutine = routines.find((r) => r.id === targetRoutineId);
      if (!targetRoutine) return;

      // Create a copy with new ID and updated dayOrder
      const newDay: WorkoutDay = {
        ...dayToCopy,
        id: createUuid(),
        backendId: null,
        name: generateUniqueWorkoutDayName(
          targetRoutine.days,
          targetRoutineId === sourceRoutineId ? `${dayToCopy.name} (Copy)` : dayToCopy.name
        ),
        dayOrder: targetRoutine.days.length + 1,
        supersetGroups: (dayToCopy.supersetGroups ?? []).map((group) => ({
          ...group,
          id: createUuid(),
          backendId: null,
        })),
        exercises: dayToCopy.exercises.map((ex) => ({
          ...ex,
          id: createUuid(),
          backendId: null,
          supersetGroupId: null,
          sets: ex.sets.map((s) => ({
            ...s,
            id: createUuid(),
            backendId: null,
          })),
        })),
      };

      try {
        await updateRoutine(targetRoutineId, {
          ...targetRoutine,
          days: [...targetRoutine.days, newDay],
        }, { throwOnSyncError: true });
        refreshRoutines();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to copy workout day.");
        await refreshRoutinesFromBackend();
      }
    },
    [routines, refreshRoutines, refreshRoutinesFromBackend]
  );

  // Handle start workout from day row
  const handleStartWorkout = useCallback(
    (routineId: string, dayId: string, dayName: string, routineName: string) => {
      setStartWorkoutDialog({ routineId, dayId, dayName, routineName });
    },
    []
  );

  const handleConfirmStartWorkout = useCallback(() => {
    if (!startWorkoutDialog) return;
    startWorkoutMutation.mutate({
      routineId: startWorkoutDialog.routineId,
      dayId: startWorkoutDialog.dayId,
    });
  }, [startWorkoutDialog, startWorkoutMutation]);

  // Generate routine summary
  const getRoutineSummaryText = useCallback((routine: Routine): string => {
    if (routine.description) return routine.description;
    const dayCount = routine.days.length;
    const totalExercises = routine.days.reduce((s, d) => s + d.exercises.length, 0);
    const parts: string[] = [];
    if (dayCount > 0) parts.push(`${dayCount} day${dayCount > 1 ? "s" : ""}`);
    if (totalExercises > 0) parts.push(`${totalExercises} exercise${totalExercises > 1 ? "s" : ""}`);
    if (routine.goal) parts.push(routine.goal);
    return parts.join(" • ") || "No workout days";
  }, []);

  const generatedRoutinePending = generateAiRoutineMutation.isPending;
  const availableGeneratedSuggestions =
    generatedRoutineResult?.suggestions.filter(
      (suggestion) => !rejectedGeneratedSuggestionIds.includes(suggestion.splitId)
    ) ?? [];
  const isInitialRoutineListLoading =
    routinesListQuery.isLoading && routines.length === 0 && !inlineEditRoutineId;
  const initialRoutineListErrorMessage =
    routinesListQuery.isError && routines.length === 0 && !inlineEditRoutineId
      ? getApiErrorMessage(routinesListQuery.error, "Failed to load routines.")
      : null;
  const hasGeneratedRoutinePanel =
    (generatedRoutinePending || generatedRoutineResult !== null || generatedRoutineError !== null)
    && !(generatedPreviewResult !== null && generatedPreviewRoutine !== null);
  const hasGeneratedPreviewPanel =
    generateAiRoutinePreviewMutation.isPending
    || generatedPreviewResult !== null
    || generatedPreviewError !== null;
  const activeGeneratedSuggestion =
    availableGeneratedSuggestions[activeGeneratedSuggestionIndex] ?? null;
  const previewGeneratedDaysPerWeek =
    generatedRoutineResult?.promptInput.daysPerWeek ?? generatedRoutineRequest?.daysPerWeek ?? 0;
  const previewGeneratedGoal =
    generatedRoutineResult?.effectiveGoal ?? generatedRoutineRequest?.routineGoal ?? null;
  const previewGeneratedEquipment =
    generatedRoutineResult?.normalizedEquipmentPreferences
    ?? generatedRoutineRequest?.equipmentPreferences
    ?? [];
  const generatedRoutineSummary = buildGeneratedRoutineSummary(
    previewGeneratedDaysPerWeek,
    previewGeneratedGoal,
    previewGeneratedEquipment
  );
  const generatedRoutineStatusLabel = generatedRoutinePending
    ? "Thinking"
    : generatedRoutineResult && availableGeneratedSuggestions.length > 0
      ? `${availableGeneratedSuggestions.length} splits available`
      : generatedRoutineResult
        ? "No splits left"
      : "Failed";

  useEffect(() => {
    if (activeGeneratedSuggestionIndex < availableGeneratedSuggestions.length) {
      return;
    }
    setActiveGeneratedSuggestionIndex(0);
  }, [activeGeneratedSuggestionIndex, availableGeneratedSuggestions.length]);

  const handlePreviousGeneratedSuggestion = useCallback(() => {
    if (availableGeneratedSuggestions.length <= 1) {
      return;
    }

    setActiveGeneratedSuggestionIndex((prev) =>
      prev === 0 ? availableGeneratedSuggestions.length - 1 : prev - 1
    );
  }, [availableGeneratedSuggestions.length]);

  const handleNextGeneratedSuggestion = useCallback(() => {
    if (availableGeneratedSuggestions.length <= 1) {
      return;
    }

    setActiveGeneratedSuggestionIndex((prev) =>
      prev === availableGeneratedSuggestions.length - 1 ? 0 : prev + 1
    );
  }, [availableGeneratedSuggestions.length]);

  const handleAcceptGeneratedSuggestion = useCallback(() => {
    if (!generatedRoutineRequest || !activeGeneratedSuggestion) {
      return;
    }

    const selectedSuggestionForPreview = {
      ...activeGeneratedSuggestion,
      split: activeGeneratedSuggestion.split.map((day) => ({
        day: day.day,
        label: day.label,
        muscles: [...day.muscles],
        targetSlotCount: day.targetSlotCount ?? undefined,
      })),
    };

    setGeneratedPreviewResult(null);
    setGeneratedPreviewRoutine(null);
    setGeneratedPreviewError(null);
    generateAiRoutinePreviewMutation.mutate({
      generationRequest: generatedRoutineRequest,
      selectedSuggestion: selectedSuggestionForPreview,
    });
  }, [
    activeGeneratedSuggestion,
    generateAiRoutinePreviewMutation,
    generatedRoutineRequest,
  ]);

  const handleRejectGeneratedSuggestion = useCallback(() => {
    if (!activeGeneratedSuggestion) {
      return;
    }

    setRejectedGeneratedSuggestionIds((prev) => [...prev, activeGeneratedSuggestion.splitId]);
    if (generatedPreviewResult?.selectedSuggestion.splitId === activeGeneratedSuggestion.splitId) {
      setGeneratedPreviewResult(null);
      setGeneratedPreviewRoutine(null);
      setGeneratedPreviewError(null);
    }
  }, [activeGeneratedSuggestion, generatedPreviewResult]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <UserSectionShell
      title={
        <>
          My <span className="text-gradient-fire">Routine</span>
        </>
      }
      description="Create and manage your workout routines"
      actions={
        !inlineEditRoutineId && (
          <div className="flex w-full flex-nowrap items-center justify-end gap-2">
            <button
              onClick={() => setIsAiDialogOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-200 transition-colors hover:bg-orange-500/15"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
            <button
              onClick={handleNewRoutine}
              className="flow-button-primary"
            >
              <Plus className="h-4 w-4" />
              New Routine
            </button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {hasGeneratedPreviewPanel && (
          generateAiRoutinePreviewMutation.isPending ? (
            <section className="flow-panel rounded-[2rem] border border-orange-500/15 bg-orange-500/[0.04] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">Building your final routine preview</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Resolving real library exercises, set templates, and muscle distribution.
                  </p>
                </div>
              </div>
            </section>
          ) : generatedPreviewError ? (
            <section className="flow-panel rounded-[2rem] border border-red-500/20 bg-red-500/5 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">Routine preview failed</p>
                  <p className="mt-1 text-xs leading-5 text-red-100/80">{generatedPreviewError}</p>
                </div>
              </div>
            </section>
          ) : generatedPreviewResult && generatedPreviewRoutine ? (
            <Suspense fallback={<RoutinePanelFallback label="Loading AI preview..." />}>
              <AiRoutinePreviewPanel
                key={generatedPreviewResult.selectedSuggestion.splitId}
                previewRoutine={generatedPreviewRoutine}
                previewResponse={generatedPreviewResult}
                onImport={() => importGeneratedRoutineMutation.mutate()}
                importPending={importGeneratedRoutineMutation.isPending}
              />
            </Suspense>
          ) : null
        )}

        {hasGeneratedRoutinePanel && (
          <section className="relative flow-panel rounded-[2rem]">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 p-4">
              <button
                type="button"
                onClick={handlePreviousGeneratedSuggestion}
                disabled={availableGeneratedSuggestions.length <= 1}
                className="inline-flex h-9 w-9 items-center justify-center text-slate-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Previous generated split"
              >
                <ChevronLeft className="h-6 w-6 [stroke-width:2.6]" />
              </button>

              <div
                onClick={toggleGeneratedRoutineExpanded}
                className="min-w-0 cursor-pointer text-center"
              >
                <div className="mb-1 flex flex-wrap items-center justify-center gap-2">
                  <h3 className="text-lg font-black text-white">AI Split Suggestions</h3>
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase ${
                      generatedRoutinePending
                        ? "bg-orange-500/15 text-orange-200"
                        : generatedRoutineResult
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {generatedRoutineStatusLabel}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-gray-500">
                  {generatedRoutinePending
                    ? `Generating ranked split suggestions | ${generatedRoutineSummary}`
                    : generatedRoutineSummary}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNextGeneratedSuggestion}
                disabled={availableGeneratedSuggestions.length <= 1}
                className="inline-flex h-9 w-9 items-center justify-center text-slate-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Next generated split"
              >
                <ChevronRight className="h-6 w-6 [stroke-width:2.6]" />
              </button>
            </div>

            {generatedRoutineExpanded && (
              <div className="border-t border-white/5 p-5 pt-4">
                {generatedRoutinePending ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-orange-500/15 bg-orange-500/[0.04] p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-orange-200" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-white">Thinking through your routine split</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            Matching recovery, training days, goal, and equipment before showing 3 ranked options.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {Array.from({ length: Math.max(previewGeneratedDaysPerWeek, 3) }).map((_, index) => (
                        <div
                          key={`generated-routine-placeholder-${index}`}
                          className="flex items-center gap-3 rounded-[1.5rem] border border-white/[0.07] user-surface-soft p-4"
                        >
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-sm font-black text-slate-500">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="h-3 w-36 max-w-[70%] animate-pulse rounded-full bg-white/10" />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Array.from({ length: 4 }).map((__, chipIndex) => (
                                <span
                                  key={`generated-routine-placeholder-chip-${index}-${chipIndex}`}
                                  className="h-6 w-20 animate-pulse rounded-full bg-white/[0.06]"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : generatedRoutineError ? (
                  <div className="rounded-[1.5rem] border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10">
                        <AlertTriangle className="h-5 w-5 text-red-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-white">Routine generation failed</p>
                        <p className="mt-1 text-xs leading-5 text-red-100/80">{generatedRoutineError}</p>
                      </div>
                    </div>
                  </div>
                ) : activeGeneratedSuggestion ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-white/[0.07] user-surface-soft p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
                              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-200">
                                Active split
                              </p>
                              <h4 className="truncate text-base font-black text-white">
                                {activeGeneratedSuggestion.splitName}
                              </h4>
                            </div>
                          </div>
                          <p className="mt-3 text-xs leading-5 text-slate-400">
                            {activeGeneratedSuggestion.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                            {`${activeGeneratedSuggestionIndex + 1} / ${availableGeneratedSuggestions.length}`}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleAcceptGeneratedSuggestion}
                          disabled={!generatedRoutineRequest || generateAiRoutinePreviewMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {generateAiRoutinePreviewMutation.isPending
                            && generatedPreviewResult?.selectedSuggestion.splitId !== activeGeneratedSuggestion.splitId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Accept Split
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectGeneratedSuggestion}
                          disabled={generateAiRoutinePreviewMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-300 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Reject Split
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {activeGeneratedSuggestion.split.map((day) => (
                        <div
                          key={`${activeGeneratedSuggestion.splitId}-${day.day}`}
                          className="rounded-[1.5rem] border border-white/[0.07] user-surface-soft p-4 transition-colors hover:border-white/15 hover:bg-[#191919]"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-600/20 text-sm font-black text-orange-300">
                              {day.day}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-white">{day.label}</p>
                                <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300">
                                  Day {day.day}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {day.muscles.map((muscle) => (
                                  <span
                                    key={`${activeGeneratedSuggestion.splitId}-${day.day}-${muscle}`}
                                    className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-bold text-slate-300"
                                  >
                                    {muscle}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : generatedRoutineResult ? (
                  <div className="rounded-[1.5rem] border border-white/[0.07] user-surface-soft p-4 text-xs text-slate-400">
                    All suggested splits were rejected. Generate again to get a new set of options.
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-white/[0.07] user-surface-soft p-4 text-xs text-slate-400">
                    No generated split is available yet.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Inline Editor for New/Edit Routine */}
        {inlineEditRoutineId && (
          <Suspense fallback={<RoutinePanelFallback label="Loading routine editor..." />}>
            <InlineRoutineEditor
              routineId={inlineEditRoutineId}
              isNewRoutine={isCreatingNewRoutine}
              onSave={handleInlineEditorSave}
              onCancel={handleInlineEditorCancel}
              onEditDay={(routineId, dayId) => {
                // Close inline editor and navigate to day edit mode
                setInlineEditRoutineId(null);
                setIsCreatingNewRoutine(false);
                onEditDay?.(routineId, dayId);
              }}
            />
          </Suspense>
        )}

        {/* Routine list — active first, then alphabetical */}
        {isInitialRoutineListLoading ? (
          <div className="flow-panel rounded-[2rem] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
            <p className="mb-2 text-sm font-bold text-white">Loading routines...</p>
            <p className="text-xs text-gray-500">
              Fetching your saved routines and active workout day.
            </p>
          </div>
        ) : initialRoutineListErrorMessage ? (
          <div className="flow-panel rounded-[2rem] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-300" />
            </div>
            <p className="mb-2 text-sm font-bold text-white">Routines could not be loaded</p>
            <p className="mb-6 text-xs text-gray-400">{initialRoutineListErrorMessage}</p>
            <button
              type="button"
              onClick={() => void routinesListQuery.refetch()}
              className="flow-button-primary"
            >
              Retry
            </button>
          </div>
        ) : routines.length === 0 && !inlineEditRoutineId ? (
          <div className="flow-panel rounded-[2rem] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Dumbbell className="h-8 w-8 text-gray-600" />
            </div>
            <p className="mb-2 text-sm font-bold text-white">No routines yet</p>
            <p className="mb-6 text-xs text-gray-500">
              Create your first routine to start tracking your workouts
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => setIsAiDialogOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-200 transition-colors hover:bg-orange-500/15"
              >
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </button>
              <button
                onClick={handleNewRoutine}
                className="flow-button-primary"
              >
                <Plus className="h-4 w-4" />
                Create Your First Routine
              </button>
            </div>
          </div>
        ) : (
          [...routines]
            .sort((a, b) => {
              if (a.isActive && !b.isActive) return -1;
              if (!a.isActive && b.isActive) return 1;
              return a.name.localeCompare(b.name);
            })
            .map((routine) => {
            // Skip rendering the routine being edited inline (it shows in the editor)
            if (routine.id === inlineEditRoutineId) return null;
            
            const isExpanded = expandedRoutines.has(routine.id);
            const isMenuOpen = openMenuId === routine.id;
            const summaryText = getRoutineSummaryText(routine);
            const allExercises = routine.days.flatMap((d) => d.exercises);
            const heatmapExercises = allExercises.map((exercise) => {
              if (exercise.source !== "library" || exercise.secondaryMuscles.length > 0) {
                return exercise;
              }
              const hydratedSecondary = librarySecondaryLookup[exercise.sourceExerciseId];
              if (!hydratedSecondary || hydratedSecondary.length === 0) {
                return exercise;
              }
              return {
                ...exercise,
                secondaryMuscles: hydratedSecondary,
              };
            });

            return (
              <div
                key={routine.id}
                className={`relative flow-panel rounded-[2rem] transition-all ${
                  isMenuOpen ? "z-[80]" : "z-0"
                }`}
              >
                {/* Routine Header */}
                <div className="flex items-center gap-3 p-5">
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleRoutineExpanded(routine.id)}
                    className="flex-shrink-0 text-gray-500 transition-colors hover:text-white"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>

                  {/* Routine Info - Clickable to toggle dropdown */}
                  <div 
                    onClick={() => toggleRoutineExpanded(routine.id)}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">
                        {routine.name}
                      </h3>
                      {routine.isActive && (
                        <span className="rounded-lg bg-green-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-green-500">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-gray-500">
                      {summaryText}
                    </p>
                  </div>

                  {/* Three-Dot Menu */}
                  <div className={`relative flex-shrink-0 ${isMenuOpen ? "z-[9999]" : ""}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(routine.id);
                      }}
                      className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setOpenMenuId(null)} />
                        <div
                          className="absolute right-0 top-full z-[9999] mt-2 w-56 rounded-2xl border border-white/10 bg-[#181818] py-2 shadow-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleEditRoutine(routine.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-white/5"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit Routine
                          </button>
                          <button
                            onClick={() => handleAddWorkoutDay(routine.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-white/5"
                          >
                            <Plus className="h-4 w-4" />
                            Add New Workout Day
                          </button>
                          {!routine.isActive && (
                            <button
                              onClick={() => handleSetActive(routine.id)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-orange-400 transition-colors hover:bg-orange-500/10"
                            >
                              <Star className="h-3.5 w-3.5" />
                              Set as Active
                            </button>
                          )}
                          <div className="my-1 border-t border-white/5" />
                          <button
                            onClick={() => handleDeleteRoutine(routine.id)}
                            className="w-full px-4 py-2 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded: Workout Days (drag-reorderable) + Muscle Heatmap */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-5 pt-4">
                    {routine.days.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="mb-3 text-xs text-gray-500">
                          No workout days yet
                        </p>
                        <button
                          onClick={() => handleAddWorkoutDay(routine.id)}
                          className="flow-button-secondary"
                        >
                          <Plus className="h-3 w-3" />
                          Add First Day
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
                        {/* Muscle Heatmap */}
                        {allExercises.length > 0 && (
                          <div className="order-1 w-full lg:order-2 lg:self-start">
                            <Suspense fallback={<RoutinePanelFallback label="Loading muscle map..." />}>
                              <MuscleHeatmap
                                exercises={heatmapExercises}
                                variant="full"
                                showSetBars={false}
                                showScoreLegend={false}
                                stretchMode="none"
                                className="w-full"
                              />
                            </Suspense>
                          </div>
                        )}

                        {/* Day List — with drag-and-drop reorder */}
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDayDragEnd(routine.id)}
                        >
                          <SortableContext
                            items={routine.days.map((d) => d.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="order-2 space-y-2 lg:order-1">
                              {[...routine.days]
                                .sort((a, b) => a.dayOrder - b.dayOrder)
                                .map((day) => (
                                  <SortableDayRow
                                    key={day.id}
                                    day={day}
                                    routineId={routine.id}
                                    routineName={routine.name}
                                    routines={routines}
                                    isUpcomingDay={
                                      routine.isActive && 
                                      routine.backendId === activeRoutineBackendId &&
                                      day.backendId === upcomingDayId
                                    }
                                    onViewDay={handleDayClick}
                                    onEditDay={handleDayEdit}
                                    onDeleteDay={handleDayDelete}
                                    onCopyDay={handleDayCopy}
                                    onStartWorkout={handleStartWorkout}
                                  />
                                ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <AlertDialog
        open={pendingRoutineDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRoutineDeleteId(null);
        }}
      >
        <AlertDialogContent className="rounded-[20px] border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
          <AlertDialogHeader>
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)]">
              <Trash2 className="h-5 w-5 text-red-400" strokeWidth={1.8} />
            </div>
            <AlertDialogTitle className="text-[17px] font-black tracking-tight">
              Delete routine
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-relaxed text-[hsl(0,0%,55%)]">
              {pendingRoutineDelete
                ? `Delete ${pendingRoutineDelete.name}. This action cannot be undone.`
                : "Delete this routine. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="mt-0 flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] py-2.5 text-[11px] font-black uppercase tracking-wider text-[hsl(0,0%,55%)] hover:border-white/20 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteRoutine}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-red-500 py-2.5 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Routine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDayDeleteDetails !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDayDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-[20px] border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
          <AlertDialogHeader>
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)]">
              <Trash2 className="h-5 w-5 text-red-400" strokeWidth={1.8} />
            </div>
            <AlertDialogTitle className="text-[17px] font-black tracking-tight">
              Delete workout day
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-relaxed text-[hsl(0,0%,55%)]">
              {pendingDayDeleteDetails
                ? `Delete ${pendingDayDeleteDetails.day.name} from ${pendingDayDeleteDetails.routine.name}. This action cannot be undone.`
                : "Delete this workout day. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="mt-0 flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] py-2.5 text-[11px] font-black uppercase tracking-wider text-[hsl(0,0%,55%)] hover:border-white/20 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteDay}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-red-500 py-2.5 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Day
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Workout Dialog */}
      {startWorkoutDialog !== null && (
        <Suspense fallback={null}>
          <StartWorkoutDayDialog
            open
            onOpenChange={(open) => {
              if (!open) setStartWorkoutDialog(null);
            }}
            dayName={startWorkoutDialog.dayName}
            routineName={startWorkoutDialog.routineName}
            onConfirm={handleConfirmStartWorkout}
            isStarting={startWorkoutMutation.isPending}
          />
        </Suspense>
      )}

      {isAiDialogOpen && (
        <Suspense fallback={null}>
          <AiRoutineGenerationDialog
            open
            onOpenChange={setIsAiDialogOpen}
            onGenerateRequest={handleGenerateRoutineRequest}
          />
        </Suspense>
      )}
    </UserSectionShell>
  );
};

export default RoutinesSection;
