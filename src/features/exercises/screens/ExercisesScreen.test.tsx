import type { ReactNode } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/test-utils";

const exerciseMocks = vi.hoisted(() => ({
  getExerciseLibraryApi: vi.fn(),
  getExerciseLibraryEquipmentApi: vi.fn(),
  getExerciseLibraryMusclesApi: vi.fn(),
  getExerciseByIdApi: vi.fn(),
  getMyCustomExercisesApi: vi.fn(),
  getMyCustomExerciseByIdApi: vi.fn(),
  getMyExerciseStatsApi: vi.fn(),
  getMyExerciseHistoryApi: vi.fn(),
  deleteCustomExerciseApi: vi.fn(),
}));

vi.mock("@/features/auth/hooks", () => ({
  useAuthState: () => ({
    accessToken: "token",
    accountId: 1,
    email: "member@fitpal.com",
    role: "USER",
  }),
}));

vi.mock("@/features/exercises/api", () => ({
  getExerciseLibraryApi: exerciseMocks.getExerciseLibraryApi,
  getExerciseLibraryEquipmentApi: exerciseMocks.getExerciseLibraryEquipmentApi,
  getExerciseLibraryMusclesApi: exerciseMocks.getExerciseLibraryMusclesApi,
  getExerciseByIdApi: exerciseMocks.getExerciseByIdApi,
  getMyCustomExercisesApi: exerciseMocks.getMyCustomExercisesApi,
  getMyCustomExerciseByIdApi: exerciseMocks.getMyCustomExerciseByIdApi,
  getMyExerciseStatsApi: exerciseMocks.getMyExerciseStatsApi,
  getMyExerciseHistoryApi: exerciseMocks.getMyExerciseHistoryApi,
  deleteCustomExerciseApi: exerciseMocks.deleteCustomExerciseApi,
}));

vi.mock("@/features/exercises/components/AddCustomExerciseModal", () => ({
  AddCustomExerciseModal: ({
    isOpen,
    onClose,
    onCreated,
  }: {
    isOpen: boolean;
    onClose: (reason?: "dismiss" | "success") => void;
    onCreated?: (exercise: any) => void;
  }) =>
    isOpen ? (
      <div>
        <div>CUSTOM EXERCISE MODAL</div>
        <button
          type="button"
          onClick={() => {
            onCreated?.({
              customExerciseId: 91,
              name: "Band Face Pull",
              equipment: { equipmentId: 4, name: "Bands" },
              coverImgUrl: null,
              coverPublicId: null,
              exerciseType: "Reps Only",
              primaryMuscle: { muscleId: 9, name: "Rear Delts" },
              secondaryMuscles: [],
            });
            onClose("success");
          }}
        >
          create-custom-exercise
        </button>
      </div>
    ) : null,
}));

import ExercisesScreen from "@/features/exercises/screens/ExercisesScreen";

const buildLibrarySummary = (overrides: Record<string, unknown> = {}) => ({
  exerciseId: 1,
  name: "Bench Press",
  equipmentName: "Barbell",
  coverUrl: null,
  exerciseType: "Weight Reps",
  popular: true,
  primaryMuscles: ["Chest"],
  ...overrides,
});

const buildExerciseDetail = (overrides: Record<string, unknown> = {}) => ({
  exerciseId: 1,
  name: "Bench Press",
  equipment: { equipmentId: 1, name: "Barbell" },
  coverUrl: null,
  videoUrl: null,
  exerciseType: "Weight Reps",
  popular: true,
  muscleAssignments: [
    { exerciseMuscleId: 1, muscleId: 1, muscleName: "Chest", muscleType: "PRIMARY" },
    { exerciseMuscleId: 2, muscleId: 2, muscleName: "Triceps", muscleType: "SECONDARY" },
  ],
  howToSections: [{ howToSectionId: 1, displayOrder: 1, content: "Lower under control." }],
  ...overrides,
});

