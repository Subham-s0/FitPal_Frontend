import type { ExerciseType, ExerciseLibrarySummaryResponse, CustomExerciseResponse } from "@/features/exercises/model";

// ============================================
// FRONTEND-ONLY TYPES (for localStorage persistence)
// ============================================

export interface RoutineSet {
  id: string;
  setOrder: number;
  targetWeight: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  targetDistance: number | null;
  targetRestSeconds: number | null;
}

export interface RoutineExercise {
  id: string;
  source: "library" | "custom";
  sourceExerciseId: number;
  name: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  notes: string;
  defaultRestSeconds: number;
  sets: RoutineSet[];
}

export interface WorkoutDay {
  id: string;
  name: string;
  dayOrder: number;
  description?: string;
  exercises: RoutineExercise[];
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  goal: string;
  isActive: boolean;
  days: WorkoutDay[];
}

// ============================================
// RESPONSE TYPES (from backend)
// ============================================

export interface RoutineSetTemplateResponse {
  routineSetTemplateId: string;
  setOrder: number;
  targetWeight: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  targetDistance: number | null;
  targetRestSeconds: number | null;
  isWarmup: boolean;
}

export interface SupersetGroupResponse {
  supersetGroupId: string;
  label: string;
  restAfterRoundSec: number | null;
}

export interface RoutineExerciseResponse {
  routineDayExerciseId: string;
  exerciseOrder: number;
  notes: string | null;
  
  // Exercise source info
  exerciseSource: "library" | "custom";
  sourceExerciseId: number;
  
  // Exercise metadata (resolved from source)
  exerciseName: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  
  // Superset
  supersetGroupId: string | null;
  
  // Sets
  sets: RoutineSetTemplateResponse[];
}

export interface RoutineDaySummaryResponse {
  routineDayId: string;
  name: string;
  dayOrder: number;
  weekDay: string | null;
  exerciseCount: number;
  setCount: number;
}

export interface RoutineDayDetailResponse {
  routineDayId: string;
  name: string;
  dayOrder: number;
  weekDay: string | null;
  description: string | null;
  exercises: RoutineExerciseResponse[];
  supersetGroups: SupersetGroupResponse[];
}

export interface RoutineSummaryResponse {
  routineId: string;
  name: string;
  description: string | null;
  routineType: string | null;
  structureType: "NUMBERED" | "WEEKLY";
  isPublic: boolean;
  isActive: boolean;
  daysPerWeek: number;
  createdAt: string;
  updatedAt: string;
  days: RoutineDaySummaryResponse[];
}

export interface RoutineDetailResponse {
  routineId: string;
  name: string;
  description: string | null;
  routineType: string | null;
  structureType: "NUMBERED" | "WEEKLY";
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  days: RoutineDayDetailResponse[];
}

// ============================================
// REQUEST TYPES (for create/update)
// ============================================

export interface RoutineSetTemplateUpsertRequest {
  routineSetTemplateId?: string | null;
  targetWeight?: number | null;
  targetReps?: number | null;
  targetDurationSeconds?: number | null;
  targetDistance?: number | null;
  targetRestSeconds?: number | null;
  isWarmup?: boolean;
}

export interface SupersetGroupUpsertRequest {
  supersetGroupId?: string | null;
  label: string;
  restAfterRoundSec?: number | null;
}

export interface RoutineExerciseUpsertRequest {
  routineDayExerciseId?: string | null;
  exerciseSource: "library" | "custom";
  sourceExerciseId: number;
  notes?: string | null;
  supersetGroupId?: string | null;
  sets: RoutineSetTemplateUpsertRequest[];
}

export interface RoutineDayUpsertRequest {
  routineDayId?: string | null;
  name: string;
  weekDay?: string | null;
  description?: string | null;
  exercises: RoutineExerciseUpsertRequest[];
  supersetGroups?: SupersetGroupUpsertRequest[];
}

export interface RoutineUpsertRequest {
  name: string;
  description?: string | null;
  routineType?: string | null;
  structureType?: "NUMBERED" | "WEEKLY";
  isPublic?: boolean;
  days: RoutineDayUpsertRequest[];
}

// ============================================
// UI STATE TYPES (for editor)
// ============================================

export interface RoutineSetUI {
  id: string;
  routineSetTemplateId: string | null;
  setOrder: number;
  targetWeight: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  targetDistance: number | null;
  targetRestSeconds: number | null;
  isWarmup: boolean;
}

