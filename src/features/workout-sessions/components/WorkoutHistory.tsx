import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Dumbbell,
  CheckCircle2,
  ChevronRight,
  SkipForward,
  Loader2,
} from "lucide-react";
import {
  getWorkoutSessionHistoryApi,
  getWorkoutSessionApi,
  workoutSessionQueryKeys,
} from "@/features/workout-sessions/workoutSessionApi";
import type {
  WorkoutSessionSummaryResponse,
  WorkoutSessionResponse,
} from "@/features/workout-sessions/workoutSessionTypes";

interface WorkoutHistoryProps {
  onViewSession?: (sessionId: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function SessionCard({
  session,
  onClick,
}: {
  session: WorkoutSessionSummaryResponse;
  onClick?: () => void;
}) {
  const isCompleted = session.status === "COMPLETED";
  const isSkipped = session.status === "SKIPPED";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flow-panel group w-full rounded-2xl p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-4">
        {/* Status Icon */}
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
            isCompleted
              ? "bg-emerald-500/20 text-emerald-400"
              : isSkipped
              ? "bg-gray-500/20 text-gray-400"
              : "bg-orange-500/20 text-orange-400"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : isSkipped ? (
            <SkipForward className="h-6 w-6" />
          ) : (
            <Dumbbell className="h-6 w-6" />
          )}
        </div>

        {/* Session Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-base font-bold text-white">
              {session.title}
            </h4>
            {session.mode === "FREESTYLE" && (
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Freestyle
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(session.sessionDate)}
            </span>
            {session.durationSeconds && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(session.durationSeconds)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3.5 w-3.5" />
              {session.exerciseCount} exercises
            </span>
          </div>
        </div>

        {/* Sets completed */}
        <div className="text-right">
          <p className="text-lg font-bold text-white">
            {session.completedSetCount}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            Sets
          </p>
        </div>

        <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-600 transition-colors group-hover:text-white" />
      </div>
    </button>
  );
}

function SessionDetail({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const { data: session, isLoading } = useQuery({
    queryKey: workoutSessionQueryKeys.detail(sessionId),
    queryFn: () => getWorkoutSessionApi(sessionId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
            {formatDate(session.sessionDate)}
          </p>
          <h3 className="mt-1 text-xl font-black text-white">{session.title}</h3>
          {session.routineName && (
            <p className="text-sm text-gray-400">{session.routineName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-400 hover:bg-white/10 hover:text-white"
        >
          Back
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-lg font-bold text-white">
            {session.exercises.length}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            Exercises
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-lg font-bold text-white">
            {session.exercises.reduce(
              (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
              0
            )}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            Sets Done
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-lg font-bold text-white">
            {formatDuration(session.durationSeconds)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            Duration
          </p>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {session.exercises.map((exercise, idx) => (
          <div
            key={exercise.routineLogExerciseId}
            className="flow-panel rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-sm font-bold text-orange-400">
                {idx + 1}
              </div>
              {exercise.coverUrl ? (
                <img
                  src={exercise.coverUrl}
                  alt={exercise.exerciseName}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-gray-400">
                  {exercise.exerciseName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-white">{exercise.exerciseName}</h4>
                <p className="text-sm text-gray-500">
                  {exercise.sets.filter((s) => s.completed).length}/
                  {exercise.sets.length} sets
                </p>
              </div>
            </div>

            {/* Set summary */}
            <div className="mt-3 space-y-1">
              {exercise.sets
                .filter((s) => s.completed)
                .map((set) => (
                  <div
                    key={set.routineLogSetId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-gray-400">Set {set.setOrder}:</span>
                    {set.actualWeight && (
                      <span className="text-white">{set.actualWeight}kg</span>
                    )}
                    {set.actualReps && (
                      <span className="text-white">× {set.actualReps} reps</span>
                    )}
                    {set.actualDurationSeconds && (
                      <span className="text-white">
                        {Math.floor(set.actualDurationSeconds / 60)}:
                        {(set.actualDurationSeconds % 60)
                          .toString()
                          .padStart(2, "0")}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {session.notes && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
            Session Notes
          </p>
          <p className="mt-2 text-sm text-gray-300">{session.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function WorkoutHistory({ onViewSession }: WorkoutHistoryProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: history, isLoading, error } = useQuery({
    queryKey: workoutSessionQueryKeys.history(),
    queryFn: getWorkoutSessionHistoryApi,
  });

  const handleViewSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    onViewSession?.(sessionId);
  }, [onViewSession]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 p-4 text-center text-red-300">
        Failed to load workout history
      </div>
    );
  }

  if (selectedSessionId) {
    return (
      <SessionDetail
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flow-panel rounded-2xl p-8 text-center">
        <Dumbbell className="mx-auto h-12 w-12 text-gray-600" />
        <h3 className="mt-4 text-lg font-bold text-white">No workout history</h3>
        <p className="mt-2 text-sm text-gray-500">
          Your completed workouts will appear here
        </p>
      </div>
    );
  }

  // Group by date
  const groupedHistory = history.reduce((acc, session) => {
    const date = session.sessionDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, WorkoutSessionSummaryResponse[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedHistory).map(([date, sessions]) => (
        <div key={date}>
          <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
            {formatDate(date)}
          </h4>
          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionCard
                key={session.routineLogId}
                session={session}
                onClick={() => handleViewSession(session.routineLogId)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

