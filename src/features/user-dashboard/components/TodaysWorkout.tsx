import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Dumbbell,
  CheckCircle2,
  SkipForward,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import ActiveWorkoutSession from "./ActiveWorkoutSession";
import {
  getTodayWorkoutSessionApi,
  startWorkoutSessionApi,
  workoutSessionQueryKeys,
} from "@/features/user-dashboard/workoutSessionApi";
import type { TodaySessionState } from "@/features/user-dashboard/workoutSessionTypes";

interface TodaysWorkoutProps {
  onOpenRoutines?: () => void;
}

function PlannedSessionCard({
  routineName,
  dayName,
  exerciseCount,
  onStart,
  isStarting,
}: {
  routineName: string;
  dayName: string;
  exerciseCount: number;
  onStart: () => void;
  isStarting: boolean;
}) {
  return (
    <div className="flow-panel rounded-[2rem] p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-400">
            <Dumbbell className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-400">
              Today's Workout
            </p>
            <h3 className="mt-1 text-2xl font-black text-white">{dayName}</h3>
            <p className="mt-1 text-sm text-gray-400">
              {routineName} • {exerciseCount} exercises
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={isStarting}
          className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] hover:shadow-orange-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStarting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          {isStarting ? "Starting..." : "Start Session"}
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
            You skipped today's workout. No worries, get back at it tomorrow!
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TodaysWorkout({ onOpenRoutines }: TodaysWorkoutProps) {
  const queryClient = useQueryClient();

  const { data: todayData, isLoading, error } = useQuery({
    queryKey: workoutSessionQueryKeys.today(),
    queryFn: getTodayWorkoutSessionApi,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const startSessionMutation = useMutation({
    mutationFn: () => startWorkoutSessionApi({ mode: "ROUTINE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() });
      toast.success("Workout started! Let's go! 💪");
    },
    onError: (error: Error) => {
      toast.error("Failed to start session", { description: error.message });
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

  // State: IN_PROGRESS - Show active session with logging UI
  if (state === "IN_PROGRESS" && session) {
    return <ActiveWorkoutSession initialSession={session} />;
  }

  // State: COMPLETED - Show completion summary
  if (state === "COMPLETED" && session) {
    const completedSets = session.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
    return (
      <CompletedCard
        title={session.title}
        exerciseCount={session.exercises.length}
        completedSets={completedSets}
        durationSeconds={session.durationSeconds}
      />
    );
  }

  // State: SKIPPED - Show skipped message
  if (state === "SKIPPED" && session) {
    return <SkippedCard title={session.title} />;
  }

  // State: PLANNED - Show start button
  if (state === "PLANNED" && plannedSession) {
    return (
      <PlannedSessionCard
        routineName={plannedSession.routineName}
        dayName={plannedSession.routineDayName}
        exerciseCount={plannedSession.exercises.length}
        onStart={() => startSessionMutation.mutate()}
        isStarting={startSessionMutation.isPending}
      />
    );
  }

  // State: NONE - No routine or rest day
  if (state === "NONE") {
    if (!activeRoutineName) {
      return <NoRoutineCard onOpenRoutines={onOpenRoutines} />;
    }
    return <RestDayCard />;
  }

  // Fallback
  return <NoRoutineCard onOpenRoutines={onOpenRoutines} />;
}
