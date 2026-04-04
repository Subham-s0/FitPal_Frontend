export type ExerciseMuscleType = "PRIMARY" | "SECONDARY";

export interface ExerciseEquipmentResponse {
  equipmentId: number;
  name: string;
}

export interface MuscleResponse {
  muscleId: number;
  name: string;
  frontUrl?: string | null;
  backUrl?: string | null;
}

export interface ExerciseLibrarySummaryResponse {
  exerciseId: number;
  name: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  popular: boolean;
  primaryMuscles: string[];
}

export interface ExerciseMuscleAssignmentResponse {
  exerciseMuscleId: number;
  muscleId: number | null;
  muscleName: string | null;
  muscleType: ExerciseMuscleType;
}

export interface ExerciseHowToSectionResponse {
  howToSectionId: number;
  displayOrder: number;
  content: string;
}

export interface ExerciseLibraryResponse {
  exerciseId: number;
  name: string;
  equipment: ExerciseEquipmentResponse | null;
  coverUrl: string | null;
  videoUrl: string | null;
  exerciseType: ExerciseType;
  popular: boolean;
  muscleAssignments: ExerciseMuscleAssignmentResponse[];
  howToSections: ExerciseHowToSectionResponse[];
}

export interface ExerciseLibrarySearchRequest {
  query?: string;
  equipmentIds?: number[];
  muscleIds?: number[];
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type ExerciseType = 
  | "Weight Reps"
  | "Reps Only"
  | "Weighted Bodyweight"
  | "Assisted Bodyweight"
  | "Duration"
  | "Weight & Duration"
  | "Distance & Duration"
  | "Weight & Distance";

export interface CustomExerciseRequest {
  name: string;
  equipmentId?: number;
  exerciseType: ExerciseType;
  primaryMuscleId: number;
  secondaryMuscleIds?: number[];
  coverImage?: File;
}

export interface CustomExerciseResponse {
  customExerciseId: number;
  name: string;
  equipment: ExerciseEquipmentResponse | null;
  coverImgUrl: string | null;
  coverPublicId: string | null;
  exerciseType: ExerciseType;
  primaryMuscle: MuscleResponse | null;
  secondaryMuscles: MuscleResponse[];
}

export type ExerciseHistorySource = "LIBRARY" | "CUSTOM";
export type ExerciseTrendRange = "MONTH" | "YEAR" | "ALL_TIME";

export interface UserExerciseHistorySearchRequest {
  exerciseSource: ExerciseHistorySource;
  sourceExerciseId: number;
  page?: number;
  size?: number;
}

export interface UserExerciseHistoryItemResponse {
  routineLogId: string;
  sessionDate: string;
  sessionTitle: string | null;
  routineName: string | null;
  routineDayName: string | null;
  setCount: number;
  completedSetCount: number;
  summaryLabel: string;
  performanceLabel: string | null;
}

export interface UserExerciseMetricRecordResponse {
  metricLabel: string;
  value: number | null;
  unit: string | null;
  displayValue: string;
  detailLabel: string | null;
  achievedOn: string;
}

export interface UserExerciseTrendPointResponse {
  periodStart: string;
  periodLabel: string;
  value: number | null;
  displayValue: string | null;
  detailLabel: string | null;
}

export interface UserExerciseStatsResponse {
  trendLabel: string;
  trendUnit: string | null;
  trendPoints: UserExerciseTrendPointResponse[];
  personalBest: UserExerciseMetricRecordResponse | null;
  estimatedBest: UserExerciseMetricRecordResponse | null;
}