export interface RoutineExerciseUI {
  id: string;
  routineDayExerciseId: string | null;
  exerciseOrder: number;
  notes: string;
  
  exerciseSource: "library" | "custom";
  sourceExerciseId: number;
  
  exerciseName: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  
  supersetGroupId: string | null;
  
  sets: RoutineSetUI[];
}

export interface SupersetGroupUI {
  id: string;
  supersetGroupId: string | null;
  label: string;
  restAfterRoundSec: number | null;
}

export interface RoutineDayUI {
  id: string;
  routineDayId: string | null;
  name: string;
  dayOrder: number;
  weekDay: string | null;
  description: string | null;
  exercises: RoutineExerciseUI[];
  supersetGroups: SupersetGroupUI[];
}

export interface RoutineEditorState {
  routineId: string | null;
  name: string;
  description: string;
  routineType: string | null;
  structureType: "NUMBERED" | "WEEKLY";
  isPublic: boolean;
  days: RoutineDayUI[];
  selectedDayId: string | null;
  isDirty: boolean;
}

// ============================================
// LEGACY TYPES (for backward compatibility with existing components)
// ============================================

export interface LegacyRoutineSet {
  id: string;
  setOrder: number;
  targetWeight: number | null;
  targetReps: number | null;
  targetRepRangeMin: number | null;
  targetRepRangeMax: number | null;
  targetRestSeconds: number | null;
  targetDurationSeconds: number | null;
  targetDistance: number | null;
  isWarmup: boolean;
}

export interface LegacyRoutineExercise {
  id: string;
  exerciseId: number;
  name: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  primaryMuscles: string[];
  sets: LegacyRoutineSet[];
  notes: string;
  supersetGroupId: string | null;
}

export interface SupersetGroup {
  id: string;
  label: string;
  exerciseIds: string[];
  restAfterRoundSec: number;
}

export interface LegacyWorkoutDay {
  id: string;
  name: string;
  exercises: LegacyRoutineExercise[];
  supersetGroups: SupersetGroup[];
}

export type RoutineGoal = "hypertrophy" | "strength" | "endurance" | "general";

