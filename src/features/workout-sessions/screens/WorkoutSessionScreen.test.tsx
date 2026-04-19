import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/test-utils";

const workoutSessionMocks = vi.hoisted(() => {
  let currentSession: any = null;

  return {
    getSession: () => currentSession,
    setSession: (next: any) => {
      currentSession = structuredClone(next);
    },
    getWorkoutSessionApi: vi.fn(async () => structuredClone(currentSession)),
    updateWorkoutSetApi: vi.fn(async (_logId: string, exerciseId: string, setId: string, updates: any) => {
      const exercise = currentSession.exercises.find((item: any) => item.routineLogExerciseId === exerciseId);
      const set = exercise?.sets.find((item: any) => item.routineLogSetId === setId);
      if (set) {
        Object.assign(set, updates);
      }
      return structuredClone(currentSession);
    }),
    addWorkoutSetApi: vi.fn(async (_logId: string, exerciseId: string) => {
      const exercise = currentSession.exercises.find((item: any) => item.routineLogExerciseId === exerciseId);
      exercise?.sets.push({
        routineLogSetId: `set-${exercise.sets.length + 1}`,
        setOrder: exercise.sets.length + 1,
        targetReps: 8,
        actualReps: null,
        targetWeight: 20,
        actualWeight: null,
        targetRestSeconds: 90,
        actualRestSeconds: null,
        targetDurationSeconds: null,
        actualDurationSeconds: null,
        targetDistance: null,
        actualDistance: null,
        rir: null,
        tempo: null,
        warmup: false,
        completed: false,
        completedAt: null,
      });
      return structuredClone(currentSession);
    }),
    addWorkoutExerciseApi: vi.fn(async () => {
      currentSession.exercises.push({
        routineLogExerciseId: "exercise-2",
        routineDayExerciseId: null,
        exerciseOrder: 2,
        notes: null,
        supersetGroupId: null,
        exerciseSource: "library",
        sourceExerciseId: 202,
        exerciseName: "Lateral Raise",
        equipmentName: "Dumbbell",
        coverUrl: null,
        exerciseType: "Weight Reps",
        primaryMuscles: ["Shoulders"],
        secondaryMuscles: [],
        sets: [
          {
            routineLogSetId: "set-2",
            setOrder: 1,
            targetReps: 12,
            actualReps: null,
            targetWeight: 10,
            actualWeight: null,
            targetRestSeconds: 60,
            actualRestSeconds: null,
            targetDurationSeconds: null,
            actualDurationSeconds: null,
            targetDistance: null,
            actualDistance: null,
            rir: null,
            tempo: null,
            warmup: false,
            completed: false,
            completedAt: null,
          },
        ],
      });
      return structuredClone(currentSession);
    }),
    addExerciseToRoutineApi: vi.fn(async () => undefined),
    deleteWorkoutSetApi: vi.fn(async (_logId: string, exerciseId: string, setId: string) => {
      const exercise = currentSession.exercises.find((item: any) => item.routineLogExerciseId === exerciseId);
      if (exercise) {
        exercise.sets = exercise.sets.filter((item: any) => item.routineLogSetId !== setId);
      }
      return structuredClone(currentSession);
    }),
    deleteWorkoutExerciseApi: vi.fn(async (_logId: string, exerciseId: string) => {
      currentSession.exercises = currentSession.exercises.filter(
        (item: any) => item.routineLogExerciseId !== exerciseId,
      );
      return structuredClone(currentSession);
    }),
    completeWorkoutSessionApi: vi.fn(async () => {
      currentSession.status = "COMPLETED";
      return structuredClone(currentSession);
    }),
    skipWorkoutSessionApi: vi.fn(async () => {
      currentSession.status = "SKIPPED";
      return structuredClone(currentSession);
    }),
    syncSessionToRoutineApi: vi.fn(async () => undefined),
    reorderWorkoutExercisesApi: vi.fn(async () => undefined),
    getRoutineDetailApi: vi.fn(async () => ({
      routineId: "routine-1",
      name: "Push Pull Split",
      description: null,
      routineType: "STRENGTH",
      structureType: "CUSTOM",
      isPublic: false,
      isActive: true,
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-18T00:00:00Z",
      days: [
        {
          routineDayId: "day-1",
          name: "Push Day",
          dayOrder: 1,
          weekDay: null,
          supersetGroups: [],
          exercises: [
            {
              routineDayExerciseId: "template-1",
              exerciseOrder: 1,
              notes: null,
              exerciseSource: "library",
              sourceExerciseId: 101,
              exerciseName: "Bench Press",
              equipmentName: "Barbell",
              coverUrl: null,
              exerciseType: "Weight Reps",
              primaryMuscles: ["Chest"],
              secondaryMuscles: ["Triceps"],
              supersetGroupId: null,
              sets: [
                {
                  routineSetTemplateId: "template-set-1",
                  setNo: 1,
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
    })),
  };
});

vi.mock("@/features/workout-sessions/components/WorkoutSetRow", () => ({
  default: ({
    set,
    onUpdateSet,
    onRemoveSet,
  }: {
    set: { routineLogSetId: string };
    onUpdateSet: (setId: string, updates: any) => void;
    onRemoveSet: (setId: string) => void;
  }) => (
    <tr>
      <td colSpan={8}>
        <button
          type="button"
          onClick={() =>
            onUpdateSet(set.routineLogSetId, {
              completed: true,
              actualReps: 5,
              actualWeight: 80,
            })
          }
        >
          mark-set-complete
        </button>
        <button type="button" onClick={() => onRemoveSet(set.routineLogSetId)}>
          remove-set-{set.routineLogSetId}
        </button>
      </td>
    </tr>
  ),
  getVisibleFieldsForExerciseType: () => ({
    weight: true,
    reps: true,
    duration: false,
    distance: false,
  }),
}));

vi.mock("@/features/workout-sessions/components/WorkoutSummarySheet", () => ({
  default: ({
    open,
    onComplete,
  }: {
    open: boolean;
    onComplete: () => void;
  }) =>
    open ? (
      <div>
        <div>WORKOUT SUMMARY SHEET</div>
        <button type="button" onClick={onComplete}>
          confirm-complete-session
        </button>
      </div>
    ) : null,
}));

vi.mock("@/features/routines/components/ExerciseDetailSheet", () => ({
  default: () => <div>EXERCISE DETAIL SHEET</div>,
}));

vi.mock("@/features/exercises/components/ExerciseLibraryPanel", () => ({
  ExerciseLibraryPanel: ({
    onAddExercise,
  }: {
    onAddExercise: (exercise: any) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onAddExercise({
          key: "library-202",
          source: "library",
          id: 202,
          name: "Lateral Raise",
          equipmentName: "Dumbbell",
          coverUrl: null,
          exerciseType: "Weight Reps",
          primaryMuscles: ["Shoulders"],
        })
      }
    >
      library-add-exercise
    </button>
  ),
  ExerciseLibrarySheet: ({
    isOpen,
    onAddExercise,
  }: {
    isOpen: boolean;
    onAddExercise: (exercise: any) => void;
  }) =>
    isOpen ? (
      <button
        type="button"
        onClick={() =>
          onAddExercise({
            key: "library-202",
            source: "library",
            id: 202,
            name: "Lateral Raise",
            equipmentName: "Dumbbell",
            coverUrl: null,
            exerciseType: "Weight Reps",
            primaryMuscles: ["Shoulders"],
          })
        }
      >
        sheet-add-exercise
      </button>
    ) : null,
}));

vi.mock("@/features/workout-sessions/workoutSessionApi", () => ({
  workoutSessionQueryKeys: {
    detail: (id: string) => ["workout-detail", id],
    today: () => ["workout-today"],
  },
  getWorkoutSessionApi: workoutSessionMocks.getWorkoutSessionApi,
  updateWorkoutSetApi: workoutSessionMocks.updateWorkoutSetApi,
  addWorkoutSetApi: workoutSessionMocks.addWorkoutSetApi,
  addWorkoutExerciseApi: workoutSessionMocks.addWorkoutExerciseApi,
  addExerciseToRoutineApi: workoutSessionMocks.addExerciseToRoutineApi,
  deleteWorkoutSetApi: workoutSessionMocks.deleteWorkoutSetApi,
  deleteWorkoutExerciseApi: workoutSessionMocks.deleteWorkoutExerciseApi,
  completeWorkoutSessionApi: workoutSessionMocks.completeWorkoutSessionApi,
  skipWorkoutSessionApi: workoutSessionMocks.skipWorkoutSessionApi,
  syncSessionToRoutineApi: workoutSessionMocks.syncSessionToRoutineApi,
  reorderWorkoutExercisesApi: workoutSessionMocks.reorderWorkoutExercisesApi,
}));

vi.mock("@/features/routines/routineApi", () => ({
  routineQueryKeys: {
    detail: (id: string) => ["routine-detail", id],
    list: () => ["routine-list"],
  },
  getRoutineDetailApi: workoutSessionMocks.getRoutineDetailApi,
}));

import WorkoutSessionScreen from "@/features/workout-sessions/screens/WorkoutSessionScreen";

const buildSession = (overrides: Record<string, unknown> = {}) => ({
  routineLogId: "log-1",
  mode: "ROUTINE",
  routineId: "routine-1",
  routineName: "Push Pull Split",
  routineDayId: "day-1",
  routineDayName: "Push Day",
  title: "Push Session",
  sessionDate: "2026-04-18T08:00:00Z",
  status: "IN_PROGRESS",
  startedAt: "2026-04-18T08:00:00Z",
  endedAt: null,
  durationSeconds: null,
  notes: null,
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
          actualReps: null,
          targetWeight: 80,
          actualWeight: null,
          targetRestSeconds: 90,
          actualRestSeconds: null,
          targetDurationSeconds: null,
          actualDurationSeconds: null,
          targetDistance: null,
          actualDistance: null,
          rir: null,
          tempo: null,
          warmup: false,
          completed: false,
          completedAt: null,
        },
      ],
    },
  ],
  ...overrides,
});

describe("WorkoutSessionScreen (FE-WORKOUT-01 / FE-WORKOUT-02 / FE-WORKOUT-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workoutSessionMocks.setSession(buildSession());
  });

  const renderSessionScreen = () =>
    renderWithProviders(
      <Routes>
        <Route path="/workout-session/:routineLogId" element={<WorkoutSessionScreen />} />
      </Routes>,
      { route: "/workout-session/log-1" },
    );

  it("renders missing, completed, skipped, and active session states", async () => {
    const user = userEvent.setup();
    workoutSessionMocks.getWorkoutSessionApi.mockRejectedValueOnce(new Error("Missing"));

    const missingView = renderSessionScreen();

    expect(await screen.findByText("Session not found")).toBeInTheDocument();
    missingView.unmount();

    workoutSessionMocks.setSession(buildSession({ status: "COMPLETED", endedAt: "2026-04-18T08:45:00Z" }));
    const completedView = renderSessionScreen();
    expect(await screen.findByText("Session completed")).toBeInTheDocument();
    completedView.unmount();

    workoutSessionMocks.setSession(buildSession({ status: "SKIPPED", endedAt: "2026-04-18T08:10:00Z" }));
    const skippedView = renderSessionScreen();
    expect(await screen.findByText("Session skipped")).toBeInTheDocument();
    skippedView.unmount();

    workoutSessionMocks.setSession(buildSession());
    renderSessionScreen();

    expect(await screen.findByText("Complete at least one set to finish the workout")).toBeInTheDocument();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /skip/i }));
    await waitFor(() => {
      expect(workoutSessionMocks.skipWorkoutSessionApi).toHaveBeenCalled();
    });
  });

  it("supports set updates, add/remove mutations, sync-to-routine, and completion", async () => {
    const user = userEvent.setup();

    const editingView = renderSessionScreen();

    expect(await screen.findByText("Bench Press")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mark-set-complete/i }));
    await waitFor(() => {
      expect(workoutSessionMocks.updateWorkoutSetApi).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /add set/i }));
    await waitFor(() => {
      expect(workoutSessionMocks.addWorkoutSetApi).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /remove-set-set-1/i }));
    await waitFor(() => {
      expect(workoutSessionMocks.deleteWorkoutSetApi).toHaveBeenCalledWith("log-1", "exercise-1", "set-1");
    });

    await user.click(screen.getByRole("button", { name: /add exercise/i }));
    await user.click(await screen.findByRole("button", { name: /sheet-add-exercise/i }));
    await waitFor(() => {
      expect(workoutSessionMocks.addWorkoutExerciseApi).toHaveBeenCalled();
    });

    expect(await screen.findByText("Lateral Raise")).toBeInTheDocument();
    const updateRoutineButtons = screen.getAllByRole("button", { name: /update routine/i });
    expect(updateRoutineButtons.length).toBeGreaterThan(0);

    await user.click(updateRoutineButtons[0]);
    await waitFor(() => {
      expect(workoutSessionMocks.syncSessionToRoutineApi).toHaveBeenCalled();
    });

    const removeExerciseButtons = screen.getAllByRole("button", { name: /remove exercise/i });
    expect(removeExerciseButtons.length).toBeGreaterThan(0);
    await user.click(removeExerciseButtons[0]);
    await waitFor(() => {
      expect(workoutSessionMocks.deleteWorkoutExerciseApi).toHaveBeenCalledWith("log-1", "exercise-1");
    });

    editingView.unmount();

    workoutSessionMocks.setSession(buildSession());
    renderSessionScreen();

    expect(await screen.findByText("Bench Press")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /mark-set-complete/i }));
    await waitFor(() => {
      expect(workoutSessionMocks.updateWorkoutSetApi).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^complete$/i })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /^complete$/i }));
    expect(await screen.findByText("WORKOUT SUMMARY SHEET")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /confirm-complete-session/i }));
    await waitFor(() => {
      expect(workoutSessionMocks.completeWorkoutSessionApi).toHaveBeenCalled();
    });
  });
});
