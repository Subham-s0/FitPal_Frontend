import { useState, useCallback, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Dumbbell,
  GripVertical,
  Star,
} from "lucide-react";
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

import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import MuscleHeatmap from "@/features/user-dashboard/components/MuscleHeatmap";
import type { Routine, WorkoutDay } from "@/features/user-dashboard/routineTypes";
import {
  normalizeDayOrder,
  getExerciseInitials,
} from "@/features/user-dashboard/routineTypes";
import {
  loadRoutines,
  deleteRoutine,
  updateRoutine,
  setActiveRoutine,
  initializeRoutineStore,
} from "@/features/user-dashboard/routineStore";

// ============================================
// SORTABLE DAY ROW (for reordering inside the card)
// ============================================

interface SortableDayRowProps {
  day: WorkoutDay;
  routineId: string;
  onViewDay: (routineId: string, dayId: string) => void;
}

function SortableDayRow({ day, routineId, onViewDay }: SortableDayRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const exerciseCount = day.exercises.length;
  const setCount = day.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center gap-2">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Day Button */}
      <button
        onClick={() => onViewDay(routineId, day.id)}
        className="flex flex-1 items-center gap-3 rounded-xl border border-white/5 bg-black/30 p-3 text-left transition-all hover:border-orange-600/30 hover:bg-black/50"
      >
        {/* Day Order Badge */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-orange-600/20 text-sm font-black text-orange-600">
          {day.dayOrder}
        </div>

        {/* Day Info */}
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-sm font-bold text-white">{day.name}</p>
          <p className="text-[10px] text-gray-500">
            {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} •{" "}
            {setCount} set{setCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Exercise thumbnails */}
        <div className="hidden items-center gap-1 sm:flex">
          {day.exercises.slice(0, 3).map((ex) =>
            ex.coverUrl ? (
              <img
                key={ex.id}
                src={ex.coverUrl}
                alt={ex.name}
                className="h-7 w-7 rounded-md border border-white/10 object-cover"
              />
            ) : (
              <div
                key={ex.id}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black text-[7px] font-black text-orange-600"
              >
                {getExerciseInitials(ex.name)}
              </div>
            )
          )}
          {day.exercises.length > 3 && (
            <span className="ml-1 text-[10px] font-bold text-gray-500">
              +{day.exercises.length - 3}
            </span>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-600 transition-colors group-hover:text-orange-600" />
      </button>
    </div>
  );
}

// ============================================
// PROPS
// ============================================

interface RoutinesSectionProps {
  onNewRoutine?: () => void;
  onEditRoutine?: (routineId: string) => void;
  onAddWorkoutDay?: (routineId: string) => void;
  onViewDay?: (routineId: string, dayId: string) => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

const RoutinesSection = ({
  onNewRoutine,
  onEditRoutine,
  onAddWorkoutDay,
  onViewDay,
}: RoutinesSectionProps) => {
  // State
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load routines from localStorage
  useEffect(() => {
    initializeRoutineStore();
    setRoutines(loadRoutines());
  }, []);

  // Refresh routines
  const refreshRoutines = useCallback(() => {
    setRoutines(loadRoutines());
  }, []);

  // Toggle routine expansion
  const toggleRoutineExpanded = useCallback((routineId: string) => {
    setExpandedRoutines((prev) => {
      const next = new Set(prev);
      if (next.has(routineId)) next.delete(routineId);
      else next.add(routineId);
      return next;
    });
  }, []);

  // Toggle menu
  const toggleMenu = useCallback((routineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === routineId ? null : routineId));
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  // Handlers
  const handleEditRoutine = useCallback(
    (routineId: string) => {
      setOpenMenuId(null);
      onEditRoutine?.(routineId);
    },
    [onEditRoutine]
  );

  const handleAddWorkoutDay = useCallback(
    (routineId: string) => {
      setOpenMenuId(null);
      onAddWorkoutDay?.(routineId);
    },
    [onAddWorkoutDay]
  );

  const handleSetActive = useCallback(
    (routineId: string) => {
      setActiveRoutine(routineId);
      refreshRoutines();
      setOpenMenuId(null);
    },
    [refreshRoutines]
  );

  const handleDeleteRoutine = useCallback(
    (routineId: string) => {
      if (confirm("Are you sure you want to delete this routine?")) {
        deleteRoutine(routineId);
        refreshRoutines();
      }
      setOpenMenuId(null);
    },
    [refreshRoutines]
  );

  // Day reorder via drag
  const handleDayDragEnd = useCallback(
    (routineId: string) => (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Find the routine
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;

      const oldIndex = routine.days.findIndex((d) => d.id === active.id);
      const newIndex = routine.days.findIndex((d) => d.id === over.id);
      const reordered = normalizeDayOrder(arrayMove(routine.days, oldIndex, newIndex));

      const updatedRoutine = { ...routine, days: reordered };
      updateRoutine(routineId, updatedRoutine);
      refreshRoutines();
    },
    [routines, refreshRoutines]
  );

  const handleDayClick = useCallback(
    (routineId: string, dayId: string) => {
      onViewDay?.(routineId, dayId);
    },
    [onViewDay]
  );

  // Generate routine summary
  const getRoutineSummaryText = useCallback((routine: Routine): string => {
    if (routine.description) return routine.description;
    const dayCount = routine.days.length;
    const totalExercises = routine.days.reduce((s, d) => s + d.exercises.length, 0);
    const parts: string[] = [];
    if (dayCount > 0) parts.push(`${dayCount} day${dayCount > 1 ? "s" : ""}`);
    if (totalExercises > 0) parts.push(`${totalExercises} exercise${totalExercises > 1 ? "s" : ""}`);
    if (routine.goal) parts.push(routine.goal);
    return parts.join(" • ") || "No workout days";
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <UserSectionShell
      title="Routines"
      description="Create and manage your workout routines"
      actions={
        <button
          onClick={onNewRoutine}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          New Routine
        </button>
      }
    >
      <div className="space-y-4">
        {routines.length === 0 ? (
          <div className="rounded-[2rem] border border-white/5 bg-[#111] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Dumbbell className="h-8 w-8 text-gray-600" />
            </div>
            <p className="mb-2 text-sm font-bold text-white">No routines yet</p>
            <p className="mb-6 text-xs text-gray-500">
              Create your first routine to start tracking your workouts
            </p>
            <button
              onClick={onNewRoutine}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Create Your First Routine
            </button>
          </div>
        ) : (
          routines.map((routine) => {
            const isExpanded = expandedRoutines.has(routine.id);
            const isMenuOpen = openMenuId === routine.id;
            const summaryText = getRoutineSummaryText(routine);
            const allExercises = routine.days.flatMap((d) => d.exercises);

            return (
              <div
                key={routine.id}
                className="rounded-[2rem] border border-white/5 bg-[#111] transition-all hover:border-white/10"
              >
                {/* Routine Header */}
                <div className="flex items-start gap-3 p-5">
                  {/* Expand/Collapse */}
                  <button
                    onClick={() => toggleRoutineExpanded(routine.id)}
                    className="mt-0.5 flex-shrink-0 text-gray-500 transition-colors hover:text-white"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>

                  {/* Routine Info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">
                        {routine.name}
                      </h3>
                      {routine.isActive && (
                        <span className="rounded-lg bg-green-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-green-500">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-gray-500">
                      {summaryText}
                    </p>
                  </div>

                  {/* Three-Dot Menu */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => toggleMenu(routine.id, e)}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-full z-10 mt-2 w-56 rounded-xl border border-white/10 bg-[#0a0a0a] py-2 shadow-xl">
                        <button
                          onClick={() => handleEditRoutine(routine.id)}
                          className="w-full px-4 py-2 text-left text-sm text-white transition-colors hover:bg-white/5"
                        >
                          Edit Routine
                        </button>
                        <button
                          onClick={() => handleAddWorkoutDay(routine.id)}
                          className="w-full px-4 py-2 text-left text-sm text-white transition-colors hover:bg-white/5"
                        >
                          Add New Workout / Routine Day
                        </button>
                        {!routine.isActive && (
                          <button
                            onClick={() => handleSetActive(routine.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-orange-500 transition-colors hover:bg-orange-500/10"
                          >
                            <Star className="h-3.5 w-3.5" />
                            Set as Active
                          </button>
                        )}
                        <div className="my-1 border-t border-white/5" />
                        <button
                          onClick={() => handleDeleteRoutine(routine.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded: Workout Days (drag-reorderable) + Muscle Heatmap */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-5 pt-4">
                    {routine.days.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="mb-3 text-xs text-gray-500">
                          No workout days yet
                        </p>
                        <button
                          onClick={() => handleAddWorkoutDay(routine.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/5"
                        >
                          <Plus className="h-3 w-3" />
                          Add First Day
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto]">
                        {/* Day List — with drag-and-drop reorder */}
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDayDragEnd(routine.id)}
                        >
                          <SortableContext
                            items={routine.days.map((d) => d.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {routine.days
                                .sort((a, b) => a.dayOrder - b.dayOrder)
                                .map((day) => (
                                  <SortableDayRow
                                    key={day.id}
                                    day={day}
                                    routineId={routine.id}
                                    onViewDay={handleDayClick}
                                  />
                                ))}
                            </div>
                          </SortableContext>
                        </DndContext>

                        {/* Muscle Heatmap (desktop sidebar) */}
                        {allExercises.length > 0 && (
                          <div className="hidden w-56 lg:block">
                            <MuscleHeatmap
                              exercises={allExercises}
                              variant="compact"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </UserSectionShell>
  );
};

export default RoutinesSection;
