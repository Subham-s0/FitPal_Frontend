import { Loader2, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";

interface StartWorkoutDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayName: string;
  routineName: string;
  onConfirm: () => void;
  isStarting: boolean;
}

export default function StartWorkoutDayDialog({
  open,
  onOpenChange,
  dayName,
  routineName,
  onConfirm,
  isStarting,
}: StartWorkoutDayDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-emerald-400" />
            Start Workout
          </DialogTitle>
          <DialogDescription className="pt-2">
            Start <span className="font-semibold text-white">{dayName}</span> from{" "}
            <span className="font-semibold text-orange-400">{routineName}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isStarting}
            className="bg-gradient-to-r from-emerald-500 to-green-500"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="mr-1 h-4 w-4" />
                Start Workout
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
