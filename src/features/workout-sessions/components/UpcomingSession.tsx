import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Dumbbell,
  CheckCircle2,
  SkipForward,
  Calendar,
  AlertCircle,
  Loader2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import FreestyleSessionDialog from "./FreestyleSessionDialog";
import MuscleHeatmap from "@/features/routines/components/MuscleHeatmap";
import {
  getTodayWorkoutSessionApi,
  startWorkoutSessionApi,
  skipWorkoutSessionApi,
  workoutSessionQueryKeys,
} from "@/features/workout-sessions/workoutSessionApi";
import type { PlannedWorkoutSessionResponse } from "@/features/workout-sessions/workoutSessionTypes";

interface UpcomingSessionProps {
  onOpenRoutines?: () => void;
}

type PlannedExercise = PlannedWorkoutSessionResponse["exercises"][number];

function formatPlannedDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPlannedTarget(exercise: PlannedExercise): string {
  const firstSet = exercise.sets[0];
  if (!firstSet) return "No target";

  const parts: string[] = [];
  if (firstSet.targetReps !== null) parts.push(`${firstSet.targetReps} reps`);
  if (firstSet.targetWeight !== null) parts.push(`${firstSet.targetWeight} kg`);
  if (firstSet.targetDurationSeconds !== null) parts.push(formatPlannedDuration(firstSet.targetDurationSeconds));
  if (firstSet.targetDistance !== null) parts.push(`${firstSet.targetDistance} m`);

  return parts.length > 0 ? parts.join(" | ") : "No target";
}

function toHeatmapExercises(exercises: PlannedWorkoutSessionResponse["exercises"]) {
  return exercises.map((exercise, exerciseIndex) => ({
    primaryMuscles: exercise.primaryMuscles ?? [],
    secondaryMuscles: exercise.secondaryMuscles ?? [],
    sets: exercise.sets.map((set, setIndex) => ({
      id:
        set.routineSetTemplateId ??
        `${exercise.routineDayExerciseId}-${exerciseIndex}-${setIndex + 1}`,
      setOrder: set.setNo,
      targetWeight: set.targetWeight,
      targetReps: set.targetReps,
      targetDurationSeconds: set.targetDurationSeconds,
      targetDistance: set.targetDistance,
      targetRestSeconds: set.targetRestSeconds,
    })),
  }));
}

