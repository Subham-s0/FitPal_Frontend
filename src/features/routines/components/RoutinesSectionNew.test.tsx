import type { ReactNode } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/test-utils";

const routineMocks = vi.hoisted(() => {
  let currentRoutines: any[] = [];

  return {
    get currentRoutines() {
      return currentRoutines;
    },
    setRoutines(next: any[]) {
      currentRoutines = next;
    },
    loadRoutines: vi.fn(() => currentRoutines.map((routine) => structuredClone(routine))),
    deleteRoutine: vi.fn(async (routineId: string) => {
      currentRoutines = currentRoutines.filter((routine) => routine.id !== routineId);
    }),
    updateRoutine: vi.fn(async (routineId: string, nextRoutine: any) => {
      currentRoutines = currentRoutines.map((routine) =>
        routine.id === routineId ? { ...nextRoutine } : routine,
      );
      return nextRoutine;
    }),
    setActiveRoutine: vi.fn(async (routineId: string) => {
      currentRoutines = currentRoutines.map((routine) => ({
        ...routine,
        isActive: routine.id === routineId,
      }));
    }),
    addRoutine: vi.fn(async (routine: any) => {
      currentRoutines = [...currentRoutines, { ...routine }];
      return routine;
    }),
    resolveRoutineStartIds: vi.fn(() => ({
      routineId: "backend-routine-1",
      routineDayId: "backend-day-1",
    })),
    refreshRoutineStore: vi.fn(async () => currentRoutines.map((routine) => structuredClone(routine))),
    getMyRoutineSettingsApi: vi.fn(async () => ({
      activeSetting: {
        userRoutineSettingId: "setting-1",
        routineId: "backend-routine-1",
        routineName: "Push Pull Split",
        structureType: "CUSTOM",
        routineType: "STRENGTH",
        active: true,
        activatedAt: "2026-04-18T00:00:00Z",
        lastSessionAt: null,
        currentDayId: "backend-day-1",
        currentDayName: "Push Day",
        currentDayOrder: 1,
        totalDays: 1,
      },
    })),
    getExerciseByIdApi: vi.fn(async () => ({
      exerciseId: 101,
      secondaryMuscles: ["Triceps"],
    })),
    prepareAiRoutineSuggestionsApi: vi.fn(),
    generateAiRoutinePreviewApi: vi.fn(),
    startWorkoutSessionApi: vi.fn(async () => ({
      routineLogId: "log-1",
    })),
  };
});

