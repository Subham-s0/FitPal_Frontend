import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import { CheckInScreen } from "@/features/check-in";
import { ExercisesScreen } from "@/features/exercises";
import { GymsScreen } from "@/features/gyms";
import MuscleHeatmap from "@/features/routines/components/MuscleHeatmap";
import RoutineFlow from "@/features/routines/components/RoutineFlow";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import {
  dashboardQueryKeys,
  getDashboardMonthlyActivityApi,
  getDashboardSummaryApi,
  getDashboardVisitStatsApi,
} from "@/features/user-dashboard/api";
import type {
  DashboardMemberStatsResponse,
  DashboardMonthlyActivityDayResponse,
  DashboardMonthlyActivityResponse,
  DashboardPlanCardResponse,
  DashboardRoutineHeatmapResponse,
  DashboardTopFacilityResponse,
  DashboardUpcomingSessionResponse,
  DashboardVisitRangeType,
} from "@/features/user-dashboard/model";
import WorkoutsSection from "@/features/workout-sessions/components/WorkoutsSection";
import {
  startWorkoutSessionApi,
  workoutSessionQueryKeys,
} from "@/features/workout-sessions/workoutSessionApi";
import { getApiErrorMessage } from "@/shared/api/client";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Map,
  MapPinned,
  Maximize2,
  Pause,
  Play,
  QrCode,
  Search,
  TrendingUp,
} from "lucide-react";

type UserDashboardSection = "home" | "gyms" | "routines" | "exercises" | "workouts" | "checkin" | "progress" | "profile";
type MemberStatsRange = "week" | "month" | "year";
type CheckInView = "scanner" | "logs";

const USER_SECTIONS: UserDashboardSection[] = ["home", "gyms", "routines", "exercises", "workouts", "checkin", "progress", "profile"];
const ACTIVITY_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const resolveSection = (value: string | undefined): UserDashboardSection =>
  USER_SECTIONS.includes(value as UserDashboardSection) ? (value as UserDashboardSection) : "home";

const formatEnumLabel = (value: string | null | undefined) =>
  value ? value.replaceAll("_", " ") : null;

const formatIsoDate = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return SHORT_DATE_FORMATTER.format(parsed);
};

const parseLocalDate = (value: string) => new Date(`${value}T00:00:00`);

const toActivityMonthParts = (value: Date) => ({
  year: value.getFullYear(),
  month: value.getMonth() + 1,
});

const toDashboardVisitRangeType = (value: MemberStatsRange): DashboardVisitRangeType => {
  switch (value) {
    case "week":
      return "WEEK";
    case "year":
      return "YEAR";
    case "month":
    default:
      return "MONTH";
  }
};

const toWeekStartIso = (value: Date) => {
  const start = new Date(value);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start.toISOString().slice(0, 10);
};

const buildActivityCellClass = (displayState: DashboardMonthlyActivityDayResponse["displayState"]) => {
  let classes =
    "flex h-[90%] w-[90%] cursor-pointer items-center justify-center rounded-[10px] text-[11px] font-black transition-all duration-200 lg:h-[82%] lg:w-[82%] lg:rounded-[8px] lg:text-[10px]";

  if (displayState === "SUCCESS") {
    classes +=
      " border border-green-500/25 bg-green-500/[0.08] text-green-500 shadow-[inset_0_0_10px_rgba(74,222,128,0.05)] hover:scale-[1.08] hover:-rotate-[4deg] hover:border-green-400/40";
  } else if (displayState === "MISSED") {
    classes +=
      " border border-red-500/20 bg-red-500/[0.06] text-red-400 hover:scale-[1.08] hover:-rotate-[4deg] hover:border-red-300/35";
  } else if (displayState === "TODAY") {
    classes +=
      " border-2 border-orange-600 bg-gradient-to-br from-orange-600 to-yellow-400 text-black shadow-[0_0_15px_rgba(234,88,12,0.5)]";
  } else {
    classes +=
      " border border-white/5 bg-white/[0.02] text-white/15 hover:scale-[1.08] hover:-rotate-[4deg] hover:border-white/20";
  }

  return classes;
};

