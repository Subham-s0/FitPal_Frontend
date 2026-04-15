import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  SkipForward,
  Plus,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import WorkoutSetRow from "./WorkoutSetRow";
import WorkoutSummarySheet from "./WorkoutSummarySheet";
import { ExerciseLibrarySheet, type ExerciseItem } from "@/features/exercises/components/ExerciseLibraryPanel";
import {
  getTodayWorkoutSessionApi,
  updateWorkoutSetApi,
  completeWorkoutSessionApi,
  skipWorkoutSessionApi,
  addWorkoutSetApi,
  addWorkoutExerciseApi,
  workoutSessionQueryKeys,
} from "@/features/workout-sessions/workoutSessionApi";
import type {
  WorkoutSessionResponse,
  WorkoutSessionExerciseResponse,
  UpdateWorkoutSetRequest,
} from "@/features/workout-sessions/workoutSessionTypes";

interface ActiveWorkoutSessionProps {
  initialSession: WorkoutSessionResponse;
  onSessionComplete?: () => void;
}

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

function ExerciseCard({
  exercise,
  exerciseIndex,
  onSetUpdate,
  onAddSet,
  isExpanded,
  onToggleExpand,
}: {
  exercise: WorkoutSessionExerciseResponse;
  exerciseIndex: number;
  onSetUpdate: (
    exerciseId: string,
    setId: string,
    updates: UpdateWorkoutSetRequest
  ) => void;
  onAddSet: (exerciseId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;
  const allCompleted = completedSets === totalSets && totalSets > 0;

  return (
    <div
      className={`flow-panel overflow-hidden rounded-2xl transition-all ${
        allCompleted ? "border-emerald-500/30 bg-emerald-500/5" : ""
      }`}
    >
      {/* Exercise Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        {/* Exercise Number */}
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-bold ${
            allCompleted
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-orange-500/10 text-orange-400"
          }`}
        >
          {exerciseIndex + 1}
        </div>

        {/* Exercise Image or Initials */}
        {exercise.coverUrl ? (
          <img
            src={exercise.coverUrl}
            alt={exercise.exerciseName}
            className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-gray-400">
            {exercise.exerciseName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}

        {/* Exercise Info */}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-base font-bold text-white">
            {exercise.exerciseName}
          </h4>
          <p className="text-sm text-gray-500">
            {exercise.equipmentName || exercise.primaryMuscles?.join(", ") || ""}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className={`text-sm font-bold ${
                allCompleted ? "text-emerald-400" : "text-white"
              }`}
            >
              {completedSets}/{totalSets}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Sets
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </button>

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
                />
              ))}
            </tbody>
          </table>

          {/* Add Set Button */}
          <button
            type="button"
            onClick={() => onAddSet(exercise.routineLogExerciseId)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-gray-400 transition-colors hover:border-white/20 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Set
          </button>
        </div>
      )}
    </div>
  );
}

export default function ActiveWorkoutSession({
  initialSession,
  onSessionComplete,
}: ActiveWorkoutSessionProps) {
  const queryClient = useQueryClient();

  // Use React Query to get fresh session data after mutations
  const { data: todayData } = useQuery({
    queryKey: workoutSessionQueryKeys.today(),
    queryFn: getTodayWorkoutSessionApi,
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  });

  // Use the session from query if available, otherwise use initial
  const session: WorkoutSessionResponse = 
    (todayData?.state === "IN_PROGRESS" && todayData.session) 
      ? todayData.session 
      : initialSession;

  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    () => new Set(initialSession.exercises.map((e) => e.routineLogExerciseId))
  );
  const [elapsedTime, setElapsedTime] = useState(() =>
    formatElapsedTime(session.startedAt)
  );
  const [completeNotes, setCompleteNotes] = useState("");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(session.startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

  // Stats
  const stats = useMemo(() => {
    let totalSets = 0;
    let completedSets = 0;
    session.exercises.forEach((ex) => {
      totalSets += ex.sets.length;
      completedSets += ex.sets.filter((s) => s.completed).length;
    });
    return { totalSets, completedSets, exerciseCount: session.exercises.length };
  }, [session.exercises]);

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
    }) =>
      updateWorkoutSetApi(session.routineLogId, exerciseId, setId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() });
    },
    onError: (error: Error) => {
      toast.error("Failed to update set", { description: error.message });
    },
  });

  // Add set mutation
  const addSetMutation = useMutation({
    mutationFn: (exerciseId: string) =>
      addWorkoutSetApi(session.routineLogId, exerciseId, {
        warmup: false,
        completed: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() });
      toast.success("Set added");
    },
    onError: (error: Error) => {
      toast.error("Failed to add set", { description: error.message });
    },
  });

  // Add exercise mutation
  const addExerciseMutation = useMutation({
    mutationFn: (exercise: ExerciseItem) =>
      addWorkoutExerciseApi(session.routineLogId, {
        exerciseSource: exercise.source,
        sourceExerciseId: exercise.id,
      }),
    onSuccess: (_, exercise) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() });
      setShowExercisePicker(false);
      toast.success(`${exercise.name} added to workout`);
    },
    onError: (error: Error) => {
      toast.error("Failed to add exercise", { description: error.message });
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: (notes: string) =>
      completeWorkoutSessionApi(session.routineLogId, {
        notes: notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.all });
      toast.success("Workout completed! 💪");
      setShowSummary(false);
      setShowCompleteDialog(false);
      onSessionComplete?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to complete session", { description: error.message });
    },
  });

  // Skip session mutation
  const skipSessionMutation = useMutation({
    mutationFn: () =>
      skipWorkoutSessionApi(session.routineLogId, {
        notes: completeNotes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.all });
      toast.info("Session skipped");
      setShowSkipDialog(false);
      onSessionComplete?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to skip session", { description: error.message });
    },
  });

  // Handle completing from summary sheet
  const handleSummaryComplete = useCallback((notes: string) => {
    completeSessionMutation.mutate(notes);
  }, [completeSessionMutation]);

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

  return (
    <div className="space-y-4">
      {/* Session Header */}
      <div className="flow-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-400">
              In Progress
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {session.title}
            </h2>
            {session.routineName && (
              <p className="mt-1 text-sm text-gray-400">{session.routineName}</p>
            )}
          </div>

          {/* Live Timer */}
          <div className="flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3">
            <Clock className="h-5 w-5 text-orange-400" />
            <span className="font-mono text-2xl font-bold text-orange-300">
              {elapsedTime}
            </span>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <Dumbbell className="mx-auto h-5 w-5 text-gray-500" />
            <p className="mt-2 text-2xl font-black text-white">
              {stats.exerciseCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Exercises
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
            <p className="mt-2 text-2xl font-black text-white">
              {stats.completedSets}/{stats.totalSets}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Sets Done
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <div className="mx-auto h-5 w-5">
              <svg viewBox="0 0 36 36" className="h-5 w-5 rotate-[-90deg]">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray={`${
                    (stats.completedSets / Math.max(stats.totalSets, 1)) * 100
                  } 100`}
                />
              </svg>
            </div>
            <p className="mt-2 text-2xl font-black text-white">
              {stats.totalSets > 0
                ? Math.round((stats.completedSets / stats.totalSets) * 100)
                : 0}
              %
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Progress
            </p>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {session.exercises.map((exercise, idx) => (
          <ExerciseCard
            key={exercise.routineLogExerciseId}
            exercise={exercise}
            exerciseIndex={idx}
            onSetUpdate={handleSetUpdate}
            onAddSet={handleAddSet}
            isExpanded={expandedExercises.has(exercise.routineLogExerciseId)}
            onToggleExpand={() => toggleExercise(exercise.routineLogExerciseId)}
          />
        ))}

        {/* Add Exercise Button */}
        <button
          type="button"
          onClick={() => setShowExercisePicker(true)}
          disabled={addExerciseMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-500/30 bg-orange-500/5 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-orange-300 transition-all hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addExerciseMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
          Add Exercise
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setShowSummary(true)}
          disabled={stats.completedSets === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-5 w-5" />
          Complete Workout
        </button>
        <button
          type="button"
          onClick={() => setShowSkipDialog(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-gray-400 transition-colors hover:border-white/20 hover:text-white"
        >
          <SkipForward className="h-5 w-5" />
          Skip
        </button>
      </div>

      {stats.completedSets === 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Complete at least one set to finish the workout</span>
        </div>
      )}

      {/* Complete Dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flow-panel w-full max-w-md rounded-3xl p-6">
            <h3 className="text-xl font-black text-white">Complete Workout?</h3>
            <p className="mt-2 text-sm text-gray-400">
              You completed {stats.completedSets} of {stats.totalSets} sets.
              Add any notes about this session.
            </p>
            <textarea
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Session notes (optional)..."
              className="flow-input mt-4 h-24 w-full resize-none rounded-xl p-3 text-sm"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCompleteDialog(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-gray-400 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => completeSessionMutation.mutate()}
                disabled={completeSessionMutation.isPending}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
              >
                {completeSessionMutation.isPending ? "Saving..." : "Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Dialog */}
      {showSkipDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flow-panel w-full max-w-md rounded-3xl p-6">
            <h3 className="text-xl font-black text-white">Skip Workout?</h3>
            <p className="mt-2 text-sm text-gray-400">
              You can add a note about why you're skipping this session.
            </p>
            <textarea
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Reason for skipping (optional)..."
              className="flow-input mt-4 h-24 w-full resize-none rounded-xl p-3 text-sm"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSkipDialog(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-gray-400 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => skipSessionMutation.mutate()}
                disabled={skipSessionMutation.isPending}
                className="flex-1 rounded-xl bg-gray-600 px-4 py-3 text-sm font-bold text-white hover:bg-gray-500 disabled:opacity-50"
              >
                {skipSessionMutation.isPending ? "Saving..." : "Skip"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Library Sheet */}
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
    </div>
  );
}

