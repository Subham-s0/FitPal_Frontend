import type {
  FitnessLevel,
  Gender,
  PrimaryFitnessFocus,
} from "@/features/profile/model";
import type { ExerciseType } from "@/features/exercises/model";

export type AiCanonicalLift =
  | "BENCH_PRESS"
  | "SQUAT"
  | "DEADLIFT"
  | "SHOULDER_PRESS";

export type AiStrengthSnapshotSource = "HISTORY" | "USER_INPUT";

export type EquipmentPreference =
  | "ALL"
  | "NONE"
  | "DUMBBELL"
  | "MACHINE"
  | "BARBELL";

export type WeightUnit = "KG" | "LB";

export interface AiProfileSummaryResponse {
  gender: Gender | null;
  weight: number | null;
  height: number | null;
  fitnessLevel: FitnessLevel | null;
  primaryFitnessFocus: PrimaryFitnessFocus | null;
}

export interface AiLiftSnapshotResponse {
  estimated1rm: number;
  bestSetWeight: number;
  bestSetReps: number;
  source: AiStrengthSnapshotSource;
}

export interface AiStrengthSnapshotResponse {
  benchPress: AiLiftSnapshotResponse | null;
  squat: AiLiftSnapshotResponse | null;
  deadlift: AiLiftSnapshotResponse | null;
  shoulderPress: AiLiftSnapshotResponse | null;
}

export interface AiRoutineBootstrapResponse {
  canGenerate: boolean;
  missingProfileFields: string[];
  profileSummary: AiProfileSummaryResponse;
  strengthSnapshot: AiStrengthSnapshotResponse;
  liftsMissingSnapshot: AiCanonicalLift[];
}

export interface LiftInputRequest {
  weight: number;
  reps: number;
  unit: WeightUnit;
}

export interface StrengthInputsRequest {
  benchPress: LiftInputRequest | null;
  squat: LiftInputRequest | null;
  deadlift: LiftInputRequest | null;
  shoulderPress: LiftInputRequest | null;
}

export interface GenerateRoutineSuggestionsRequest {
  daysPerWeek: number;
  equipmentPreferences: EquipmentPreference[];
  routineGoal: PrimaryFitnessFocus | null;
  strengthInputs: StrengthInputsRequest;
}

export interface AiPromptOneInputResponse {
  daysPerWeek: number;
  effectiveGoal: PrimaryFitnessFocus;
  allowedEquipment: EquipmentPreference[];
  age: number | null;
  profileSummary: AiProfileSummaryResponse;
}

export interface AiRoutineSplitDayResponse {
  day: number;
  label: string;
  muscles: string[];
  targetSlotCount?: number | null;
}

export interface AiRoutineSplitSuggestionResponse {
  splitId: string;
  splitName: string;
  daysPerWeek: number;
  description: string;
  split: AiRoutineSplitDayResponse[];
}

export interface AiRoutineSuggestionsResponse {
  effectiveGoal: PrimaryFitnessFocus;
  normalizedEquipmentPreferences: EquipmentPreference[];
  profileSummary: AiProfileSummaryResponse;
  strengthSnapshot: AiStrengthSnapshotResponse;
  promptInput: AiPromptOneInputResponse;
  llmModel: string;
  suggestions: AiRoutineSplitSuggestionResponse[];
}

export interface GenerateRoutinePreviewRequest {
  generationRequest: GenerateRoutineSuggestionsRequest;
  selectedSuggestion: AiRoutineSplitSuggestionResponse;
}

export interface AiRoutinePreviewSetResponse {
  routineSetTemplateId: string | null;
  setNo: number;
  targetReps: number | null;
  targetWeight: number | null;
  targetRestSeconds: number | null;
  targetDurationSeconds: number | null;
  targetDistance: number | null;
}

export interface AiRoutinePreviewExerciseResponse {
  order: number;
  notes: string;
  exerciseSource: "library" | "custom";
  sourceExerciseId: number;
  exerciseName: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  movementPattern: string;
  searchQuery: string;
  sets: AiRoutinePreviewSetResponse[];
}

export interface AiRoutinePreviewDayResponse {
  day: number;
  label: string;
  summary: string;
  exercises: AiRoutinePreviewExerciseResponse[];
}

export interface AiRoutinePreviewResponse {
  routineName: string;
  description: string;
  routineType: PrimaryFitnessFocus;
  llmModel: string;
  selectedSuggestion: AiRoutineSplitSuggestionResponse;
  days: AiRoutinePreviewDayResponse[];
}
