import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Clock3,
  Flame,
  Dumbbell,
  CheckCircle2,
  SkipForward,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Trash2,
  MoreVertical,
  Eye,
  Trophy,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import UpcomingSession from "@/features/workout-sessions/components/UpcomingSession";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { cn } from "@/shared/lib/utils";
import {
  getWorkoutInsightsApi,
  getWorkoutSessionHistoryApi,
  getWorkoutSessionHistoryPaginatedApi,
  getWorkoutSessionApi,
  deleteWorkoutSessionApi,
  workoutSessionQueryKeys,
} from "@/features/workout-sessions/workoutSessionApi";
import type {
  WorkoutInsightRange,
  WorkoutSessionSummaryResponse,
} from "@/features/workout-sessions/workoutSessionTypes";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { getApiErrorMessage } from "@/shared/api/client";

interface WorkoutsSectionProps {
  onOpenRoutines?: () => void;
}

type Tab = "upcoming" | "history" | "insights";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

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
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

  const totalVolume = session.exercises.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets
      .filter((set) => set.completed && set.actualWeight && set.actualReps)
      .reduce((sum, set) => sum + (set.actualWeight! * set.actualReps!), 0);
    return total + exerciseVolume;
  }, 0);

  return (
    <div className="space-y-4">
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
          className="flow-button-secondary rounded-xl px-4 py-2 text-sm"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="flow-panel rounded-2xl p-3 text-center">
          <p className="text-lg font-bold text-white">{session.exercises.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Exercises</p>
        </div>
        <div className="flow-panel rounded-2xl p-3 text-center">
          <p className="text-lg font-bold text-white">
            {session.exercises.reduce(
              (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
              0
            )}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Sets Done</p>
        </div>
        <div className="flow-panel rounded-2xl p-3 text-center">
          <p className="text-lg font-bold text-white">
            {formatDuration(session.durationSeconds)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Duration</p>
        </div>
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3 text-center">
          <p className="text-lg font-bold text-orange-400">
            {totalVolume > 0 ? totalVolume.toLocaleString() : "-"}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-orange-400/70">Volume (kg)</p>
        </div>
      </div>

      <div className="space-y-3">
        {session.exercises.map((exercise, idx) => (
          <div key={exercise.routineLogExerciseId} className="flow-panel rounded-2xl p-4">
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
                  {exercise.sets.filter((s) => s.completed).length}/{exercise.sets.length} sets
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {exercise.sets
                .filter((s) => s.completed)
                .map((set) => (
                  <div key={set.routineLogSetId} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-gray-400">Set {set.setOrder}:</span>
                    {set.actualWeight && <span className="text-white">{set.actualWeight}kg</span>}
                    {set.actualReps && <span className="text-white">× {set.actualReps} reps</span>}
                    {set.actualDurationSeconds && (
                      <span className="text-white">
                        {Math.floor(set.actualDurationSeconds / 60)}:
                        {(set.actualDurationSeconds % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {session.notes && (
        <div className="flow-panel rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
            Session Notes
          </p>
          <p className="mt-2 text-sm text-gray-300">{session.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function WorkoutsSection({ onOpenRoutines }: WorkoutsSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [insightRange, setInsightRange] = useState<WorkoutInsightRange>("7d");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSessionSummaryResponse | null>(null);
  const pageSize = 10;
  const queryClient = useQueryClient();

  const { data: history } = useQuery({
    queryKey: workoutSessionQueryKeys.history(),
    queryFn: getWorkoutSessionHistoryApi,
  });

  const { data: historyPage, isLoading: isHistoryLoading } = useQuery({
    queryKey: workoutSessionQueryKeys.historyPaginated(page, pageSize),
    queryFn: () => getWorkoutSessionHistoryPaginatedApi(page, pageSize),
  });

  const {
    data: insightsData,
    isLoading: isInsightsLoading,
    isError: isInsightsError,
    error: insightsError,
  } = useQuery({
    queryKey: workoutSessionQueryKeys.insights(insightRange),
    queryFn: () => getWorkoutInsightsApi(insightRange),
    enabled: activeTab === "insights",
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkoutSessionApi,
    onSuccess: () => {
      toast.success("Workout deleted");
      queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.all });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to delete workout", { description: error.message });
    },
  });

  const handleViewSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
  }, []);

  const handleDelete = useCallback((session: WorkoutSessionSummaryResponse) => {
    setDeleteTarget(session);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.routineLogId);
    }
  }, [deleteTarget, deleteMutation]);

  // Stats from history — only COMPLETED sessions count
  const stats = (() => {
    if (!history) return { totalCompleted: 0, sessionsThisWeek: 0, avgDuration: 0, streak: 0 };

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const completedSessions = history.filter((s) => s.status === "COMPLETED");

    const totalCompleted = completedSessions.length;

    const sessionsThisWeek = completedSessions.filter((s) => {
      const date = new Date(s.sessionDate);
      return date >= weekAgo;
    }).length;

    const withDuration = completedSessions.filter((s) => s.durationSeconds);
    const avgDuration =
      withDuration.length > 0
        ? Math.round(
            withDuration.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) /
              withDuration.length /
              60
          )
        : 0;

    let streak = 0;
    const sorted = [...completedSessions].sort(
      (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    );

    if (sorted.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let currentDate = today;

      for (const session of sorted) {
        const sessionDate = new Date(session.sessionDate);
        sessionDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor(
          (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays <= 1) {
          streak++;
          currentDate = sessionDate;
        } else {
          break;
        }
      }
    }

    return { totalCompleted, sessionsThisWeek, avgDuration, streak };
  })();

  const workoutStats = [
    {
      label: "Completed",
      value: stats.totalCompleted.toString().padStart(2, "0"),
      icon: Trophy,
      accentClassName: "border-orange-600/20 bg-orange-600/[0.08] text-orange-500",
    },
    {
      label: "This Week",
      value: stats.sessionsThisWeek.toString().padStart(2, "0"),
      icon: Activity,
      accentClassName: "border-orange-600/20 bg-orange-600/[0.08] text-orange-500",
    },
    {
      label: "Avg Duration",
      value: `${stats.avgDuration}m`,
      icon: Clock3,
      accentClassName: "border-orange-600/20 bg-orange-600/[0.08] text-orange-500",
    },
    {
      label: "Streak",
      value: `${stats.streak}d`,
      icon: Flame,
      accentClassName: "border-orange-600/20 bg-orange-600/[0.08] text-orange-500",
    },
  ];

  const insightChartData = insightsData?.chartData ?? [];
  const hasInsightValues = insightChartData.some(
    (bucket) =>
      bucket.completed > 0 ||
      bucket.skipped > 0 ||
      bucket.sets > 0 ||
      Number(bucket.volume ?? 0) > 0
  );

  // Group history by date
  const groupedHistory = historyPage?.items.reduce((acc, session) => {
    const date = session.sessionDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, WorkoutSessionSummaryResponse[]>);

  if (selectedSessionId) {
    return (
      <UserSectionShell
        title={
          <>
            Session <span className="text-gradient-fire">Detail</span>
          </>
        }
        description="Review your workout performance and progress."
        width="wide"
        className="fade-up"
        bodyClassName="space-y-5"
      >
        <SessionDetail
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      </UserSectionShell>
    );
  }

  return (
    <UserSectionShell
      title={
        <>
          Workout <span className="text-gradient-fire">Log</span>
        </>
      }
      description="Track your workouts, view your history, and crush your fitness goals."
      width="wide"
      className="fade-up"
      bodyClassName="space-y-5"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {workoutStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400 sm:text-[10px]">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-mono text-[17px] font-bold text-white sm:text-[19px]">{stat.value}</p>
                </div>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${stat.accentClassName} sm:h-8 sm:w-8`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="mb-5 sm:mb-6">
          <TabsList className="flex h-auto w-full max-w-full gap-0 overflow-x-auto border-b border-white/10 bg-transparent p-0 px-2 sm:w-fit sm:rounded-full sm:border sm:bg-black/40 sm:p-1 sm:backdrop-blur-sm">
            {(
              [
                { id: "upcoming", label: "Upcoming Session", mobileLabel: "Today", icon: Dumbbell },
                { id: "history", label: "Workout Logs", mobileLabel: "History", icon: Calendar },
                { id: "insights", label: "Insights", mobileLabel: "Insights", icon: BarChart3 },
              ] as const
            ).map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "group relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[9px] font-bold uppercase tracking-wider",
                  "text-slate-400 hover:text-white sm:flex-initial sm:rounded-full sm:px-5 sm:py-2.5 sm:text-[10px]",
                  "sm:hover:bg-white/5",
                  "data-[state=active]:text-orange-500 data-[state=active]:sm:bg-orange-600 data-[state=active]:sm:text-white",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                )}
              >
                <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span
                  className="absolute inset-x-0 bottom-0 hidden h-[2px] bg-orange-500 group-data-[state=active]:block sm:!hidden"
                  aria-hidden
                />
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {activeTab === "upcoming" && <UpcomingSession onOpenRoutines={onOpenRoutines} />}

        {activeTab === "history" &&
          (isHistoryLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
            </div>
          ) : !historyPage || historyPage.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] py-12">
              <Dumbbell className="h-12 w-12 text-gray-600" />
              <h4 className="mt-4 text-lg font-bold text-white">No workout history</h4>
              <p className="mt-2 text-sm text-gray-500">
                Your completed workouts will appear here
              </p>
            </div>
          ) : (
            <div className="flow-panel space-y-5 rounded-[1.6rem] p-4 sm:rounded-[2rem] sm:p-6">
              {Object.entries(groupedHistory ?? {}).map(([date, sessions]) => (
                <div key={date}>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                    {formatDate(date)}
                  </p>
                  <div className="space-y-2">
                    {sessions.map((session) => {
                      const isCompleted = session.status === "COMPLETED";
                      const isSkipped = session.status === "SKIPPED";
                      const isInProgress = session.status === "IN_PROGRESS";

                      return (
                        <div
                          key={session.routineLogId}
                          className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/15 hover:bg-white/[0.04]"
                        >
                          <button
                            type="button"
                            onClick={() => handleViewSession(session.routineLogId)}
                            className="flex w-full items-center gap-4 text-left"
                          >
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
                                {isCompleted && (
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                    Complete
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                {session.routineName && (
                                  <span className="text-gray-400">{session.routineName}</span>
                                )}
                                {session.durationSeconds && (
                                  <span className="flex items-center gap-1">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {formatDuration(session.durationSeconds)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Dumbbell className="h-3.5 w-3.5" />
                                  {session.exerciseCount} exercises
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-lg font-bold text-white">
                                {session.completedSetCount}
                              </p>
                              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                                Sets
                              </p>
                            </div>

                            <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-600 transition-colors group-hover:text-white" />
                          </button>

                          {!isInProgress && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-500 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100"
                                  title="More options"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewSession(session.routineLogId);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(session);
                                  }}
                                  className="flex items-center gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Workout
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {historyPage.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={!historyPage.hasPrevious}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {page + 1} of {historyPage.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!historyPage.hasNext}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}

        {activeTab === "insights" && (
          <div className="flow-panel space-y-4 rounded-[1.6rem] p-4 sm:rounded-[2rem] sm:p-6">
            <div className="flex overflow-x-auto items-center gap-2 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { key: "7d" as const, label: "Last 7 Days" },
                { key: "30d" as const, label: "Last Month" },
                { key: "all" as const, label: "All Time" },
              ].map((range) => (
                <button
                  key={range.key}
                  type="button"
                  onClick={() => setInsightRange(range.key)}
                  className={`flex-shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all ${
                    insightRange === range.key
                      ? "bg-orange-500/20 text-orange-300"
                      : "text-gray-500 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {isInsightsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
              </div>
            ) : isInsightsError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {getApiErrorMessage(insightsError, "Failed to load workout insights")}
              </div>
            ) : !hasInsightValues ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-gray-400">
                No workout insight data in this range yet. Complete a few sessions and refresh insights.
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                    Sessions (Completed vs Skipped)
                  </p>
                  <div className="mt-3 h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insightChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="label" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          contentStyle={{
                            background: "rgba(15,15,15,0.98)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="completed" radius={[8, 8, 0, 0]} fill="#34d399" name="Completed" />
                        <Bar dataKey="skipped" radius={[8, 8, 0, 0]} fill="#9ca3af" name="Skipped" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                    Sets and Volume
                  </p>
                  <div className="mt-3 h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insightChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="label" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          contentStyle={{
                            background: "rgba(15,15,15,0.98)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="sets" radius={[8, 8, 0, 0]} fill="#60a5fa" name="Completed Sets" />
                        <Bar dataKey="volume" radius={[8, 8, 0, 0]} fill="#f59e0b" name="Volume (kg)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}" and all its exercises and sets.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UserSectionShell>
  );
}
