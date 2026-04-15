import type { ExerciseType, ExerciseLibrarySummaryResponse, CustomExerciseResponse } from "@/features/exercises/model";
import { createUuid } from "@/shared/lib/uuid";

// ============================================
// FRONTEND-ONLY TYPES (for localStorage persistence)
// ============================================

export type RoutineStructureType = "NUMBERED" | "WEEKLY";
export type RoutineFocusType =
  | "HYPERTROPHY"
  | "STRENGTH_POWER"
  | "ENDURANCE_CARDIO"
  | "FLEXIBILITY_MOBILITY"
  | "WEIGHT_LOSS";
export type RoutineGoal = "hypertrophy" | "strength" | "endurance" | "general";
export type RoutineSyncState = "synced" | "draft" | "saving" | "error";

export interface RoutineSupersetGroup {
  id: string;
  backendId: string | null;
  label: string;
  restAfterRoundSec: number | null;
}

export interface RoutineSet {
  id: string;
  backendId?: string | null;
  setOrder: number;
  targetWeight: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  targetDistance: number | null;
  targetRestSeconds: number | null;
}

export interface RoutineExercise {
  id: string;
  backendId?: string | null;
  source: "library" | "custom";
  sourceExerciseId: number;
  name: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  notes: string;
  supersetTag?: string;
  supersetGroupId?: string | null;
  sets: RoutineSet[];
}

export interface WorkoutDay {
  id: string;
  backendId?: string | null;
  name: string;
  dayOrder: number;
  weekDay?: string | null;
  description?: string;
  supersetGroups?: RoutineSupersetGroup[];
  exercises: RoutineExercise[];
}

export interface Routine {
  id: string;
  backendId?: string | null;
  name: string;
  description: string;
  goal: string;
  routineType?: RoutineFocusType | null;
  structureType?: RoutineStructureType;
  isPublic?: boolean;
  isActive: boolean;
  syncState?: RoutineSyncState;
  lastSyncError?: string | null;
  days: WorkoutDay[];
}

// ============================================
// RESPONSE TYPES (from backend)
// ============================================

export interface RoutineSetTemplateResponse {
  routineSetTemplateId: string;
  setNo: number;
  targetWeight: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  targetDistance: number | null;
  targetRestSeconds: number | null;
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
  exerciseCount: number;
  totalSets: number;
}

export interface RoutineDayDetailResponse {
  routineDayId: string;
  name: string;
  dayOrder: number;
  weekDay: string | null;
  supersetGroups: SupersetGroupResponse[];
  exercises: RoutineExerciseResponse[];
}

export interface RoutineSummaryResponse {
  routineId: string;
  name: string;
  description: string | null;
  routineType: RoutineFocusType | null;
  structureType: RoutineStructureType;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  days: RoutineDaySummaryResponse[];
}

export interface RoutineDetailResponse {
  routineId: string;
  name: string;
  description: string | null;
  routineType: RoutineFocusType | null;
  structureType: RoutineStructureType;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  days: RoutineDayDetailResponse[];
}

export interface UserRoutineSettingItemResponse {
  userRoutineSettingId: string;
  routineId: string;
  routineName: string;
  structureType: RoutineStructureType;
  routineType: RoutineFocusType | null;
  active: boolean;
  activatedAt: string;
  lastSessionAt: string | null;
  currentDayId: string | null;
  currentDayName: string | null;
  currentDayOrder: number | null;
  totalDays: number;
}

export interface UserRoutineSettingsResponse {
  activeSetting: UserRoutineSettingItemResponse | null;
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
  exercises: RoutineExerciseUpsertRequest[];
  supersetGroups?: SupersetGroupUpsertRequest[];
}

export interface RoutineUpsertRequest {
  name: string;
  description?: string | null;
  routineType?: RoutineFocusType | null;
  structureType?: RoutineStructureType;
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
  exercises: RoutineExerciseUI[];
  supersetGroups: SupersetGroupUI[];
}

