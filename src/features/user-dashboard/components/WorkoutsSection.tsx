import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock3, Flame, History, Dumbbell } from "lucide-react";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import TodaysWorkout from "@/features/user-dashboard/components/TodaysWorkout";
import WorkoutHistory from "@/features/user-dashboard/components/WorkoutHistory";
import {
  getWorkoutSessionHistoryApi,
  workoutSessionQueryKeys,
} from "@/features/user-dashboard/workoutSessionApi";

interface WorkoutsSectionProps {
  onOpenRoutines?: () => void;
}

type Tab = "today" | "history";

export default function WorkoutsSection({ onOpenRoutines }: WorkoutsSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("today");

  // Fetch history for stats
  const { data: history } = useQuery({
    queryKey: workoutSessionQueryKeys.history(),
    queryFn: getWorkoutSessionHistoryApi,
  });

  // Calculate stats from history
  const stats = (() => {
    if (!history) return { sessionsThisWeek: 0, avgDuration: 0, streak: 0 };

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Sessions this week
    const sessionsThisWeek = history.filter((s) => {
      const date = new Date(s.sessionDate);
      return date >= weekAgo && s.status === "COMPLETED";
    }).length;

    // Average duration (completed sessions only)
    const completedSessions = history.filter(
      (s) => s.status === "COMPLETED" && s.durationSeconds
    );
    const avgDuration =
      completedSessions.length > 0
        ? Math.round(
            completedSessions.reduce(
              (acc, s) => acc + (s.durationSeconds || 0),
              0
            ) /
              completedSessions.length /
              60
          )
        : 0;

    // Calculate streak (consecutive days with completed workouts)
    let streak = 0;
    const sortedHistory = [...history]
      .filter((s) => s.status === "COMPLETED")
      .sort(
        (a, b) =>
          new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
      );

    if (sortedHistory.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let currentDate = today;
      
      for (const session of sortedHistory) {
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

    return { sessionsThisWeek, avgDuration, streak };
  })();

  const workoutStats = [
    {
      label: "Sessions This Week",
      value: stats.sessionsThisWeek.toString().padStart(2, "0"),
      icon: Activity,
      accentClassName: "border-orange-500/20 bg-orange-500/10 text-orange-400",
    },
    {
      label: "Average Duration",
      value: `${stats.avgDuration}m`,
      icon: Clock3,
      accentClassName: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    },
    {
      label: "Active Streak",
      value: `${stats.streak}d`,
      icon: Flame,
      accentClassName: "border-red-500/20 bg-red-500/10 text-red-300",
    },
  ];

  return (
    <UserSectionShell
      title={
        <>
          Workout <span className="text-gradient-fire">Log</span>
        </>
      }
      description="Track your workouts, view your history, and crush your fitness goals."
    >
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {workoutStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flow-panel rounded-[1.75rem] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-black text-white">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${stat.accentClassName}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("today")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === "today"
              ? "bg-orange-500/20 text-orange-300"
              : "text-gray-500 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Dumbbell className="h-4 w-4" />
          Today's Session
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === "history"
              ? "bg-orange-500/20 text-orange-300"
              : "text-gray-500 hover:bg-white/5 hover:text-white"
          }`}
        >
          <History className="h-4 w-4" />
          Workout History
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "today" && (
          <TodaysWorkout onOpenRoutines={onOpenRoutines} />
        )}
        {activeTab === "history" && <WorkoutHistory />}
      </div>
    </UserSectionShell>
  );
}
