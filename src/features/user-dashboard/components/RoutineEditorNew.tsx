import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  Plus,
  X,
  GripVertical,
  Save,
  Trash2,
  MoreVertical,
  Copy,
  ArrowUp,
  ArrowDown,
  Edit2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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

import {
  type Routine,
  type WorkoutDay,
  type RoutineExercise,
  type RoutineSet,
  createDefaultRoutine,
  createDefaultDay,
  createDefaultSet,
  createExerciseFromLibrary,
  cloneExercise,
  normalizeDayOrder,
  getVisibleSetFields,
  clearInvalidSetFields,
  getExerciseInitials,
} from "@/features/user-dashboard/routineTypes";

import {
  getRoutine,
  updateRoutine,
  addRoutine,
} from "@/features/user-dashboard/routineStore";

// ============================================
// SORTABLE DAY ITEM
// ============================================

interface SortableDayItemProps {
  day: WorkoutDay;
  isSelected: boolean;
  isEditing: boolean;
  editName: string;
  onSelect: () => void;
  onStartRename: () => void;
  onChangeEditName: (name: string) => void;
  onCommitRename: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function SortableDayItem({
  day,
  isSelected,
  isEditing,
  editName,
  onSelect,
  onStartRename,
  onChangeEditName,
  onCommitRename,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SortableDayItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: day.id,
  });

