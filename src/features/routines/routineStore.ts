import {
  activateRoutineApi,
  createRoutineApi,
  deleteRoutineApi,
  getMyRoutinesApi,
  getRoutineDetailApi,
  updateRoutineApi,
} from "@/features/routines/routineApi";
import { getApiErrorMessage } from "@/shared/api/client";
import {
  type Routine,
  type RoutineDetailResponse,
  type RoutineExercise,
  type RoutineSet,
  type RoutineSupersetGroup,
  type WorkoutDay,
  deriveGoalFromRoutineType,
  getRoutinePersistenceValidationError,
  reconcileWorkoutDaySupersets,
  resolveRoutineTypeForSave,
} from "@/features/routines/routineTypes";

type MutationOptions = {
  sync?: "auto" | "force" | "none";
  throwOnSyncError?: boolean;
  rollbackOnSyncError?: boolean;
};

const DEFAULT_MUTATION_OPTIONS: Required<MutationOptions> = {
  sync: "auto",
  throwOnSyncError: false,
  rollbackOnSyncError: false,
};

let routineCache: Routine[] = [];
let initialized = false;
let initializationPromise: Promise<Routine[]> | null = null;
let mutationQueue: Promise<void> = Promise.resolve();

function cloneSet(set: RoutineSet): RoutineSet {
  return { ...set };
}

function cloneExercise(exercise: RoutineExercise): RoutineExercise {
  return {
    ...exercise,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    sets: exercise.sets.map(cloneSet),
  };
}

function cloneSupersetGroup(group: RoutineSupersetGroup): RoutineSupersetGroup {
  return { ...group };
}

function cloneDay(day: WorkoutDay): WorkoutDay {
  return {
    ...day,
    supersetGroups: (day.supersetGroups ?? []).map(cloneSupersetGroup),
    exercises: day.exercises.map(cloneExercise),
  };
}

function cloneRoutine(routine: Routine): Routine {
  return {
    ...routine,
    days: routine.days.map(cloneDay),
  };
}

function cloneRoutines(routines: Routine[]): Routine[] {
  return routines.map(cloneRoutine);
}

function sanitizeNonNegative(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return value >= 0 ? value : null;
}

function normalizeSet(set: RoutineSet, index: number): RoutineSet {
  return {
    ...set,
    backendId: set.backendId ?? null,
    setOrder: index + 1,
    targetRestSeconds: sanitizeNonNegative(set.targetRestSeconds),
    targetDurationSeconds: sanitizeNonNegative(set.targetDurationSeconds),
  };
}

function normalizeExercise(exercise: RoutineExercise, index: number): RoutineExercise {
  const normalizedSets = exercise.sets.map(normalizeSet);
  return {
    ...exercise,
    backendId: exercise.backendId ?? null,
    exerciseOrder: index + 1,
    equipmentName: exercise.equipmentName ?? null,
    coverUrl: exercise.coverUrl ?? null,
    notes: exercise.notes ?? "",
    supersetGroupId: exercise.supersetGroupId ?? null,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    sets: normalizedSets,
  };
}

function normalizeSupersetGroup(group: RoutineSupersetGroup): RoutineSupersetGroup {
  return {
    ...group,
    backendId: group.backendId ?? null,
    restAfterRoundSec: sanitizeNonNegative(group.restAfterRoundSec),
  };
}

function normalizeDay(day: WorkoutDay, index: number): WorkoutDay {
  return {
    ...day,
    backendId: day.backendId ?? null,
    dayOrder: index + 1,
    weekDay: day.weekDay ?? null,
    description: day.description ?? "",
    supersetGroups: (day.supersetGroups ?? []).map(normalizeSupersetGroup),
    exercises: day.exercises.map(normalizeExercise),
  };
}

