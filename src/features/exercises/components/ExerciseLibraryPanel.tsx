import { startTransition, useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";

import {
  getExerciseLibraryApi,
  getExerciseLibraryEquipmentApi,
  getExerciseLibraryMusclesApi,
  getMyCustomExercisesApi,
} from "@/features/exercises/api";
import type {
  CustomExerciseResponse,
  ExerciseLibrarySummaryResponse,
  ExerciseType,
} from "@/features/exercises/model";
import { exerciseQueryKeys } from "@/features/exercises/queryKeys";
import { CustomSelect } from "@/shared/ui/CustomSelect";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { useAuthState } from "@/features/auth/hooks";

// ============================================
// TYPES
// ============================================

export type ExerciseSource = "library" | "custom";

export interface ExerciseItem {
  key: string;
  source: ExerciseSource;
  id: number;
  name: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  popular: boolean;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

export interface ExerciseLibraryPanelProps {
  /** Called when user adds an exercise */
  onAddExercise: (exercise: ExerciseItem) => void;
  /** Optional: for selecting/viewing exercises without adding */
  onSelectExercise?: (exercise: ExerciseItem) => void;
  /** The currently selected exercise key (for highlighting) */
  selectedExerciseKey?: string | null;
  /** Show "Add" button on each exercise (default: true) */
  showAddButton?: boolean;
  /** Show "Custom" button to create new exercises (default: true) */
  showCustomButton?: boolean;
  /** Callback when custom button is clicked */
  onCustomClick?: () => void;
  /** Show delete button for custom exercises (default: false) */
  showDeleteButton?: boolean;
  /** Callback when delete button is clicked */
  onDeleteExercise?: (exercise: ExerciseItem) => void;
  /** Is delete in progress */
  deleteDisabled?: boolean;
}

// ============================================
// HELPERS
// ============================================

function getExerciseInitials(name?: string | null) {
  if (!name) return "EX";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("") || "EX";
}

function toExerciseItem(exercise: ExerciseLibrarySummaryResponse): ExerciseItem {
  return {
    key: `library-${exercise.exerciseId}`,
    source: "library",
    id: exercise.exerciseId,
    name: exercise.name,
    equipmentName: exercise.equipmentName ?? null,
    coverUrl: exercise.coverUrl ?? null,
    exerciseType: exercise.exerciseType,
    popular: exercise.popular,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: [],
  };
}

function toCustomExerciseItem(exercise: CustomExerciseResponse): ExerciseItem {
  return {
    key: `custom-${exercise.customExerciseId}`,
    source: "custom",
    id: exercise.customExerciseId,
    name: exercise.name,
    equipmentName: exercise.equipment?.name ?? null,
    coverUrl: exercise.coverImgUrl ?? null,
    exerciseType: exercise.exerciseType,
    popular: false,
    primaryMuscles: exercise.primaryMuscle?.name ? [exercise.primaryMuscle.name] : [],
    secondaryMuscles: exercise.secondaryMuscles.map((m) => m.name),
  };
}

function matchesCustomExerciseFilters(
  exercise: CustomExerciseResponse,
  query: string,
  selectedMuscle: string,
  selectedEquipment: string
) {
  const normalizedQuery = query.trim().toLowerCase();
  const exerciseMuscles = [exercise.primaryMuscle, ...exercise.secondaryMuscles].filter(Boolean);

  if (
    selectedMuscle !== "all" &&
    !exerciseMuscles.some((muscle) => muscle?.muscleId === Number(selectedMuscle))
  ) {
    return false;
  }

  if (
    selectedEquipment !== "all" &&
    exercise.equipment?.equipmentId !== Number(selectedEquipment)
  ) {
    return false;
  }

  if (!normalizedQuery) return true;

  const searchFields = [
    exercise.name,
    exercise.exerciseType,
    exercise.equipment?.name,
    exercise.primaryMuscle?.name,
    ...exercise.secondaryMuscles.map((muscle) => muscle.name),
  ];

  return searchFields.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

// ============================================
// EXERCISE LIST ITEM
// ============================================

interface ExerciseListItemProps {
  exercise: ExerciseItem;
  isActive: boolean;
  showAddButton: boolean;
  showDeleteButton: boolean;
  deleteDisabled: boolean;
  onSelect?: () => void;
  onAdd: () => void;
  onDelete?: () => void;
}

function ExerciseListItem({
  exercise,
  isActive,
  showAddButton,
  showDeleteButton,
  deleteDisabled,
  onSelect,
  onAdd,
  onDelete,
}: ExerciseListItemProps) {
  const primaryLabel =
    exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles.join(", ") : "No primary muscle";
  const equipmentLabel = exercise.equipmentName ?? "No equipment";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSelect ?? onAdd}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-[1.5rem] p-3 text-left transition-all ${
          isActive
            ? "active-exercise"
            : "border border-transparent hover:border-white/5 hover:bg-white/[0.02]"
        }`}
      >
        {exercise.coverUrl ? (
          <img
            src={exercise.coverUrl}
            alt={exercise.name}
            className="h-10 w-10 rounded-xl border border-white/10 object-cover"
          />
        ) : (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black text-xs font-black ${
              isActive ? "text-orange-600" : "text-gray-500"
            }`}
          >
            {getExerciseInitials(exercise.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={`truncate text-[10px] font-black uppercase leading-tight tracking-wide ${
                isActive ? "text-white" : "text-gray-300"
              }`}
            >
              {exercise.name}
            </h4>
            {exercise.source === "custom" && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest ${
                  isActive ? "bg-orange-600/20 text-orange-100" : "bg-white/5 text-orange-400"
                }`}
              >
                Custom
              </span>
            )}
          </div>
          <p
            className={`truncate text-[8px] font-black uppercase tracking-widest ${
              isActive ? "text-orange-600/70" : "text-gray-500"
            }`}
          >
            {primaryLabel} / {equipmentLabel}
          </p>
        </div>
      </button>

      {showAddButton && (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-600/20 bg-orange-600/10 transition-all hover:bg-orange-600/20"
          title="Add to workout"
        >
          <Plus className="h-4 w-4 text-orange-400" />
        </button>
      )}

      {showDeleteButton && exercise.source === "custom" && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteDisabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 transition-all hover:bg-red-500/20 disabled:opacity-50"
          title="Delete custom exercise"
        >
          <X className="h-3 w-3 text-red-400" />
        </button>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ExerciseLibraryPanel({
  onAddExercise,
  onSelectExercise,
  selectedExerciseKey,
  showAddButton = true,
  showCustomButton = true,
  onCustomClick,
  showDeleteButton = false,
  onDeleteExercise,
  deleteDisabled = false,
}: ExerciseLibraryPanelProps) {
  const [selectedMuscle, setSelectedMuscle] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const auth = useAuthState();

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const hasAuthToken = Boolean(auth.accessToken);

  const muscleOptionsQuery = useQuery({
    queryKey: exerciseQueryKeys.muscles(),
    queryFn: getExerciseLibraryMusclesApi,
    enabled: hasAuthToken,
  });

  const equipmentOptionsQuery = useQuery({
    queryKey: exerciseQueryKeys.equipment(),
    queryFn: getExerciseLibraryEquipmentApi,
    enabled: hasAuthToken,
  });

  const exercisesQuery = useQuery({
    queryKey: exerciseQueryKeys.libraryList(
      deferredSearchQuery || undefined,
      selectedMuscle === "all" ? null : Number(selectedMuscle),
      selectedEquipment === "all" ? null : Number(selectedEquipment)
    ),
    queryFn: () =>
      getExerciseLibraryApi({
        query: deferredSearchQuery || undefined,
        muscleIds: selectedMuscle === "all" ? undefined : [Number(selectedMuscle)],
        equipmentIds: selectedEquipment === "all" ? undefined : [Number(selectedEquipment)],
      }),
    enabled: hasAuthToken,
    placeholderData: (previousData) => previousData,
  });

  const customExercisesQuery = useQuery({
    queryKey: exerciseQueryKeys.customList(),
    queryFn: getMyCustomExercisesApi,
    enabled: hasAuthToken,
  });

  const exercises = (exercisesQuery.data ?? []).map(toExerciseItem);
  const customExercises = (customExercisesQuery.data ?? [])
    .filter((exercise) =>
      matchesCustomExerciseFilters(exercise, deferredSearchQuery, selectedMuscle, selectedEquipment)
    )
    .map(toCustomExerciseItem);
  const popularExercises = exercises.filter((ex) => ex.popular);
  const allExercises = exercises.filter((ex) => !ex.popular);

  const muscleOptions = [
    { value: "all", label: "All Muscles" },
    ...(muscleOptionsQuery.data ?? []).map((muscle) => ({
      value: String(muscle.muscleId),
      label: muscle.name,
    })),
  ];

  const equipmentOptions = [
    { value: "all", label: "All Equipment" },
    ...(equipmentOptionsQuery.data ?? []).map((equipment) => ({
      value: String(equipment.equipmentId),
      label: equipment.name,
    })),
  ];

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      setSearchQuery(value);
    });
  };

  const handleMuscleChange = (value: string) => {
    startTransition(() => {
      setSelectedMuscle(value);
    });
  };

  const handleEquipmentChange = (value: string) => {
    startTransition(() => {
      setSelectedEquipment(value);
    });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Mobile drag handle */}
      <div className="flex justify-center px-4 pt-3 md:hidden">
        <div className="h-1.5 w-12 rounded-full bg-white/10" />
      </div>

      {/* Scrollable Content (Search/Filters + List) */}
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {/* Header + Filters */}
        <div className="space-y-3 border-b border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                Exercise Library
              </h3>
              <p className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.15em] text-gray-500 md:hidden">
                Select an exercise
              </p>
            </div>
            {showCustomButton && onCustomClick && (
              <button
                type="button"
                onClick={onCustomClick}
                className="rounded-lg border border-orange-600/20 bg-orange-600/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-orange-600 transition-all hover:bg-gradient-fire hover:text-white"
              >
                + Custom
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 pl-10 text-sm font-medium text-slate-200 transition-all placeholder:text-slate-500 hover:border-orange-600/50 focus:border-orange-600/50 focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(234,88,12,0.08)]"
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>

            <CustomSelect
              options={muscleOptions}
              value={selectedMuscle}
              onChange={handleMuscleChange}
              placeholder="All Muscles"
              className="h-10 w-full"
              disabled={muscleOptionsQuery.isLoading}
            />

            <CustomSelect
              options={equipmentOptions}
              value={selectedEquipment}
              onChange={handleEquipmentChange}
              placeholder="All Equipment"
              className="h-10 w-full"
              disabled={equipmentOptionsQuery.isLoading}
            />
          </div>
        </div>

        {/* Exercise List */}
        {/* Custom Exercises */}
        {customExercises.length > 0 && (
          <>
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                Custom Exercises
              </h3>
              <span className="text-[9px] font-bold text-orange-600">
                {customExercises.length} TOTAL
              </span>
            </div>
            <div className="space-y-2 border-b border-white/5 p-4">
              {customExercises.map((exercise) => (
                <ExerciseListItem
                  key={exercise.key}
                  exercise={exercise}
                  isActive={selectedExerciseKey === exercise.key}
                  showAddButton={showAddButton}
                  showDeleteButton={showDeleteButton}
                  deleteDisabled={deleteDisabled}
                  onSelect={onSelectExercise ? () => onSelectExercise(exercise) : undefined}
                  onAdd={() => onAddExercise(exercise)}
                  onDelete={onDeleteExercise ? () => onDeleteExercise(exercise) : undefined}
                />
              ))}
            </div>
          </>
        )}

        {/* Popular Exercises */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-white">
            Popular Exercises
          </h3>
          <span className="text-[9px] font-bold text-orange-600">
            {exercisesQuery.isLoading ? "--" : `${popularExercises.length} TOTAL`}
          </span>
        </div>
        <div className="space-y-2 border-b border-white/5 p-4">
          {exercisesQuery.isLoading ? (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              Loading...
            </p>
          ) : popularExercises.length > 0 ? (
            popularExercises.map((exercise) => (
              <ExerciseListItem
                key={exercise.key}
                exercise={exercise}
                isActive={selectedExerciseKey === exercise.key}
                showAddButton={showAddButton}
                showDeleteButton={false}
                deleteDisabled={false}
                onSelect={onSelectExercise ? () => onSelectExercise(exercise) : undefined}
                onAdd={() => onAddExercise(exercise)}
              />
            ))
          ) : (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              No popular exercises
            </p>
          )}
        </div>

        {/* All Exercises */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-white">All Exercises</h3>
          <span className="text-[9px] font-bold text-orange-600">
            {exercisesQuery.isLoading ? "--" : `${allExercises.length} TOTAL`}
          </span>
        </div>
        <div className="space-y-2 p-4">
          {exercisesQuery.isLoading ? (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              Loading...
            </p>
          ) : allExercises.length > 0 ? (
            allExercises.map((exercise) => (
              <ExerciseListItem
                key={exercise.key}
                exercise={exercise}
                isActive={selectedExerciseKey === exercise.key}
                showAddButton={showAddButton}
                showDeleteButton={false}
                deleteDisabled={false}
                onSelect={onSelectExercise ? () => onSelectExercise(exercise) : undefined}
                onAdd={() => onAddExercise(exercise)}
              />
            ))
          ) : exercises.length === 0 && customExercises.length === 0 ? (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              No exercises found
            </p>
          ) : (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              No additional exercises
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOBILE BOTTOM SHEET WRAPPER
// ============================================

interface ExerciseLibrarySheetProps extends ExerciseLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExerciseLibrarySheet({
  isOpen,
  onClose,
  ...panelProps
}: ExerciseLibrarySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] overflow-hidden rounded-t-[2rem] border-white/10 bg-[#0a0a0a] p-0"
      >
        <SheetTitle className="sr-only">Exercise Library</SheetTitle>
        <ExerciseLibraryPanel {...panelProps} />
      </SheetContent>
    </Sheet>
  );
}

export default ExerciseLibraryPanel;
