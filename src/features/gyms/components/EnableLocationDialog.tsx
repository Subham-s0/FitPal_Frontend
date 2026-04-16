import { LocateFixed, MapPin, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type {
  LocationPermissionState,
  RecommendationMode,
} from "@/features/gyms/types";

interface EnableLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestedMode: Extract<RecommendationMode, "nearest" | "best-match"> | null;
  permissionState: LocationPermissionState;
  onEnableLocation: () => void | Promise<void>;
  allowBestMatch?: boolean;
}

const modeLabels: Record<
  Extract<RecommendationMode, "nearest" | "best-match">,
  string
> = {
  nearest: "Nearest",
  "best-match": "Best Match",
};

const modeIcons = {
  nearest: MapPin,
  "best-match": Sparkles,
} satisfies Record<
  Extract<RecommendationMode, "nearest" | "best-match">,
  typeof MapPin
>;

const EnableLocationDialog = ({
  open,
  onOpenChange,
  requestedMode,
  permissionState,
  onEnableLocation,
  allowBestMatch = true,
}: EnableLocationDialogProps) => {
  const mode = requestedMode;
  const ModeIcon = mode ? modeIcons[mode] : LocateFixed;
  const isDenied = permissionState === "denied";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-32px)] max-w-[420px] overflow-hidden rounded-[28px] sm:rounded-[28px] border border-white/10 bg-[#101012] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col">
          <div className="border-b border-white/5 bg-[radial-gradient(circle_at_top,rgba(234,88,12,0.18),transparent_60%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)] px-6 pb-4 pt-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10">
              <ModeIcon size={22} className="text-orange-500" />
            </div>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">
                Enable Location
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-400">
                {mode
                  ? `${modeLabels[mode]} recommendations need your location to calculate distance and rank gyms around you.`
                  : allowBestMatch
                    ? "Turn on location to unlock Nearest and Best Match recommendations around you."
                    : "Turn on location to unlock Nearest recommendations around you."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-white/8 user-surface-muted p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                  <LocateFixed size={16} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Use location for smarter gym recommendations
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    You can still keep browsing in Show All without location.
                  </p>
                </div>
              </div>
            </div>

            {isDenied && (
              <p className="text-xs leading-relaxed text-slate-400">
                Location is currently blocked. You can still use Show All
                without location, or allow access if your browser prompts again.
              </p>
            )}
          </div>

          <DialogFooter className="gap-3 border-t border-white/5 px-6 py-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10 sm:flex-none"
            >
              Not Now
            </button>
            <button
              type="button"
              onClick={() => void onEnableLocation()}
              className="flex-1 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-black transition-opacity hover:opacity-90 sm:flex-none"
              style={{
                background:
                  "linear-gradient(135deg, #FACC15 0%, #FF9900 45%, #FF6A00 100%)",
              }}
            >
              Enable Location
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnableLocationDialog;
