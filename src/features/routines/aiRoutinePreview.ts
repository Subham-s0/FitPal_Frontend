import type { AiRoutinePreviewResponse } from "@/features/routines/aiRoutineTypes";
import type { Routine } from "@/features/routines/routineTypes";
import { deriveGoalFromRoutineType } from "@/features/routines/routineTypes";
import { createUuid } from "@/shared/lib/uuid";

export function mapAiRoutinePreviewToRoutine(preview: AiRoutinePreviewResponse): Routine {
  return {
    id: createUuid(),
    backendId: null,
    name: preview.routineName,
    description: preview.description || preview.selectedSuggestion.description || "",
    goal: deriveGoalFromRoutineType(preview.routineType),
    routineType: preview.routineType,
    structureType: "NUMBERED",
    isPublic: false,
    isActive: false,
    syncState: "draft",
    lastSyncError: null,
    days: preview.days.map((day) => ({
      id: createUuid(),
      backendId: null,
      name: day.label,
      dayOrder: day.day,
      weekDay: null,
      description: day.summary,
      supersetGroups: [],
      exercises: day.exercises.map((exercise) => ({
        id: createUuid(),
        backendId: null,
        source: exercise.exerciseSource,
        sourceExerciseId: exercise.sourceExerciseId,
        name: exercise.exerciseName,
        equipmentName: exercise.equipmentName,
        coverUrl: exercise.coverUrl,
        exerciseType: exercise.exerciseType,
        primaryMuscles: exercise.primaryMuscles,
        secondaryMuscles: exercise.secondaryMuscles,
        notes: exercise.notes || "",
        supersetGroupId: null,
        sets: exercise.sets.map((set, setIndex) => ({
          id: createUuid(),
          backendId: null,
          setOrder: set.setNo ?? setIndex + 1,
          targetWeight: set.targetWeight,
          targetReps: set.targetReps,
          targetDurationSeconds: set.targetDurationSeconds,
          targetDistance: set.targetDistance,
          targetRestSeconds: set.targetRestSeconds,
        })),
      })),
    })),
  };
}
