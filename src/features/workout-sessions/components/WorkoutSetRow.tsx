import { useCallback, useState, useEffect } from "react";
import { Check, Timer, Trash2 } from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import type { WorkoutSessionSetResponse, UpdateWorkoutSetRequest } from "@/features/workout-sessions/workoutSessionTypes";

interface WorkoutSetRowProps {
  set: WorkoutSessionSetResponse;
  exerciseType: string;
  onUpdateSet: (setId: string, updates: UpdateWorkoutSetRequest) => void;
  onRemoveSet?: (setId: string) => void;
  canRemove?: boolean;
  disabled?: boolean;
}

type VisibleFields = {
  weight: boolean;
  reps: boolean;
  duration: boolean;
  distance: boolean;
};

export function getVisibleFieldsForExerciseType(exerciseType: string): VisibleFields {
  switch (exerciseType) {
    case "WEIGHT_REPS":
      return { weight: true, reps: true, duration: false, distance: false };
    case "REPS_ONLY":
      return { weight: false, reps: true, duration: false, distance: false };
    case "WEIGHTED_BODYWEIGHT":
    case "ASSISTED_BODYWEIGHT":
      return { weight: true, reps: true, duration: false, distance: false };
    case "DURATION":
      return { weight: false, reps: false, duration: true, distance: false };
    case "WEIGHT_AND_DURATION":
      return { weight: true, reps: false, duration: true, distance: false };
    case "DISTANCE_AND_DURATION":
      return { weight: false, reps: false, duration: true, distance: true };
    case "WEIGHT_AND_DISTANCE":
      return { weight: true, reps: false, duration: false, distance: true };
    default:
      return { weight: true, reps: true, duration: false, distance: false };
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function parseDuration(value: string): number | null {
  if (!value.trim()) return null;
  const parts = value.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  return parseInt(value, 10) || null;
}

function clampNumericInput(value: string, maxDigits: number, allowDecimal: boolean): string {
  const normalized = allowDecimal ? value.replace(/[^\d.]/g, "") : value.replace(/\D/g, "");
  const decimalIndex = normalized.indexOf(".");

  if (!allowDecimal || decimalIndex === -1) {
    return normalized.slice(0, maxDigits);
  }

  const whole = normalized.slice(0, decimalIndex).replace(/\./g, "");
  const fraction = normalized.slice(decimalIndex + 1).replace(/\./g, "");
  const digits = `${whole}${fraction}`.slice(0, maxDigits);
  const cappedWhole = digits.slice(0, whole.length);
  const cappedFraction = digits.slice(cappedWhole.length);

  return `${cappedWhole}.${cappedFraction}`;
}

function getInputWidth(value: string, minCh: number, maxCh: number): string {
  const chars = Math.min(Math.max(value.length + 1, minCh), maxCh);
  return `${chars}ch`;
}

export default function WorkoutSetRow({
  set,
  exerciseType,
  onUpdateSet,
  onRemoveSet,
  canRemove = false,
  disabled = false,
}: WorkoutSetRowProps) {
  const fields = getVisibleFieldsForExerciseType(exerciseType);
  
  const [localActualReps, setLocalActualReps] = useState<string>(
    set.actualReps?.toString() ?? ""
  );
  const [localActualWeight, setLocalActualWeight] = useState<string>(
    set.actualWeight?.toString() ?? ""
  );
  const [localActualDuration, setLocalActualDuration] = useState<string>(
    formatDuration(set.actualDurationSeconds)
  );
  const [localActualDistance, setLocalActualDistance] = useState<string>(
    set.actualDistance?.toString() ?? ""
  );

  // Sync local state with prop changes
  useEffect(() => {
    setLocalActualReps(set.actualReps?.toString() ?? "");
    setLocalActualWeight(set.actualWeight?.toString() ?? "");
    setLocalActualDuration(formatDuration(set.actualDurationSeconds));
    setLocalActualDistance(set.actualDistance?.toString() ?? "");
  }, [set.actualReps, set.actualWeight, set.actualDurationSeconds, set.actualDistance]);

  const handleCompletedChange = useCallback(
    (checked: boolean) => {
      onUpdateSet(set.routineLogSetId, { completed: checked });
    },
    [set.routineLogSetId, onUpdateSet]
  );

  const handleRepsBlur = useCallback(() => {
    const value = localActualReps ? parseInt(localActualReps, 10) : null;
    if (value !== set.actualReps) {
      onUpdateSet(set.routineLogSetId, { actualReps: value });
    }
  }, [localActualReps, set.actualReps, set.routineLogSetId, onUpdateSet]);

  const handleWeightBlur = useCallback(() => {
    const value = localActualWeight ? parseFloat(localActualWeight) : null;
    if (value !== set.actualWeight) {
      onUpdateSet(set.routineLogSetId, { actualWeight: value });
    }
  }, [localActualWeight, set.actualWeight, set.routineLogSetId, onUpdateSet]);

  const handleDurationBlur = useCallback(() => {
    const value = parseDuration(localActualDuration);
    if (value !== set.actualDurationSeconds) {
      onUpdateSet(set.routineLogSetId, { actualDurationSeconds: value });
    }
  }, [localActualDuration, set.actualDurationSeconds, set.routineLogSetId, onUpdateSet]);

  const handleDistanceBlur = useCallback(() => {
    const value = localActualDistance ? parseFloat(localActualDistance) : null;
    if (value !== set.actualDistance) {
      onUpdateSet(set.routineLogSetId, { actualDistance: value });
    }
  }, [localActualDistance, set.actualDistance, set.routineLogSetId, onUpdateSet]);

  const formatTarget = () => {
    const parts: string[] = [];
    if (fields.weight && set.targetWeight) {
      parts.push(`${set.targetWeight}kg`);
    }
    if (fields.reps && set.targetReps) {
      parts.push(`${set.targetReps} reps`);
    }
    if (fields.duration && set.targetDurationSeconds) {
      parts.push(formatDuration(set.targetDurationSeconds));
    }
    if (fields.distance && set.targetDistance) {
      parts.push(`${set.targetDistance}m`);
    }
    return parts.join(" × ") || "-";
  };

  return (
    <tr
      className={`border-b border-white/5 last:border-b-0 transition-colors ${
        set.completed ? "bg-emerald-500/5" : ""
      }`}
    >
      {/* Checkbox */}
      <td className="w-10 px-1 py-1 sm:py-2">
        <Checkbox
          checked={set.completed}
          onCheckedChange={(checked) => handleCompletedChange(checked === true)}
          disabled={disabled}
          className={`h-5 w-5 rounded-md border-2 transition-all ${
            set.completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-gray-600 bg-transparent hover:border-gray-500"
          }`}
        />
      </td>



      {/* Actual inputs */}
      {fields.weight && (
        <td className="px-0.5 py-1 sm:py-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={localActualWeight}
              onChange={(e) =>
                setLocalActualWeight(clampNumericInput(e.target.value, 5, true))
              }
              onBlur={handleWeightBlur}
              disabled={disabled}
              placeholder={set.targetWeight?.toString() ?? "-"}
              className={`flow-input w-[4.5rem] rounded-lg px-2 py-1 text-center text-sm font-medium ${
                set.completed ? "bg-emerald-500/10 text-emerald-300" : "text-white"
              }`}
            />
            <span className="flex-shrink-0 text-[10px] sm:text-xs text-gray-500">kg</span>
          </div>
        </td>
      )}

      {fields.reps && (
        <td className="px-0.5 py-1 sm:py-2">
          <input
            type="number"
            value={localActualReps}
            onChange={(e) => setLocalActualReps(clampNumericInput(e.target.value, 3, false))}
            onBlur={handleRepsBlur}
            disabled={disabled}
            placeholder={set.targetReps?.toString() ?? "-"}
            className={`flow-input w-16 rounded-lg px-2 py-1 text-center text-sm font-medium ${
              set.completed ? "bg-emerald-500/10 text-emerald-300" : "text-white"
            }`}
          />
        </td>
      )}

      {fields.duration && (
        <td className="px-0 py-1 sm:py-2">
          <div className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={localActualDuration}
              onChange={(e) => setLocalActualDuration(e.target.value)}
              onBlur={handleDurationBlur}
              disabled={disabled}
              placeholder={formatDuration(set.targetDurationSeconds) || "0:00"}
              className={`flow-input w-16 rounded-lg px-2 py-1 text-sm font-medium ${
                set.completed ? "bg-emerald-500/10 text-emerald-300" : "text-white"
              }`}
            />
          </div>
        </td>
      )}

      {fields.distance && (
        <td className="px-0 py-1 sm:py-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={localActualDistance}
              onChange={(e) => setLocalActualDistance(e.target.value)}
              onBlur={handleDistanceBlur}
              disabled={disabled}
              placeholder={set.targetDistance?.toString() ?? "-"}
              className={`flow-input w-16 rounded-lg px-2 py-1 text-sm font-medium ${
                set.completed ? "bg-emerald-500/10 text-emerald-300" : "text-white"
              }`}
            />
            <span className="text-[10px] sm:text-xs text-gray-500">m</span>
          </div>
        </td>
      )}

      {/* Target display */}
      <td className="px-0 py-1 sm:py-2 text-right">
        <span className="text-[10px] sm:text-xs leading-none text-gray-500">
          Target: {formatTarget()}
        </span>
      </td>

      {/* Remove button */}
      {canRemove && onRemoveSet && (
        <td className="w-10 px-1 py-1 sm:py-2">
          <button
            type="button"
            onClick={() => onRemoveSet(set.routineLogSetId)}
            disabled={disabled}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            title="Remove set"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      )}
    </tr>
  );
}
