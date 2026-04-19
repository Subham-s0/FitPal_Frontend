import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DashboardSummaryResponse,
} from "@/features/user-dashboard/model";
import type { PlanResponse } from "@/features/plans/model";
import type { UserSubscriptionStateResponse } from "@/features/subscription/model";
import { renderWithProviders } from "@/test/test-utils";

const userDashboardMocks = vi.hoisted(() => ({
  getMyCheckInsApi: vi.fn(),
  checkOutMyCheckInApi: vi.fn(),
  refreshCheckInState: vi.fn(),
  syncCheckInVisitCache: vi.fn(),
  getMySubscriptionApi: vi.fn(),
  pauseMySubscriptionApi: vi.fn(),
  resumeMySubscriptionApi: vi.fn(),
  getPlansApi: vi.fn(),
  getDashboardSummaryApi: vi.fn(),
  getDashboardMonthlyActivityApi: vi.fn(),
  getDashboardVisitStatsApi: vi.fn(),
  startWorkoutSessionApi: vi.fn(),
  updateOnboardingStatus: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/auth/store", () => ({
  authStore: {
    updateOnboardingStatus: userDashboardMocks.updateOnboardingStatus,
  },
}));

vi.mock("@/features/check-in/api", () => ({
  getMyCheckInsApi: userDashboardMocks.getMyCheckInsApi,
  checkOutMyCheckInApi: userDashboardMocks.checkOutMyCheckInApi,
}));

vi.mock("@/features/check-in/cache", () => ({
  refreshCheckInState: userDashboardMocks.refreshCheckInState,
  syncCheckInVisitCache: userDashboardMocks.syncCheckInVisitCache,
}));

vi.mock("@/features/subscription/api", () => ({
  getMySubscriptionApi: userDashboardMocks.getMySubscriptionApi,
  pauseMySubscriptionApi: userDashboardMocks.pauseMySubscriptionApi,
  resumeMySubscriptionApi: userDashboardMocks.resumeMySubscriptionApi,
}));

vi.mock("@/features/plans/api", () => ({
  getPlansApi: userDashboardMocks.getPlansApi,
}));