vi.mock("@/features/user-dashboard/components/UserSectionShell", () => ({
  default: ({ title, children }: { title?: string; children: ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

vi.mock("@/features/routines/components/MuscleHeatmap", () => ({
  default: () => <div>MUSCLE HEATMAP</div>,
}));

vi.mock("@/features/routines/components/InlineRoutineEditor", () => ({
  default: ({
    routineId,
    onClose,
  }: {
    routineId: string | null;
    onClose: () => void;
  }) => (
    <div>
      <div>INLINE EDITOR:{routineId ?? "new"}</div>
      <button type="button" onClick={onClose}>
        close-inline-editor
      </button>
    </div>
  ),
}));

vi.mock("@/features/routines/components/AiRoutineGenerationDialog", () => ({
  default: ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => (
    <div>
      <div>AI ROUTINE DIALOG</div>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-ai-dialog
      </button>
    </div>
  ),
}));

vi.mock("@/features/routines/components/AiRoutinePreviewPanel", () => ({
  default: () => <div>AI PREVIEW PANEL</div>,
}));

vi.mock("@/features/routines/components/StartWorkoutDayDialog", () => ({
  default: () => <div>START WORKOUT DAY DIALOG</div>,
}));

vi.mock("@/features/routines/routineStore", () => ({
  loadRoutines: routineMocks.loadRoutines,
  deleteRoutine: routineMocks.deleteRoutine,
  updateRoutine: routineMocks.updateRoutine,
  setActiveRoutine: routineMocks.setActiveRoutine,
  addRoutine: routineMocks.addRoutine,
  resolveRoutineStartIds: routineMocks.resolveRoutineStartIds,
  refreshRoutineStore: routineMocks.refreshRoutineStore,
}));

vi.mock("@/features/routines/routineApi", () => ({
  routineQueryKeys: {
    settings: () => ["routine-settings"],
    list: () => ["routine-list"],
    detail: (routineId: string) => ["routine-detail", routineId],
  },
  getMyRoutineSettingsApi: routineMocks.getMyRoutineSettingsApi,
}));

vi.mock("@/features/exercises/api", () => ({
  getExerciseByIdApi: routineMocks.getExerciseByIdApi,
}));

vi.mock("@/features/routines/aiRoutineApi", () => ({
  prepareAiRoutineSuggestionsApi: routineMocks.prepareAiRoutineSuggestionsApi,
  generateAiRoutinePreviewApi: routineMocks.generateAiRoutinePreviewApi,
}));

vi.mock("@/features/workout-sessions/workoutSessionApi", () => ({
  workoutSessionQueryKeys: {
    today: () => ["today-workout"],
  },
  startWorkoutSessionApi: routineMocks.startWorkoutSessionApi,
}));

import RoutinesSectionNew from "@/features/routines/components/RoutinesSectionNew";

const buildRoutine = (overrides: Record<string, unknown> = {}) => ({
  id: "routine-1",
  backendId: "backend-routine-1",
  name: "Push Pull Split",
  description: "Strength block",
  goal: "Build strength",
  routineType: "STRENGTH",
  structureType: "CUSTOM",
  isPublic: false,
  isActive: false,
  days: [
    {
      id: "day-1",
      backendId: "backend-day-1",
      name: "Push Day",
      dayOrder: 1,
      exercises: [
        {
          id: "exercise-1",
          backendId: "backend-exercise-1",
          source: "library",
          sourceExerciseId: 101,
          name: "Bench Press",
          equipmentName: "Barbell",
          coverUrl: null,
          exerciseType: "Weight Reps",
          primaryMuscles: ["Chest"],
          secondaryMuscles: [],
          notes: "",
          sets: [
            {
              id: "set-1",
              backendId: "backend-set-1",
              setOrder: 1,
              targetWeight: 80,
              targetReps: 5,
              targetDurationSeconds: null,
              targetDistance: null,
              targetRestSeconds: 90,
            },
          ],
        },
      ],
    },
  ],
  ...overrides,
});

describe("RoutinesSectionNew (FE-ROUTINE-01 / FE-ROUTINE-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routineMocks.setRoutines([]);
  });

  it("renders the empty retrieval state and opens the new-routine editor", async () => {
    const user = userEvent.setup();

    renderWithProviders(<RoutinesSectionNew />);

    expect(await screen.findByText("No routines yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate with ai/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /new routine/i }));

    await waitFor(() => {
      expect(routineMocks.addRoutine).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/INLINE EDITOR:/)).toBeInTheDocument();
  });

  it("renders routine details and supports set-active and delete actions", async () => {
    const user = userEvent.setup();
    routineMocks.setRoutines([
      buildRoutine(),
      buildRoutine({
        id: "routine-2",
        backendId: "backend-routine-2",
        name: "Conditioning",
        isActive: true,
      }),
    ]);

    renderWithProviders(<RoutinesSectionNew />);

    const heading = await screen.findByText("Push Pull Split");
    const card = heading.closest("div[class]")?.parentElement?.parentElement;
    expect(card).not.toBeNull();

    await user.click(card!.querySelectorAll("button")[0] as HTMLButtonElement);
    expect(await screen.findByText("Push Day")).toBeInTheDocument();
    expect(await screen.findByText("MUSCLE HEATMAP")).toBeInTheDocument();

    await user.click(card!.querySelectorAll("button")[1] as HTMLButtonElement);
    await user.click(await screen.findByRole("button", { name: /set as active/i }));

    await waitFor(() => {
      expect(routineMocks.setActiveRoutine).toHaveBeenCalledWith("routine-1");
    });

    await user.click(card!.querySelectorAll("button")[1] as HTMLButtonElement);
    await user.click(await screen.findByRole("button", { name: /^delete$/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete routine")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /delete routine/i }));

    await waitFor(() => {
      expect(routineMocks.deleteRoutine).toHaveBeenCalledWith("routine-1");
    });
  });
});
