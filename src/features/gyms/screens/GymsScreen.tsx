import { useEffect, useMemo, useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Search, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GymRecommendationItem } from "@/features/gyms/types";
import DesktopSelectedGymCard from "@/features/gyms/components/DesktopSelectedGymCard";
import EnableLocationDialog from "@/features/gyms/components/EnableLocationDialog";
import GymsFilterDropdown from "@/features/gyms/components/GymsFilterDropdown";
import GymDetailsSheet from "@/features/gyms/components/GymDetailsSheet";
import GymsMapCanvas from "@/features/gyms/components/GymsMapCanvas";
import GymsSidebarRail from "@/features/gyms/components/GymsSidebarRail";
import RecommendationModeBar from "@/features/gyms/components/RecommendationModeBar";
import { useGymsRecommendation } from "@/features/gyms/hooks/useGymsRecommendation";
import {
  formatGymDistance,
  getGymCityLabel,
  getGymDisplayName,
  getGymPreviewImageUrl,
} from "@/features/gyms/utils";

interface GymsScreenProps {
  onSwitchToCheckIn: (gymId?: number) => void;
}

const ITEMS_PER_PAGE = 4;

const GymsScreen = ({ onSwitchToCheckIn }: GymsScreenProps) => {
  const state = useGymsRecommendation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const locationEnabled = state.locationPermission === "granted" && !!state.userCoords;
  const shouldShowLocationEnablePanel =
    !locationEnabled &&
    state.locationPermission !== "loading" &&
    state.locationPermission !== "granted";
  const selectedGymSaved = state.selectedGym?.isSaved ?? false;
  const totalPages = Math.max(1, Math.ceil(state.filteredGyms.length / ITEMS_PER_PAGE));
  const pagedGyms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return state.filteredGyms.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, state.filteredGyms]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    state.filteredGyms.length,
    state.mode,
    state.searchQuery,
    state.showSavedOnly,
    state.sortMode,
    state.statusFilter,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!state.selectedGym) return;

    const selectedIndex = state.filteredGyms.findIndex((gym) => gym.gymId === state.selectedGym?.gymId);
    if (selectedIndex === -1) return;

    const selectedPage = Math.floor(selectedIndex / ITEMS_PER_PAGE) + 1;
    if (selectedPage !== currentPage) {
      setCurrentPage(selectedPage);
    }
  }, [currentPage, state.filteredGyms, state.selectedGym]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden md:flex-row">
      <GymsSidebarRail
        mode={state.mode}
        onModeChange={state.setMode}
        searchQuery={state.searchQuery}
        onSearchQueryChange={state.setSearchQuery}
        visibleGyms={pagedGyms}
        totalGymCount={state.filteredGyms.length}
        selectedGymId={state.selectedGym?.gymId}
        onSelectGym={state.selectGym}
        locationEnabled={locationEnabled}
        savedGymCount={state.savedGymCount}
        showSavedOnly={state.showSavedOnly}
        statusFilter={state.statusFilter}
        sortMode={state.sortMode}
        onToggleSavedOnly={state.toggleSavedOnly}
        onToggleSavedGym={state.toggleSavedGym}
        onStatusFilterChange={state.setStatusFilter}
        onSortModeChange={state.setSortMode}
        onResetFilters={state.resetFilters}
        currentPage={currentPage}
        totalPages={totalPages}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
      />

      <div className="relative flex-1 overflow-hidden bg-[#0a0a0a]">
        {shouldShowLocationEnablePanel && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] hidden w-[min(420px,calc(100%-2rem))] -translate-x-1/2 md:flex">
            <button
              type="button"
              onClick={() => state.setLocationPopupOpen(true)}
              className="pointer-events-auto w-full rounded-2xl border border-white/10 bg-[rgba(10,10,10,0.88)] px-5 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 backdrop-blur-2xl transition-colors hover:border-orange-500/30 hover:bg-[rgba(14,14,14,0.92)] hover:text-white"
            >
              Location off. Showing all gyms. Click here to enable.
            </button>
          </div>
        )}

        <div className="absolute left-0 right-0 top-0 z-[1000] space-y-2 p-4 pt-4 md:hidden">
          <div className="flex justify-center">
            <RecommendationModeBar
              active={state.mode}
              onChange={state.setMode}
              locationEnabled={locationEnabled}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder={state.showSavedOnly ? "Search saved gyms..." : "Search gyms..."}
                value={state.searchQuery}
                onChange={(event) => state.setSearchQuery(event.target.value)}
                className="w-full rounded-full border border-[#2a2a2a] bg-[#141414] py-3 pl-10 pr-4 text-sm font-medium text-white outline-none transition-colors placeholder:text-slate-500 focus:border-orange-600"
              />
            </div>
            <GymsFilterDropdown
              statusFilter={state.statusFilter}
              sortMode={state.sortMode}
              showSavedOnly={state.showSavedOnly}
              savedGymCount={state.savedGymCount}
              onStatusFilterChange={state.setStatusFilter}
              onSortModeChange={state.setSortMode}
              onToggleSavedOnly={state.toggleSavedOnly}
              onResetFilters={state.resetFilters}
            />
          </div>

          {shouldShowLocationEnablePanel && (
            <button
              type="button"
              onClick={() => state.setLocationPopupOpen(true)}
              className="w-full rounded-xl border border-white/10 bg-[rgba(10,10,10,0.84)] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 backdrop-blur-2xl transition-colors hover:border-orange-500/30 hover:bg-[rgba(14,14,14,0.92)] hover:text-white"
            >
              Location off. Showing all gyms. Click here to enable.
            </button>
          )}
        </div>

        <GymsMapCanvas
          userCoords={state.userCoords}
          filteredGyms={state.filteredGyms}
          selectedGym={state.selectedGym}
          onSelectGym={state.selectGym}
        />

        <DesktopSelectedGymCard
          gym={state.selectedGym}
          isSaved={selectedGymSaved}
          onClose={() => state.selectGym(null)}
          onViewProfile={() => state.selectedGym && navigate(`/gym/${state.selectedGym.gymId}`)}
          onCheckIn={() => state.selectedGym && onSwitchToCheckIn(state.selectedGym.gymId)}
          onToggleSaved={() => state.selectedGym && state.toggleSavedGym(state.selectedGym.gymId)}
        />

        {!state.selectedGym && (
          <div className="absolute bottom-[calc(var(--mobile-bottom-dock-height,52px)+env(safe-area-inset-bottom)+8px)] left-0 right-0 z-[1000] pb-4 pt-10 md:hidden">
            <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
              {pagedGyms.map((gym) => (
                <MobileGymCard
                  key={gym.gymId}
                  gym={gym}
                  isSaved={gym.isSaved}
                  onClick={() => state.selectGym(gym)}
                  onToggleSaved={() => state.toggleSavedGym(gym.gymId)}
                />
              ))}
              {totalPages > 1 && (
                <MobilePaginationCard
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                />
              )}
            </div>
          </div>
        )}

        <GymDetailsSheet
          gym={state.selectedGym}
          snap={state.sheetSnap}
          onSnapChange={state.setSheetSnap}
          onClose={() => state.selectGym(null)}
          onCheckIn={(gymId) => onSwitchToCheckIn(gymId)}
          isSaved={selectedGymSaved}
          onToggleSaved={() => state.selectedGym && state.toggleSavedGym(state.selectedGym.gymId)}
        />
      </div>

      <EnableLocationDialog
        open={state.isLocationPopupOpen}
        onOpenChange={(open) => {
          if (!open) state.dismissLocationPopup();
          else state.setLocationPopupOpen(true);
        }}
        requestedMode={state.requestedLocationMode}
        permissionState={state.locationPermission}
        onEnableLocation={async () => {
          await state.requestLocation();
        }}
      />
    </div>
  );
};

