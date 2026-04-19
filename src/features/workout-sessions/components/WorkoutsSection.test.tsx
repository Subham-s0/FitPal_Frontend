import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/test-utils";

const workoutsSectionMocks = vi.hoisted(() => ({
  getWorkoutInsightsApi: vi.fn(),
  getWorkoutSessionHistoryApi: vi.fn(),
  getWorkoutSessionHistoryPaginatedApi: vi.fn(),
  getWorkoutSessionApi: vi.fn(),
  deleteWorkoutSessionApi: vi.fn(),
}));

vi.mock("@/features/user-dashboard/components/UserSectionShell", () => ({
  default: ({
    title,
    children,
  }: {
    title: string;
    children: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/features/workout-sessions/components/UpcomingSession", () => ({
  default: ({
    onOpenRoutines,
  }: {
    onOpenRoutines?: () => void;
  }) => (
    <div>
      <div>UPCOMING SESSION CARD</div>
      <button type="button" onClick={() => onOpenRoutines?.()}>
        open-routines
      </button>
    </div>
  ),
}));

vi.mock("@/features/workout-sessions/workoutSessionApi", () => ({
  workoutSessionQueryKeys: {
    all: ["workout-session"],
    history: () => ["workout-history"],
    historyPaginated: (page: number, size: number) => ["workout-history-page", page, size],
    insights: (range: string) => ["workout-insights", range],
    detail: (id: string) => ["workout-detail", id],
  },
  getWorkoutInsightsApi: workoutsSectionMocks.getWorkoutInsightsApi,
  getWorkoutSessionHistoryApi: workoutsSectionMocks.getWorkoutSessionHistoryApi,
  getWorkoutSessionHistoryPaginatedApi: workoutsSectionMocks.getWorkoutSessionHistoryPaginatedApi,
  getWorkoutSessionApi: workoutsSectionMocks.getWorkoutSessionApi,
  deleteWorkoutSessionApi: workoutsSectionMocks.deleteWorkoutSessionApi,
}));

import WorkoutsSection from "@/features/workout-sessions/components/WorkoutsSection";

describe("WorkoutsSection (FE-WORKOUT-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workoutsSectionMocks.getWorkoutSessionHistoryApi.mockResolvedValue([
      {
        routineLogId: "log-1",
        mode: "ROUTINE",
        routineId: "routine-1",
        routineName: "Push Pull Split",
        routineDayId: "day-1",
        routineDayName: "Push Day",
        title: "Push Session",
        sessionDate: "2026-04-18T08:00:00Z",
        status: "COMPLETED",
        startedAt: "2026-04-18T08:00:00Z",
        endedAt: "2026-04-18T08:45:00Z",
        durationSeconds: 2700,
        exerciseCount: 2,
        completedSetCount: 6,
      },
    ]);
    workoutsSectionMocks.getWorkoutSessionHistoryPaginatedApi.mockResolvedValue({
      items: [
        {
          routineLogId: "log-1",
          mode: "ROUTINE",
          routineId: "routine-1",
          routineName: "Push Pull Split",
          routineDayId: "day-1",
          routineDayName: "Push Day",
          title: "Push Session",
          sessionDate: "2026-04-18T08:00:00Z",
          status: "COMPLETED",
          startedAt: "2026-04-18T08:00:00Z",
          endedAt: "2026-04-18T08:45:00Z",
          durationSeconds: 2700,
          exerciseCount: 2,
          completedSetCount: 6,
        },
      ],
      page: 0,
      size: 10,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
    workoutsSectionMocks.getWorkoutInsightsApi.mockResolvedValue({
      range: "7d",
      chartData: [],
    });
    workoutsSectionMocks.getWorkoutSessionApi.mockResolvedValue({
      routineLogId: "log-1",
      mode: "ROUTINE",
      routineId: "routine-1",
      routineName: "Push Pull Split",
      routineDayId: "day-1",
      routineDayName: "Push Day",
      title: "Push Session",
      sessionDate: "2026-04-18T08:00:00Z",
      status: "COMPLETED",
      startedAt: "2026-04-18T08:00:00Z",
      endedAt: "2026-04-18T08:45:00Z",
      durationSeconds: 2700,
      notes: "Solid session",
      exercises: [
        {
          routineLogExerciseId: "exercise-1",
          routineDayExerciseId: "template-1",
          exerciseOrder: 1,
          notes: null,
          supersetGroupId: null,
          exerciseSource: "library",
          sourceExerciseId: 101,
          exerciseName: "Bench Press",
          equipmentName: "Barbell",
          coverUrl: null,
          exerciseType: "Weight Reps",
          primaryMuscles: ["Chest"],
          secondaryMuscles: ["Triceps"],
          sets: [
            {
              routineLogSetId: "set-1",
              setOrder: 1,
              targetReps: 5,
              actualReps: 5,
              targetWeight: 80,
              actualWeight: 80,
              targetRestSeconds: 90,
              actualRestSeconds: null,
              targetDurationSeconds: null,
              actualDurationSeconds: null,
              targetDistance: null,
              actualDistance: null,
              rir: null,
              tempo: null,
              warmup: false,
              completed: true,
              completedAt: "2026-04-18T08:10:00Z",
            },
          ],
        },
      ],
    });
  });

  it("renders upcoming, history detail, and empty insights states safely", async () => {
    const user = userEvent.setup();
    const onOpenRoutines = vi.fn();

    renderWithProviders(<WorkoutsSection onOpenRoutines={onOpenRoutines} />);

    expect(await screen.findByText("UPCOMING SESSION CARD")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open-routines/i }));
    expect(onOpenRoutines).toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: /workout logs/i }));
    expect(await screen.findByText("Push Session")).toBeInTheDocument();

    await user.click(screen.getByText("Push Session"));
    expect(await screen.findByText("Session Notes")).toBeInTheDocument();
    expect(screen.getByText("Solid session")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByText("Push Session")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /today/i }));
    expect(await screen.findByText("UPCOMING SESSION CARD")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /insights/i }));
    expect(
      await screen.findByText(
        "No workout insight data in this range yet. Complete a few sessions and refresh insights.",
      ),
    ).toBeInTheDocument();
  });
});