function normalizeRoutine(routine: Routine): Routine {
  return {
    ...routine,
    backendId: routine.backendId ?? null,
    description: routine.description ?? "",
    goal: routine.goal || deriveGoalFromRoutineType(routine.routineType),
    routineType: routine.routineType ?? null,
    structureType: routine.structureType ?? "NUMBERED",
    isPublic: routine.isPublic ?? false,
    isActive: Boolean(routine.isActive),
    syncState: routine.syncState ?? (routine.backendId ? "synced" : "draft"),
    lastSyncError: routine.lastSyncError ?? null,
    days: routine.days.map(normalizeDay),
  };
}

function replaceRoutineInCache(routine: Routine): Routine {
  const normalized = normalizeRoutine(routine);
  const index = routineCache.findIndex((item) => item.id === normalized.id);

  if (index === -1) {
    routineCache = [...routineCache, normalized];
  } else {
    routineCache = routineCache.map((item, itemIndex) => (itemIndex === index ? normalized : item));
  }

  return normalized;
}

function removeRoutineFromCache(routineId: string): Routine | null {
  const existing = routineCache.find((routine) => routine.id === routineId) ?? null;
  routineCache = routineCache.filter((routine) => routine.id !== routineId);
  return existing;
}

function getCachedRoutine(routineId: string): Routine | null {
  return routineCache.find((routine) => routine.id === routineId) ?? null;
}

function markRoutineState(
  routineId: string,
  syncState: Routine["syncState"],
  lastSyncError: string | null
): Routine | null {
  const existing = getCachedRoutine(routineId);
  if (!existing) {
    return null;
  }

  const updated = normalizeRoutine({
    ...existing,
    syncState,
    lastSyncError,
  });
  replaceRoutineInCache(updated);
  return updated;
}

function getErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, "Routine request failed.");
}

function buildSupersetPayload(day: WorkoutDay): {
  groups: Array<{
    supersetGroupId: string;
    label: string;
    restAfterRoundSec: number | null;
  }>;
  groupIdsByTag: Map<string, string>;
} {
  const existingByLabel = new Map<string, RoutineSupersetGroup>();
  for (const group of day.supersetGroups ?? []) {
    const label = group.label.trim();
    if (!label) {
      continue;
    }
    existingByLabel.set(label, group);
  }

  const groupIdsByTag = new Map<string, string>();
  const groups: Array<{
    supersetGroupId: string;
    label: string;
    restAfterRoundSec: number | null;
  }> = [];

  for (const exercise of day.exercises) {
    const tag = exercise.supersetTag?.trim();
    if (!tag || groupIdsByTag.has(tag)) {
      continue;
    }

    const existing = existingByLabel.get(tag);
    const requestId = existing?.backendId ?? existing?.id ?? crypto.randomUUID();
    groupIdsByTag.set(tag, requestId);
    groups.push({
      supersetGroupId: requestId,
      label: tag,
      restAfterRoundSec: sanitizeNonNegative(existing?.restAfterRoundSec),
    });
  }

  return { groups, groupIdsByTag };
}

function buildRoutineRequest(routine: Routine) {
  return {
    name: routine.name.trim(),
    description: routine.description.trim() || null,
    structureType: routine.structureType ?? "NUMBERED",
    routineType: resolveRoutineTypeForSave(routine.goal, routine.routineType),
    isPublic: routine.isPublic ?? false,
    days: routine.days.map((day) => {
      const normalizedDay = reconcileWorkoutDaySupersets(day);
      const { groups, groupIdsByTag } = buildSupersetPayload(normalizedDay);

      return {
        routineDayId: normalizedDay.backendId ?? null,
        name: normalizedDay.name.trim(),
        weekDay: normalizedDay.weekDay ?? null,
        supersetGroups: groups,
        exercises: normalizedDay.exercises.map((exercise) => ({
          routineDayExerciseId: exercise.backendId ?? null,
          exerciseSource: exercise.source,
          sourceExerciseId: exercise.sourceExerciseId,
          notes: exercise.notes.trim() || null,
          supersetGroupId: exercise.supersetTag?.trim()
            ? (groupIdsByTag.get(exercise.supersetTag.trim()) ?? null)
            : null,
          sets: exercise.sets.map((set) => ({
            routineSetTemplateId: set.backendId ?? null,
            targetWeight: set.targetWeight,
            targetReps: set.targetReps,
            targetDurationSeconds: sanitizeNonNegative(set.targetDurationSeconds),
            targetDistance: set.targetDistance,
            targetRestSeconds: sanitizeNonNegative(set.targetRestSeconds),
          })),
        })),
      };
    }),
  };
}