function PlannedSessionCard({
  routineName,
  dayName,
  exercises,
  todayStatusLabel,
  onStart,
  onSkip,
  onFreestyle,
  isStarting,
  isSkipping,
  isFreestyleStarting,
}: {
  routineName: string;
  dayName: string;
  exercises: PlannedWorkoutSessionResponse["exercises"];
  todayStatusLabel?: string | null;
  onStart: () => void;
  onSkip: () => void;
  onFreestyle: () => void;
  isStarting: boolean;
  isSkipping: boolean;
  isFreestyleStarting: boolean;
}) {
  const isAnyPending = isStarting || isSkipping || isFreestyleStarting;
  const heatmapExercises = useMemo(() => toHeatmapExercises(exercises), [exercises]);

  return (
    <div className="flow-panel rounded-[1.6rem] p-4 sm:rounded-[2rem] sm:p-6">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-400">
            Upcoming Session
          </p>
          {todayStatusLabel ? (
            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-orange-300">
              {todayStatusLabel}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">{dayName}</h3>
        <p className="mt-1 text-sm text-gray-400">
          {routineName} | {exercises.length} exercises
        </p>
      </div>

      <div className="mt-6 flex flex-col md:flex-row md:items-start gap-6 sm:gap-8">
        <div className="w-full max-w-[240px] sm:max-w-[280px] md:w-52 lg:w-60 flex-shrink-0 mx-auto md:mx-0">
          <MuscleHeatmap
            exercises={heatmapExercises}
            variant="compact"
            showSetBars={false}
            showScoreLegend={false}
            className="w-full object-contain"
          />
        </div>

        <div className="w-full flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {exercises.slice(0, 3).map((exercise, index) => (
              <div
                key={`${exercise.routineDayExerciseId}-${exercise.exerciseOrder}`}
                className="flex items-center gap-3"
              >
                {exercise.coverUrl ? (
                  <img
                    src={exercise.coverUrl}
                    alt={exercise.exerciseName}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover bg-white/5"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-black text-gray-400">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{exercise.exerciseName}</p>
                  <p className="truncate text-xs text-gray-500 mt-0.5">
                    {exercise.sets.length} sets 
                    {exercise.sets[0]?.targetReps ? ` • ${exercise.sets[0].targetReps} reps` : ""}
                  </p>
                </div>
              </div>
            ))}
            
            {exercises.length > 3 && (
              <div className="flex h-[48px] items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-xs font-bold uppercase tracking-wider text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-gray-400">
                +{exercises.length - 3} more exercises
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={onStart}
          disabled={isAnyPending}
          className="btn-fire flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-[0.14em] shadow-lg transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isStarting ? "Starting..." : "Start"}
        </button>

        <button
          type="button"
          onClick={onSkip}
          disabled={isAnyPending}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-gray-300 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSkipping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SkipForward className="h-4 w-4" />
          )}
          Skip
        </button>

        <button
          type="button"
          onClick={onFreestyle}
          disabled={isAnyPending}
          className="flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-orange-300 transition-all hover:border-orange-500/40 hover:bg-orange-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFreestyleStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Freestyle
        </button>
      </div>
    </div>
  );
}

function NoRoutineCard({ onOpenRoutines }: { onOpenRoutines?: () => void }) {
  return (
    <div className="flow-panel rounded-[2rem] p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-500/10 text-gray-500">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">No Active Routine</h3>
          <p className="mt-2 max-w-lg text-sm text-gray-400">
            Set up a workout routine to start tracking your sessions. You can
            create a routine with custom exercises and workout days.
          </p>
          {onOpenRoutines && (
            <button
              type="button"
              onClick={onOpenRoutines}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-orange-300 transition-colors hover:border-orange-500/40 hover:bg-orange-500/15 hover:text-white"
            >
              <Dumbbell className="h-4 w-4" />
              Set Up Routine
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RestDayCard() {
  return (
    <div className="flow-panel rounded-[2rem] p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <Calendar className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">Rest Day</h3>
          <p className="mt-2 text-sm text-gray-400">
            No workout planned for today. Take this time to recover and come
            back stronger!
          </p>
        </div>
      </div>
    </div>
  );
}

function CompletedCard({
  title,
  exerciseCount,
  completedSets,
  durationSeconds,
}: {
  title: string;
  exerciseCount: number;
  completedSets: number;
  durationSeconds: number | null;
}) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="flow-panel rounded-[2rem] border-emerald-500/20 bg-emerald-500/5 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
            Workout Complete
          </p>
          <h3 className="mt-1 text-xl font-black text-white">{title}</h3>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-400">
            <span>{exerciseCount} exercises</span>
            <span>{completedSets} sets completed</span>
            <span>{formatDuration(durationSeconds)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkippedCard({ title }: { title: string }) {
  return (
    <div className="flow-panel rounded-[2rem] border-gray-500/20 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-500/20 text-gray-400">
          <SkipForward className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
            Session Skipped
          </p>
          <h3 className="mt-1 text-xl font-black text-white">{title}</h3>
          <p className="mt-2 text-sm text-gray-400">
            You skipped this workout. You can still start another workout today.
          </p>
        </div>
      </div>
    </div>
  );
}

function FreestyleButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-orange-300 transition-all hover:border-orange-500/40 hover:bg-orange-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Zap className="h-5 w-5" />
      Start Freestyle
    </button>
  );
}

export default function UpcomingSession({ onOpenRoutines }: UpcomingSessionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showFreestyleDialog, setShowFreestyleDialog] = useState(false);

  const { data: todayData, isLoading, error } = useQuery({
    queryKey: workoutSessionQueryKeys.today(),
    queryFn: getTodayWorkoutSessionApi,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const startSessionMutation = useMutation({
    mutationFn: () => startWorkoutSessionApi({ mode: "ROUTINE" }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() });
      toast.success("Workout started! Let's go! 💪");
      navigate(`/workout-session/${session.routineLogId}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to start session", { description: error.message });
    },
  });

  const startFreestyleMutation = useMutation({
    mutationFn: (title: string) => startWorkoutSessionApi({ mode: "FREESTYLE", title }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() });
      setShowFreestyleDialog(false);
      toast.success("Freestyle session started! 💪");
      navigate(`/workout-session/${session.routineLogId}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to start freestyle session", { description: error.message });
    },
  });

  const skipSessionMutation = useMutation({
    mutationFn: (routineLogId: string) => skipWorkoutSessionApi(routineLogId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() });
      toast.info("Session skipped. You can still start another workout today.");
    },
    onError: (error: Error) => {
      toast.error("Failed to skip session", { description: error.message });
    },
  });

  // For planned sessions, we need to start the session first before we can skip it
  const skipPlannedSessionMutation = useMutation({
    mutationFn: async () => {
      // Start the session first, then immediately skip it
      const session = await startWorkoutSessionApi({ mode: "ROUTINE" });
      await skipWorkoutSessionApi(session.routineLogId, { notes: "Skipped from planned state" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() });
      toast.info("Session skipped. You can still start another workout today.");
    },
    onError: (error: Error) => {
      toast.error("Failed to skip session", { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flow-panel flex items-center justify-center rounded-[2rem] p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (error || !todayData) {
    return (
      <div className="flow-panel rounded-[2rem] p-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load today's workout</span>
        </div>
      </div>
    );
  }

  const { state, session, plannedSession, activeRoutineName } = todayData;
  const isAnyMutationPending = 
    startSessionMutation.isPending || 
    startFreestyleMutation.isPending || 
    skipSessionMutation.isPending ||
    skipPlannedSessionMutation.isPending;

  // State: IN_PROGRESS - Navigate to dedicated workout session page
  if (state === "IN_PROGRESS" && session) {
    // Calculate session progress
    const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const completedSets = session.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
    const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    // Show a card with link to resume the session
    return (
      <div className="flow-panel relative overflow-hidden rounded-[2rem] border-2 border-emerald-500/30 p-6">
        {/* Progress bar background */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/5"
          style={{ width: `${progress}%` }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 text-emerald-400">
              <Dumbbell className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
                In Progress • {completedSets}/{totalSets} sets
              </p>
              <h3 className="mt-1 text-2xl font-black text-white">{session.title}</h3>
              {session.routineName && (
                <p className="mt-1 text-sm text-gray-400">{session.routineName}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/workout-session/${session.routineLogId}`)}
            className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-8 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] hover:shadow-emerald-500/40"
          >
            <Play className="h-5 w-5" />
            Continue Session
          </button>
        </div>
      </div>
    );
  }

  // State: COMPLETED - Show completion summary
  if (state === "COMPLETED" && session) {
    const completedSets = session.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
    return (
      <div>
        <CompletedCard
          title={session.title}
          exerciseCount={session.exercises.length}
          completedSets={completedSets}
          durationSeconds={session.durationSeconds}
        />
        <FreestyleButton
          onClick={() => setShowFreestyleDialog(true)}
          disabled={isAnyMutationPending}
        />
        <FreestyleSessionDialog
          open={showFreestyleDialog}
          onOpenChange={setShowFreestyleDialog}
          onStart={(name) => startFreestyleMutation.mutate(name)}
          isStarting={startFreestyleMutation.isPending}
        />
      </div>
    );
  }

  // State: SKIPPED - Show skipped message
  if (state === "SKIPPED" && session) {
    return (
      <div>
        <SkippedCard title={session.title} />
        <FreestyleButton
          onClick={() => setShowFreestyleDialog(true)}
          disabled={isAnyMutationPending}
        />
        <FreestyleSessionDialog
          open={showFreestyleDialog}
          onOpenChange={setShowFreestyleDialog}
          onStart={(name) => startFreestyleMutation.mutate(name)}
          isStarting={startFreestyleMutation.isPending}
        />
      </div>
    );
  }

  // State: PLANNED - Show start button
  if (state === "PLANNED" && plannedSession) {
    const todayStatusLabel =
      todayData.latestTodayStatus === "COMPLETED"
        ? "Today: Completed"
        : todayData.latestTodayStatus === "SKIPPED"
        ? "Today: Skipped"
        : null;

    return (
      <div>
        <PlannedSessionCard
          routineName={plannedSession.routineName}
          dayName={plannedSession.routineDayName}
          exercises={plannedSession.exercises}
          todayStatusLabel={todayStatusLabel}
          onStart={() => startSessionMutation.mutate()}
          onSkip={() => skipPlannedSessionMutation.mutate()}
          onFreestyle={() => setShowFreestyleDialog(true)}
          isStarting={startSessionMutation.isPending}
          isSkipping={skipPlannedSessionMutation.isPending}
          isFreestyleStarting={startFreestyleMutation.isPending}
        />
        <FreestyleSessionDialog
          open={showFreestyleDialog}
          onOpenChange={setShowFreestyleDialog}
          onStart={(name) => startFreestyleMutation.mutate(name)}
          isStarting={startFreestyleMutation.isPending}
        />
      </div>
    );
  }

  // State: NONE - No routine or rest day
  if (state === "NONE") {
    if (!activeRoutineName) {
      return (
        <div>
          <NoRoutineCard onOpenRoutines={onOpenRoutines} />
          <FreestyleButton
            onClick={() => setShowFreestyleDialog(true)}
            disabled={isAnyMutationPending}
          />
          <FreestyleSessionDialog
            open={showFreestyleDialog}
            onOpenChange={setShowFreestyleDialog}
            onStart={(name) => startFreestyleMutation.mutate(name)}
            isStarting={startFreestyleMutation.isPending}
          />
        </div>
      );
    }
    return (
      <div>
        <RestDayCard />
        <FreestyleButton
          onClick={() => setShowFreestyleDialog(true)}
          disabled={isAnyMutationPending}
        />
        <FreestyleSessionDialog
          open={showFreestyleDialog}
          onOpenChange={setShowFreestyleDialog}
          onStart={(name) => startFreestyleMutation.mutate(name)}
          isStarting={startFreestyleMutation.isPending}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div>
      <NoRoutineCard onOpenRoutines={onOpenRoutines} />
      <FreestyleButton
        onClick={() => setShowFreestyleDialog(true)}
        disabled={isAnyMutationPending}
      />
      <FreestyleSessionDialog
        open={showFreestyleDialog}
        onOpenChange={setShowFreestyleDialog}
        onStart={(name) => startFreestyleMutation.mutate(name)}
        isStarting={startFreestyleMutation.isPending}
      />
    </div>
  );
}

