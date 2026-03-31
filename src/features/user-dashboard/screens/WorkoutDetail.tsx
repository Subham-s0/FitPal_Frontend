import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Edit3, Plus, Settings, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ExerciseLibraryPanel,
  ExerciseLibrarySheet,
  type ExerciseItem,
} from "@/features/exercises";

import type {
  Routine,
  WorkoutDay,
  RoutineExercise,
  RoutineSet,
} from "@/features/user-dashboard/routineTypes";
import {
  getExerciseInitials,
  getVisibleSetFields,
  createDefaultSet,
  createExerciseFromLibrary,
} from "@/features/user-dashboard/routineTypes";
import {
  getRoutine,
  updateRoutine,
} from "@/features/user-dashboard/routineStore";
import MuscleHeatmap from "@/features/user-dashboard/components/MuscleHeatmap";

// ============================================
// PROPS
// ============================================

interface WorkoutDetailProps {
  routineId: string;
  dayId: string;
  onBack: () => void;
  onEditRoutineDays: (routineId: string, dayId: string) => void;
}

// ============================================
// SORTABLE EXERCISE CARD (Edit Mode)
// ============================================

interface SortableExerciseWrapperProps {
  exercise: RoutineExercise;
  children: React.ReactNode;
}

function SortableExerciseWrapper({ exercise, children }: SortableExerciseWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/drag relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-4 z-10 cursor-grab rounded p-1 text-gray-600 opacity-0 transition-opacity group-hover/drag:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      {children}
    </div>
  );
}

// ============================================
// EXERCISE CARD
// ============================================

interface ExerciseCardProps {
  exercise: RoutineExercise;
  exerciseNumber: number;
  editMode: boolean;
  onUpdateSet?: (exerciseId: string, setId: string, updates: Partial<RoutineSet>) => void;
  onRemoveSet?: (exerciseId: string, setId: string) => void;
  onAddSet?: (exerciseId: string) => void;
  onRemoveExercise?: (exerciseId: string) => void;
  onUpdateNotes?: (exerciseId: string, notes: string) => void;
}

