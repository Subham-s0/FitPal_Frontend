import { Suspense, lazy, useCallback, useEffect, useState, useMemo, type ChangeEvent, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { toast } from "sonner";
import { authStore } from "@/features/auth/store";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import { getMyCheckInsApi, checkOutMyCheckInApi } from "@/features/check-in/api";
import { refreshCheckInState, syncCheckInVisitCache } from "@/features/check-in/cache";
import { checkInQueryKeys } from "@/features/check-in/queryKeys";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import {
  getMySubscriptionApi,
  pauseMySubscriptionApi,
  resumeMySubscriptionApi,
} from "@/features/subscription/api";
import { getPlansApi } from "@/features/plans/api";
import { plansQueryKeys } from "@/features/plans/queryKeys";
import ViewPlansDialog from "@/features/subscription/components/ViewPlansDialog";
import { CustomDatePicker } from "@/shared/ui/CustomDatePicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Field,
  TextInput,
} from "@/features/profile/components/ProfileSetupShell";
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
import type { UserSubscriptionResponse } from "@/features/subscription/model";
import {
  startWorkoutSessionApi,
  workoutSessionQueryKeys,
} from "@/features/workout-sessions/workoutSessionApi";
import { getApiErrorMessage } from "@/shared/api/client";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  getUserDashboardSectionFromPath,
  getUserDashboardSectionPath,
} from "@/shared/navigation/dashboard-navigation";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Loader2,
  LogOut,
  Map,
  MapPin,
  MapPinned,
  Maximize2,
  Pause,
  Play,
  PlayCircle,
  QrCode,
  Search,
  TrendingUp,
} from "lucide-react";

type UserDashboardSection = "home" | "gyms" | "routines" | "exercises" | "workouts" | "notifications" | "checkin" | "progress" | "profile";
type MemberStatsRange = "week" | "month" | "year";
type CheckInView = "scanner" | "logs";

const MuscleHeatmap = lazy(() => import("@/features/routines/components/MuscleHeatmap"));
const RoutineFlow = lazy(() => import("@/features/routines/components/RoutineFlow"));
const CheckInScreen = lazy(() => import("@/features/check-in/screens/CheckInScreen"));
const ExercisesScreen = lazy(() => import("@/features/exercises/screens/ExercisesScreen"));
const GymsScreen = lazy(() => import("@/features/gyms/screens/GymsScreen"));
const WorkoutsSection = lazy(() => import("@/features/workout-sessions/components/WorkoutsSection"));
const NotificationInboxPage = lazy(() => import("@/features/notifications/components/NotificationInboxPage"));

const USER_SECTIONS: UserDashboardSection[] = ["home", "gyms", "routines", "exercises", "workouts", "notifications", "checkin", "progress", "profile"];
const ACTIVITY_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const PAUSE_DAYS_MIN = 1;
const PAUSE_DAYS_MAX = 30;
const DASHBOARD_SUBSCRIPTION_QUERY_KEY = ["dashboard-membership-state"] as const;

const DashboardSectionFallback = ({ label }: { label: string }) => (
  <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-white/10 user-surface-soft p-6 text-center text-sm font-bold uppercase tracking-[0.12em] text-white/55">
    <Loader2 className="mr-3 h-4 w-4 animate-spin text-orange-500" />
    {label}
  </div>
);

const DashboardHeatmapFallback = () => (
  <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] border border-white/10 user-surface-soft p-6 text-sm font-bold uppercase tracking-[0.12em] text-white/45">
    Loading muscle map...
  </div>
);

const resolveSection = (value: string | undefined): UserDashboardSection =>
  USER_SECTIONS.includes(value as UserDashboardSection) ? (value as UserDashboardSection) : "home";

const formatEnumLabel = (value: string | null | undefined) =>
  value ? value.replaceAll("_", " ") : null;

const toIsoLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowIsoDate = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return toIsoLocalDate(date);
};

const parseDateInput = (value: string | null | undefined) => {
  if (!value) return undefined;

  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return undefined;
  }

  return new Date(parts[0], parts[1] - 1, parts[2]);
};

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

const formatMembershipDate = (value: string | null | undefined) => {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }

  return SHORT_DATE_FORMATTER.format(parsed);
};

const getPauseUntilIsoDate = (pauseStartDate: string | null | undefined, pauseDays: number) => {
  const startsAt = parseDateInput(pauseStartDate);
  if (!startsAt || !Number.isFinite(pauseDays) || pauseDays < PAUSE_DAYS_MIN) {
    return null;
  }

  const pauseUntil = new Date(startsAt);
  pauseUntil.setDate(pauseUntil.getDate() + Math.trunc(pauseDays));
  return toIsoLocalDate(pauseUntil);
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
      " border-2 border-orange-600 bg-gradient-to-br from-orange-600 to-yellow-400 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]";
  } else {
    classes +=
      " border border-white/5 user-surface-soft text-white/15 hover:scale-[1.08] hover:-rotate-[4deg] hover:border-white/20";
  }

  return classes;
};

