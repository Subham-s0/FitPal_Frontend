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
