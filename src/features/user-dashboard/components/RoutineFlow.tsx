import { useState, useCallback } from "react";
import RoutinesSectionNew from "@/features/user-dashboard/components/RoutinesSectionNew";
import WorkoutDetail from "@/features/user-dashboard/screens/WorkoutDetail";
import RoutineEditorNew from "@/features/user-dashboard/components/RoutineEditorNew";
import {
  createDefaultRoutine,
} from "@/features/user-dashboard/routineTypes";
import {
  addRoutine,
} from "@/features/user-dashboard/routineStore";

// ============================================
// TYPES
// ============================================

type View = "list" | "detail" | "editor";

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * RoutineFlow - Orchestrates the three-screen routine management flow
 *
 * Screens:
 * 1. List (RoutinesSectionNew) - Browse routines
 * 2. Detail (WorkoutDetail) - View/edit a single workout day
 * 3. Editor (RoutineEditorNew) - Full routine builder
 */
export function RoutineFlow() {
  // Navigation state
  const [view, setView] = useState<View>("list");
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [addNewDay, setAddNewDay] = useState(false);
  // Used to force RoutinesSectionNew to reload from localStorage on return
  const [refreshKey, setRefreshKey] = useState(0);

  const goToList = useCallback(() => {
    setView("list");
    setRoutineId(null);
    setDayId(null);
    setAddNewDay(false);
    setRefreshKey((k) => k + 1);
  }, []);

  // ============================================
  // LIST VIEW
  // ============================================

  if (view === "list") {
    return (
      <RoutinesSectionNew
        key={refreshKey}
        // Create new routine from scratch
        onNewRoutine={() => {
          const newRoutine = createDefaultRoutine();
          addRoutine(newRoutine);
          setRoutineId(newRoutine.id);
          setAddNewDay(false);
          setView("editor");
        }}
        // Edit existing routine
        onEditRoutine={(id) => {
          setRoutineId(id);
          setDayId(null);
          setAddNewDay(false);
          setView("editor");
        }}
        // Add new workout day to existing routine
        onAddWorkoutDay={(id) => {
          setRoutineId(id);
          setDayId(null);
          setAddNewDay(true);
          setView("editor");
        }}
        // View a specific workout day
        onViewDay={(rId, dId) => {
          setRoutineId(rId);
          setDayId(dId);
          setView("detail");
        }}
      />
    );
  }

  // ============================================
  // DETAIL VIEW
  // ============================================

  if (view === "detail" && routineId && dayId) {
    return (
      <WorkoutDetail
        routineId={routineId}
        dayId={dayId}
        // Back to list
        onBack={goToList}
        // Edit this workout day in the full editor
        onEditRoutineDays={(rId, dId) => {
          setRoutineId(rId);
          setDayId(dId);
          setAddNewDay(false);
          setView("editor");
        }}
      />
    );
  }

  // ============================================
  // EDITOR VIEW
  // ============================================

  if (view === "editor" && routineId) {
    return (
      <RoutineEditorNew
        routineId={routineId}
        selectedDayId={dayId}
        addNewDayOnLoad={addNewDay}
        // Back to list (with unsaved changes warning)
        onBack={goToList}
        // Save and return to list
        onSave={goToList}
      />
    );
  }

  // Fallback (should never reach here)
  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-gray-500">Invalid view state</p>
    </div>
  );
}

export default RoutineFlow;