const formatActivityTitle = (day: DashboardMonthlyActivityDayResponse) =>
  `${SHORT_DATE_FORMATTER.format(parseLocalDate(day.date))} • ${day.displayState}`;

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

const getUpcomingTodayStatusLabel = (card: DashboardUpcomingSessionResponse | null) => {
  if (!card?.todayStatus) {
    return null;
  }

  return card.todayStatus === "COMPLETED" ? "Today: Completed" : "Today: Skipped";
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
  const navigationType = useNavigationType();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const locationState = (location.state as { activeSection?: string; checkInView?: CheckInView } | null) ?? null;
  const pathSection = getUserDashboardSectionFromPath(location.pathname);
  const requestedSection = pathSection ?? (navigationType === "POP" ? undefined : locationState?.activeSection);
  const requestedCheckInView = navigationType === "POP" ? undefined : locationState?.checkInView;
  const [activeSection, setActiveSection] = useState<UserDashboardSection>(() => resolveSection(requestedSection));
  const [checkInView, setCheckInView] = useState<CheckInView>(requestedCheckInView ?? "scanner");
  const [activityMonth, setActivityMonth] = useState<Date>(new Date());
  const [memberStatsRange, setMemberStatsRange] = useState<MemberStatsRange>("month");
  const [isRoutineDetailView, setIsRoutineDetailView] = useState(false);

  // Pause/Resume dialog state
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isResumeAlertOpen, setIsResumeAlertOpen] = useState(false);
  const [pauseStartDate, setPauseStartDate] = useState("");
  const [pauseDays, setPauseDays] = useState(0);
  const [pauseStartDateError, setPauseStartDateError] = useState("");
  const [pauseDaysError, setPauseDaysError] = useState("");
  const [isUpdatingMembership, setIsUpdatingMembership] = useState(false);

  // View Plans dialog state
  const [isViewPlansDialogOpen, setIsViewPlansDialogOpen] = useState(false);

  const goToSection = useCallback((section: string, nextCheckInView?: CheckInView) => {
    const resolvedSection = resolveSection(section);

    if (resolvedSection === "profile") {
      navigate("/profile");
      return;
    }

    if (resolvedSection === "checkin") {
      setCheckInView(nextCheckInView ?? "scanner");
    }

    setActiveSection(resolvedSection);

    const targetPath = getUserDashboardSectionPath(resolvedSection);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!requestedSection) return;
    setActiveSection(resolveSection(requestedSection));
  }, [requestedSection]);

  useEffect(() => {
    if (!requestedCheckInView) return;
    setCheckInView(requestedCheckInView);
  }, [requestedCheckInView]);

  useEffect(() => {
    if (!locationState) {
      return;
    }

    if (!locationState.activeSection && !locationState.checkInView) {
      return;
    }

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      { replace: true, state: null }
    );
  }, [location.hash, location.pathname, location.search, locationState, navigate]);

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

  const subscriptionQuery = useQuery({
    queryKey: DASHBOARD_SUBSCRIPTION_QUERY_KEY,
    queryFn: getMySubscriptionApi,
    enabled: isHomeVisible,
    staleTime: 30 * 1000,
  });

  const checkInsQuery = useQuery({
    queryKey: checkInQueryKeys.active(),
    queryFn: getMyCheckInsApi,
    enabled: isHomeVisible,
    refetchInterval: 5_000,
  });

  const activeCheckIn = useMemo(() => {
    const checkIns = checkInsQuery.data ?? [];
    return checkIns.find((c) => c.status === "CHECKED_IN") ?? null;
  }, [checkInsQuery.data]);

  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

  useEffect(() => {
    if (!activeCheckIn?.checkInAt) {
      setElapsedTime("00:00:00");
      return;
    }

    const updateTimer = () => {
      const checkInTime = new Date(activeCheckIn.checkInAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - checkInTime) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      setElapsedTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeCheckIn?.checkInAt]);

  const checkOutMutation = useMutation({
    mutationFn: (checkInId: string) => checkOutMyCheckInApi(checkInId),
    onSuccess: async (response) => {
      syncCheckInVisitCache(queryClient, response);
      await refreshCheckInState(queryClient);
      toast.success("Checked out successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to check out"));
    },
  });

  const plansQuery = useQuery({
    queryKey: plansQueryKeys.list(),
    queryFn: getPlansApi,
    enabled: isViewPlansDialogOpen,
    staleTime: 5 * 60 * 1000,
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
  const subscriptionState = subscriptionQuery.data ?? null;
  const currentMembership = subscriptionState?.currentSubscription ?? null;
  const pauseCount = currentMembership?.pauseCount ?? 0;
  const pauseCountCurrentWindow = currentMembership?.pauseCountCurrentWindow ?? 0;
  const pauseLimitPerWindow = currentMembership?.pauseLimitPerWindow ?? 0;
  const totalPauseLimit = currentMembership?.totalPauseLimit ?? 0;
  const hasScheduledPause = Boolean(
    currentMembership?.scheduledPauseStartAt && currentMembership?.scheduledPauseUntil
  );
  const remainingFlexiblePauses = Math.max(0, totalPauseLimit - pauseCount);
  const remainingPausesThisWindow = Math.max(0, pauseLimitPerWindow - pauseCountCurrentWindow);
  const canPauseCurrentMembership =
    currentMembership?.subscriptionStatus === "ACTIVE" &&
    !hasScheduledPause &&
    remainingFlexiblePauses > 0 &&
    remainingPausesThisWindow > 0;
  const canResumeCurrentMembership =
    currentMembership?.subscriptionStatus === "PAUSED" || hasScheduledPause;
  const upcomingSessionCard = summary?.upcomingSessionCard ?? null;
  const routineHeatmapCard = summary?.routineHeatmapCard ?? null;
  const heatmapExercises = toHeatmapExercises(routineHeatmapCard);
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
  const earliestPauseStartDate = parseDateInput(getTomorrowIsoDate());
  const latestPauseStartDate = currentMembership?.endsAt ? new Date(currentMembership.endsAt) : null;
  const hasValidLatestPauseStartDate = Boolean(
    latestPauseStartDate && !Number.isNaN(latestPauseStartDate.getTime())
  );
  const pauseUntilPreview = useMemo(
    () => getPauseUntilIsoDate(pauseStartDate, pauseDays),
    [pauseDays, pauseStartDate]
  );
  const parsedPauseStartDate = parseDateInput(pauseStartDate);
  const isPauseDaysValid =
    Number.isInteger(pauseDays) && pauseDays >= PAUSE_DAYS_MIN && pauseDays <= PAUSE_DAYS_MAX;
  const isPauseStartDateValid = Boolean(
    parsedPauseStartDate &&
    earliestPauseStartDate &&
    parsedPauseStartDate.getTime() >= earliestPauseStartDate.getTime() &&
    (!hasValidLatestPauseStartDate ||
      parsedPauseStartDate.getTime() <= latestPauseStartDate!.getTime())
  );
  const isPauseFormValid =
    !hasScheduledPause &&
    canPauseCurrentMembership &&
    isPauseDaysValid &&
    isPauseStartDateValid &&
    !pauseStartDateError &&
    !pauseDaysError;
  const isPauseActionLoading = isUpdatingMembership || (subscriptionQuery.isLoading && !subscriptionState);
  const canUsePauseAction =
    Boolean(currentMembership) && (canPauseCurrentMembership || canResumeCurrentMembership);
  const isPauseActionDisabled = isPauseActionLoading || !canUsePauseAction;
  const resumeAlertTitle = hasScheduledPause ? "Cancel Scheduled Pause?" : "Resume Membership Now?";
  const resumeAlertDescription = hasScheduledPause
    ? `This will cancel the scheduled pause for ${currentMembership?.planName ?? "your membership"} before it starts.`
    : `This will reactivate ${currentMembership?.planName ?? "your membership"} immediately and restore gym access now.`;
  const resumeAlertStateLabel = hasScheduledPause ? "Scheduled pause" : "Paused";
  const resumeAlertPrimaryDateLabel = hasScheduledPause ? "Pause starts" : "Paused until";
  const resumeAlertPrimaryDateValue = formatMembershipDate(
    hasScheduledPause ? currentMembership?.scheduledPauseStartAt : currentMembership?.pauseUntil
  );
  const resumeAlertSecondaryDateLabel = hasScheduledPause ? "Scheduled end" : "Membership ends";
  const resumeAlertSecondaryDateValue = formatMembershipDate(
    hasScheduledPause ? currentMembership?.scheduledPauseUntil : currentMembership?.endsAt
  );
  const resumeAlertActionLabel = hasScheduledPause
    ? "Cancel Scheduled Pause"
    : "Resume Membership";

  const openMembership = () => navigate("/membership");

  const syncDashboardMembershipState = async (response: UserSubscriptionResponse) => {
    authStore.updateOnboardingStatus({
      profileCompleted: response.profileCompleted,
      hasSubscription: response.hasSubscription,
      hasActiveSubscription: response.hasActiveSubscription,
      hasDashboardAccess: response.hasDashboardAccess,
    });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUBSCRIPTION_QUERY_KEY }),
    ]);
  };

  const openPauseFlow = () => {
    setPauseDays(7);
    setPauseStartDate(getTomorrowIsoDate());
    setPauseStartDateError("");
    setPauseDaysError("");
    setIsPauseDialogOpen(true);
  };

  const openResumeConfirmation = () => {
    if (!currentMembership || !canResumeCurrentMembership) {
      return;
    }

    setIsResumeAlertOpen(true);
  };

  const handleResumeAlertOpenChange = (open: boolean) => {
    if (isUpdatingMembership) {
      return;
    }

    setIsResumeAlertOpen(open);
  };

  const handlePauseDaysChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    if (!nextValue) {
      setPauseDays(0);
      setPauseDaysError(`Pause length must be between ${PAUSE_DAYS_MIN} and ${PAUSE_DAYS_MAX} days.`);
      return;
    }

    const parsedValue = Number(nextValue);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setPauseDays(parsedValue);

    if (
      !Number.isInteger(parsedValue) ||
      parsedValue < PAUSE_DAYS_MIN ||
      parsedValue > PAUSE_DAYS_MAX
    ) {
      setPauseDaysError(`Pause length must be between ${PAUSE_DAYS_MIN} and ${PAUSE_DAYS_MAX} days.`);
      return;
    }

    setPauseDaysError("");
  };

  const handlePauseDaysBlur = () => {
    const normalizedValue = Math.trunc(Number.isFinite(pauseDays) ? pauseDays : PAUSE_DAYS_MIN);
    const clampedValue = Math.min(PAUSE_DAYS_MAX, Math.max(PAUSE_DAYS_MIN, normalizedValue));
    setPauseDays(clampedValue);
    setPauseDaysError("");
  };

  const handlePauseMembership = async () => {
    if (!currentMembership || !canPauseCurrentMembership) return;
    const normalizedPauseDays = Math.trunc(Number.isFinite(pauseDays) ? pauseDays : 0);

    if (!parsedPauseStartDate) {
      setPauseStartDateError("Select a pause start date.");
      return;
    }

    if (
      !earliestPauseStartDate ||
      parsedPauseStartDate.getTime() < earliestPauseStartDate.getTime()
    ) {
      setPauseStartDateError("Pause start date must be tomorrow or later.");
      return;
    }

    if (
      currentMembership.endsAt &&
      !Number.isNaN(new Date(currentMembership.endsAt).getTime()) &&
      parsedPauseStartDate.getTime() > new Date(currentMembership.endsAt).getTime()
    ) {
      setPauseStartDateError("Pause start date must be before the current membership ends.");
      return;
    }

    if (
      !Number.isInteger(normalizedPauseDays) ||
      normalizedPauseDays < PAUSE_DAYS_MIN ||
      normalizedPauseDays > PAUSE_DAYS_MAX
    ) {
      setPauseDaysError(`Pause length must be between ${PAUSE_DAYS_MIN} and ${PAUSE_DAYS_MAX} days.`);
      return;
    }

    setIsUpdatingMembership(true);

    try {
      const response = await pauseMySubscriptionApi({
        pauseStartDate,
        pauseDays: normalizedPauseDays,
      });
      await syncDashboardMembershipState(response);
      setIsPauseDialogOpen(false);
      setPauseStartDateError("");
      setPauseDaysError("");
      toast.success(
        `Pause scheduled from ${formatMembershipDate(
          response.scheduledPauseStartAt ?? pauseStartDate
        )} for ${normalizedPauseDays} day${normalizedPauseDays === 1 ? "" : "s"}.`
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to pause membership"));
    } finally {
      setIsUpdatingMembership(false);
    }
  };

  const handleResumeMembership = async () => {
    if (!currentMembership || !canResumeCurrentMembership) return;

    setIsUpdatingMembership(true);

    try {
      const response = await resumeMySubscriptionApi();
      await syncDashboardMembershipState(response);
      setIsResumeAlertOpen(false);
      setIsPauseDialogOpen(false);
      toast.success(
        hasScheduledPause
          ? "Scheduled pause cancelled."
          : "Membership resumed. Gym access is active again."
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to resume membership"));
    } finally {
      setIsUpdatingMembership(false);
    }
  };

  const handleResumeAlertAction = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (isUpdatingMembership) {
      return;
    }

    void handleResumeMembership();
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

    goToSection("routines");
  };

  const handleOpenRoutinesSection = () => {
    goToSection("routines");
  };

  const handlePauseOrResume = () => {
    if (isUpdatingMembership) {
      return;
    }

    if (canResumeCurrentMembership) {
      openResumeConfirmation();
      return;
    }

    if (currentMembership?.subscriptionStatus === "ACTIVE") {
      if (canPauseCurrentMembership) {
        openPauseFlow();
      }
      return;
    }

    openMembership();
  };

  const isPaused = currentMembership?.subscriptionStatus === "PAUSED" || hasScheduledPause;
  const pauseButtonLabel = isPaused ? "Resume" : "Pause";
  const PauseIcon = isPaused ? PlayCircle : Pause;

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
          <div className="flex min-h-[360px] items-center justify-center rounded-[36px] border border-white/5 user-surface">
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
          {/* Gym Access / Active Check-In Card */}
          <div className="card flex flex-col rounded-[36px] border border-white/5 bg-[linear-gradient(165deg,#1e120a,#000)] p-6 lg:min-h-[372px] lg:p-5">
            {activeCheckIn ? (
              /* Active Check-In Card */
              <>
                <div className="mb-3 flex flex-wrap items-center gap-3 lg:mb-2.5 lg:gap-2.5">
                  <Check className="h-7 w-7 shrink-0 text-green-500 lg:h-6 lg:w-6" />
                  <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">
                    Active <span className="text-gradient-fire">Session</span>
                  </h2>
                </div>
                <p className="mb-8 text-base font-light text-white/50 lg:mb-5 lg:text-[15px]">
                  Currently checked in
                </p>

                <div className="mt-1 flex flex-1 flex-col gap-6 lg:gap-6">
                  <div className="relative flex flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-green-500/28 bg-green-500/[0.08] p-5 lg:min-h-[198px]">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.15),transparent_70%)]" />

                    <div className="relative z-10 flex flex-1 flex-col">
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className="h-[18px] w-[18px] text-green-500" />
                        <h3 className="text-lg font-black tracking-tight text-white">
                          {activeCheckIn.gymName || "Unknown Gym"}
                        </h3>
                      </div>

                      <div className="flex flex-1 flex-col items-center justify-center rounded-[1.25rem] border border-green-500/20 bg-green-500/[0.04] p-4 text-center">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-green-500/60">
                          Session Time
                        </p>
                        <div className="font-mono text-[42px] font-black tracking-tight text-green-500 leading-none">
                          {elapsedTime}
                        </div>
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-white/40">
                          <Clock className="h-3.5 w-3.5" /> Started at {new Date(activeCheckIn.checkInAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => activeCheckIn && checkOutMutation.mutate(activeCheckIn.checkInId)}
                    disabled={checkOutMutation.isPending}
                    className="flex items-center justify-center gap-2.5 rounded-[14px] border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm font-black text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50 lg:py-3.5 lg:text-[13px]"
                  >
                    {checkOutMutation.isPending ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    ) : (
                      <LogOut className="h-[18px] w-[18px]" />
                    )}
                    Check Out
                  </button>
                </div>
              </>
            ) : (
              /* Gym Access Card (Default) */
              <>
                <div className="mb-3 flex flex-wrap items-center gap-3 lg:mb-2.5 lg:gap-2.5">
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
                      goToSection("checkin");
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
                      onClick={() => goToSection("checkin")}
                      className="btn-fire flex items-center justify-center gap-2.5 rounded-[14px] px-4 py-4 text-sm font-black text-white lg:py-3.5 lg:text-[13px]"
                    >
                      <Maximize2 className="h-[18px] w-[18px]" /> Check-In
                    </button>
                    <button
                      type="button"
                      onClick={() => goToSection("gyms")}
                      className="btn-ghost flex items-center justify-center gap-2.5 rounded-[14px] border border-white/15 px-4 py-4 text-sm font-black text-white lg:py-3.5 lg:text-[13px]"
                    >
                      <Search className="h-[18px] w-[18px]" /> Find Gyms
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="card relative flex flex-col overflow-hidden rounded-[40px] border border-white/[0.06] user-surface p-7 lg:min-h-[372px] lg:px-5 lg:py-4">
            <div className="pointer-events-none absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.05)_0%,transparent_70%)]" />

            <div className="mb-6 lg:mb-3">
              <h3 className="mb-4 text-left text-2xl font-black uppercase tracking-[-0.03em] lg:mb-2 lg:text-[20px]">
                Monthly <span className="text-gradient-fire">Activity</span>
              </h3>
              <div className="flex w-full justify-center">
                <div className="inline-flex min-w-[160px] items-center justify-center gap-3.5 rounded-xl border border-white/[0.06] user-surface-muted px-4 py-2 lg:min-w-[136px] lg:gap-2 lg:px-2.5 lg:py-1">
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

                <div className="relative mt-2 flex items-center justify-between rounded-[20px] border border-orange-600/20 user-surface-muted p-4 px-5 lg:mt-1.5 lg:p-2.5 lg:px-3.5">
                  <div className="flex items-center gap-3.5 lg:gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-orange-600/20 bg-orange-600/[0.08] lg:h-10 lg:w-10">
                      <TrendingUp className="h-6 w-6 text-orange-600 lg:h-5 lg:w-5" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/40">
                        Current
                      </p>
                      <p className="text-[32px] font-black leading-none tracking-[-0.02em] text-white lg:text-[28px]">
                        <span className="text-gradient-fire">{activityCard.overallCurrentStreak ?? 0}</span> Days
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="mb-0.5 text-[10px] font-extrabold uppercase text-white/25">Max Streak</p>
                    <span className="text-[28px] font-black italic text-white/20 lg:text-[24px]">
                      {activityCard.overallMaxStreak ?? 0}
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
              <div className="flex min-h-[230px] items-center justify-center rounded-[22px] border border-dashed border-white/10 user-surface-soft">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            )}
          </div>

          <div className="card flex h-full flex-col rounded-[36px] border border-white/5 user-surface p-6 lg:min-h-[372px] lg:p-5">
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
                <div className="w-full rounded-2xl border border-white/[0.04] user-surface-soft p-3.5 px-4 lg:p-3.5 lg:px-4">
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
                    onClick={handlePauseOrResume}
                    disabled={isPauseActionDisabled}
                    className="btn-ghost flex h-12 items-center justify-center gap-1.5 rounded-[14px] text-[11px] font-black lg:h-[52px]"
                  >
                    {isPauseActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PauseIcon className="h-4 w-4" />
                    )}
                    {pauseButtonLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsViewPlansDialogOpen(true)}
                    className="btn-ghost h-12 rounded-[14px] text-[11px] font-black lg:h-[52px]"
                  >
                    View Plans
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

        {/* Bottom Row Grid - Member Stats + Live Session */}
        <div className="bottom-sys grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2fr]">
          <div className="card order-2 flex h-full flex-col rounded-[36px] border border-white/5 user-surface p-6 lg:order-1">
            <div className="mb-4 text-left">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">
                  Member <span className="text-gradient-fire">Stats</span>
                </h3>
                <div className="inline-flex rounded-full border border-white/10 user-surface-muted p-1">
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
                <div className="mb-5 flex min-h-[120px] items-center justify-center rounded-[24px] border border-dashed border-white/10 user-surface-soft">
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
                  <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-white/10 user-surface-soft p-5 text-center">
                    <p className="max-w-xs text-sm text-white/45">
                      No gym visits recorded in this range yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-white/10 user-surface-soft">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            )}

            {memberStatsQuery.isError && memberStatsRange !== "month" ? (
              <p className="mt-3 text-xs text-red-300">
                {getApiErrorMessage(memberStatsQuery.error, "Visit stats could not be refreshed.")}
              </p>
            ) : null}

          </div>

          <div className="card order-1 relative flex h-full flex-col overflow-hidden rounded-[40px] border border-white/[0.06] user-surface p-8 lg:order-2">
            <div className="pointer-events-none absolute -right-[50px] -top-[50px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.05)_0%,transparent_70%)]" />

            <div className="live-sys grid grid-cols-1 gap-10 xl:grid-cols-2">
              <div className="ex-col order-2 flex flex-col justify-between xl:order-1">
              <div className="mb-6">
                <div>
                  <div className="mb-2 flex items-center justify-start gap-2.5">
                    <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">
                      Upcoming <span className="text-gradient-fire">Session</span>
                    </h3>
                    {getUpcomingTodayStatusLabel(upcomingSessionCard) ? (
                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-orange-300">
                        {getUpcomingTodayStatusLabel(upcomingSessionCard)}
                      </span>
                    ) : null}
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
                </div>

                {upcomingSessionCard?.exercises.length ? (
                  <div className="custom-scroll flex max-h-[500px] flex-1 flex-col gap-3 overflow-y-auto pr-2">
                    {upcomingSessionCard.exercises.map((exercise) => (
                      <div
                        key={exercise.exerciseName}
                        className="group/ex flex items-center rounded-[20px] border border-white/[0.06] user-surface-soft p-4 transition-transform duration-200 hover:-translate-y-1"
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
                  <div className="flex min-h-[240px] flex-1 items-center justify-center rounded-[28px] border border-dashed border-white/10 user-surface-soft p-6 text-center">
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
                    onClick={handleOpenRoutinesSection}
                    disabled={startUpcomingSessionMutation.isPending}
                    title="Open routines"
                    aria-label="Open routines"
                    className="btn-ghost rounded-2xl px-5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {startUpcomingSessionMutation.isPending ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <ClipboardList size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div className="img-col order-1 flex flex-col xl:order-2">
                <h3 className="mb-5 text-[clamp(18px,2vw,22px)] font-black uppercase tracking-[-0.03em]">
                  Workout <span className="text-gradient-fire">Summary</span>
                </h3>

                {upcomingSessionCard?.routineName || upcomingSessionCard?.routineDayName ? (
                  <p className="mb-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                    {[upcomingSessionCard.routineName, upcomingSessionCard.routineDayName]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                ) : null}

                <Suspense fallback={<DashboardHeatmapFallback />}>
                  <MuscleHeatmap
                    exercises={heatmapExercises}
                    variant="full"
                    showSetBars={false}
                    showScoreLegend={false}
                    stretchMode="compact"
                    className="h-full"
                  />
                </Suspense>

                {routineHeatmapCard?.state === "EMPTY" ? (
                  <p className="mt-4 text-center text-sm text-white/50">
                    {routineHeatmapCard.emptyStateMessage ??
                      "No workout focus is available until you activate a routine."}
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
          <Suspense fallback={<DashboardSectionFallback label="Loading gyms..." />}>
            <GymsScreen
              onSwitchToCheckIn={() => {
                goToSection("checkin");
              }}
            />
          </Suspense>
        );
      case "routines":
        return (
          <Suspense fallback={<DashboardSectionFallback label="Loading routines..." />}>
            <RoutineFlow onViewModeChange={(view) => setIsRoutineDetailView(view === "detail")} />
          </Suspense>
        );
      case "exercises":
        return (
          <Suspense fallback={<DashboardSectionFallback label="Loading exercises..." />}>
            <ExercisesScreen />
          </Suspense>
        );
      case "workouts":
        return (
          <Suspense fallback={<DashboardSectionFallback label="Loading workouts..." />}>
            <WorkoutsSection onOpenRoutines={() => goToSection("routines")} />
          </Suspense>
        );
      case "notifications":
        return (
          <Suspense fallback={<DashboardSectionFallback label="Loading notifications..." />}>
            <NotificationInboxPage />
          </Suspense>
        );
      case "checkin":
        return (
          <Suspense fallback={<DashboardSectionFallback label="Loading check-in..." />}>
            <CheckInScreen
              initialView={checkInView}
              onBack={() => {
                goToSection("home");
              }}
            />
          </Suspense>
        );
      case "progress":
        return renderHome();
      case "profile":
        return <Navigate to="/profile" replace />;
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
        goToSection(section);
      }}
    >
      {renderContent()}

      {/* Pause Subscription Dialog */}
      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent className="overflow-hidden rounded-[1.6rem] border-white/10 bg-[#090909] p-0 text-white sm:max-w-lg">
          <div className="border border-white/8 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(9,9,9,0.98))] p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase text-white">
                {hasScheduledPause ? "Scheduled Pause" : "Schedule Pause"}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-400">
                {hasScheduledPause
                  ? "Another pause cannot be created while this schedule is still active."
                  : "Choose when the pause should begin and how long it should last."}
              </DialogDescription>
            </DialogHeader>

            {hasScheduledPause ? (
              <>
                <div className="mt-5 rounded-[1.2rem] border border-sky-500/20 bg-sky-500/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">
                    Current scheduled pause
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-sky-50">
                    Starts on {formatMembershipDate(currentMembership?.scheduledPauseStartAt)}
                    {" "}and runs until {formatMembershipDate(currentMembership?.scheduledPauseUntil)}.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-sky-50/90">
                    Another pause cannot be created until this one is cancelled or completed.
                    Use Resume on the dashboard to cancel this schedule first.
                  </p>
                </div>

                <DialogFooter className="mt-6 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsPauseDialogOpen(false)}
                    className="inline-flex items-center justify-center rounded-[1rem] border border-white/10 user-surface-muted px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
                  >
                    Close
                  </button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Pause Starts At" error={pauseStartDateError}>
                    <CustomDatePicker
                      value={pauseStartDate}
                      onChange={(value) => {
                        setPauseStartDate(value);
                        setPauseStartDateError("");
                      }}
                      minDate={earliestPauseStartDate ?? undefined}
                      maxDate={hasValidLatestPauseStartDate ? latestPauseStartDate! : undefined}
                      invalid={Boolean(pauseStartDateError)}
                    />
                  </Field>

                  <Field label="Pause For How Many Days" error={pauseDaysError}>
                    <TextInput
                      type="number"
                      min={PAUSE_DAYS_MIN}
                      max={PAUSE_DAYS_MAX}
                      step={1}
                      inputMode="numeric"
                      value={pauseDays > 0 ? String(pauseDays) : ""}
                      onChange={handlePauseDaysChange}
                      onBlur={handlePauseDaysBlur}
                      placeholder="Enter days"
                      aria-label="Pause duration in days"
                      aria-invalid={Boolean(pauseDaysError)}
                    />
                  </Field>
                </div>

                <div className="mt-5 rounded-[1.2rem] border border-white/10 user-surface-muted p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Pause summary
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white">
                    Paused until{" "}
                    <span className="font-bold text-orange-300">
                      {pauseUntilPreview ? formatMembershipDate(pauseUntilPreview) : "Not scheduled"}
                    </span>
                    . Remaining pauses:{" "}
                    <span className="font-bold text-white">
                      {remainingFlexiblePauses} total
                    </span>
                    {" "}and{" "}
                    <span className="font-bold text-white">
                      {remainingPausesThisWindow} this billing window
                    </span>
                    .
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Only active memberships can schedule a pause, and another pause cannot be
                    added until the current scheduled or active pause is cancelled or completed.
                  </p>
                </div>

                <DialogFooter className="mt-6 gap-3 sm:justify-between sm:space-x-0">
                  <button
                    type="button"
                    onClick={() => setIsPauseDialogOpen(false)}
                    className="inline-flex items-center justify-center rounded-[1rem] border border-white/10 user-surface-muted px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePauseMembership()}
                    disabled={!isPauseFormValid || isUpdatingMembership}
                    className="inline-flex items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_24px_-6px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-6px_rgba(249,115,22,0.42)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingMembership ? "Scheduling..." : "Confirm Pause"}
                  </button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isResumeAlertOpen} onOpenChange={handleResumeAlertOpenChange}>
        <DialogContent className="overflow-hidden rounded-[1.6rem] border-white/10 bg-[#090909] p-0 text-white sm:max-w-lg shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
          <div className="border border-white/8 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(9,9,9,0.98))] p-6">
            <DialogHeader>
              <div className="flex justify-between items-start w-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  <PlayCircle className="h-6 w-6" />
                </div>
              </div>
              <DialogTitle className="mt-4 text-2xl font-black uppercase text-white">
                {resumeAlertTitle}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-400">
                {resumeAlertDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 rounded-[1.2rem] border border-white/10 user-surface-muted p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Confirmation details
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] border border-white/10 user-surface p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Membership
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {currentMembership?.planName ?? "Not available"}
                  </p>
                </div>

                <div className="rounded-[14px] border border-white/10 user-surface p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Current state
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {resumeAlertStateLabel}
                  </p>
                </div>

                <div className="rounded-[14px] border border-white/10 user-surface p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {resumeAlertPrimaryDateLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {resumeAlertPrimaryDateValue}
                  </p>
                </div>

                <div className="rounded-[14px] border border-white/10 user-surface p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {resumeAlertSecondaryDateLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {resumeAlertSecondaryDateValue}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 gap-3 sm:justify-between sm:space-x-0">
              <button
                type="button"
                onClick={() => handleResumeAlertOpenChange(false)}
                disabled={isUpdatingMembership}
                className="inline-flex items-center justify-center rounded-[1rem] border border-white/10 user-surface-muted px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
              >
                Keep Current State
              </button>
              <button
                type="button"
                onClick={handleResumeAlertAction}
                disabled={isUpdatingMembership}
                className="inline-flex items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#10b981,#059669)] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_24px_-6px_rgba(16,185,129,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-6px_rgba(16,185,129,0.42)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingMembership ? "Working..." : resumeAlertActionLabel}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ViewPlansDialog
        open={isViewPlansDialogOpen}
        onOpenChange={setIsViewPlansDialogOpen}
        plans={plansQuery.data ?? []}
        highlightedPlanId={null}
        defaultBillingCycle="monthly"
        title="Available Plans"
        description="Browse available membership plans and compare monthly or yearly pricing."
        highlightLabel="Current Plan"
        isLoading={plansQuery.isLoading}
        isError={plansQuery.isError}
      />
    </UserLayout>
  );
};

export default UserDashboard;
