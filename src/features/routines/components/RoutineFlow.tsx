import { Suspense, lazy, useState, useCallback, useEffect } from "react";

type View = "list" | "detail";

interface RoutineFlowProps {
  onViewModeChange?: (view: View) => void;
}

const RoutinesSectionNew = lazy(() => import("@/features/routines/components/RoutinesSectionNew"));
const WorkoutDetail = lazy(() => import("@/features/routines/screens/WorkoutDetail"));

const RoutineFlowFallback = ({ label }: { label: string }) => (
  <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-white/10 user-surface-soft p-6 text-center text-sm font-bold uppercase tracking-[0.12em] text-white/55">
    <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
    {label}
  </div>
);

/**
 * RoutineFlow — orchestrates the routine management flow.
 *
 * List (RoutinesSectionNew) ↔ Detail (WorkoutDetail)
 *
 * Back behaviour:
 *  • goToList(expandId) → re-mount list, auto-expand the routine card that
 *    was open so the user lands exactly where they left off.
 *  • inlineEditRoutineId is NEVER set on back — it only opens when the user
 *    explicitly clicks "Edit Routine" from the three-dot menu.
 */
export function RoutineFlow({ onViewModeChange }: RoutineFlowProps) {
  const [view, setView] = useState<View>("list");
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [startInEditMode, setStartInEditMode] = useState(false);

  // Which routine to auto-expand when returning to the list
  const [expandOnReturnId, setExpandOnReturnId] = useState<string | null>(null);

  // Which routine to open in the inline editor (only set explicitly, not on back)
  const [inlineEditRoutineId, setInlineEditRoutineId] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    onViewModeChange?.(view);
  }, [onViewModeChange, view]);

  /** Go back to the list. Expands the given routine card (not inline editor). */
  const goToList = useCallback((expandId: string | null = null) => {
    setView("list");
    setRoutineId(null);
    setDayId(null);
    setStartInEditMode(false);
    setInlineEditRoutineId(null);   // never reopen inline editor on back
    setExpandOnReturnId(expandId);
    setRefreshKey((k) => k + 1);
  }, []);

  // ── LIST ───────────────────────────────────────────────
  if (view === "list") {
    return (
      <Suspense fallback={<RoutineFlowFallback label="Loading routine list..." />}>
        <RoutinesSectionNew
        key={refreshKey}
        initialExpandedRoutineId={expandOnReturnId}
        initialInlineEditRoutineId={inlineEditRoutineId}
        // Tap day row → view mode
        onViewDay={(rId, dId) => {
          setRoutineId(rId);
          setDayId(dId);
          setStartInEditMode(false);
          setExpandOnReturnId(rId);   // remember to expand this routine on back
          setView("detail");
        }}
        // Three-dot "Edit Workout" → edit mode
        onEditDay={(rId, dId) => {
          setRoutineId(rId);
          setDayId(dId);
          setStartInEditMode(true);
          setExpandOnReturnId(rId);
          setView("detail");
        }}
        />
      </Suspense>
    );
  }

  // ── DETAIL ─────────────────────────────────────────────
  if (view === "detail" && routineId && dayId) {
    return (
      <Suspense fallback={<RoutineFlowFallback label="Loading workout detail..." />}>
        <WorkoutDetail
        routineId={routineId}
        dayId={dayId}
        startInEditMode={startInEditMode}
        onBack={() => goToList(routineId)}   // expand the parent routine card on back
        onEditRoutineDays={() => goToList(routineId)}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-gray-500">Invalid view state</p>
    </div>
  );
}

export default RoutineFlow;

