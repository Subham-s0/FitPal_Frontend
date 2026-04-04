import type { ExerciseHistorySource, ExerciseTrendRange } from "./model";

/**
 * Centralized query keys for the exercises feature.
 * 
 * Key structure:
 * - exercises.all: Root key for all exercise queries
 * - exercises.library: Exercise library (catalog) queries
 * - exercises.custom: User's custom exercises
 * - exercises.stats: Exercise statistics/trends
 * - exercises.history: Exercise workout history
 */
export const exerciseQueryKeys = {
  // Root key
  all: ["exercises"] as const,

  // Exercise library (catalog)
  library: () => [...exerciseQueryKeys.all, "library"] as const,
  libraryList: (query?: string, muscleId?: number | null, equipmentId?: number | null) =>
    [...exerciseQueryKeys.library(), "list", query ?? "", muscleId ?? null, equipmentId ?? null] as const,
  libraryDetail: (exerciseId: number | null) =>
    [...exerciseQueryKeys.library(), "detail", exerciseId] as const,

  // Library filters (muscles, equipment)
  filters: () => [...exerciseQueryKeys.library(), "filters"] as const,
  muscles: () => [...exerciseQueryKeys.filters(), "muscles"] as const,
  equipment: () => [...exerciseQueryKeys.filters(), "equipment"] as const,

  // Custom exercises
  custom: () => [...exerciseQueryKeys.all, "custom"] as const,
  customList: () => [...exerciseQueryKeys.custom(), "list"] as const,
  customDetail: (customExerciseId: number | null) =>
    [...exerciseQueryKeys.custom(), "detail", customExerciseId] as const,

  // Exercise stats and history (for detail views)
  stats: (source: ExerciseHistorySource | null, exerciseId: number | null, range: ExerciseTrendRange) =>
    [...exerciseQueryKeys.all, "stats", source, exerciseId, range] as const,
  history: (source: ExerciseHistorySource | null, exerciseId: number | null, page: number) =>
    [...exerciseQueryKeys.all, "history", source, exerciseId, page] as const,
};

// Type helper for exercise source references
export type ExerciseRef = {
  source: "library" | "custom";
  id: number;
};
