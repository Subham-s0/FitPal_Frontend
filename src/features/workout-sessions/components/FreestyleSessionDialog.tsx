import { useState } from "react";
import { Loader2, Dumbbell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

interface FreestyleSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (sessionName: string) => void;
  isStarting: boolean;
}

export default function FreestyleSessionDialog({
  open,
  onOpenChange,
  onStart,
  isStarting,
}: FreestyleSessionDialogProps) {
  const [sessionName, setSessionName] = useState("");

  const handleStart = () => {
    onStart(sessionName.trim() || "Freestyle Workout");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-orange-400" />
            Start Freestyle Session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-gray-300">
              Session Name (optional)
            </label>
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Morning Pump"
              className="mt-1.5"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={isStarting}
            className="bg-gradient-to-r from-orange-500 to-red-500"
          >
            {isStarting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Start Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
