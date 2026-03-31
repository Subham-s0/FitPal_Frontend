import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  MapPin,
  Navigation,
  QrCode,
  Star,
  X,
} from "lucide-react";
import type { GymRecommendationItem, SheetSnap } from "@/features/gyms/types";
import {
  canCheckInAtGym,
  formatGymDistance,
  getGymCityLabel,
  getGymDisplayName,
  getGymLocationLabel,
  getGymPreviewImageUrl,
} from "@/features/gyms/utils";

interface GymDetailsSheetProps {
  gym: GymRecommendationItem | null;
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  onClose: () => void;
  onCheckIn: (gymId: number) => void;
  isSaved: boolean;
  onToggleSaved: () => void;
}

const GymDetailsSheet = ({
  gym,
  snap,
  onSnapChange,
  onClose,
  onCheckIn,
  isSaved,
  onToggleSaved,
}: GymDetailsSheetProps) => {
  const navigate = useNavigate();
  const touchStartYRef = useRef<number | null>(null);

  if (!gym || snap === "closed") return null;

  const snapHeightClass = snap === "compact" ? "max-h-[44dvh]" : "max-h-[85dvh]";

  return (
    <div className="fixed bottom-[calc(var(--mobile-bottom-dock-height,80px)+env(safe-area-inset-bottom)+12px)] left-0 right-0 z-[1001] mx-3 overflow-hidden transition-all duration-300 md:hidden">
      <div
        className={`flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl transition-all duration-300 ${snapHeightClass}`}
      >
        <div
          className="flex shrink-0 cursor-pointer items-center justify-center py-3"
          onClick={() => onSnapChange(snap === "compact" ? "expanded" : "compact")}
          onTouchStart={(event) => {
            touchStartYRef.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={(event) => {
            const startY = touchStartYRef.current;
            const endY = event.changedTouches[0]?.clientY;
            touchStartYRef.current = null;

            if (startY === null || endY === undefined) return;

            const deltaY = endY - startY;
            if (deltaY < -30 && snap === "compact") onSnapChange("expanded");
            if (deltaY > 30 && snap === "expanded") onSnapChange("compact");
          }}
        >
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="custom-scroll overflow-y-auto px-5 pb-5">
          <SheetContent
            gym={gym}
            snap={snap}
            isSaved={isSaved}
            onClose={onClose}
            onSnapChange={onSnapChange}
            onViewProfile={() => navigate(`/gym/${gym.gymId}`)}
            onCheckIn={() => onCheckIn(gym.gymId)}
            onToggleSaved={onToggleSaved}
          />
        </div>
      </div>
    </div>
  );
};

interface SheetContentProps {
  gym: GymRecommendationItem;
  snap: SheetSnap;
  isSaved: boolean;
  onClose: () => void;
  onSnapChange: (snap: SheetSnap) => void;
  onViewProfile: () => void;
  onCheckIn: () => void;
  onToggleSaved: () => void;
}

function SheetContent({
  gym,
  snap,
  isSaved,
  onClose,
  onSnapChange,
  onViewProfile,
  onCheckIn,
  onToggleSaved,
}: SheetContentProps) {
  const isExpanded = snap === "expanded";
  const previewImageUrl = getGymPreviewImageUrl(gym);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        {previewImageUrl && (
          <img
            src={previewImageUrl}
            alt={getGymDisplayName(gym)}
            className={`shrink-0 rounded-xl border border-white/10 object-cover transition-all ${
              isExpanded ? "h-16 w-16" : "h-12 w-12"
            }`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black uppercase leading-none tracking-tight text-white">
              {getGymDisplayName(gym)}
            </h3>
            {gym.rating != null && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-black text-amber-500">
                <Star size={9} className="fill-amber-500" />
                {gym.rating}
              </span>
            )}
          </div>

          {isExpanded ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={12} className="shrink-0 text-orange-600" />
              {getGymLocationLabel(gym)}
            </p>
          ) : (
            <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {getGymCityLabel(gym)}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-500">
              <Navigation size={9} />
              {formatGymDistance(gym.distanceMeters)}
            </span>
            {gym.rating != null && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-400">
                <Star size={9} className="fill-current" />
                {gym.rating.toFixed(1)}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                gym.currentlyOpen ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${gym.currentlyOpen ? "bg-green-400" : "bg-red-400"}`}
              />
              {gym.currentlyOpen ? "Open" : "Closed"}
            </span>
          </div>
        </div>

        <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleSaved}
            className={`rounded-full border p-2 transition-colors ${
              isSaved
                ? "border-orange-500/30 bg-orange-500/12 text-orange-400"
                : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-white"
            }`}
          >
            <Bookmark size={14} className={isSaved ? "fill-current" : ""} />
          </button>
          {snap === "compact" && (
            <button
              type="button"
              onClick={() => onSnapChange("expanded")}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronUp size={16} />
            </button>
          )}
          {snap === "expanded" && (
            <button
              type="button"
              onClick={() => onSnapChange("compact")}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronDown size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="animate-in slide-in-from-bottom-2 fade-in pt-2 duration-300">
          <div className="flex gap-3">
            {gym.occupancyPercent != null && (
              <div className="flex-1 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Occupancy
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-xl font-black">{gym.occupancyPercent}%</span>
                  {gym.occupancyLabel && (
                    <span className="pb-0.5 text-[10px] font-bold text-slate-400">
                      {gym.occupancyLabel}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ea580c] to-[#facc15]"
                    style={{ width: `${gym.occupancyPercent}%` }}
                  />
                </div>
              </div>
            )}
            {gym.minimumAccessTier && (
              <div className="flex-1 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Required Tier
                </p>
                <p className="mt-1 text-xl font-black text-orange-500">{gym.minimumAccessTier}</p>
                <p className="mt-1 text-[10px] leading-tight text-slate-400">
                  Included in your active subscription.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`flex gap-3 ${isExpanded ? "pt-2" : "pt-1"}`}>
        <button
          type="button"
          onClick={onViewProfile}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold transition-all hover:bg-white/10"
        >
          View Profile
        </button>
        {canCheckInAtGym(gym) && (
          <button
            type="button"
            onClick={onCheckIn}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold text-black shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #FACC15 0%, #FF9900 45%, #FF6A00 100%)" }}
          >
            <QrCode size={14} />
            Check In
          </button>
        )}
      </div>
    </div>
  );
}

export default GymDetailsSheet;
