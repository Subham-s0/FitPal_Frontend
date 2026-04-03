import type { ExerciseItem } from "@/features/exercises";
import type { RoutineExercise } from "@/features/routines/routineTypes";

export type ExerciseDetailSource = "library" | "custom";

export interface ExerciseDetailPreview {
  key: string;
  source: ExerciseDetailSource;
  id: number;
  name: string;
  equipmentName: string | null;
  coverUrl: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

export function createExerciseDetailPreviewFromRoutineExercise(
  exercise: RoutineExercise
): ExerciseDetailPreview {
  return {
    key: `${exercise.source}-${exercise.sourceExerciseId}`,
    source: exercise.source,
    id: exercise.sourceExerciseId,
    name: exercise.name,
    equipmentName: exercise.equipmentName,
    coverUrl: exercise.coverUrl,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
  };
}

export function createExerciseDetailPreviewFromExerciseItem(
  exercise: ExerciseItem
): ExerciseDetailPreview {
  return {
    key: exercise.key,
    source: exercise.source,
    id: exercise.id,
    name: exercise.name,
    equipmentName: exercise.equipmentName,
    coverUrl: exercise.coverUrl,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
  };
}