function findByBackendIdOrIndex<T extends { backendId?: string | null }>(
  items: T[] | undefined,
  backendId: string,
  index: number
): T | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }

  return items.find((item) => item.backendId === backendId) ?? items[index];
}

function applyServerDetailToRoutine(existing: Routine | undefined, detail: RoutineDetailResponse): Routine {
  const days = detail.days.map((day, dayIndex) => {
    const existingDay = findByBackendIdOrIndex(existing?.days, day.routineDayId, dayIndex);

    const supersetGroups = day.supersetGroups.map((group, groupIndex) => {
      const existingGroup =
        existingDay?.supersetGroups?.find((item) => item.backendId === group.supersetGroupId)
        ?? existingDay?.supersetGroups?.find((item) => item.label === group.label)
        ?? existingDay?.supersetGroups?.[groupIndex];

      return {
        id: existingGroup?.id ?? group.supersetGroupId,
        backendId: group.supersetGroupId,
        label: group.label,
        restAfterRoundSec: sanitizeNonNegative(group.restAfterRoundSec),
      };
    });

    const supersetLabelsById = new Map(
      supersetGroups
        .filter((group) => group.backendId)
        .map((group) => [group.backendId as string, group.label])
    );

    const exercises = day.exercises.map((exercise, exerciseIndex) => {
      const existingExercise = findByBackendIdOrIndex(
        existingDay?.exercises,
        exercise.routineDayExerciseId,
        exerciseIndex
      );

      const sets = exercise.sets.map((set, setIndex) => {
        const existingSet = findByBackendIdOrIndex(
          existingExercise?.sets,
          set.routineSetTemplateId,
          setIndex
        );

        return {
          id: existingSet?.id ?? set.routineSetTemplateId,
          backendId: set.routineSetTemplateId,
          setOrder: set.setNo,
          targetWeight: set.targetWeight,
          targetReps: set.targetReps,
          targetDurationSeconds: set.targetDurationSeconds,
          targetDistance: set.targetDistance,
          targetRestSeconds: sanitizeNonNegative(set.targetRestSeconds),
        };
      });

      return {
        id: existingExercise?.id ?? exercise.routineDayExerciseId,
        backendId: exercise.routineDayExerciseId,
        source: exercise.exerciseSource,
        sourceExerciseId: exercise.sourceExerciseId,
        name: exercise.exerciseName,
        equipmentName: exercise.equipmentName ?? null,
        coverUrl: exercise.coverUrl ?? null,
        exerciseType: exercise.exerciseType,
        primaryMuscles: [...exercise.primaryMuscles],
        secondaryMuscles: [...exercise.secondaryMuscles],
        notes: exercise.notes ?? "",
        supersetTag: exercise.supersetGroupId ? supersetLabelsById.get(exercise.supersetGroupId) : undefined,
        supersetGroupId: exercise.supersetGroupId ?? null,
        sets,
      };
    });

    return {
      id: existingDay?.id ?? day.routineDayId,
      backendId: day.routineDayId,
      name: day.name,
      dayOrder: day.dayOrder,
      weekDay: day.weekDay ?? null,
      description: existingDay?.description ?? "",
      supersetGroups,
      exercises,
    };
  });

  return normalizeRoutine({
    id: existing?.id ?? detail.routineId,
    backendId: detail.routineId,
    name: detail.name,
    description: detail.description ?? "",
    goal: deriveGoalFromRoutineType(detail.routineType),
    routineType: detail.routineType ?? null,
    structureType: detail.structureType,
    isPublic: detail.isPublic,
    isActive: detail.isActive,
    syncState: "synced",
    lastSyncError: null,
    days,
  });
}