const formatActivityTitle = (day: DashboardMonthlyActivityDayResponse) =>
  `${SHORT_DATE_FORMATTER.format(parseLocalDate(day.date))} • ${day.displayState}`;

const calculateStreaks = (days: DashboardMonthlyActivityDayResponse[]) => {
  const completedWindow = days.filter((day) => day.displayState !== "FUTURE");

  let currentStreak = 0;
  for (let index = completedWindow.length - 1; index >= 0; index -= 1) {
    if (completedWindow[index].displayState !== "SUCCESS") {
      break;
    }
    currentStreak += 1;
  }

  let maxStreak = 0;
  let running = 0;
  for (const day of completedWindow) {
    if (day.displayState === "SUCCESS") {
      running += 1;
      if (running > maxStreak) {
        maxStreak = running;
      }
    } else {
      running = 0;
    }
  }

  return { currentStreak, maxStreak };
};

const getPlanBadgeLabel = (planCard: DashboardPlanCardResponse) => {
  if (planCard.durationDays && planCard.durationDays > 0) {
    return `${planCard.durationDays}-DAY`;
  }

  return (
    formatEnumLabel(planCard.billingCycle) ??
    formatEnumLabel(planCard.subscriptionStatus) ??
    "NO PLAN"
  );
};

const getPlanEndDate = (planCard: DashboardPlanCardResponse) =>
  planCard.currentAccessEndsAt ?? planCard.totalPaidCoverageEndsAt ?? planCard.nextMembershipStartsAt;

const getComparisonTone = (comparisonLabel: string | null | undefined) => {
  if (!comparisonLabel || comparisonLabel.startsWith("0.0%")) {
    return {
      className: "text-white/50",
      Icon: TrendingUp,
    };
  }

  if (comparisonLabel.startsWith("-")) {
    return {
      className: "text-red-400",
      Icon: ArrowDownCircle,
    };
  }

  return {
    className: "text-green-500",
    Icon: ArrowUpCircle,
  };
};

const getUpcomingSessionActionLabel = (card: DashboardUpcomingSessionResponse | null) => {
  if (!card) {
    return "Start Upcoming Session";
  }

  switch (card.state) {
    case "IN_PROGRESS":
      return "Resume Session";
    case "EMPTY":
      return "Open Routines";
    case "PLANNED":
    default:
      return "Start Upcoming Session";
  }
};