vi.mock("@/features/subscription/components/ViewPlansDialog", () => ({
  default: ({
    open,
    title,
    plans,
  }: {
    open: boolean;
    title: string;
    plans: PlanResponse[];
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        <div>PLAN COUNT: {plans.length}</div>
      </div>
    ) : null,
}));

vi.mock("@/shared/ui/CustomDatePicker", () => ({
  CustomDatePicker: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      aria-label="Pause start date"
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock("@/features/profile/components/ProfileSetupShell", () => ({
  Field: ({
    label,
    error,
    children,
  }: {
    label: string;
    error?: string;
    children: ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {children}
      {error ? <span>{error}</span> : null}
    </label>
  ),
  TextInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/features/user-dashboard/api", () => ({
  dashboardQueryKeys: {
    all: ["dashboard"],
    summary: () => ["dashboard", "summary"],
    monthlyActivity: (year: number, month: number) => [
      "dashboard",
      "monthly-activity",
      year,
      month,
    ],
    visits: (request: unknown) => ["dashboard", "visits", request],
  },
  getDashboardSummaryApi: userDashboardMocks.getDashboardSummaryApi,
  getDashboardMonthlyActivityApi: userDashboardMocks.getDashboardMonthlyActivityApi,
  getDashboardVisitStatsApi: userDashboardMocks.getDashboardVisitStatsApi,
}));

vi.mock("@/features/workout-sessions/workoutSessionApi", () => ({
  workoutSessionQueryKeys: {
    today: () => ["workout-sessions", "today"],
  },
  startWorkoutSessionApi: userDashboardMocks.startWorkoutSessionApi,
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/features/user-dashboard/components/UserLayout", () => ({
  default: ({
    activeSection,
    onSectionChange,
    children,
  }: {
    activeSection: string;
    onSectionChange?: (section: string) => void;
    children: ReactNode;
  }) => (
    <div data-testid="user-layout">
      <div data-testid="active-section">{activeSection}</div>
      <button type="button" onClick={() => onSectionChange?.("home")}>
        nav-home
      </button>
      <button type="button" onClick={() => onSectionChange?.("notifications")}>
        nav-notifications
      </button>
      <button type="button" onClick={() => onSectionChange?.("workouts")}>
        nav-workouts
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@/features/user-dashboard/components/UserSectionShell", () => ({
  default: ({
    title,
    description,
    children,
  }: {
    title: ReactNode;
    description: string;
    children: ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

vi.mock("@/features/routines/components/MuscleHeatmap", () => ({
  default: () => <div>MUSCLE HEATMAP</div>,
}));

vi.mock("@/features/routines/components/RoutineFlow", () => ({
  default: () => <div>ROUTINE FLOW</div>,
}));

vi.mock("@/features/check-in/screens/CheckInScreen", () => ({
  default: () => <div>CHECK IN SCREEN</div>,
}));

vi.mock("@/features/exercises/screens/ExercisesScreen", () => ({
  default: () => <div>EXERCISES SCREEN</div>,
}));

vi.mock("@/features/gyms/screens/GymsScreen", () => ({
  default: () => <div>GYMS SCREEN</div>,
}));

vi.mock("@/features/workout-sessions/components/WorkoutsSection", () => ({
  default: () => <div>WORKOUTS SECTION</div>,
}));

vi.mock("@/features/notifications/components/NotificationInboxPage", () => ({
  default: () => <div>NOTIFICATION INBOX</div>,
}));

vi.mock("@/shared/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("sonner", () => ({
  toast: userDashboardMocks.toast,
}));

import UserDashboard from "@/features/user-dashboard/screens/UserDashboard";

const buildSummary = (
  overrides: Partial<DashboardSummaryResponse> = {},
): DashboardSummaryResponse => ({
  generatedAt: "2026-04-19T08:00:00Z",
  planCard: {
    hasSubscription: true,
    planName: "Pro Monthly",
    planType: "PRO",
    billingCycle: "MONTHLY",
    subscriptionStatus: "ACTIVE",
    currentAccessEndsAt: "2026-05-19",
    nextMembershipStartsAt: null,
    totalPaidCoverageEndsAt: "2026-05-19",
    remainingDays: 30,
    durationDays: 30,
    progressPercent: 50,
  },
  monthlyActivityCard: {
    year: 2026,
    month: 4,
    days: [
      {
        date: "2026-04-18",
        dayOfMonth: 18,
        hasValidCheckIn: true,
        displayState: "SUCCESS",
      },
    ],
    overallCurrentStreak: 3,
    overallMaxStreak: 7,
  },
  upcomingSessionCard: {
    state: "PLANNED",
    todayStatus: null,
    title: "Upper Body Blast",
    routineName: "Push Pull Split",
    routineDayName: "Push Day",
    focusLabel: "Chest + Shoulders",
    exerciseCount: 4,
    estimatedDurationMinutes: 45,
    routineId: "routine-1",
    routineDayId: "day-1",
    routineLogId: null,
    emptyStateTitle: null,
    emptyStateMessage: null,
    exercises: [
      {
        exerciseName: "Bench Press",
        setCount: 4,
        repsLabel: "4 x 8",
        weightLabel: "80 kg",
      },
    ],
  },
  memberStatsCard: {
    rangeType: "MONTH",
    rangeLabel: "This month",
    totalVisits: 12,
    successfulVisits: 11,
    deniedVisits: 1,
    uniqueGyms: 3,
    comparisonLabel: "+20.0% VS LAST MONTH",
    topFacilities: [
      {
        gymId: 101,
        gymName: "FitPal Arena",
        city: "Kathmandu",
        logoUrl: null,
        visitCount: 6,
      },
    ],
  },
  routineHeatmapCard: {
    state: "READY",
    title: "Upper Body Focus",
    routineName: "Push Pull Split",
    routineDayName: "Push Day",
    emptyStateTitle: null,
    emptyStateMessage: null,
    exercises: [
      {
        exerciseName: "Bench Press",
        setCount: 4,
        primaryMuscles: ["Chest"],
        secondaryMuscles: ["Triceps"],
      },
    ],
  },
  ...overrides,
});

const buildSubscriptionState = (
  overrides: Partial<UserSubscriptionStateResponse> = {},
): UserSubscriptionStateResponse => {
  const currentSubscription = {
    accountId: 1,
    userId: 2,
    onboardingStep: 4,
    profileCompleted: true,
    hasSubscription: true,
    hasActiveSubscription: true,
    hasDashboardAccess: true,
    subscriptionId: 77,
    planId: 5,
    planType: "PRO",
    planName: "Pro Monthly",
    billingCycle: "MONTHLY" as const,
    subscriptionStatus: "ACTIVE" as const,
    baseAmount: 2500,
    billedAmount: 2500,
    discountAmount: 0,
    discountPercent: 0,
    taxRate: 0,
    taxAmount: 0,
    serviceChargeRate: 0,
    serviceChargeAmount: 0,
    totalAmount: 2500,
    autoRenew: false,
    pauseCount: 0,
    pauseCountCurrentWindow: 0,
    pauseLimitPerWindow: 2,
    totalPauseLimit: 4,
    scheduledPauseStartAt: null,
    scheduledPauseUntil: null,
    pausedAt: null,
    pauseUntil: null,
    startsAt: "2026-04-19",
    endsAt: "2026-05-19",
    pauseHistory: [],
  };

  return {
    selected: true,
    subscription: currentSubscription,
    currentSubscription,
    upcomingSubscription: null,
    currentAccessEndsAt: "2026-05-19",
    nextMembershipStartsAt: null,
    totalPaidCoverageEndsAt: "2026-05-19",
    ...overrides,
  };
};

const buildPlan = (): PlanResponse => ({
  planId: 5,
  planType: "PRO",
  accessTierGranted: "PRO",
  name: "Pro Monthly",
  description: "Unlimited access",
  monthlyPrice: 2500,
  currency: "NPR",
  monthlyDurationDays: 30,
  yearlyDurationDays: 365,
  yearlyDiscountPercent: 10,
  yearlyBaseAmount: 30000,
  yearlyBilledAmount: 27000,
  yearlySavingsAmount: 3000,
  mostPopular: true,
  active: true,
  features: ["Unlimited check-ins", "Priority access"],
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
});

const renderDashboard = (route = "/dashboard") =>
  renderWithProviders(
    <Routes>
      <Route path="*" element={<UserDashboard />} />
    </Routes>,
    { route },
  );

describe("UserDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userDashboardMocks.getDashboardSummaryApi.mockResolvedValue(buildSummary());
    userDashboardMocks.getMySubscriptionApi.mockResolvedValue(
      buildSubscriptionState(),
    );
    userDashboardMocks.getMyCheckInsApi.mockResolvedValue([]);
    userDashboardMocks.getPlansApi.mockResolvedValue([buildPlan()]);
    userDashboardMocks.getDashboardMonthlyActivityApi.mockResolvedValue(
      buildSummary().monthlyActivityCard,
    );
    userDashboardMocks.getDashboardVisitStatsApi.mockResolvedValue(
      buildSummary().memberStatsCard,
    );
  });

  it("renders user dashboard widgets consistently and exposes plans, pause, and notifications flows", async () => {
    const user = userEvent.setup();

    renderDashboard();

    expect(await screen.findByText("Pro Monthly")).toBeInTheDocument();
    expect(screen.getByText("Total Visits")).toBeInTheDocument();
    expect(screen.getByText("Top Facilities")).toBeInTheDocument();
    expect(screen.getByText("Upper Body Blast")).toBeInTheDocument();
    expect(await screen.findByText("MUSCLE HEATMAP")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /view plans/i }));
    expect(await screen.findByText("Available Plans")).toBeInTheDocument();
    expect(screen.getByText("PLAN COUNT: 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^pause$/i }));
    expect(await screen.findByText("Schedule Pause")).toBeInTheDocument();
    expect(screen.getByText("Pause summary")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /nav-notifications/i }));
    expect(await screen.findByText("NOTIFICATION INBOX")).toBeInTheDocument();
  });
});
