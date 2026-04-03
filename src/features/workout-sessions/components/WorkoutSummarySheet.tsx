import { useState, useMemo } from "react";
import { CheckCircle2, Clock, Dumbbell, Weight, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/ui/sheet";
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[90vh] overflow-y-auto rounded-t-[2rem] border-t border-white/10 bg-[#0a0a0a] px-6 pb-8 pt-6"
      >
        <SheetHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <SheetTitle className="text-2xl font-black text-white">
            Workout Complete! 💪
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            {session.title}
          </SheetDescription>
        </SheetHeader>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <Clock className="mx-auto h-5 w-5 text-orange-400" />
            <p className="mt-2 text-xl font-black text-white">{stats.duration}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Duration
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <Dumbbell className="mx-auto h-5 w-5 text-blue-400" />
            <p className="mt-2 text-xl font-black text-white">
              {stats.exerciseCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Exercises
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-400" />
            <p className="mt-2 text-xl font-black text-white">
              {stats.completedSets}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Sets Done
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <Weight className="mx-auto h-5 w-5 text-purple-400" />
            <p className="mt-2 text-xl font-black text-white">
              {formatVolume(stats.totalVolume)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Volume (kg)
            </p>
          </div>
        </div>

        {/* Notes Input */}
        <div className="mt-6">
          <label className="mb-2 block text-sm font-bold text-gray-300">
            Session Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did you feel? Any PRs? Notes for next time..."
            className="h-24 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder-gray-500 transition-colors focus:border-orange-500/50 focus:outline-none"
          />
        </div>

        {/* Complete Button */}
        <Button
          onClick={handleComplete}
          disabled={isCompleting}
          className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-green-500 py-6 text-base font-black uppercase tracking-wider hover:from-emerald-400 hover:to-green-400"
        >
          {isCompleting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            "Done"
          )}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