const toHeatmapExercises = (card: DashboardRoutineHeatmapResponse | null) =>
  (card?.exercises ?? []).map((exercise) => ({
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    sets: Array.from({ length: exercise.setCount }, (_, index) => ({
      id: `${exercise.exerciseName}-${index + 1}`,
      setOrder: index + 1,
      targetWeight: null,
      targetReps: null,
      targetDurationSeconds: null,
      targetDistance: null,
      targetRestSeconds: null,
    })),
  }));

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const requestedSection = (location.state as { activeSection?: string } | null)?.activeSection;
  const requestedCheckInView = (location.state as { checkInView?: CheckInView } | null)?.checkInView;
  const [activeSection, setActiveSection] = useState<UserDashboardSection>(() => resolveSection(requestedSection));
  const [checkInView, setCheckInView] = useState<CheckInView>(requestedCheckInView ?? "scanner");
  const [activityMonth, setActivityMonth] = useState<Date>(new Date());
  const [memberStatsRange, setMemberStatsRange] = useState<MemberStatsRange>("month");
  const [isRoutineDetailView, setIsRoutineDetailView] = useState(false);

  useEffect(() => {
    if (!requestedSection) return;
    setActiveSection(resolveSection(requestedSection));
  }, [requestedSection]);

  useEffect(() => {
    if (!requestedCheckInView) return;
    setCheckInView(requestedCheckInView);
  }, [requestedCheckInView]);

  useEffect(() => {
    if (activeSection !== "routines") {
      setIsRoutineDetailView(false);
    }
  }, [activeSection]);
  const isHomeVisible = activeSection === "home" || activeSection === "progress";
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const weekStart = toWeekStartIso(currentDate);
  const selectedActivityMonth = toActivityMonthParts(activityMonth);

  const summaryQuery = useQuery({
    queryKey: dashboardQueryKeys.summary(),
    queryFn: getDashboardSummaryApi,
    enabled: isHomeVisible,
  });

  const isSummaryActivityMonthSelected =
    summaryQuery.data?.monthlyActivityCard.year === selectedActivityMonth.year &&
    summaryQuery.data?.monthlyActivityCard.month === selectedActivityMonth.month;

  const monthlyActivityQuery = useQuery({
    queryKey: dashboardQueryKeys.monthlyActivity(
      selectedActivityMonth.year,
      selectedActivityMonth.month
    ),
    queryFn: () =>
      getDashboardMonthlyActivityApi({
        year: selectedActivityMonth.year,
        month: selectedActivityMonth.month,
      }),
    enabled: isHomeVisible && summaryQuery.isSuccess && !isSummaryActivityMonthSelected,
    placeholderData: (previousData) => previousData,
  });

  const visitRangeType = toDashboardVisitRangeType(memberStatsRange);
  const memberStatsQuery = useQuery({
    queryKey: dashboardQueryKeys.visits({
      rangeType: visitRangeType,
      year: currentYear,
      month: currentMonth,
      weekStart,
    }),
    queryFn: () =>
      getDashboardVisitStatsApi({
        rangeType: visitRangeType,
        year: currentYear,
        month: currentMonth,
        weekStart,
      }),
    enabled: isHomeVisible && summaryQuery.isSuccess && memberStatsRange !== "month",
    placeholderData: (previousData) => previousData,
  });

  const startUpcomingSessionMutation = useMutation({
    mutationFn: (payload: { routineId?: string | null; routineDayId?: string | null }) =>
      startWorkoutSessionApi({
        mode: "ROUTINE",
        ...(payload.routineId ? { routineId: payload.routineId } : {}),
        ...(payload.routineDayId ? { routineDayId: payload.routineDayId } : {}),
      }),
    onSuccess: async (session) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: workoutSessionQueryKeys.today() }),
        queryClient.invalidateQueries({ queryKey: ["todayWorkoutSession"] }),
      ]);
      toast.success("Workout started.");
      navigate(`/workout-session/${session.routineLogId}`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to start workout"));
    },
  });

  const summary = summaryQuery.data ?? null;
  const activityCard: DashboardMonthlyActivityResponse | null = isSummaryActivityMonthSelected
    ? summary?.monthlyActivityCard ?? null
    : monthlyActivityQuery.data ?? null;
  const memberStats: DashboardMemberStatsResponse | null =
    memberStatsRange === "month" ? summary?.memberStatsCard ?? null : memberStatsQuery.data ?? null;
  const planCard = summary?.planCard ?? null;
  const upcomingSessionCard = summary?.upcomingSessionCard ?? null;
  const routineHeatmapCard = summary?.routineHeatmapCard ?? null;
  const heatmapExercises = toHeatmapExercises(routineHeatmapCard);
  const streaks = calculateStreaks(activityCard?.days ?? []);
  const topFacilities = memberStats?.topFacilities ?? [];
  const topFacilityCount = topFacilities[0]?.visitCount ?? 0;
  const comparisonTone = getComparisonTone(memberStats?.comparisonLabel);
  const comparisonLabel = memberStats?.comparisonLabel ?? "0.0% VS LAST MONTH";
  const planProgress = Math.min(Math.max(planCard?.progressPercent ?? 0, 0), 100);
  const planRingCircumference = 414.6;
  const planRingDashOffset = planRingCircumference * (1 - planProgress / 100);
  const planEndDateLabel = planCard ? formatIsoDate(getPlanEndDate(planCard)) : "-";
  const planNameLabel = planCard?.planName ?? "No Active Plan";
  const planMetaLabel =
    formatEnumLabel(planCard?.planType) ??
    formatEnumLabel(planCard?.billingCycle) ??
    "Not active";
  const memberStatsSubtitle = memberStats
    ? `${memberStats.successfulVisits} successful | ${memberStats.deniedVisits} denied | ${memberStats.uniqueGyms} gyms`
    : null;

  const openMembership = () => navigate("/membership");

  const openMembershipDetails = () => navigate("/profile?tab=membership");

  const openVisitHistory = () => {
    setCheckInView("logs");
    setActiveSection("checkin");
  };

  const handleUpcomingSessionAction = () => {
    if (!upcomingSessionCard) {
      return;
    }

    if (upcomingSessionCard.state === "IN_PROGRESS" && upcomingSessionCard.routineLogId) {
      navigate(`/workout-session/${upcomingSessionCard.routineLogId}`);
      return;
    }

    if (upcomingSessionCard.state === "PLANNED") {
      startUpcomingSessionMutation.mutate({
        routineId: upcomingSessionCard.routineId,
        routineDayId: upcomingSessionCard.routineDayId,
      });
      return;
    }

    setActiveSection("routines");
  };

  const renderHome = () => {
    if (summaryQuery.isLoading && !summary) {
      return (
        <UserSectionShell
          title={
            <>
              Member <span className="text-gradient-fire">Dashboard</span>
            </>
          }
          description="All your widgets combined in one place."
          width="wide"
          className="fade-up"
          bodyClassName="space-y-5"
        >
          <div className="flex min-h-[360px] items-center justify-center rounded-[36px] border border-white/5 bg-[#111]">
            <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.14em] text-white/60">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              Loading dashboard
            </div>
          </div>
        </UserSectionShell>
      );
    }

    if (summaryQuery.isError || !summary) {
      return (
        <UserSectionShell
          title={
            <>
              Member <span className="text-gradient-fire">Dashboard</span>
            </>
          }
          description="All your widgets combined in one place."
          width="wide"
          className="fade-up"
          bodyClassName="space-y-5"
        >
          <div className="rounded-[36px] border border-red-500/20 bg-red-500/5 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-300">
              <AlertCircle className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-black uppercase tracking-[0.12em] text-white">
              Dashboard could not be loaded
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-white/55">
              {getApiErrorMessage(summaryQuery.error, "Try refreshing the page.")}
            </p>
            <button
              type="button"
              onClick={() => void summaryQuery.refetch()}
              className="btn-fire mt-6 rounded-[14px] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white"
            >
              Retry
            </button>
          </div>
        </UserSectionShell>
      );
    }

    return (
      <UserSectionShell
        title={
          <>
            Member <span className="text-gradient-fire">Dashboard</span>
          </>
        }
        description="All your widgets combined in one place."
        width="wide"
        className="fade-up"
        bodyClassName="space-y-5"
      >
      {/* Top Row Grid - 3 columns on desktop, 1 on mobile */}
      <div className="top-sys mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Gym Access Card */}
        <div className="card flex flex-col rounded-[36px] border border-white/5 bg-[linear-gradient(165deg,#1e120a,#000)] p-6 lg:min-h-[372px] lg:p-5">
          <div className="mb-3 flex flex-wrap align-center items-center gap-3 lg:mb-2.5 lg:gap-2.5">
            <MapPinned className="h-7 w-7 shrink-0 text-orange-600 lg:h-6 lg:w-6" />
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">
              Gym <span className="text-gradient-fire">Access</span>
            </h2>
          </div>
          <p className="mb-8 text-base font-light text-white/50 lg:mb-5 lg:text-[15px]">
            Find nearby facilities & check-in
          </p>

          <div className="mt-1 flex flex-1 flex-col gap-6 lg:gap-6">
            <div
              className="relative flex min-h-[196px] flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-orange-600/10 bg-[rgba(45,26,15,0.6)] lg:min-h-[198px]"
              onClick={() => {
                setCheckInView("scanner");
                setActiveSection("checkin");
              }}
              title="Click to Check In"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.18),transparent_65%)] opacity-45" />
              <div className="absolute inset-8 z-10 flex items-center justify-center gap-8 lg:inset-10 lg:gap-9">
                <Map className="h-20 w-20 text-orange-600/90 lg:h-[74px] lg:w-[74px]" />
                <div className="h-14 w-0.5 bg-orange-600/30 lg:h-12" />
                <QrCode className="h-20 w-20 text-orange-600/90 lg:h-[74px] lg:w-[74px]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCheckInView("scanner");
                  setActiveSection("checkin");
                }}
                className="btn-fire flex items-center justify-center gap-2.5 rounded-[14px] px-4 py-4 text-sm font-black text-white lg:py-3.5 lg:text-[13px]"
              >
                <Maximize2 className="h-[18px] w-[18px]" /> Check-In
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("gyms")}
                className="btn-ghost flex items-center justify-center gap-2.5 rounded-[14px] border border-white/15 px-4 py-4 text-sm font-black text-white lg:py-3.5 lg:text-[13px]"
              >
                <Search className="h-[18px] w-[18px]" /> Find Gyms
              </button>
            </div>
          </div>
        </div>

        <div className="card relative flex flex-col overflow-hidden rounded-[40px] border border-white/[0.06] bg-[#111] p-7 lg:min-h-[372px] lg:px-5 lg:py-4">
          <div className="pointer-events-none absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.05)_0%,transparent_70%)]" />

          <div className="mb-6 lg:mb-3">
            <h3 className="mb-4 text-left text-2xl font-black uppercase tracking-[-0.03em] lg:mb-2 lg:text-[20px]">
              Monthly <span className="text-gradient-fire">Activity</span>
            </h3>
            <div className="flex w-full justify-center">
              <div className="inline-flex min-w-[160px] items-center justify-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 lg:min-w-[136px] lg:gap-2 lg:px-2.5 lg:py-1">
                <button
                  type="button"
                  onClick={() => {
                    const nextMonth = new Date(activityMonth);
                    nextMonth.setMonth(nextMonth.getMonth() - 1);
                    setActivityMonth(nextMonth);
                  }}
                  className="flex border-none bg-transparent p-0 text-white/30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em] text-white lg:text-[10px]">
                  {ACTIVITY_MONTH_FORMATTER.format(activityMonth)}
                  {monthlyActivityQuery.isFetching && !isSummaryActivityMonthSelected ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextMonth = new Date(activityMonth);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    setActivityMonth(nextMonth);
                  }}
                  className="flex border-none bg-transparent p-0 text-white/30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {activityCard ? (
            <>
              <div className="mb-6 grid grid-cols-7 gap-1.5 lg:mb-3 lg:gap-1">
                {activityCard.days.map((day) => (
                  <div
                    key={day.date}
                    className="flex aspect-square items-center justify-center"
                    title={formatActivityTitle(day)}
                  >
                    <div className={buildActivityCellClass(day.displayState)}>
                      <div className="flex items-center gap-0.5">
                        <span>{day.dayOfMonth}</span>
                        {day.displayState === "SUCCESS" ? <Check size={10} strokeWidth={4} /> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative mt-2 flex items-center justify-between rounded-[20px] border border-orange-600/20 bg-white/[0.03] p-4 px-5 lg:mt-1.5 lg:p-2.5 lg:px-3.5">
                <div className="flex items-center gap-3.5 lg:gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-orange-600/20 bg-orange-600/[0.08] lg:h-10 lg:w-10">
                    <TrendingUp className="h-6 w-6 text-orange-600 lg:h-5 lg:w-5" />
                  </div>
                  <div>
                    <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/40">
                      Current
                    </p>
                    <p className="text-[32px] font-black leading-none tracking-[-0.02em] text-white lg:text-[28px]">
                      <span className="text-gradient-fire">{streaks.currentStreak}</span> Days
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="mb-0.5 text-[10px] font-extrabold uppercase text-white/25">Max Streak</p>
                  <span className="text-[28px] font-black italic text-white/20 lg:text-[24px]">
                    {streaks.maxStreak}
                  </span>
                </div>
              </div>

              {monthlyActivityQuery.isError && !isSummaryActivityMonthSelected ? (
                <p className="mt-3 text-xs text-red-300">
                  {getApiErrorMessage(monthlyActivityQuery.error, "Month activity could not be refreshed.")}
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-[230px] items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[0.02]">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          )}
        </div>

        <div className="card flex h-full flex-col rounded-[36px] border border-white/5 bg-[#111] p-6 lg:min-h-[372px] lg:p-5">
          <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-2 lg:mb-3">
            <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">
              Plan <span className="text-gradient-fire">Duration</span>
            </h3>
            <span className="rounded-md bg-orange-600/[0.12] px-2 py-1 text-[10px] font-bold text-orange-600">
              {planCard ? getPlanBadgeLabel(planCard) : "NO PLAN"}
            </span>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="relative flex flex-1 items-center justify-center py-3 lg:py-4">
              <svg viewBox="0 0 144 144" className="h-[140px] w-[140px] max-w-full -rotate-90 lg:h-[134px] lg:w-[134px]">
                <circle cx="72" cy="72" r="66" stroke="#1a1a1a" strokeWidth="12" fill="transparent" />
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  stroke="url(#planGrad)"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={planRingCircumference}
                  strokeDashoffset={planRingDashOffset}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="planGrad">
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#facc15" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <span className="block text-[40px] font-black leading-none lg:text-[36px]">
                  {planCard?.hasSubscription ? planCard.remainingDays ?? 0 : "-"}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-500 lg:text-[8px]">
                  Days Left
                </span>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-4 pt-4 lg:gap-5 lg:pt-5">
              <div className="w-full rounded-2xl border border-white/[0.04] bg-white/[0.02] p-3.5 px-4 lg:p-3.5 lg:px-4">
                <div className="mb-1.5 flex justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">Current Tier</span>
                  <span className="text-right text-[10px] font-black uppercase tracking-[0.1em] text-orange-600">
                    {planNameLabel}
                  </span>
                </div>
                <div className="mb-1.5 flex justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">Plan Type</span>
                  <span className="text-right text-[10px] font-black uppercase tracking-[0.1em] text-white">
                    {planMetaLabel}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">Ends At</span>
                  <span className="text-right text-[10px] font-black uppercase tracking-[0.1em] text-white">
                    {planEndDateLabel}
                  </span>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-3 lg:gap-4">
                <button
                  type="button"
                  onClick={openMembership}
                  className="btn-ghost flex h-12 items-center justify-center gap-1.5 rounded-[14px] text-[11px] font-black lg:h-[52px]"
                >
                  <Pause className="h-4 w-4" /> Pause
                </button>
                <button
                  type="button"
                  onClick={openMembershipDetails}
                  className="btn-ghost h-12 rounded-[14px] text-[11px] font-black lg:h-[52px]"
                >
                  View Plan
                </button>
                <button
                  type="button"
                  onClick={openMembership}
                  className="btn-fire col-span-2 h-[52px] rounded-[14px] text-xs text-white lg:h-[54px]"
                >
                  Upgrade Membership
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row Grid - Live Session + Member Stats */}
      <div className="bottom-sys grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="card order-2 flex h-full flex-col rounded-[36px] border border-white/5 bg-[#121212] p-6 lg:order-1">
          <div className="mb-4 text-left">
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">
                Member <span className="text-gradient-fire">Stats</span>
              </h3>
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                {(["week", "month", "year"] as const).map((range) => {
                  const isActive = memberStatsRange === range;
                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setMemberStatsRange(range)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                        isActive ? "bg-orange-600 text-white" : "text-white/45 hover:text-white"
                      }`}
                    >
                      {range}
                    </button>
                  );
                })}
              </div>
            </div>

            {memberStats ? (
              <>
                <div className="mb-4 flex items-end justify-start gap-2.5">
                  <div className="text-[clamp(56px,8vw,80px)] font-black italic leading-[0.9] tracking-[-0.04em]">
                    {memberStats.totalVisits}
                  </div>
                  <div className="pb-2">
                    <p className="text-[11px] font-black uppercase text-orange-600">Total Visits</p>
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${comparisonTone.className}`}>
                      <comparisonTone.Icon size={12} /> {comparisonLabel}
                    </div>
                  </div>
                </div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
                  {memberStats.rangeLabel}
                </p>
                {memberStatsSubtitle ? (
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                    {memberStatsSubtitle}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="mb-5 flex min-h-[120px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02]">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            )}

            <h4 className="flex items-center justify-start gap-2 text-lg font-black italic">
              <span className="inline-block h-[18px] w-1 rounded-full bg-orange-600" />
              Top Facilities
            </h4>
          </div>

          {memberStats ? (
            <div className="custom-scroll flex max-h-[240px] flex-1 flex-col gap-4 overflow-y-auto pr-2">
              {topFacilities.length > 0 ? (
                topFacilities.map((gym: DashboardTopFacilityResponse, index) => {
                  const progressWidth =
                    topFacilityCount > 0
                      ? `${Math.max((gym.visitCount / topFacilityCount) * 100, 8)}%`
                      : "0%";

                  return (
                    <div key={gym.gymId}>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-black text-gray-500">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <p className="text-[13px] font-extrabold uppercase italic leading-tight">
                              {gym.gymName ?? "Unknown Gym"}
                            </p>
                            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-gray-500">
                              {gym.city ?? "Location unavailable"}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-black ${index === 0 ? "text-orange-600" : "text-gray-400"}`}>
                          {gym.visitCount}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-400"
                          style={{ width: progressWidth }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
                  <p className="max-w-xs text-sm text-white/45">
                    No gym visits recorded in this range yet.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02]">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          )}

          {memberStatsQuery.isError && memberStatsRange !== "month" ? (
            <p className="mt-3 text-xs text-red-300">
              {getApiErrorMessage(memberStatsQuery.error, "Visit stats could not be refreshed.")}
            </p>
          ) : null}

          <button
            type="button"
            onClick={openVisitHistory}
            className="btn-ghost mt-auto w-full rounded-[14px] py-3.5 text-[10px] tracking-[0.15em] text-gray-500"
          >
            <Download size={13} /> Download History
          </button>
        </div>

        <div className="card order-1 relative flex h-full flex-col overflow-hidden rounded-[40px] border border-white/[0.06] bg-[#111] p-8 lg:order-2">
          <div className="pointer-events-none absolute -right-[50px] -top-[50px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.05)_0%,transparent_70%)]" />

          <div className="live-sys grid grid-cols-1 gap-10 xl:grid-cols-2">
            <div className="ex-col order-2 flex flex-col justify-between xl:order-1">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center justify-start gap-2.5">
                    <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">
                      Upcoming <span className="text-gradient-fire">Session</span>
                    </h3>
                  </div>
                  <h2 className="text-[clamp(24px,3vw,32px)] font-black uppercase italic leading-none tracking-[-0.04em]">
                    {upcomingSessionCard?.title ?? upcomingSessionCard?.emptyStateTitle ?? "No Active Routine"}
                  </h2>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-500">
                    {upcomingSessionCard?.focusLabel ??
                      upcomingSessionCard?.emptyStateMessage ??
                      "Activate a routine to plan your next session."}
                  </p>
                  {upcomingSessionCard?.routineName || upcomingSessionCard?.routineDayName ? (
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-white/35">
                      {[upcomingSessionCard.routineName, upcomingSessionCard.routineDayName]
                        .filter(Boolean)
                        .join(" | ")}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3 px-4 text-right">
                  <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-500">Est. Time</p>
                  <p className="text-[22px] font-black leading-none">
                    {upcomingSessionCard?.estimatedDurationMinutes ?? 0}
                    <span className="ml-1 text-xs text-orange-600">m</span>
                  </p>
                </div>
              </div>

              {upcomingSessionCard?.exercises.length ? (
                <div className="custom-scroll flex max-h-[500px] flex-1 flex-col gap-3 overflow-y-auto pr-2">
                  {upcomingSessionCard.exercises.map((exercise) => (
                    <div
                      key={exercise.exerciseName}
                      className="group/ex flex items-center rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-4 transition-transform duration-200 hover:-translate-y-1"
                    >
                      <div className="mr-4 flex h-[60px] w-[60px] shrink-0 flex-col items-center justify-center rounded-[14px] border border-white/[0.08] bg-[#1a1a1a]">
                        <span className="text-[9px] font-black uppercase text-gray-500">Sets</span>
                        <span className="text-[26px] font-black leading-none">
                          {String(exercise.setCount).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-black uppercase italic tracking-tight transition-colors group-hover/ex:text-orange-600">
                          {exercise.exerciseName}
                        </p>
                        <div className="mt-1 flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase text-gray-500">{exercise.repsLabel ?? "-"}</span>
                          <span className="text-[10px] font-black text-orange-600">{exercise.weightLabel ?? "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[240px] flex-1 items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                  <p className="max-w-sm text-sm text-white/50">
                    {upcomingSessionCard?.emptyStateMessage ??
                      "No workout is ready yet. Activate a routine to populate this section."}
                  </p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleUpcomingSessionAction}
                  disabled={startUpcomingSessionMutation.isPending}
                  className="btn-fire flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-[11px] tracking-[0.1em] text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {startUpcomingSessionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {getUpcomingSessionActionLabel(upcomingSessionCard)}
                </button>
                <button
                  type="button"
                  onClick={handleUpcomingSessionAction}
                  disabled={startUpcomingSessionMutation.isPending}
                  className="btn-ghost rounded-2xl px-5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {startUpcomingSessionMutation.isPending ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Play size={20} />
                  )}
                </button>
              </div>
            </div>

            <div className="img-col order-1 flex flex-col xl:order-2">
              <h3 className="mb-5 text-[clamp(18px,2vw,22px)] font-black uppercase tracking-[-0.03em]">
                Routine <span className="text-gradient-fire">Summary</span>
              </h3>

              {routineHeatmapCard?.routineName || routineHeatmapCard?.routineDayName ? (
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                  {[routineHeatmapCard.routineName, routineHeatmapCard.routineDayName]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
              ) : null}

              <MuscleHeatmap
                exercises={heatmapExercises}
                variant="full"
                showSetBars={false}
                showScoreLegend={false}
                stretchMode="compact"
                className="h-full"
              />

              {routineHeatmapCard?.state === "EMPTY" ? (
                <p className="mt-4 text-center text-sm text-white/50">
                  {routineHeatmapCard.emptyStateMessage ??
                    "No routine focus is available until you activate a routine."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </UserSectionShell>
  );
  };


  const renderContent = () => {
    switch (activeSection) {
      case "gyms":
        return (
          <GymsScreen
            onSwitchToCheckIn={() => {
              setCheckInView("scanner");
              setActiveSection("checkin");
            }}
          />
        );
      case "routines":
        return <RoutineFlow onViewModeChange={(view) => setIsRoutineDetailView(view === "detail")} />;
      case "exercises":
        return <ExercisesScreen />;
      case "workouts":
        return <WorkoutsSection onOpenRoutines={() => setActiveSection("routines")} />;
      case "checkin":
        return (
          <CheckInScreen
            initialView={checkInView}
            onBack={() => {
              setCheckInView("scanner");
              setActiveSection("home");
            }}
          />
        );
      case "progress":
        return renderHome();
      case "profile":
        navigate("/profile");
        return null;
      case "home":
      default:
        return renderHome();
    }
  };

  return (
    <UserLayout
      activeSection={activeSection}
      contentMode={
        activeSection === "gyms" ||
        activeSection === "exercises" ||
        (activeSection === "routines" && isRoutineDetailView && !isMobile)
          ? "immersive"
          : "default"
      }
      onSectionChange={(section) => {
        if (section === "profile") {
          navigate("/profile");
          return;
        }
        if (section === "checkin") {
          setCheckInView("scanner");
        }
        setActiveSection(resolveSection(section));
      }}
    >
      {renderContent()}
    </UserLayout>
  );
};

export default UserDashboard;