describe("ExercisesScreen (FE-EX-01 / FE-EX-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exerciseMocks.getExerciseLibraryEquipmentApi.mockResolvedValue([
      { equipmentId: 1, name: "Barbell" },
    ]);
    exerciseMocks.getExerciseLibraryMusclesApi.mockResolvedValue([
      { muscleId: 1, name: "Chest" },
    ]);
    exerciseMocks.getMyExerciseStatsApi.mockResolvedValue({
      trendLabel: "Load",
      trendUnit: "kg",
      trendPoints: [
        {
          periodStart: "2026-04-01",
          periodLabel: "Apr 1",
          value: 80,
          displayValue: "80",
          detailLabel: "Top set",
        },
      ],
      personalBest: {
        metricLabel: "PR",
        value: 100,
        unit: "kg",
        displayValue: "100",
        detailLabel: "Best single",
        achievedOn: "2026-04-18",
      },
      estimatedBest: null,
    });
    exerciseMocks.getMyExerciseHistoryApi.mockResolvedValue({
      items: [
        {
          routineLogId: "log-1",
          sessionDate: "2026-04-18T08:00:00Z",
          sessionTitle: "Push Session",
          routineName: "Push Pull Split",
          routineDayName: "Push Day",
          setCount: 3,
          completedSetCount: 3,
          summaryLabel: "3 working sets",
          performanceLabel: "80kg x 5",
        },
      ],
      page: 0,
      size: 10,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
    exerciseMocks.getMyCustomExercisesApi.mockResolvedValue([]);
    exerciseMocks.getMyCustomExerciseByIdApi.mockResolvedValue({
      customExerciseId: 91,
      name: "Band Face Pull",
      equipment: { equipmentId: 4, name: "Bands" },
      coverImgUrl: null,
      coverPublicId: null,
      exerciseType: "Reps Only",
      primaryMuscle: { muscleId: 9, name: "Rear Delts" },
      secondaryMuscles: [],
    });
    exerciseMocks.deleteCustomExerciseApi.mockResolvedValue(undefined);
  });

  it("renders library browsing, search empty state, and exercise detail tabs", async () => {
    const user = userEvent.setup();
    exerciseMocks.getExerciseLibraryApi.mockImplementation(async (request?: { query?: string }) =>
      request?.query
        ? []
        : [
            buildLibrarySummary(),
            buildLibrarySummary({
              exerciseId: 2,
              name: "Pull Up",
              equipmentName: "Bodyweight",
              popular: false,
              primaryMuscles: ["Back"],
            }),
          ],
    );
    exerciseMocks.getExerciseByIdApi.mockResolvedValue(buildExerciseDetail());

    renderWithProviders(<ExercisesScreen />);

    expect(await screen.findByText("Exercise Library")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search exercises...")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search exercises..."), "zzz");
    await waitFor(() => {
      expect(screen.getByText("No exercises found")).toBeInTheDocument();
    });

    await user.clear(screen.getByPlaceholderText("Search exercises..."));
    await user.click(await screen.findByText("Bench Press"));

    expect(
      await screen.findByRole("heading", { name: /bench press/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stats" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByText("Exercise History")).toBeInTheDocument();
    expect(screen.getByText("3 working sets")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "How To" }));
    expect(await screen.findByText("Lower under control.")).toBeInTheDocument();
  });

  it("creates and deletes a custom exercise while preserving the owner-scoped detail state", async () => {
    const user = userEvent.setup();
    exerciseMocks.getExerciseLibraryApi.mockResolvedValue([buildLibrarySummary()]);
    exerciseMocks.getExerciseByIdApi.mockResolvedValue(buildExerciseDetail());
    exerciseMocks.getMyCustomExercisesApi.mockResolvedValue([
      {
        customExerciseId: 91,
        name: "Band Face Pull",
        equipment: { equipmentId: 4, name: "Bands" },
        coverImgUrl: null,
        coverPublicId: null,
        exerciseType: "Reps Only",
        primaryMuscle: { muscleId: 9, name: "Rear Delts" },
        secondaryMuscles: [],
      },
    ]);

    renderWithProviders(<ExercisesScreen />);

    expect(await screen.findByText("Exercise Library")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /\+ custom/i }));
    expect(await screen.findByText("CUSTOM EXERCISE MODAL")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "create-custom-exercise" }));

    expect(
      await screen.findByRole("heading", { name: /band face pull/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Remove" }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete custom exercise")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /delete exercise/i }));

    await waitFor(() => {
      expect(exerciseMocks.deleteCustomExerciseApi).toHaveBeenCalledWith(91);
    });
  });
});