const ExerciseCard = ({
  exercise,
  exerciseNumber,
  editMode,
  onUpdateSet,
  onRemoveSet,
  onAddSet,
  onRemoveExercise,
  onUpdateNotes,
}: ExerciseCardProps) => {
  const fields = getVisibleSetFields(exercise.exerciseType);

  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-4">
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        {exercise.coverUrl ? (
          <img
            src={exercise.coverUrl}
            alt={exercise.name}
            className="h-11 w-11 flex-shrink-0 rounded-lg border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black text-xs font-black text-orange-600">
            {getExerciseInitials(exercise.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-orange-600/20 text-[10px] font-black text-orange-600">
              {exerciseNumber}
            </span>
            <h4 className="text-sm font-bold text-white">{exercise.name}</h4>
          </div>
          <p className="text-[10px] text-gray-500">
            {exercise.equipmentName || exercise.primaryMuscles.join(", ")}
          </p>
        </div>

        {editMode && onRemoveExercise && (
          <button
            onClick={() => onRemoveExercise(exercise.id)}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Notes */}
      {editMode ? (
        <textarea
          value={exercise.notes}
          onChange={(e) => onUpdateNotes?.(exercise.id, e.target.value)}
          placeholder="Add notes..."
          rows={1}
          className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-orange-600 focus:outline-none"
        />
      ) : (
        exercise.notes && (
          <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
            <p className="text-xs text-gray-400">{exercise.notes}</p>
          </div>
        )
      )}

      {/* Sets Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              <th className="pb-2 pr-3 text-left font-bold text-gray-500">Set</th>
              {fields.weight && (
                <th className="pb-2 px-2 text-left font-bold text-gray-500">
                  {fields.weightLabel || "Weight"}
                </th>
              )}
              {fields.reps && (
                <th className="pb-2 px-2 text-left font-bold text-gray-500">Reps</th>
              )}
              {fields.duration && (
                <th className="pb-2 px-2 text-left font-bold text-gray-500">Time</th>
              )}
              {fields.distance && (
                <th className="pb-2 px-2 text-left font-bold text-gray-500">Dist</th>
              )}
              {editMode && <th className="pb-2 w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {exercise.sets.map((set, index) => (
              <tr key={set.id} className="border-b border-white/[0.02]">
                <td className="py-1.5 pr-3 font-bold text-white">{index + 1}</td>
                {fields.weight && (
                  <td className="py-1.5 px-2">
                    {editMode ? (
                      <input
                        type="number"
                        value={set.targetWeight ?? ""}
                        onChange={(e) =>
                          onUpdateSet?.(exercise.id, set.id, {
                            targetWeight: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="-"
                        className="w-16 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-white focus:border-orange-600 focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-400">
                        {set.targetWeight ? `${set.targetWeight} kg` : "-"}
                      </span>
                    )}
                  </td>
                )}
                {fields.reps && (
                  <td className="py-1.5 px-2">
                    {editMode ? (
                      <input
                        type="number"
                        value={set.targetReps ?? ""}
                        onChange={(e) =>
                          onUpdateSet?.(exercise.id, set.id, {
                            targetReps: e.target.value ? parseInt(e.target.value, 10) : null,
                          })
                        }
                        placeholder="-"
                        className="w-14 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-white focus:border-orange-600 focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-400">{set.targetReps || "-"}</span>
                    )}
                  </td>
                )}
                {fields.duration && (
                  <td className="py-1.5 px-2">
                    {editMode ? (
                      <input
                        type="number"
                        value={set.targetDurationSeconds ?? ""}
                        onChange={(e) =>
                          onUpdateSet?.(exercise.id, set.id, {
                            targetDurationSeconds: e.target.value ? parseInt(e.target.value, 10) : null,
                          })
                        }
                        placeholder="-"
                        className="w-16 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-white focus:border-orange-600 focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-400">
                        {set.targetDurationSeconds
                          ? `${Math.floor(set.targetDurationSeconds / 60)}:${(set.targetDurationSeconds % 60).toString().padStart(2, "0")}`
                          : "-"}
                      </span>
                    )}
                  </td>
                )}
                {fields.distance && (
                  <td className="py-1.5 px-2">
                    {editMode ? (
                      <input
                        type="number"
                        value={set.targetDistance ?? ""}
                        onChange={(e) =>
                          onUpdateSet?.(exercise.id, set.id, {
                            targetDistance: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="-"
                        className="w-16 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-white focus:border-orange-600 focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-400">
                        {set.targetDistance ? `${set.targetDistance} m` : "-"}
                      </span>
                    )}
                  </td>
                )}
                {editMode && (
                  <td className="py-1.5 pl-2">
                    <button
                      onClick={() => onRemoveSet?.(exercise.id, set.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMode && (
        <button
          onClick={() => onAddSet?.(exercise.id)}
          className="mt-2 text-xs font-bold text-orange-600 hover:text-orange-500 transition-colors"
        >
          + Add Set
        </button>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const WorkoutDetail = ({
  routineId,
  dayId,
  onBack,
  onEditRoutineDays,
}: WorkoutDetailProps) => {
  const [editMode, setEditMode] = useState(false);
  const [localDay, setLocalDay] = useState<WorkoutDay | null>(null);
  const [showLibrarySheet, setShowLibrarySheet] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load routine and day
  const routine = useMemo(() => getRoutine(routineId), [routineId]);
  const day = useMemo(
    () => routine?.days.find((d) => d.id === dayId) || null,
    [routine, dayId]
  );

  // Initialize local state
  useMemo(() => {
    if (day) setLocalDay({ ...day });
  }, [day]);

  // Handlers for edit mode
  const handleUpdateNotes = useCallback(
    (exerciseId: string, notes: string) => {
      setLocalDay((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, notes } : ex
              ),
            }
          : prev
      );
    },
    []
  );

  const handleUpdateSet = useCallback(
    (exerciseId: string, setId: string, updates: Partial<RoutineSet>) => {
      setLocalDay((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((ex) =>
                ex.id === exerciseId
                  ? {
                      ...ex,
                      sets: ex.sets.map((set) =>
                        set.id === setId ? { ...set, ...updates } : set
                      ),
                    }
                  : ex
              ),
            }
          : prev
      );
    },
    []
  );

  const handleRemoveSet = useCallback(
    (exerciseId: string, setId: string) => {
      setLocalDay((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((ex) =>
                ex.id === exerciseId
                  ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
                  : ex
              ),
            }
          : prev
      );
    },
    []
  );

  const handleAddSet = useCallback(
    (exerciseId: string) => {
      setLocalDay((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            const newSet = createDefaultSet(ex.sets.length + 1, ex.defaultRestSeconds);
            return { ...ex, sets: [...ex.sets, newSet] };
          }),
        };
      });
    },
    []
  );

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    setLocalDay((prev) =>
      prev
        ? { ...prev, exercises: prev.exercises.filter((ex) => ex.id !== exerciseId) }
        : prev
    );
  }, []);

  const handleAddExercise = useCallback(
    (exerciseItem: ExerciseItem) => {
      if (!localDay) return;
      const newExercise = createExerciseFromLibrary(
        exerciseItem as any,
        localDay.exercises.length
      );
      setLocalDay((prev) =>
        prev ? { ...prev, exercises: [...prev.exercises, newExercise] } : prev
      );
      setShowLibrarySheet(false);
    },
    [localDay]
  );

  const handleExerciseDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalDay((prev) => {
      if (!prev) return prev;
      const oldIndex = prev.exercises.findIndex((ex) => ex.id === active.id);
      const newIndex = prev.exercises.findIndex((ex) => ex.id === over.id);
      return { ...prev, exercises: arrayMove(prev.exercises, oldIndex, newIndex) };
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!routine || !localDay) return;
    const updatedRoutine: Routine = {
      ...routine,
      days: routine.days.map((d) => (d.id === dayId ? localDay : d)),
    };
    updateRoutine(routineId, updatedRoutine);
    setEditMode(false);
  }, [routine, localDay, routineId, dayId]);

  const handleCancel = useCallback(() => {
    if (day) setLocalDay({ ...day });
    setEditMode(false);
  }, [day]);

  if (!routine || !day || !localDay) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Workout not found</p>
        <button onClick={onBack} className="mt-4 text-sm text-orange-600 hover:text-orange-500">
          ← Back to Routines
        </button>
      </div>
    );
  }

  const exercisesToShow = editMode ? localDay.exercises : day.exercises;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <p className="text-xs text-gray-500">{routine.name}</p>
            <h2 className="text-2xl font-black text-white">{localDay.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => setShowLibrarySheet(true)}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/5 md:hidden"
              >
                <Plus className="h-4 w-4" />
                Add Exercise
              </button>
              <button
                onClick={handleCancel}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-orange-700"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/5"
              >
                <Edit3 className="h-4 w-4" />
                Edit Workout
              </button>
              <button
                onClick={() => onEditRoutineDays(routineId, dayId)}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/5"
              >
                <Settings className="h-4 w-4" />
                Edit Routine Days
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-column layout: Exercises left, Heatmap + Summary right */}
      <div className="flex gap-6">
        {/* Left: Exercise List */}
        <div className="min-w-0 flex-1 space-y-4">
          {exercisesToShow.length === 0 ? (
            <div className="rounded-[2rem] border border-white/5 bg-[#111] p-12 text-center">
              <p className="mb-4 text-sm text-gray-500">No exercises yet</p>
              {editMode ? (
                <button
                  onClick={() => setShowLibrarySheet(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </button>
              ) : (
                <button
                  onClick={() => onEditRoutineDays(routineId, dayId)}
                  className="text-sm font-bold text-orange-600 hover:text-orange-500"
                >
                  Add Exercises
                </button>
              )}
            </div>
          ) : editMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleExerciseDragEnd}
            >
              <SortableContext
                items={exercisesToShow.map((ex) => ex.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {exercisesToShow.map((exercise, index) => (
                    <SortableExerciseWrapper key={exercise.id} exercise={exercise}>
                      <ExerciseCard
                        exercise={exercise}
                        exerciseNumber={index + 1}
                        editMode
                        onUpdateSet={handleUpdateSet}
                        onRemoveSet={handleRemoveSet}
                        onAddSet={handleAddSet}
                        onRemoveExercise={handleRemoveExercise}
                        onUpdateNotes={handleUpdateNotes}
                      />
                    </SortableExerciseWrapper>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-3">
              {exercisesToShow.map((exercise, index) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  exerciseNumber={index + 1}
                  editMode={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Muscle Heatmap + Summary (desktop only) */}
        <div className="hidden w-72 flex-shrink-0 space-y-4 lg:block">
          {/* Routine Summary card */}
          <div className="rounded-2xl border border-white/5 bg-[#111] p-4">
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-gray-500">
              Day Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                <p className="text-2xl font-black text-white">{exercisesToShow.length}</p>
                <p className="text-[9px] font-bold uppercase text-gray-500">Exercises</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                <p className="text-2xl font-black text-white">
                  {exercisesToShow.reduce((sum, ex) => sum + ex.sets.length, 0)}
                </p>
                <p className="text-[9px] font-bold uppercase text-gray-500">Total Sets</p>
              </div>
            </div>
          </div>

          {/* Muscle Heatmap */}
          {exercisesToShow.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-[#111] p-4">
              <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-gray-500">
                Muscle Distribution
              </h3>
              <MuscleHeatmap exercises={exercisesToShow} variant="compact" />
            </div>
          )}

          {/* Exercise Library (desktop, edit mode only) */}
          {editMode && (
            <div className="rounded-2xl border border-white/5 bg-[#111] p-4">
              <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-gray-500">
                Add Exercise
              </h3>
              <div className="max-h-[400px] overflow-y-auto">
                <ExerciseLibraryPanel
                  onAddExercise={handleAddExercise}
                  showAddButton
                  showCustomButton
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Exercise Library Sheet (edit mode only) */}
      {editMode && (
        <ExerciseLibrarySheet
          open={showLibrarySheet}
          onOpenChange={setShowLibrarySheet}
          onAddExercise={handleAddExercise}
          showAddButton
        />
      )}
    </div>
  );
};

export default WorkoutDetail;