function MobileGymCard({
  gym,
  isSaved,
  onClick,
  onToggleSaved,
}: {
  gym: GymRecommendationItem;
  isSaved: boolean;
  onClick: () => void;
  onToggleSaved: () => void;
}) {
  const previewImageUrl = getGymPreviewImageUrl(gym);

  return (
    <div
      onClick={onClick}
      className="w-[248px] shrink-0 cursor-pointer rounded-2xl border border-border/50 bg-card p-4 shadow-xl transition-all hover:border-primary/30"
    >
      <div className="mb-2 flex items-start gap-2.5">
        {previewImageUrl && (
          <img
            src={previewImageUrl}
            alt=""
            className="h-9 w-9 rounded-lg border border-white/10 object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-xs font-extrabold uppercase tracking-tight">{getGymDisplayName(gym)}</h4>
          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">
            {getGymCityLabel(gym)}
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSaved();
          }}
          className={`rounded-full border p-2 transition-colors ${
            isSaved
              ? "border-orange-500/30 bg-orange-500/12 text-orange-400"
              : "border-white/10 bg-transparent text-slate-500 hover:bg-white/[0.04]"
          }`}
        >
          <Bookmark size={12} className={isSaved ? "fill-current" : ""} />
        </button>
      </div>
      <div className="flex items-center gap-2 text-[9px] font-bold">
        <span className="text-orange-500">{formatGymDistance(gym.distanceMeters)}</span>
        <span className={gym.currentlyOpen ? "text-green-400" : "text-red-400"}>
          {gym.currentlyOpen ? "Open" : "Closed"}
        </span>
        {gym.rating != null && (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <Star size={10} className="fill-current" />
            {gym.rating.toFixed(1)}
          </span>
        )}
        {gym.occupancyPercent != null && (
          <span className="text-slate-500">{gym.occupancyPercent}%</span>
        )}
      </div>
    </div>
  );
}

function MobilePaginationCard({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
}: {
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  return (
    <div className="flex w-[248px] shrink-0 flex-col justify-between rounded-2xl border border-white/10 bg-[rgba(10,10,10,0.84)] p-4 shadow-xl backdrop-blur-2xl">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          More Gyms
        </p>
        <p className="mt-2 text-sm font-extrabold uppercase tracking-tight text-white">
          Page {currentPage} of {totalPages}
        </p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/[0.03]"
        >
          <ChevronLeft size={14} className="mr-1" />
          Prev
        </button>
        <button
          type="button"
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="flex flex-1 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300 transition-colors hover:bg-orange-500/18 disabled:opacity-30 disabled:hover:bg-orange-500/12"
        >
          Next
          <ChevronRight size={14} className="ml-1" />
        </button>
      </div>
    </div>
  );
}

export default GymsScreen;
