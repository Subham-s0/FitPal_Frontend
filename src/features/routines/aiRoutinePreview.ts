import type { AiRoutinePreviewResponse } from "@/features/routines/aiRoutineTypes";
import type { Routine } from "@/features/routines/routineTypes";
import { deriveGoalFromRoutineType } from "@/features/routines/routineTypes";

export function mapAiRoutinePreviewToRoutine(preview: AiRoutinePreviewResponse): Routine {
  return {
    id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      backendId: null,
      name: day.label,
      dayOrder: day.day,
      weekDay: null,
      description: day.summary,
      supersetGroups: [],
      exercises: day.exercises.map((exercise) => ({
        id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
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
