import { useState, useCallback, useEffect } from "react";
import {
  X,
  Save,
  Plus,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Edit2,
  Trash2,
  MoreVertical,
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
import { toast } from "sonner";

import {
  type Routine,
  type WorkoutDay,
  createDefaultRoutine,
  createDefaultDay,
  generateDefaultWorkoutDayName,
  getRoutineMinimumValidationError,
  getRoutinePersistenceValidationError,
  normalizeDayOrder,
  getExerciseInitials,
} from "@/features/routines/routineTypes";

import {
  getRoutine,
  updateRoutine,
  addRoutine,
} from "@/features/routines/routineStore";
import ExerciseDetailSheet from "@/features/routines/components/ExerciseDetailSheet";
import {
  createExerciseDetailPreviewFromRoutineExercise,
  type ExerciseDetailPreview,
} from "@/features/routines/components/exerciseDetailPreview";
import { CustomSelect } from "@/shared/ui/CustomSelect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

const ROUTINE_GOAL_OPTIONS = [
  { value: "general", label: "General Fitness" },
  { value: "strength", label: "Strength" },
  { value: "hypertrophy", label: "Hypertrophy" },
  { value: "endurance", label: "Endurance" },
] as const;

// ============================================
// SORTABLE DAY ROW (for display order reordering)
// ============================================

interface SortableDayRowProps {
  day: WorkoutDay;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenExerciseDetails: (exercise: WorkoutDay["exercises"][number]) => void;
}

function SortableDayRow({
  day,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onOpenExerciseDetails,
}: SortableDayRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: day.id,
  });

  const [showMenu, setShowMenu] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 80 : showMenu ? 70 : undefined,
  };

  const exerciseCount = day.exercises.length;
  const setCount = day.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Day Card - Clickable to toggle expand */}
        <div
          onClick={onToggleExpand}
          className="flex flex-1 cursor-pointer items-center gap-3 rounded-[1.5rem] border border-white/[0.07] user-surface-soft p-3 transition-all duration-200 hover:border-white/15 hover:bg-[#191919]"
        >
          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
          )}

          {/* Day Order Badge */}
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-orange-600/20 text-sm font-black text-orange-600">
            {day.dayOrder}
          </div>

          {/* Day Name & Stats */}
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-sm font-bold text-white">{day.name}</p>
            <p className="text-[10px] text-gray-500">
              {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} &bull;{" "}
              {setCount} set{setCount !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Exercise thumbnails */}
          <div className="hidden items-center gap-1.5 sm:flex">
            {day.exercises.slice(0, 4).map((ex) =>
              ex.coverUrl ? (
                <img
                  key={ex.id}
                  src={ex.coverUrl}
                  alt={ex.name}
                  className="h-8 w-8 rounded-lg border border-white/10 object-cover"
                />
              ) : (
                <div
                  key={ex.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black text-[7px] font-black text-orange-600"
                >
                  {getExerciseInitials(ex.name)}
                </div>
              )
            )}
            {day.exercises.length > 4 && (
              <span className="ml-1 text-[10px] font-bold text-gray-500">
                +{day.exercises.length - 4}
              </span>
            )}
          </div>

          {/* Three-dot Menu */}
          <div className={`relative flex-shrink-0 ${showMenu ? "z-[60]" : ""}`}>
            {showMenu && (
              <div
                className="fixed inset-0 z-[9998]"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowMenu(false);
                }}
              />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((current) => !current);
              }}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-full z-[9999] mt-2 w-48 rounded-2xl border border-white/10 bg-[#181818] py-2 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-white/5"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Workout
                </button>
                <div className="my-1 border-t border-white/5" />
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Workout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: Show day description and exercises list */}
      {isExpanded && (
        <div className="ml-6 mt-2 rounded-[1.5rem] border border-white/[0.06] user-surface-muted p-4">
          {day.description && (
            <p className="mb-3 text-sm text-gray-400">{day.description}</p>
          )}
          {day.exercises.length === 0 ? (
            <p className="text-xs text-gray-500">No exercises added yet</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">Exercises:</p>
              {day.exercises.map((ex, index) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => onOpenExerciseDetails(ex)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs text-gray-300 transition-colors hover:bg-white/[0.03]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-600/20 text-[10px] font-bold text-orange-600">
                    {index + 1}
                  </span>
                  <span>{ex.name}</span>
                  <span className="text-gray-500">&bull; {ex.sets.length} sets</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN INLINE ROUTINE EDITOR
// ============================================

interface InlineRoutineEditorProps {
  routineId?: string | null;
  isNewRoutine?: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEditDay?: (routineId: string, dayId: string) => void;
}

export default function InlineRoutineEditor({
  routineId,
  isNewRoutine = false,
  onSave,
  onCancel,
  onEditDay,
}: InlineRoutineEditorProps) {
  // State
  const [routine, setRoutine] = useState<Routine>(() => {
    if (routineId) {
      return getRoutine(routineId) || { ...createDefaultRoutine(), id: routineId };
    }
    return createDefaultRoutine();
  });

  const [isDirty, setIsDirty] = useState(isNewRoutine);
  const [showDays, setShowDays] = useState(true);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<ExerciseDetailPreview | null>(null);
  const [isExerciseDetailOpen, setIsExerciseDetailOpen] = useState(false);
  const [pendingDeleteDayId, setPendingDeleteDayId] = useState<string | null>(null);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handlers
  const handleUpdateRoutine = useCallback((updates: Partial<Routine>) => {
    setRoutine((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

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

  const handleAddDay = useCallback(async () => {
    const nextOrder = routine.days.length + 1;
    const newDay = createDefaultDay(generateDefaultWorkoutDayName(routine.days), nextOrder);
    const days = normalizeDayOrder([...routine.days, newDay]);
    const persistedRoutineId = routineId || routine.id;
    const nextRoutine = { ...routine, id: persistedRoutineId, days };

    setRoutine(nextRoutine);
    setExpandedDayId(newDay.id);
    setShowDays(true);
    setIsDirty(true);

    if (onEditDay) {
      try {
        if (getRoutine(persistedRoutineId)) {
          await updateRoutine(persistedRoutineId, nextRoutine, { sync: "none" });
        } else {
          await addRoutine(nextRoutine, { sync: "none" });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add workout day.");
        return;
      }
      onEditDay(persistedRoutineId, newDay.id);
    }
  }, [onEditDay, routine, routineId]);

  const handleDeleteDay = useCallback((dayId: string) => {
    setPendingDeleteDayId(dayId);
  }, []);

  const handleConfirmDeleteDay = useCallback(() => {
    if (!pendingDeleteDayId) return;
    setRoutine((prev) => {
      const filtered = prev.days.filter((d) => d.id !== pendingDeleteDayId);
      const normalized = normalizeDayOrder(filtered);
      return { ...prev, days: normalized };
    });
    setPendingDeleteDayId(null);
    setIsDirty(true);
  }, [pendingDeleteDayId]);

  const handleEditDay = useCallback(async (dayId: string) => {
    // Persist the current draft locally, then open the day editor immediately.
    const persistedRoutineId = routineId || routine.id;
    try {
      if (getRoutine(persistedRoutineId)) {
        await updateRoutine(
          persistedRoutineId,
          { ...routine, id: persistedRoutineId },
          { sync: "none" }
        );
      } else {
        await addRoutine(
          { ...routine, id: persistedRoutineId },
          { sync: "none" }
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open workout day.");
      return;
    }
    onEditDay?.(persistedRoutineId, dayId);
  }, [routineId, routine, onEditDay]);

  const handleOpenExerciseDetails = useCallback((exercise: WorkoutDay["exercises"][number]) => {
    setSelectedExerciseDetail(createExerciseDetailPreviewFromRoutineExercise(exercise));
    setIsExerciseDetailOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    const validationError =
      getRoutinePersistenceValidationError(routine) || getRoutineMinimumValidationError(routine);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const persistedRoutineId = routineId || routine.id;

    try {
      if (getRoutine(persistedRoutineId)) {
        await updateRoutine(persistedRoutineId, { ...routine, id: persistedRoutineId }, {
          sync: "force",
          throwOnSyncError: true,
        });
      } else {
        await addRoutine({ ...routine, id: persistedRoutineId }, {
          sync: "force",
          throwOnSyncError: true,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save routine.");
      return;
    }

    setIsDirty(false);
    toast.success("Routine saved successfully.");
    onSave();
  }, [routine, routineId, onSave]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }
    onCancel();
  }, [isDirty, onCancel]);

  const handleConfirmDiscardChanges = useCallback(() => {
    setIsDiscardDialogOpen(false);
    onCancel();
  }, [onCancel]);

  const pendingDeleteDay = routine.days.find((day) => day.id === pendingDeleteDayId) ?? null;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flow-panel rounded-[2rem]">
      {/* Header with Name & Description */}
      <div className="border-b border-white/5 bg-black/30 p-5 backdrop-blur-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                Routine Name
              </span>
              <input
                type="text"
                value={routine.name}
                onChange={(e) => handleUpdateRoutine({ name: e.target.value })}
                placeholder="Routine Name"
                className="flow-input h-11 w-full rounded-2xl px-4 text-base font-black text-white placeholder:text-gray-600"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                Goal
              </span>
              <CustomSelect
                options={[...ROUTINE_GOAL_OPTIONS]}
                value={routine.goal}
                onChange={(value) => handleUpdateRoutine({ goal: value as Routine["goal"] })}
                className="h-11 rounded-2xl bg-white/[0.03] px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:self-end">
            <button
              onClick={handleCancel}
              className="flow-button-secondary h-11 px-4 text-gray-300"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="flow-button-primary h-11 px-4 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isNewRoutine ? "Create Routine" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Days Display Order Section */}
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setShowDays(!showDays)}
            className="flex items-center gap-2"
          >
            {showDays ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <span className="flow-label text-sm">
              Workout Days
            </span>
            <span className="text-xs text-gray-600">
              ({routine.days.length} day{routine.days.length !== 1 ? "s" : ""})
            </span>
          </button>

          <div className="flex items-center gap-2">
            {routine.days.length > 0 && (
              <span className="rounded-2xl border border-white/10 user-surface-muted px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">
                Drag to reorder
              </span>
            )}
            <button
              onClick={handleAddDay}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-600/20 bg-orange-600/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400 transition-all hover:border-orange-500/40 hover:bg-orange-600/20 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Workout Day
            </button>
          </div>
        </div>

        {showDays && (
          <>
            {routine.days.length === 0 ? (
              <div className="rounded-[1.5rem] border border-white/[0.06] user-surface-muted p-6 text-center">
                <p className="mb-3 text-xs text-gray-500">No workout days yet</p>
                <button
                  onClick={handleAddDay}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-600/20 bg-orange-600/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400 transition-all hover:border-orange-500/40 hover:bg-orange-600/20 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Day
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDayDragEnd}
              >
                <SortableContext
                  items={routine.days.map((d) => d.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {[...routine.days]
                      .sort((a, b) => a.dayOrder - b.dayOrder)
                      .map((day) => (
                        <SortableDayRow
                          key={day.id}
                          day={day}
                          isExpanded={expandedDayId === day.id}
                          onToggleExpand={() => setExpandedDayId(expandedDayId === day.id ? null : day.id)}
                          onEdit={() => handleEditDay(day.id)}
                          onDelete={() => handleDeleteDay(day.id)}
                          onOpenExerciseDetails={handleOpenExerciseDetails}
                        />
                      ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}
      </div>

      <ExerciseDetailSheet
        exercise={selectedExerciseDetail}
        open={isExerciseDetailOpen}
        onOpenChange={setIsExerciseDetailOpen}
      />

      <AlertDialog
        open={pendingDeleteDay !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteDayId(null);
        }}
      >
        <AlertDialogContent className="rounded-[20px] border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
          <AlertDialogHeader>
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)]">
              <Trash2 className="h-5 w-5 text-red-400" strokeWidth={1.8} />
            </div>
            <AlertDialogTitle className="text-[17px] font-black tracking-tight">
              Delete workout day
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-relaxed text-[hsl(0,0%,55%)]">
              {pendingDeleteDay
                ? `Delete ${pendingDeleteDay.name} from this routine. This cannot be undone.`
                : "Delete this workout day from the routine. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="mt-0 flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] py-2.5 text-[11px] font-black uppercase tracking-wider text-[hsl(0,0%,55%)] hover:border-white/20 hover:text-white">
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteDay}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-red-500 py-2.5 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Day
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent className="rounded-[20px] border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
          <AlertDialogHeader>
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)]">
              <X className="h-5 w-5 text-orange-300" strokeWidth={1.8} />
            </div>
            <AlertDialogTitle className="text-[17px] font-black tracking-tight">
              Discard changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-relaxed text-[hsl(0,0%,55%)]">
              You have unsaved routine changes. Leave this editor and discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="mt-0 flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] py-2.5 text-[11px] font-black uppercase tracking-wider text-[hsl(0,0%,55%)] hover:border-white/20 hover:text-white">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscardChanges}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-orange-600 py-2.5 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-orange-500"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