export interface RoutineState {
  title: string;
  daysPerWeek: number;
  goal: RoutineGoal;
  estimatedDuration: number;
  days: LegacyWorkoutDay[];
  selectedDayId: string | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createDefaultSetUI(setOrder: number): RoutineSetUI {
  return {
    id: crypto.randomUUID(),
    routineSetTemplateId: null,
    setOrder,
    targetWeight: null,
    targetReps: null,
    targetDurationSeconds: null,
    targetDistance: null,
    targetRestSeconds: 90,
    isWarmup: false,
  };
}

export function createDefaultDayUI(name: string, dayOrder: number): RoutineDayUI {
  return {
    id: crypto.randomUUID(),
    routineDayId: null,
    name,
    dayOrder,
    weekDay: null,
    description: null,
    exercises: [],
    supersetGroups: [],
  };
}

export function createExerciseFromLibraryUI(
  exercise: ExerciseLibrarySummaryResponse
): RoutineExerciseUI {
  return {
    id: crypto.randomUUID(),
    routineDayExerciseId: null,
    exerciseOrder: 0,
    notes: "",
    exerciseSource: "library",
    sourceExerciseId: exercise.exerciseId,
    exerciseName: exercise.name,
    equipmentName: exercise.equipmentName,
    coverUrl: exercise.coverUrl,
    exerciseType: exercise.exerciseType,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: [],
    supersetGroupId: null,
    sets: [createDefaultSetUI(1), createDefaultSetUI(2), createDefaultSetUI(3)],
  };
}

export function createExerciseFromCustomUI(
  exercise: CustomExerciseResponse
): RoutineExerciseUI {
  return {
    id: crypto.randomUUID(),
    routineDayExerciseId: null,
    exerciseOrder: 0,
    notes: "",
    exerciseSource: "custom",
    sourceExerciseId: exercise.customExerciseId,
    exerciseName: exercise.name,
    equipmentName: exercise.equipment?.name ?? null,
    coverUrl: exercise.coverImgUrl,
    exerciseType: exercise.exerciseType,
    primaryMuscles: exercise.primaryMuscle ? [exercise.primaryMuscle.name] : [],
    secondaryMuscles: exercise.secondaryMuscles.map((m) => m.name),
    supersetGroupId: null,
    sets: [createDefaultSetUI(1), createDefaultSetUI(2), createDefaultSetUI(3)],
  };
}

// ============================================
// FRONTEND-ONLY HELPER FUNCTIONS
// ============================================

export function createDefaultRoutine(): Routine {
  return {
    id: crypto.randomUUID(),
    name: "New Routine",
    description: "",
    goal: "general",
    isActive: false,
    days: [createDefaultDay("Day 1", 1)],
  };
}

export function createDefaultDay(name: string, dayOrder: number): WorkoutDay {
  return {
    id: crypto.randomUUID(),
    name,
    dayOrder,
    description: "",
    exercises: [],
  };
}

export function createDefaultSet(setOrder: number, defaultRestSeconds: number = 90): RoutineSet {
  return {
    id: crypto.randomUUID(),
    setOrder,
    targetWeight: null,
    targetReps: null,
    targetDurationSeconds: null,
    targetDistance: null,
    targetRestSeconds: defaultRestSeconds,
  };
}

export function createExerciseFromLibrary(
  exercise: ExerciseLibrarySummaryResponse | CustomExerciseResponse,
  exerciseOrder: number = 0
): RoutineExercise {
  const isCustom = "customExerciseId" in exercise;
  return {
    id: crypto.randomUUID(),
    source: isCustom ? "custom" : "library",
    sourceExerciseId: isCustom ? exercise.customExerciseId : exercise.exerciseId,
    name: exercise.name,
    equipmentName: isCustom ? (exercise.equipment?.name ?? null) : exercise.equipmentName,
    coverUrl: isCustom ? exercise.coverImgUrl : exercise.coverUrl,
    exerciseType: exercise.exerciseType,
    primaryMuscles: isCustom
      ? (exercise.primaryMuscle ? [exercise.primaryMuscle.name] : [])
      : exercise.primaryMuscles,
    secondaryMuscles: isCustom ? exercise.secondaryMuscles.map((m) => m.name) : [],
    notes: "",
    defaultRestSeconds: 90,
    sets: [createDefaultSet(1), createDefaultSet(2), createDefaultSet(3)],
  };
}

export function cloneExercise(exercise: RoutineExercise): RoutineExercise {
  return {
    ...exercise,
    id: crypto.randomUUID(),
    sets: exercise.sets.map((set) => ({
      ...set,
      id: crypto.randomUUID(),
    })),
  };
}

export function normalizeDayOrder(days: WorkoutDay[]): WorkoutDay[] {
  return days.map((day, index) => ({
    ...day,
    dayOrder: index + 1,
  }));
}

export function normalizeExerciseOrder(exercises: RoutineExercise[]): RoutineExercise[] {
  return exercises.map((ex, index) => ({
    ...ex,
    sets: ex.sets.map((set, setIndex) => ({
      ...set,
      setOrder: setIndex + 1,
    })),
  }));
}

export function getVisibleSetFields(exerciseType: ExerciseType): {
  weight: boolean;
  reps: boolean;
  duration: boolean;
  distance: boolean;
  weightLabel?: string;
} {
  switch (exerciseType) {
    case "Weight Reps":
      return { weight: true, reps: true, duration: false, distance: false, weightLabel: "Weight" };
    case "Reps Only":
      return { weight: false, reps: true, duration: false, distance: false };
    case "Weighted Bodyweight":
      return { weight: true, reps: true, duration: false, distance: false, weightLabel: "Added Weight" };
    case "Assisted Bodyweight":
      return { weight: true, reps: true, duration: false, distance: false, weightLabel: "Assist Weight" };
    case "Duration":
      return { weight: false, reps: false, duration: true, distance: false };
    case "Weight & Duration":
      return { weight: true, reps: false, duration: true, distance: false, weightLabel: "Weight" };
    case "Distance & Duration":
      return { weight: false, reps: false, duration: true, distance: true };
    case "Weight & Distance":
      return { weight: true, reps: false, duration: false, distance: true, weightLabel: "Weight" };
    default:
      return { weight: true, reps: true, duration: false, distance: false, weightLabel: "Weight" };
  }
}

// Clear invalid fields when exercise type changes
export function clearInvalidSetFields(set: RoutineSet, exerciseType: ExerciseType): RoutineSet {
  const visibleFields = getVisibleSetFields(exerciseType);
  return {
    ...set,
    targetWeight: visibleFields.weight ? set.targetWeight : null,
    targetReps: visibleFields.reps ? set.targetReps : null,
    targetDurationSeconds: visibleFields.duration ? set.targetDurationSeconds : null,
    targetDistance: visibleFields.distance ? set.targetDistance : null,
  };
}

// Legacy helper (for backward compatibility)
export function createLegacyDefaultSet(setOrder: number): LegacyRoutineSet {
  return {
    id: crypto.randomUUID(),
    setOrder,
    targetWeight: null,
    targetReps: null,
    targetRepRangeMin: null,
    targetRepRangeMax: null,
    targetRestSeconds: 90,
    targetDurationSeconds: null,
    targetDistance: null,
    isWarmup: false,
  };
}

// Legacy helper (for backward compatibility)
export function createLegacyExerciseFromLibrary(exercise: ExerciseLibrarySummaryResponse): LegacyRoutineExercise {
  return {
    id: crypto.randomUUID(),
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    equipmentName: exercise.equipmentName,
    coverUrl: exercise.coverUrl,
    exerciseType: exercise.exerciseType,
    primaryMuscles: exercise.primaryMuscles,
    sets: [createLegacyDefaultSet(1), createLegacyDefaultSet(2), createLegacyDefaultSet(3)],
    notes: "",
    supersetGroupId: null,
  };
}

// Legacy helper (for backward compatibility)
export function createLegacyDefaultDay(name: string): LegacyWorkoutDay {
  return {
    id: crypto.randomUUID(),
    name,
    exercises: [],
    supersetGroups: [],
  };
}

export function generateSupersetLabel(existingGroups: (SupersetGroup | SupersetGroupUI)[]): string {
  const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const usedLabels = new Set(existingGroups.map((g) => g.label));
  for (const label of labels) {
    if (!usedLabels.has(label)) return label;
  }
  return `SS${existingGroups.length + 1}`;
}

export function getExerciseInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Convert detail response to editor state
export function routineDetailToEditorState(detail: RoutineDetailResponse): RoutineEditorState {
  return {
    routineId: detail.routineId,
    name: detail.name,
    description: detail.description || "",
    routineType: detail.routineType,
    structureType: detail.structureType,
    isPublic: detail.isPublic,
    days: detail.days.map((day) => ({
      id: crypto.randomUUID(),
      routineDayId: day.routineDayId,
      name: day.name,
      dayOrder: day.dayOrder,
      weekDay: day.weekDay,
      description: day.description,
      exercises: day.exercises.map((ex) => ({
        id: crypto.randomUUID(),
        routineDayExerciseId: ex.routineDayExerciseId,
        exerciseOrder: ex.exerciseOrder,
        notes: ex.notes || "",
        exerciseSource: ex.exerciseSource,
        sourceExerciseId: ex.sourceExerciseId,
        exerciseName: ex.exerciseName,
        equipmentName: ex.equipmentName,
        coverUrl: ex.coverUrl,
        exerciseType: ex.exerciseType,
        primaryMuscles: ex.primaryMuscles,
        secondaryMuscles: ex.secondaryMuscles,
        supersetGroupId: ex.supersetGroupId,
        sets: ex.sets.map((set) => ({
          id: crypto.randomUUID(),
          routineSetTemplateId: set.routineSetTemplateId,
          setOrder: set.setOrder,
          targetWeight: set.targetWeight,
          targetReps: set.targetReps,
          targetDurationSeconds: set.targetDurationSeconds,
          targetDistance: set.targetDistance,
          targetRestSeconds: set.targetRestSeconds,
          isWarmup: set.isWarmup,
        })),
      })),
      supersetGroups: day.supersetGroups.map((sg) => ({
        id: crypto.randomUUID(),
        supersetGroupId: sg.supersetGroupId,
        label: sg.label,
        restAfterRoundSec: sg.restAfterRoundSec,
      })),
    })),
    selectedDayId: null,
    isDirty: false,
  };
}

// Convert editor state to upsert request
export function editorStateToUpsertRequest(state: RoutineEditorState): RoutineUpsertRequest {
  return {
    name: state.name,
    description: state.description || null,
    routineType: state.routineType,
    structureType: state.structureType,
    isPublic: state.isPublic,
    days: state.days.map((day) => ({
      routineDayId: day.routineDayId,
      name: day.name,
      weekDay: day.weekDay,
      description: day.description,
      exercises: day.exercises.map((ex) => ({
        routineDayExerciseId: ex.routineDayExerciseId,
        exerciseSource: ex.exerciseSource,
        sourceExerciseId: ex.sourceExerciseId,
        notes: ex.notes || null,
        supersetGroupId: ex.supersetGroupId,
        sets: ex.sets.map((set) => ({
          routineSetTemplateId: set.routineSetTemplateId,
          targetWeight: set.targetWeight,
          targetReps: set.targetReps,
          targetDurationSeconds: set.targetDurationSeconds,
          targetDistance: set.targetDistance,
          targetRestSeconds: set.targetRestSeconds,
          isWarmup: set.isWarmup,
        })),
      })),
      supersetGroups: day.supersetGroups.map((sg) => ({
        supersetGroupId: sg.supersetGroupId,
        label: sg.label,
        restAfterRoundSec: sg.restAfterRoundSec,
      })),
    })),
  };
}

// Get supported fields based on exercise type
export function getSetFieldsForExerciseType(exerciseType: ExerciseType): {
  weight: boolean;
  reps: boolean;
  duration: boolean;
  distance: boolean;
  rest: boolean;
} {
  switch (exerciseType) {
    case "Weight Reps":
    case "Weighted Bodyweight":
    case "Assisted Bodyweight":
      return { weight: true, reps: true, duration: false, distance: false, rest: true };
    case "Reps Only":
      return { weight: false, reps: true, duration: false, distance: false, rest: true };
    case "Duration":
      return { weight: false, reps: false, duration: true, distance: false, rest: true };
    case "Weight & Duration":
      return { weight: true, reps: false, duration: true, distance: false, rest: true };
    case "Distance & Duration":
      return { weight: false, reps: false, duration: true, distance: true, rest: true };
    case "Weight & Distance":
      return { weight: true, reps: false, duration: false, distance: true, rest: true };
    default:
      return { weight: true, reps: true, duration: false, distance: false, rest: true };
  }
}

// Generate routine summary from days
export function generateRoutineSummary(days: RoutineDayUI[] | RoutineDaySummaryResponse[]): string {
  const dayCount = days.length;
  if (dayCount === 0) return "No workout days";
  
  let totalExercises = 0;
  for (const day of days) {
    if ("exerciseCount" in day) {
      totalExercises += day.exerciseCount;
    } else if ("exercises" in day) {
      totalExercises += day.exercises.length;
    }
  }
  
  if (totalExercises === 0) return `${dayCount} day${dayCount > 1 ? "s" : ""}, no exercises`;
  return `${dayCount} day${dayCount > 1 ? "s" : ""}, ${totalExercises} exercise${totalExercises > 1 ? "s" : ""}`;
}

// Create empty editor state for new routine
export function createEmptyEditorState(): RoutineEditorState {
  const firstDay = createDefaultDayUI("Day 1", 1);
  return {
    routineId: null,
    name: "",
    description: "",
    routineType: null,
    structureType: "NUMBERED",
    isPublic: false,
    days: [firstDay],
    selectedDayId: firstDay.id,
    isDirty: false,
  };
}

// ============================================
// MUSCLE DISTRIBUTION
// ============================================

export interface MuscleScore {
  name: string;
  rawScore: number;
  /** 0 – 1 where 1 = highest scoring muscle */
  normalizedScore: number;
}

/**
 * Compute per-muscle scores from a list of exercises.
 * Primary muscles: +1 per set.  Secondary: +0.5 per set.
 * Returns descending by score with normalizedScore relative to the max.
 */
export function computeMuscleDistribution(
  exercises: Pick<RoutineExercise, "primaryMuscles" | "secondaryMuscles" | "sets">[]
): MuscleScore[] {
  const scores = new Map<string, number>();

  for (const ex of exercises) {
    const setCount = ex.sets.length;
    for (const muscle of ex.primaryMuscles) {
      scores.set(muscle, (scores.get(muscle) ?? 0) + setCount);
    }
    for (const muscle of ex.secondaryMuscles) {
      scores.set(muscle, (scores.get(muscle) ?? 0) + setCount * 0.5);
    }
  }

  const maxScore = Math.max(...scores.values(), 0);

  return Array.from(scores.entries())
    .map(([name, rawScore]) => ({
      name,
      rawScore,
      normalizedScore: maxScore > 0 ? rawScore / maxScore : 0,
    }))
    .sort((a, b) => b.rawScore - a.rawScore);
}