async function fetchRoutineDetails(): Promise<RoutineDetailResponse[]> {
  const summaries = await getMyRoutinesApi();
  if (summaries.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    summaries.map((summary) => getRoutineDetailApi(summary.routineId))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<RoutineDetailResponse> => result.status === "fulfilled")
    .map((result) => result.value);
}

function mergeRemoteRoutines(remoteDetails: RoutineDetailResponse[]): void {
  const localByBackendId = new Map(
    routineCache
      .filter((routine) => routine.backendId)
      .map((routine) => [routine.backendId as string, routine])
  );

  const merged: Routine[] = [];
  const seenBackendIds = new Set<string>();

  // First, merge remote routines with local state
  for (const detail of remoteDetails) {
    const existing = localByBackendId.get(detail.routineId);
    if (existing && existing.syncState !== "synced") {
      merged.push(normalizeRoutine(existing));
    } else {
      merged.push(applyServerDetailToRoutine(existing, detail));
    }
    seenBackendIds.add(detail.routineId);
  }

  // Preserve local-only routines (no backendId or pending sync)
  for (const routine of routineCache) {
    if (!routine.backendId || routine.syncState !== "synced") {
      merged.push(normalizeRoutine(routine));
    }
  }

  const deduped = new Map<string, Routine>();
  for (const routine of merged) {
    deduped.set(routine.id, normalizeRoutine(routine));
  }

  routineCache = Array.from(deduped.values());
}

function runQueuedMutation<T>(task: () => Promise<T>): Promise<T> {
  const nextTask = mutationQueue.then(task, task);
  mutationQueue = nextTask.then(() => undefined, () => undefined);
  return nextTask;
}

async function syncRoutineIfNeeded(
  routineId: string,
  options: MutationOptions = DEFAULT_MUTATION_OPTIONS
): Promise<Routine> {
  const mergedOptions = { ...DEFAULT_MUTATION_OPTIONS, ...options };
  const routine = getCachedRoutine(routineId);
  if (!routine) {
    throw new Error(`Routine with id ${routineId} not found`);
  }

  if (mergedOptions.sync === "none") {
    return cloneRoutine(routine);
  }

  const validationError = getRoutinePersistenceValidationError(routine);
  if (validationError) {
    replaceRoutineInCache({
      ...routine,
      syncState: "draft",
      lastSyncError: validationError,
    });

    if (mergedOptions.throwOnSyncError) {
      throw new Error(validationError);
    }

    return cloneRoutine(getCachedRoutine(routineId) as Routine);
  }

  markRoutineState(routineId, "saving", null);

  try {
    const freshRoutine = getCachedRoutine(routineId);
    if (!freshRoutine) {
      throw new Error(`Routine with id ${routineId} not found`);
    }

    const response = freshRoutine.backendId
      ? await updateRoutineApi(freshRoutine.backendId, buildRoutineRequest(freshRoutine))
      : await createRoutineApi(buildRoutineRequest(freshRoutine));

    let syncedRoutine = applyServerDetailToRoutine(freshRoutine, response);
    replaceRoutineInCache(syncedRoutine);

    if (freshRoutine.isActive && !response.isActive) {
      await activateRoutineApi(response.routineId);
      routineCache = routineCache.map((item) => ({
        ...item,
        isActive: item.id === syncedRoutine.id,
      }));
      syncedRoutine = getCachedRoutine(syncedRoutine.id) as Routine;
    }

    return cloneRoutine(syncedRoutine);
  } catch (error) {
    const message = getErrorMessage(error);
    markRoutineState(routineId, "error", message);
    if (mergedOptions.throwOnSyncError) {
      throw error instanceof Error ? error : new Error(message);
    }
    return cloneRoutine(getCachedRoutine(routineId) as Routine);
  }
}

// ============================================
// PUBLIC API
// ============================================

export function loadRoutines(): Routine[] {
  return cloneRoutines(routineCache);
}

