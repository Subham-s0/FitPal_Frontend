import { useState, useMemo } from "react";
import { CheckCircle2, Clock, Dumbbell, Weight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import type { WorkoutSessionResponse } from "../workoutSessionTypes";

interface WorkoutSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: WorkoutSessionResponse;
  onComplete: (notes: string) => void;
  isCompleting: boolean;
}

function formatDuration(startedAt: string | null): string {
  if (!startedAt) return "0m";
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const totalMinutes = Math.floor((now - start) / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default function WorkoutSummarySheet({
  open,
  onOpenChange,
  session,
  onComplete,
  isCompleting,
}: WorkoutSummarySheetProps) {
  const [notes, setNotes] = useState(session.notes || "");

  const stats = useMemo(() => {
    let totalSets = 0;
    let completedSets = 0;
    let totalVolume = 0;

    session.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        totalSets++;
        if (set.completed) {
          completedSets++;
          const weight = set.actualWeight ?? set.targetWeight ?? 0;
          const reps = set.actualReps ?? set.targetReps ?? 0;
          totalVolume += weight * reps;
        }
      });
    });

    return {
      exerciseCount: session.exercises.length,
      totalSets,
      completedSets,
      totalVolume,
      duration: formatDuration(session.startedAt),
    };
  }, [session]);

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return volume.toLocaleString();
  };

  const handleComplete = () => {
    onComplete(notes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
            <CheckCircle2 className="h-6 w-6 text-orange-400" />
          </div>
          <DialogTitle className="text-xl font-black text-white">
            Workout Complete!
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {session.title}
          </DialogDescription>
        </DialogHeader>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 py-4">
          <div className="text-center">
            <Clock className="mx-auto h-4 w-4 text-orange-400" />
            <p className="mt-1 text-sm font-bold text-white">{stats.duration}</p>
            <p className="text-[9px] uppercase text-gray-500">Time</p>
          </div>
          <div className="text-center">
            <Dumbbell className="mx-auto h-4 w-4 text-blue-400" />
            <p className="mt-1 text-sm font-bold text-white">{stats.exerciseCount}</p>
            <p className="text-[9px] uppercase text-gray-500">Exercises</p>
          </div>
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" />
            <p className="mt-1 text-sm font-bold text-white">{stats.completedSets}</p>
            <p className="text-[9px] uppercase text-gray-500">Sets</p>
          </div>
          <div className="text-center">
            <Weight className="mx-auto h-4 w-4 text-purple-400" />
            <p className="mt-1 text-sm font-bold text-white">{formatVolume(stats.totalVolume)}</p>
            <p className="text-[9px] uppercase text-gray-500">Volume</p>
          </div>
        </div>

        {/* Notes Input */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-gray-300">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go?"
            className="h-16 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-orange-500/50 focus:outline-none"
          />
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isCompleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            className="btn-fire border-0 text-white"
          >
            {isCompleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Complete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
