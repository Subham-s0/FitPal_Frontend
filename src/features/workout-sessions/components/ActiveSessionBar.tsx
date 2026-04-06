import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, Dumbbell } from "lucide-react";
import {
  getTodayWorkoutSessionApi,
  workoutSessionQueryKeys,
} from "@/features/workout-sessions/workoutSessionApi";

/**
 * Compact bar that shows when a workout session is IN_PROGRESS
 * Appears at the top of pages (except the session page itself)
 * Allows quick return to the active session
 */
export function ActiveSessionBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on the workout session page itself
  const isOnSessionPage = location.pathname.startsWith("/workout-session");

  const { data: todaySession, isLoading } = useQuery({
    queryKey: workoutSessionQueryKeys.today(),
    queryFn: getTodayWorkoutSessionApi,
    refetchInterval: 30000,
    staleTime: 10000,
    enabled: !isOnSessionPage,
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const session = todaySession?.session;
  const isInProgress = todaySession?.state === "IN_PROGRESS" && session;

  useEffect(() => {
    if (!isInProgress || !session?.startedAt) return;

    const startTime = new Date(session.startedAt).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isInProgress, session?.startedAt]);

  const formattedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [elapsedSeconds]);

  if (isOnSessionPage || isLoading || !isInProgress || !session) {
    return null;
  }

  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <div className="fixed left-0 right-0 top-16 z-[90] md:top-20">
      <div className="relative overflow-hidden border-b border-emerald-500/30 bg-gradient-to-r from-emerald-900/95 via-emerald-800/95 to-green-900/95 backdrop-blur-md">
        <div
          className="absolute inset-y-0 left-0 bg-emerald-500/20 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />

        <div className="relative mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
              <Dumbbell className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {session.title}
              </p>
              <p className="text-[10px] text-emerald-300/80">
                {completedSets}/{totalSets} sets • {formattedTime}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/workout-session/${session.routineLogId}`)}
            className="flex flex-shrink-0 items-center gap-2 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 hover:bg-emerald-400"
          >
            <Play className="h-3 w-3" />
            <span className="hidden sm:inline">Resume</span>
          </button>
        </div>
      </div>
    </div>
  );
}