export function getRoutine(routineId: string): Routine | null {
  const routine = getCachedRoutine(routineId);
  return routine ? cloneRoutine(routine) : null;
}

export async function initializeRoutineStore(): Promise<Routine[]> {
  if (initialized) {
    return loadRoutines();
  }

  if (!initializationPromise) {
    initializationPromise = runQueuedMutation(async () => {
      const details = await fetchRoutineDetails();
      mergeRemoteRoutines(details);
      initialized = true;
      return loadRoutines();
    }).finally(() => {
      initializationPromise = null;
    });
  }

  return initializationPromise;
}

export async function refreshRoutineStore(): Promise<Routine[]> {
  const details = await fetchRoutineDetails();
  mergeRemoteRoutines(details);
  initialized = true;
  return loadRoutines();
}

export async function addRoutine(
  routine: Routine,
  options: MutationOptions = DEFAULT_MUTATION_OPTIONS
): Promise<Routine> {
  const localRoutine = replaceRoutineInCache({
    ...routine,
    syncState: "draft",
    lastSyncError: null,
  });

  return runQueuedMutation(() => syncRoutineIfNeeded(localRoutine.id, options));
}

export async function updateRoutine(
  routineId: string,
  updates: Routine | Partial<Routine>,
  options: MutationOptions = DEFAULT_MUTATION_OPTIONS
): Promise<Routine> {
  const existing = getCachedRoutine(routineId);
  if (!existing) {
    throw new Error(`Routine with id ${routineId} not found`);
  }

  const previousRoutine = cloneRoutine(existing);

  const mergedRoutine = replaceRoutineInCache({
    ...existing,
    ...updates,
    id: existing.id,
    backendId: existing.backendId,
    syncState: "draft",
    lastSyncError: null,
  });

  return runQueuedMutation(() => syncRoutineIfNeeded(mergedRoutine.id, options))
    .catch((error) => {
      if ((options.rollbackOnSyncError ?? DEFAULT_MUTATION_OPTIONS.rollbackOnSyncError) && getCachedRoutine(routineId)) {
        replaceRoutineInCache(previousRoutine);
      }
      throw error;
    });
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const existing = getCachedRoutine(routineId);
  if (!existing) {
    return;
  }

  if (!existing.backendId) {
    removeRoutineFromCache(routineId);
    return;
  }

  const previousCache = cloneRoutines(routineCache);
  removeRoutineFromCache(routineId);

  try {
    await runQueuedMutation(() => deleteRoutineApi(existing.backendId as string));
  } catch (error) {
    routineCache = previousCache;
    throw error;
  }
}

export async function setActiveRoutine(routineId: string): Promise<void> {
  const routine = getCachedRoutine(routineId);
  if (!routine) {
    throw new Error(`Routine with id ${routineId} not found`);
  }

  const validationError = getRoutinePersistenceValidationError(routine);
  if (validationError) {
    throw new Error(validationError);
  }

  await runQueuedMutation(async () => {
    const syncedRoutine = await syncRoutineIfNeeded(routineId, {
      sync: "force",
      throwOnSyncError: true,
    });

    if (!syncedRoutine.backendId) {
      throw new Error("Routine could not be synced before activation.");
    }

    await activateRoutineApi(syncedRoutine.backendId);
    routineCache = routineCache.map((item) => ({
      ...item,
      isActive: item.id === routineId,
    }));
  });
}

export function getActiveRoutine(): Routine | null {
  const routine = routineCache.find((item) => item.isActive) ?? null;
  return routine ? cloneRoutine(routine) : null;
}

// ============================================
// MEMORY UTILITIES
// ============================================

export function clearAllRoutines(): void {
  routineCache = [];
  initialized = false;
  initializationPromise = null;
}

export function exportRoutines(): string {
  return JSON.stringify(loadRoutines(), null, 2);
}

export function importRoutines(jsonData: string): void {
  const data = JSON.parse(jsonData) as Routine[];
  routineCache = data.map(normalizeRoutine);
}