export interface RoutineEditorState {
  routineId: string | null;
  name: string;
  description: string;
  routineType: RoutineFocusType | null;
  structureType: RoutineStructureType;
  isPublic: boolean;
  days: RoutineDayUI[];
  selectedDayId: string | null;
  isDirty: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createDefaultSetUI(setOrder: number): RoutineSetUI {
  return {
    id: createUuid(),
    routineSetTemplateId: null,
    setOrder,
    targetWeight: null,
    targetReps: null,
    targetDurationSeconds: null,
    targetDistance: null,
    targetRestSeconds: 90,
  };
}

export function createDefaultDayUI(name: string, dayOrder: number): RoutineDayUI {
  return {
    id: createUuid(),
    routineDayId: null,
    name,
    dayOrder,
    weekDay: null,
    exercises: [],
    supersetGroups: [],
  };
}

export function createExerciseFromLibraryUI(
  exercise: ExerciseLibrarySummaryResponse
): RoutineExerciseUI {
  return {
    id: createUuid(),
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
    id: createUuid(),
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
    id: createUuid(),
    backendId: null,
    name: "New Routine",
    description: "",
    goal: "general",
    routineType: null,
    structureType: "NUMBERED",
    isPublic: false,
    isActive: false,
    syncState: "draft",
    lastSyncError: null,
    days: [],
  };
}

export function createDefaultDay(name: string, dayOrder: number): WorkoutDay {
  return {
    id: createUuid(),
    backendId: null,
    name,
    dayOrder,
    weekDay: null,
    description: "",
    supersetGroups: [],
    exercises: [],
  };
}

function normalizeWorkoutDayNameForComparison(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function getDuplicateWorkoutDayName(
  days: Array<Pick<WorkoutDay, "name">>
): string | null {
  const seenNames = new Set<string>();

  for (const day of days) {
    const trimmedName = day.name.trim();
    if (!trimmedName) {
      continue;
    }

    const normalizedName = normalizeWorkoutDayNameForComparison(trimmedName);
    if (seenNames.has(normalizedName)) {
      return trimmedName;
    }
    seenNames.add(normalizedName);
  }

  return null;
}

export function generateDefaultWorkoutDayName(
  days: Array<Pick<WorkoutDay, "name">>
): string {
  let nextIndex = 1;

  while (
    days.some(
      (day) =>
        normalizeWorkoutDayNameForComparison(day.name) ===
        normalizeWorkoutDayNameForComparison(`Day ${nextIndex}`)
    )
  ) {
    nextIndex += 1;
  }

  return `Day ${nextIndex}`;
}

export function generateUniqueWorkoutDayName(
  days: Array<Pick<WorkoutDay, "name">>,
  preferredName: string
): string {
  const trimmedPreferredName = preferredName.trim() || "Workout Day";
  const normalizedPreferredName = normalizeWorkoutDayNameForComparison(trimmedPreferredName);

  if (
    !days.some(
      (day) => normalizeWorkoutDayNameForComparison(day.name) === normalizedPreferredName
    )
  ) {
    return trimmedPreferredName;
  }

  let suffix = 2;
  while (true) {
    const candidateName = `${trimmedPreferredName} (${suffix})`;
    const normalizedCandidateName = normalizeWorkoutDayNameForComparison(candidateName);

    if (
      !days.some(
        (day) => normalizeWorkoutDayNameForComparison(day.name) === normalizedCandidateName
      )
    ) {
      return candidateName;
    }

    suffix += 1;
  }
}

export function createDefaultSet(setOrder: number, targetRestSeconds: number = 90): RoutineSet {
  return {
    id: createUuid(),
    backendId: null,
    setOrder,
    targetWeight: null,
    targetReps: null,
    targetDurationSeconds: null,
    targetDistance: null,
    targetRestSeconds,
  };
}

export function createExerciseFromLibrary(
  exercise: ExerciseLibrarySummaryResponse | CustomExerciseResponse,
  exerciseOrder: number = 0
): RoutineExercise {
  const isCustom = "customExerciseId" in exercise;
  return {
    id: createUuid(),
    backendId: null,
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
    supersetGroupId: null,
    sets: [createDefaultSet(1), createDefaultSet(2), createDefaultSet(3)],
  };
}

export interface ExercisePickerItem {
  source: "library" | "custom";
  id: number;
  name: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

export function createExerciseFromPickerItem(
  exercise: ExercisePickerItem,
  exerciseOrder: number = 0
): RoutineExercise {
  return {
    id: createUuid(),
    backendId: null,
    source: exercise.source,
    sourceExerciseId: exercise.id,
    name: exercise.name,
    equipmentName: exercise.equipmentName,
    coverUrl: exercise.coverUrl,
    exerciseType: exercise.exerciseType,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    notes: "",
    supersetGroupId: null,
    sets: [createDefaultSet(1), createDefaultSet(2), createDefaultSet(3)],
  };
}

export function cloneExercise(exercise: RoutineExercise): RoutineExercise {
  return {
    ...exercise,
    id: createUuid(),
    sets: exercise.sets.map((set) => ({
      ...set,
      id: createUuid(),
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
    exerciseOrder: index + 1,
    sets: ex.sets.map((set, setIndex) => ({
      ...set,
      setOrder: setIndex + 1,
    })),
  }));
}

function normalizeSupersetExerciseTag(tag: string | undefined): string | null {
  const normalized = tag?.trim();
  return normalized ? normalized : null;
}

function normalizeSupersetGroupId(groupId: string | null | undefined): string | null {
  const normalized = groupId?.trim();
  return normalized ? normalized : null;
}

function getSupersetMembershipKey(
  exercise: Pick<RoutineExercise, "supersetGroupId" | "supersetTag">
): string | null {
  return normalizeSupersetGroupId(exercise.supersetGroupId) ?? normalizeSupersetExerciseTag(exercise.supersetTag);
}

export function reconcileWorkoutDaySupersets(day: WorkoutDay): WorkoutDay {
  const membershipCounts = new Map<string, number>();

  for (const exercise of day.exercises) {
    const key = getSupersetMembershipKey(exercise);
    if (!key) {
      continue;
    }
    membershipCounts.set(key, (membershipCounts.get(key) ?? 0) + 1);
  }

  const validMembershipKeys = new Set(
    Array.from(membershipCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([key]) => key)
  );

  return {
    ...day,
    exercises: day.exercises.map((exercise) => {
      const key = getSupersetMembershipKey(exercise);
      if (!key || validMembershipKeys.has(key)) {
        return exercise;
      }

      return {
        ...exercise,
        supersetTag: undefined,
        supersetGroupId: null,
      };
    }),
    supersetGroups: (day.supersetGroups ?? []).filter((group) => {
      const groupId = normalizeSupersetGroupId(group.backendId);
      const label = normalizeSupersetExerciseTag(group.label);

      return (
        (groupId !== null && validMembershipKeys.has(groupId)) ||
        (label !== null && validMembershipKeys.has(label))
      );
    }),
  };
}

export function removeSupersetFromWorkoutDay(
  day: WorkoutDay,
  exerciseId: string
): WorkoutDay {
  const targetExercise = day.exercises.find((exercise) => exercise.id === exerciseId);
  if (!targetExercise) {
    return day;
  }

  const targetGroupId = normalizeSupersetGroupId(targetExercise.supersetGroupId);
  const targetTag = normalizeSupersetExerciseTag(targetExercise.supersetTag);
  if (!targetGroupId && !targetTag) {
    return day;
  }

  return reconcileWorkoutDaySupersets({
    ...day,
    exercises: day.exercises.map((exercise) => {
      const exerciseGroupId = normalizeSupersetGroupId(exercise.supersetGroupId);
      const exerciseTag = normalizeSupersetExerciseTag(exercise.supersetTag);
      const belongsToTargetSuperset =
        (targetGroupId !== null && exerciseGroupId === targetGroupId) ||
        (targetTag !== null && exerciseTag === targetTag);

      if (!belongsToTargetSuperset) {
        return exercise;
      }

      return {
        ...exercise,
        supersetTag: undefined,
        supersetGroupId: null,
      };
    }),
    supersetGroups: (day.supersetGroups ?? []).filter((group) => {
      const groupId = normalizeSupersetGroupId(group.backendId);
      const label = normalizeSupersetExerciseTag(group.label);

      return !(
        (targetGroupId !== null && groupId === targetGroupId) ||
        (targetTag !== null && label === targetTag)
      );
    }),
  });
}

export function removeExerciseAndLinkedSupersetExercises(
  day: WorkoutDay,
  exerciseId: string
): WorkoutDay {
  const targetExercise = day.exercises.find((exercise) => exercise.id === exerciseId);
  if (!targetExercise) {
    return day;
  }

  const targetGroupId = normalizeSupersetGroupId(targetExercise.supersetGroupId);
  const targetTag = normalizeSupersetExerciseTag(targetExercise.supersetTag);

  const shouldRemoveExercise = (exercise: RoutineExercise): boolean => {
    if (exercise.id === exerciseId) {
      return true;
    }
    if (!targetGroupId && !targetTag) {
      return false;
    }

    return (
      (targetGroupId !== null && normalizeSupersetGroupId(exercise.supersetGroupId) === targetGroupId) ||
      (targetTag !== null && normalizeSupersetExerciseTag(exercise.supersetTag) === targetTag)
    );
  };

  const shouldRemoveGroup = (group: RoutineSupersetGroup): boolean => {
    if (!targetGroupId && !targetTag) {
      return false;
    }

    return (
      (targetGroupId !== null && normalizeSupersetGroupId(group.backendId) === targetGroupId) ||
      (targetTag !== null && normalizeSupersetExerciseTag(group.label) === targetTag)
    );
  };

  return {
    ...day,
    exercises: day.exercises.filter((exercise) => !shouldRemoveExercise(exercise)),
    supersetGroups: day.supersetGroups.filter((group) => !shouldRemoveGroup(group)),
  };
}

function getSupersetValidationError(
  day: Pick<WorkoutDay, "name" | "exercises">
): string | null {
  const supersetCounts = new Map<string, { count: number; label: string }>();

  for (const exercise of day.exercises) {
    const key = getSupersetMembershipKey(exercise);
    if (!key) {
      continue;
    }

    const label = normalizeSupersetExerciseTag(exercise.supersetTag) ?? "Superset";
    const current = supersetCounts.get(key);
    if (current) {
      current.count += 1;
      continue;
    }

    supersetCounts.set(key, { count: 1, label });
  }

  for (const { count, label } of supersetCounts.values()) {
    if (count < 2) {
      const dayLabel = day.name.trim() || "Workout day";
      return `${dayLabel} has an incomplete superset (${label}). Supersets must include at least two exercises.`;
    }
  }

  return null;
}

export function deriveGoalFromRoutineType(routineType: RoutineFocusType | null | undefined): RoutineGoal {
  switch (routineType) {
    case "HYPERTROPHY":
      return "hypertrophy";
    case "STRENGTH_POWER":
      return "strength";
    case "ENDURANCE_CARDIO":
      return "endurance";
    default:
      return "general";
  }
}

export function mapGoalToRoutineType(goal: string): RoutineFocusType | null {
  switch (goal) {
    case "hypertrophy":
      return "HYPERTROPHY";
    case "strength":
      return "STRENGTH_POWER";
    case "endurance":
      return "ENDURANCE_CARDIO";
    default:
      return null;
  }
}

export function resolveRoutineTypeForSave(
  goal: string,
  existingRoutineType: RoutineFocusType | null | undefined
): RoutineFocusType | null {
  const currentGoal = deriveGoalFromRoutineType(existingRoutineType);
  if (goal === currentGoal) {
    return existingRoutineType ?? mapGoalToRoutineType(goal);
  }
  return mapGoalToRoutineType(goal);
}

function isNonNegative(value: number | null | undefined): boolean {
  return value == null || value >= 0;
}

export function getWorkoutDayMinimumValidationError(
  day: Pick<WorkoutDay, "name" | "exercises">
): string | null {
  const dayLabel = day.name.trim() || "Workout day";

  if (day.exercises.length === 0) {
    return `${dayLabel} must include at least one exercise.`;
  }

  for (const exercise of day.exercises) {
    if (exercise.sets.length === 0) {
      return `${exercise.name} in ${dayLabel} must include at least one set.`;
    }
  }

  return null;
}

export function getRoutineMinimumValidationError(
  routine: Pick<Routine, "days">
): string | null {
  if (routine.days.length === 0) {
    return "Routine must include at least one workout day.";
  }

  const duplicateDayName = getDuplicateWorkoutDayName(routine.days);
  if (duplicateDayName) {
    return `Workout day names must be unique. "${duplicateDayName}" is used more than once.`;
  }

  for (const day of routine.days) {
    const dayError = getWorkoutDayMinimumValidationError(day);
    if (dayError) {
      return dayError;
    }
  }

  return null;
}

export function getWorkoutDayPersistenceValidationError(
  day: Pick<WorkoutDay, "name" | "exercises">
): string | null {
  if (!day.name.trim()) {
    return "Workout day name is required.";
  }

  const minimumError = getWorkoutDayMinimumValidationError(day);
  if (minimumError) {
    return minimumError;
  }

  const supersetError = getSupersetValidationError(day);
  if (supersetError) {
    return supersetError;
  }

  for (const exercise of day.exercises) {
    for (const set of exercise.sets) {
      if (!isNonNegative(set.targetRestSeconds)) {
        return `${exercise.name} has a set with invalid rest time.`;
      }
      if (!isNonNegative(set.targetDurationSeconds)) {
        return `${exercise.name} has a set with invalid duration.`;
      }
    }
  }

  return null;
}

export function getRoutinePersistenceValidationError(
  routine: Pick<Routine, "name" | "days">
): string | null {
  if (!routine.name.trim()) {
    return "Routine name is required.";
  }

  if (routine.days.length === 0) {
    return "Routine must include at least one workout day.";
  }

  const duplicateDayName = getDuplicateWorkoutDayName(routine.days);
  if (duplicateDayName) {
    return `Workout day names must be unique. "${duplicateDayName}" is used more than once.`;
  }

  for (const day of routine.days) {
    const dayError = getWorkoutDayPersistenceValidationError(day);
    if (dayError) {
      return dayError;
    }
  }

  return null;
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
    id: createUuid(),
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
    id: createUuid(),
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
    id: createUuid(),
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
      id: createUuid(),
      routineDayId: day.routineDayId,
      name: day.name,
      dayOrder: day.dayOrder,
      weekDay: day.weekDay,
      exercises: day.exercises.map((ex) => ({
        id: createUuid(),
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
          id: createUuid(),
          routineSetTemplateId: set.routineSetTemplateId,
          setOrder: set.setNo,
          targetWeight: set.targetWeight,
          targetReps: set.targetReps,
          targetDurationSeconds: set.targetDurationSeconds,
          targetDistance: set.targetDistance,
          targetRestSeconds: set.targetRestSeconds,
        })),
      })),
      supersetGroups: day.supersetGroups.map((sg) => ({
        id: createUuid(),
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
  return {
    routineId: null,
    name: "",
    description: "",
    routineType: null,
    structureType: "NUMBERED",
    isPublic: false,
    days: [],
    selectedDayId: null,
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
