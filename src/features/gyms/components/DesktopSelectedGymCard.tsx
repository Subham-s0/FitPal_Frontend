import { Bookmark, Navigation, QrCode, Star, X } from "lucide-react";
import type { GymRecommendationItem } from "@/features/gyms/types";
import {
  canCheckInAtGym,
  formatGymDistance,
  getGymDisplayName,
  getGymLocationLabel,
  getGymMonogram,
  getGymPreviewImageUrl,
} from "@/features/gyms/utils";

interface DesktopSelectedGymCardProps {
  gym: GymRecommendationItem | null;
  isSaved: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onCheckIn: () => void;
  onToggleSaved: () => void;
}

const DesktopSelectedGymCard = ({
  gym,
  isSaved,
  onClose,
  onViewProfile,
  onCheckIn,
  onToggleSaved,
}: DesktopSelectedGymCardProps) => {
  if (!gym) return null;
  const previewImageUrl = getGymPreviewImageUrl(gym);

  return (
    <div className="absolute bottom-6 right-6 z-[1001] hidden w-[360px] overflow-hidden rounded-2xl border border-border/50 user-surface shadow-2xl transition-all md:block">
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl border border-white/10 object-cover"
            />
          )}
          {!previewImageUrl && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 user-surface-muted text-sm font-black uppercase tracking-tight text-slate-400">
              {getGymMonogram(gym)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black uppercase tracking-tight">{getGymDisplayName(gym)}</h3>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {getGymLocationLabel(gym)}
            </p>
          </div>
          <div className="-mr-1 flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onToggleSaved}
              className={`rounded-full border p-2 transition-colors ${
                isSaved
                  ? "border-orange-500/30 bg-orange-500/12 text-orange-400"
                  : "border-white/10 user-surface-muted text-slate-500 hover:text-white"
              }`}
            >
              <Bookmark size={14} className={isSaved ? "fill-current" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
            <Navigation size={10} />
            {formatGymDistance(gym.distanceMeters)}
          </span>
          {gym.rating != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-amber-300">
              <Star size={10} className="fill-current" />
              {gym.rating.toFixed(1)}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
              gym.currentlyOpen
                ? "border-green-500/25 bg-green-500/10 text-green-400"
                : "border-red-500/25 bg-red-500/10 text-red-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${gym.currentlyOpen ? "bg-green-400" : "bg-red-400"}`}
            />
            {gym.currentlyOpen ? "Open" : "Closed"}
          </span>
        </div>

        <div className="flex gap-3">
          {gym.occupancyPercent != null && (
            <div className="flex-1 rounded-xl border border-white/5 user-surface-soft p-3">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Occupancy</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-lg font-black">{gym.occupancyPercent}%</span>
                {gym.occupancyLabel && (
                  <span className="pb-0.5 text-[9px] font-bold text-slate-500">
                    {gym.occupancyLabel}
                  </span>
                )}
              </div>
            </div>
          )}
          {gym.minimumAccessTier && (
            <div className="flex-1 rounded-xl border border-white/5 user-surface-soft p-3">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Min. Tier</p>
              <p className="mt-1 text-lg font-black text-orange-500">{gym.minimumAccessTier}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onViewProfile}
            className="btn-ghost flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-[10px]"
          >
            View Profile
          </button>
          {canCheckInAtGym(gym) && (
            <button
              type="button"
              onClick={onCheckIn}
              className="btn-fire flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-[10px] text-white"
            >
              <QrCode size={13} />
              Check In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopSelectedGymCard;
