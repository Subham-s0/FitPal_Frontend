import type {
  RoutineExerciseResponse,
  RoutineFocusType,
  RoutineStructureType,
  SupersetGroupResponse,
} from "@/features/routines/routineTypes";

export type WorkoutSessionMode = "ROUTINE" | "FREESTYLE";
export type TodaySessionState = "NONE" | "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
export type RoutineLogStatus = "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export interface WorkoutSessionSetResponse {
  routineLogSetId: string;
  setOrder: number;
  targetReps: number | null;
  actualReps: number | null;
  targetWeight: number | null;
  actualWeight: number | null;
  targetRestSeconds: number | null;
  actualRestSeconds: number | null;
  targetDurationSeconds: number | null;
  actualDurationSeconds: number | null;
  targetDistance: number | null;
  actualDistance: number | null;
  rir: number | null;
  tempo: string | null;
  warmup: boolean;
  completed: boolean;
  completedAt: string | null;
}

export interface WorkoutSessionExerciseResponse {
  routineLogExerciseId: string;
  routineDayExerciseId: string | null;
  exerciseOrder: number;
  notes: string | null;
  supersetGroupId: string | null;
  exerciseSource: "library" | "custom";
  sourceExerciseId: number;
  exerciseName: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  sets: WorkoutSessionSetResponse[];
}

export interface WorkoutSessionResponse {
  routineLogId: string;
  mode: WorkoutSessionMode;
  routineId: string | null;
  routineName: string | null;
  routineDayId: string | null;
  routineDayName: string | null;
  title: string;
  sessionDate: string;
  status: RoutineLogStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  exercises: WorkoutSessionExerciseResponse[];
}

export interface WorkoutSessionSummaryResponse {
  routineLogId: string;
  mode: WorkoutSessionMode;
  routineId: string | null;
  routineName: string | null;
  routineDayId: string | null;
  routineDayName: string | null;
  title: string;
  sessionDate: string;
  status: RoutineLogStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  exerciseCount: number;
  completedSetCount: number;
}

export interface PlannedWorkoutSessionResponse {
  routineId: string;
  routineName: string;
  routineDayId: string;
  routineDayName: string;
  structureType: RoutineStructureType;
  routineType: RoutineFocusType | null;
  supersetGroups: SupersetGroupResponse[];
  exercises: RoutineExerciseResponse[];
}

export interface TodayWorkoutSessionResponse {
  state: TodaySessionState;
  requestedDate: string;
  activeRoutineId: string | null;
  activeRoutineName: string | null;
  session: WorkoutSessionResponse | null;
  plannedSession: PlannedWorkoutSessionResponse | null;
}

export interface StartWorkoutSessionRequest {
  mode: WorkoutSessionMode;
  title?: string | null;
  routineId?: string | null;      // Optional: specific routine to use
  routineDayId?: string | null;   // Optional: specific day to start
}

export interface UpdateWorkoutSetRequest {
  targetReps?: number | null;
  actualReps?: number | null;
  targetWeight?: number | null;
  actualWeight?: number | null;
  targetRestSeconds?: number | null;
  actualRestSeconds?: number | null;
  targetDurationSeconds?: number | null;
  actualDurationSeconds?: number | null;
  targetDistance?: number | null;
  actualDistance?: number | null;
  rir?: number | null;
  tempo?: string | null;
  warmup?: boolean | null;
  completed?: boolean | null;
}

export interface CompleteWorkoutSessionRequest {
  notes?: string | null;
  durationSeconds?: number | null;
}

export interface SkipWorkoutSessionRequest {
  notes?: string | null;
}

export interface AddWorkoutExerciseRequest {
  exerciseSource: "library" | "custom";
  sourceExerciseId: number;
  notes?: string | null;
  sets?: AddWorkoutSetRequest[];
}

export interface AddWorkoutSetRequest {
  targetReps?: number | null;
  actualReps?: number | null;
  targetWeight?: number | null;
  actualWeight?: number | null;
  targetRestSeconds?: number | null;
  actualRestSeconds?: number | null;
  targetDurationSeconds?: number | null;
  actualDurationSeconds?: number | null;
  targetDistance?: number | null;
  actualDistance?: number | null;
  rir?: number | null;
  tempo?: string | null;
  warmup?: boolean;
  completed?: boolean;
}