  const [showMenu, setShowMenu] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Backdrop to dismiss menu */}
      {showMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
      )}
      <button
        onClick={onSelect}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all ${
          isSelected
            ? "border-orange-600/50 bg-orange-600/10 text-white"
            : "border-white/10 bg-black/30 text-gray-400 hover:border-white/20 hover:text-white"
        }`}
      >
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-gray-600" />
        </div>

        {/* Day Order */}
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-orange-600/20 text-[10px] font-black text-orange-600">
          {day.dayOrder}
        </div>

        {/* Day Name (inline edit or static) */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => onChangeEditName(e.target.value)}
            onBlur={onCommitRename}
            onKeyDown={(e) => { if (e.key === "Enter") onCommitRename(); if (e.key === "Escape") onCommitRename(); }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="min-w-0 flex-1 rounded border border-orange-600/50 bg-transparent px-1 py-0.5 text-sm font-bold text-white outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{day.name}</span>
        )}

        {/* Menu */}
        <div className="relative z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded p-1 hover:bg-white/10"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-white/5"
              >
                <Edit2 className="h-3 w-3" />
                Rename
              </button>
              {onMoveUp && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-white/5"
                >
                  <ArrowUp className="h-3 w-3" />
                  Move Up
                </button>
              )}
              {onMoveDown && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-white/5"
                >
                  <ArrowDown className="h-3 w-3" />
                  Move Down
                </button>
              )}
              <div className="my-1 border-t border-white/5" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

// ============================================
// SORTABLE EXERCISE ITEM
// ============================================

interface SortableExerciseCardProps {
  exercise: RoutineExercise;
  exerciseIndex: number;
  onUpdate: (exerciseId: string, updates: Partial<RoutineExercise>) => void;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<RoutineSet>) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onCopyExercise: (exerciseId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function SortableExerciseCard({
  exercise,
  exerciseIndex,
  onUpdate,
  onUpdateSet,
  onRemoveSet,
  onAddSet,
  onRemoveExercise,
  onCopyExercise,
  onMoveUp,
  onMoveDown,
}: SortableExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });

  const [showMenu, setShowMenu] = useState(false);
  const fields = getVisibleSetFields(exercise.exerciseType);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-white/5 bg-black/30 p-4">
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-gray-600" />
        </div>

        {/* Exercise Image/Initials */}
        {exercise.coverUrl ? (
          <img
            src={exercise.coverUrl}
            alt={exercise.name}
            className="h-12 w-12 flex-shrink-0 rounded-lg border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black text-xs font-black text-orange-600">
            {getExerciseInitials(exercise.name)}
          </div>
        )}

        {/* Exercise Info */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-orange-600/20 text-[10px] font-black text-orange-600">
              {exerciseIndex + 1}
            </span>
            <h4 className="font-bold text-white">{exercise.name}</h4>
          </div>
          <p className="text-xs text-gray-500">
            {exercise.equipmentName || exercise.primaryMuscles.join(", ")}
          </p>
        </div>

        {/* Three-Dot Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 hover:bg-white/10"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
              <button
                onClick={() => {
                  onCopyExercise(exercise.id);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-white/5"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
              {onMoveUp && (
                <button
                  onClick={() => {
                    onMoveUp();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-white/5"
                >
                  <ArrowUp className="h-3 w-3" />
                  Move Up
                </button>
              )}
              {onMoveDown && (
                <button
                  onClick={() => {
                    onMoveDown();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-white/5"
                >
                  <ArrowDown className="h-3 w-3" />
                  Move Down
                </button>
              )}
              <div className="my-1 border-t border-white/5" />
              <button
                onClick={() => {
                  onRemoveExercise(exercise.id);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-3">
        <textarea
          value={exercise.notes}
          onChange={(e) => onUpdate(exercise.id, { notes: e.target.value })}
          placeholder="Add notes..."
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-orange-600 focus:outline-none"
        />
      </div>

      {/* Rest Timer */}
      <div className="mb-3">
        <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">
          Rest Between Sets
        </label>
        <select
          value={exercise.defaultRestSeconds}
          onChange={(e) => {
            const newRest = parseInt(e.target.value, 10);
            onUpdate(exercise.id, { defaultRestSeconds: newRest });
            // Update all sets
            exercise.sets.forEach((set) => {
              onUpdateSet(exercise.id, set.id, { targetRestSeconds: newRest });
            });
          }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
        >
          <option value={30}>30 seconds</option>
          <option value={60}>1 minute</option>
          <option value={90}>1.5 minutes</option>
          <option value={120}>2 minutes</option>
          <option value={180}>3 minutes</option>
          <option value={240}>4 minutes</option>
          <option value={300}>5 minutes</option>
        </select>
      </div>

      {/* Sets Table */}
      <div className="space-y-2">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-2 pr-3 text-left font-bold text-gray-500">Set</th>
                {fields.weight && (
                  <th className="pb-2 px-3 text-left font-bold text-gray-500">
                    {fields.weightLabel || "Weight"}
                  </th>
                )}
                {fields.reps && <th className="pb-2 px-3 text-left font-bold text-gray-500">Reps</th>}
                {fields.duration && (
                  <th className="pb-2 px-3 text-left font-bold text-gray-500">Time (s)</th>
                )}
                {fields.distance && (
                  <th className="pb-2 px-3 text-left font-bold text-gray-500">Distance (m)</th>
                )}
                <th className="pb-2 pl-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {exercise.sets.map((set, index) => (
                <tr key={set.id} className="border-b border-white/[0.02]">
                  <td className="py-2 pr-3 font-bold text-white">{index + 1}</td>
                  {fields.weight && (
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={set.targetWeight ?? ""}
                        onChange={(e) =>
                          onUpdateSet(exercise.id, set.id, {
                            targetWeight: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="-"
                        className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white focus:border-orange-600 focus:outline-none"
                      />
                    </td>
                  )}
                  {fields.reps && (
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={set.targetReps ?? ""}
                        onChange={(e) =>
                          onUpdateSet(exercise.id, set.id, {
                            targetReps: e.target.value ? parseInt(e.target.value, 10) : null,
                          })
                        }
                        placeholder="-"
                        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white focus:border-orange-600 focus:outline-none"
                      />
                    </td>
                  )}
                  {fields.duration && (
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={set.targetDurationSeconds ?? ""}
                        onChange={(e) =>
                          onUpdateSet(exercise.id, set.id, {
                            targetDurationSeconds: e.target.value
                              ? parseInt(e.target.value, 10)
                              : null,
                          })
                        }
                        placeholder="-"
                        className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white focus:border-orange-600 focus:outline-none"
                      />
                    </td>
                  )}
                  {fields.distance && (
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={set.targetDistance ?? ""}
                        onChange={(e) =>
                          onUpdateSet(exercise.id, set.id, {
                            targetDistance: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="-"
                        className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white focus:border-orange-600 focus:outline-none"
                      />
                    </td>
                  )}
                  <td className="py-2 pl-3">
                    <button
                      onClick={() => onRemoveSet(exercise.id, set.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => onAddSet(exercise.id)}
          className="text-xs font-bold text-orange-600 hover:text-orange-500 transition-colors"
        >
          + Add Set
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN ROUTINE EDITOR
// ============================================

interface RoutineEditorNewProps {
  routineId?: string | null;
  selectedDayId?: string | null;
  onBack: () => void;
  onSave?: () => void;
  addNewDayOnLoad?: boolean;
}

const RoutineEditorNew = ({
  routineId,
  selectedDayId,
  onBack,
  onSave,
  addNewDayOnLoad,
}: RoutineEditorNewProps) => {
  // State
  const [routine, setRoutine] = useState<Routine>(() => {
    if (routineId) {
      return getRoutine(routineId) || createDefaultRoutine();
    }
    return createDefaultRoutine();
  });

  const [currentDayId, setCurrentDayId] = useState<string | null>(
    selectedDayId || (routine.days[0]?.id ?? null)
  );

  const [isDirty, setIsDirty] = useState(false);
  const [showLibrarySheet, setShowLibrarySheet] = useState(false);

  // Add new day on load if requested
  useEffect(() => {
    if (addNewDayOnLoad && routine) {
      const newDay = createDefaultDay(
        `Day ${routine.days.length + 1}`,
        routine.days.length + 1
      );
      setRoutine((prev) => ({
        ...prev,
        days: [...prev.days, newDay],
      }));
      setCurrentDayId(newDay.id);
      setIsDirty(true);
    }
  }, [addNewDayOnLoad]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Current day
  const currentDay = useMemo(
    () => routine.days.find((d) => d.id === currentDayId) || null,
    [routine.days, currentDayId]
  );

  // Handlers
  const handleUpdateRoutine = useCallback((updates: Partial<Routine>) => {
    setRoutine((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const handleAddDay = useCallback(() => {
    const newDay = createDefaultDay(`Day ${routine.days.length + 1}`, routine.days.length + 1);
    setRoutine((prev) => ({
      ...prev,
      days: [...prev.days, newDay],
    }));
    setCurrentDayId(newDay.id);
    setIsDirty(true);
  }, [routine.days.length]);

  // Inline rename state
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayName, setEditingDayName] = useState("");

  const handleStartRenameDay = useCallback((dayId: string) => {
    const day = routine.days.find((d) => d.id === dayId);
    if (!day) return;
    setEditingDayId(dayId);
    setEditingDayName(day.name);
  }, [routine.days]);

  const handleCommitRenameDay = useCallback(() => {
    if (editingDayId && editingDayName.trim()) {
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === editingDayId ? { ...d, name: editingDayName.trim() } : d
        ),
      }));
      setIsDirty(true);
    }
    setEditingDayId(null);
    setEditingDayName("");
  }, [editingDayId, editingDayName]);

  const handleDeleteDay = useCallback((dayId: string) => {
    if (!confirm("Delete this workout day?")) return;
    setRoutine((prev) => {
      const filtered = prev.days.filter((d) => d.id !== dayId);
      const normalized = normalizeDayOrder(filtered);
      return { ...prev, days: normalized };
    });
    if (currentDayId === dayId) {
      setCurrentDayId(routine.days[0]?.id ?? null);
    }
    setIsDirty(true);
  }, [currentDayId, routine.days]);

  const handleDayDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setRoutine((prev) => {
      const oldIndex = prev.days.findIndex((d) => d.id === active.id);
      const newIndex = prev.days.findIndex((d) => d.id === over.id);
      const reordered = arrayMove(prev.days, oldIndex, newIndex);
      const normalized = normalizeDayOrder(reordered);
      return { ...prev, days: normalized };
    });
    setIsDirty(true);
  }, []);

  const handleMoveDayUp = useCallback((dayId: string) => {
    setRoutine((prev) => {
      const index = prev.days.findIndex((d) => d.id === dayId);
      if (index <= 0) return prev;
      const reordered = arrayMove(prev.days, index, index - 1);
      const normalized = normalizeDayOrder(reordered);
      return { ...prev, days: normalized };
    });
    setIsDirty(true);
  }, []);

  const handleMoveDayDown = useCallback((dayId: string) => {
    setRoutine((prev) => {
      const index = prev.days.findIndex((d) => d.id === dayId);
      if (index === -1 || index >= prev.days.length - 1) return prev;
      const reordered = arrayMove(prev.days, index, index + 1);
      const normalized = normalizeDayOrder(reordered);
      return { ...prev, days: normalized };
    });
    setIsDirty(true);
  }, []);

  const handleAddExercise = useCallback(
    (exerciseItem: ExerciseItem) => {
      if (!currentDay) return;
      const newExercise = createExerciseFromLibrary(exerciseItem as any, currentDay.exercises.length);
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === currentDayId ? { ...d, exercises: [...d.exercises, newExercise] } : d
        ),
      }));
      setIsDirty(true);
      setShowLibrarySheet(false);
    },
    [currentDay, currentDayId]
  );

  const handleUpdateExercise = useCallback(
    (exerciseId: string, updates: Partial<RoutineExercise>) => {
      if (!currentDay) return;
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === currentDayId
            ? {
                ...d,
                exercises: d.exercises.map((ex) =>
                  ex.id === exerciseId ? { ...ex, ...updates } : ex
                ),
              }
            : d
        ),
      }));
      setIsDirty(true);
    },
    [currentDay, currentDayId]
  );

  const handleUpdateSet = useCallback(
    (exerciseId: string, setId: string, updates: Partial<RoutineSet>) => {
      if (!currentDay) return;
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === currentDayId
            ? {
                ...d,
                exercises: d.exercises.map((ex) =>
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
            : d
        ),
      }));
      setIsDirty(true);
    },
    [currentDay, currentDayId]
  );

  const handleRemoveSet = useCallback(
    (exerciseId: string, setId: string) => {
      if (!currentDay) return;
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === currentDayId
            ? {
                ...d,
                exercises: d.exercises.map((ex) =>
                  ex.id === exerciseId
                    ? { ...ex, sets: ex.sets.filter((set) => set.id !== setId) }
                    : ex
                ),
              }
            : d
        ),
      }));
      setIsDirty(true);
    },
    [currentDay, currentDayId]
  );

  const handleAddSet = useCallback(
    (exerciseId: string) => {
      if (!currentDay) return;
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === currentDayId
            ? {
                ...d,
                exercises: d.exercises.map((ex) => {
                  if (ex.id !== exerciseId) return ex;
                  const newSet = createDefaultSet(ex.sets.length + 1, ex.defaultRestSeconds);
                  return { ...ex, sets: [...ex.sets, newSet] };
                }),
              }
            : d
        ),
      }));
      setIsDirty(true);
    },
    [currentDay, currentDayId]
  );

  const handleRemoveExercise = useCallback(
    (exerciseId: string) => {
      if (!confirm("Remove this exercise?")) return;
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === currentDayId
            ? { ...d, exercises: d.exercises.filter((ex) => ex.id !== exerciseId) }
            : d
        ),
      }));
      setIsDirty(true);
    },
    [currentDayId]
  );

  const handleCopyExercise = useCallback(
    (exerciseId: string) => {
      if (!currentDay) return;
      const exercise = currentDay.exercises.find((ex) => ex.id === exerciseId);
      if (!exercise) return;
      const cloned = cloneExercise(exercise);
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === currentDayId ? { ...d, exercises: [...d.exercises, cloned] } : d
        ),
      }));
      setIsDirty(true);
    },
    [currentDay, currentDayId]
  );

  const handleExerciseDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!currentDay) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== currentDayId) return d;
          const oldIndex = d.exercises.findIndex((ex) => ex.id === active.id);
          const newIndex = d.exercises.findIndex((ex) => ex.id === over.id);
          const reordered = arrayMove(d.exercises, oldIndex, newIndex);
          return { ...d, exercises: reordered };
        }),
      }));
      setIsDirty(true);
    },
    [currentDay, currentDayId]
  );

  const handleMoveExerciseUp = useCallback(
    (exerciseId: string) => {
      if (!currentDay) return;
      const index = currentDay.exercises.findIndex((ex) => ex.id === exerciseId);
      if (index <= 0) return;

      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== currentDayId) return d;
          const reordered = arrayMove(d.exercises, index, index - 1);
          return { ...d, exercises: reordered };
        }),
      }));
      setIsDirty(true);
    },
    [currentDay, currentDayId]
  );

  const handleMoveExerciseDown = useCallback(
    (exerciseId: string) => {
      if (!currentDay) return;
      const index = currentDay.exercises.findIndex((ex) => ex.id === exerciseId);
      if (index === -1 || index >= currentDay.exercises.length - 1) return;

      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== currentDayId) return d;
          const reordered = arrayMove(d.exercises, index, index + 1);
          return { ...d, exercises: reordered };
        }),
      }));
      setIsDirty(true);
    },
    [currentDay, currentDayId]
  );

  const handleSave = useCallback(() => {
    if (routineId) {
      updateRoutine(routineId, routine);
    } else {
      addRoutine(routine);
    }
    setIsDirty(false);
    onSave?.();
  }, [routine, routineId, onSave]);

  const handleBackWithConfirm = useCallback(() => {
    if (isDirty && !confirm("You have unsaved changes. Discard them?")) return;
    onBack();
  }, [isDirty, onBack]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackWithConfirm}
              className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <input
              type="text"
              value={routine.name}
              onChange={(e) => handleUpdateRoutine({ name: e.target.value })}
              placeholder="Routine Name"
              className="border-0 bg-transparent text-2xl font-black text-white outline-none placeholder-gray-600"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-orange-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {routineId ? "Save Changes" : "Create Routine"}
          </button>
        </div>

        {/* Description */}
        <textarea
          value={routine.description}
          onChange={(e) => handleUpdateRoutine({ description: e.target.value })}
          placeholder="Add description..."
          rows={2}
          className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-orange-600"
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Rail: Days */}
        <div className="w-64 border-r border-white/5 bg-black/30 p-4 overflow-y-auto">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-gray-500">Workout Days</h3>
            <button
              onClick={handleAddDay}
              className="rounded p-1 text-orange-600 hover:bg-orange-600/10"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {routine.days.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-3 text-xs text-gray-600">No days yet</p>
              <button
                onClick={handleAddDay}
                className="text-xs font-bold text-orange-600 hover:text-orange-500"
              >
                Add First Day
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDayDragEnd}
            >
              <SortableContext items={routine.days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {routine.days.map((day, index) => (
                    <SortableDayItem
                      key={day.id}
                      day={day}
                      isSelected={day.id === currentDayId}
                      isEditing={editingDayId === day.id}
                      editName={editingDayId === day.id ? editingDayName : day.name}
                      onSelect={() => setCurrentDayId(day.id)}
                      onStartRename={() => handleStartRenameDay(day.id)}
                      onChangeEditName={setEditingDayName}
                      onCommitRename={handleCommitRenameDay}
                      onDelete={() => handleDeleteDay(day.id)}
                      onMoveUp={index > 0 ? () => handleMoveDayUp(day.id) : undefined}
                      onMoveDown={
                        index < routine.days.length - 1 ? () => handleMoveDayDown(day.id) : undefined
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Center: Selected Day Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {!currentDay ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">Select a day or add one to get started</p>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-black text-white">{currentDay.name}</h2>
                <button
                  onClick={() => setShowLibrarySheet(true)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/5 md:hidden"
                >
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </button>
              </div>

              {currentDay.exercises.length === 0 ? (
                <div className="rounded-[2rem] border border-white/5 bg-[#111] p-12 text-center">
                  <p className="mb-4 text-sm text-gray-500">No exercises yet</p>
                  <button
                    onClick={() => setShowLibrarySheet(true)}
                    className="text-sm font-bold text-orange-600 hover:text-orange-500"
                  >
                    Add First Exercise
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleExerciseDragEnd}
                >
                  <SortableContext
                    items={currentDay.exercises.map((ex) => ex.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {currentDay.exercises.map((exercise, index) => (
                        <SortableExerciseCard
                          key={exercise.id}
                          exercise={exercise}
                          exerciseIndex={index}
                          onUpdate={handleUpdateExercise}
                          onUpdateSet={handleUpdateSet}
                          onRemoveSet={handleRemoveSet}
                          onAddSet={handleAddSet}
                          onRemoveExercise={handleRemoveExercise}
                          onCopyExercise={handleCopyExercise}
                          onMoveUp={index > 0 ? () => handleMoveExerciseUp(exercise.id) : undefined}
                          onMoveDown={
                            index < currentDay.exercises.length - 1
                              ? () => handleMoveExerciseDown(exercise.id)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}
        </div>

        {/* Right: Exercise Library (Desktop Only) */}
        <div className="hidden w-80 shrink-0 overflow-hidden border-l border-white/5 bg-black/30 md:block">
          <div className="sticky top-0 h-screen overflow-y-auto p-4">
            <ExerciseLibraryPanel
              onAddExercise={handleAddExercise}
              showAddButton
              showCustomButton
            />
          </div>
        </div>
      </div>

      {/* Mobile Exercise Library Sheet */}
      <ExerciseLibrarySheet
        isOpen={showLibrarySheet}
        onClose={() => setShowLibrarySheet(false)}
        onAddExercise={handleAddExercise}
        showAddButton
      />
    </div>
  );
};

export default RoutineEditorNew;
