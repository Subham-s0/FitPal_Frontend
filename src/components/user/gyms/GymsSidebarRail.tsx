import { Bookmark, ChevronLeft, ChevronRight, MapPin, Navigation, Search } from "lucide-react";
import type {
  GymRecommendationItem,
  GymSortMode,
  GymStatusFilter,
  RecommendationMode,
} from "./gyms.types";
import GymsFilterDropdown from "./GymsFilterDropdown";
import RecommendationModeBar from "./RecommendationModeBar";

interface GymsSidebarRailProps {
  mode: RecommendationMode;
  onModeChange: (mode: RecommendationMode) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  visibleGyms: GymRecommendationItem[];
  totalGymCount: number;
  selectedGymId?: string;
  onSelectGym: (gym: GymRecommendationItem) => void;
  locationEnabled: boolean;
  savedGymIds: string[];
  showSavedOnly: boolean;
  statusFilter: GymStatusFilter;
  sortMode: GymSortMode;
  onToggleSavedOnly: () => void;
  onToggleSavedGym: (gymId: string) => void;
  onStatusFilterChange: (filter: GymStatusFilter) => void;
  onSortModeChange: (sortMode: GymSortMode) => void;
  onResetFilters: () => void;
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

function formatDistance(distanceMeters?: number): string {
  if (distanceMeters === undefined) return "Location Off";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`;
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

const GymsSidebarRail = ({
  mode,
  onModeChange,
  searchQuery,
  onSearchQueryChange,
  visibleGyms,
  totalGymCount,
  selectedGymId,
  onSelectGym,
  locationEnabled,
  savedGymIds,
  showSavedOnly,
  statusFilter,
  sortMode,
  onToggleSavedOnly,
  onToggleSavedGym,
  onStatusFilterChange,
  onSortModeChange,
  onResetFilters,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
}: GymsSidebarRailProps) => {
  return (
    <div
      className="hidden h-full min-h-0 w-[450px] shrink-0 flex-col border-r border-white/5 md:flex xl:w-[490px]"
      style={{
        backgroundColor: "#070707",
        backgroundImage:
          "linear-gradient(rgba(234,88,12,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(234,88,12,0.05) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      <div className="mb-4 shrink-0 px-6 pt-8">
        <div>
          <h1 className="text-4xl font-black leading-none tracking-tighter text-white">
            FIND <span className="pr-2 text-gradient-fire">GYMS</span>
          </h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
            Personalised Recommendations
          </p>
        </div>

        {!locationEnabled && (
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Location off. Showing all gyms.
          </p>
        )}
      </div>

      <div className="mb-4 shrink-0 px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={showSavedOnly ? "Search saved gyms..." : "Search gyms by name or city..."}
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className="w-full rounded-full border border-[#2a2a2a] bg-[#141414] py-3 pl-11 pr-4 text-sm font-medium text-white outline-none transition-colors placeholder:text-slate-500 focus:border-orange-600"
            />
          </div>
          <GymsFilterDropdown
            statusFilter={statusFilter}
            sortMode={sortMode}
            showSavedOnly={showSavedOnly}
            savedGymCount={savedGymIds.length}
            onStatusFilterChange={onStatusFilterChange}
            onSortModeChange={onSortModeChange}
            onToggleSavedOnly={onToggleSavedOnly}
            onResetFilters={onResetFilters}
          />
        </div>
      </div>

      <div className="mb-2 shrink-0 px-6">
        <RecommendationModeBar
          active={mode}
          onChange={onModeChange}
          locationEnabled={locationEnabled}
        />
      </div>

      <div className="custom-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <div className="flex flex-col gap-4">
          {visibleGyms.map((gym) => (
            <DesktopGymCard
              key={gym.id}
              gym={gym}
              selected={selectedGymId === gym.id}
              isSaved={savedGymIds.includes(gym.id)}
              onClick={() => onSelectGym(gym)}
              onToggleSaved={() => onToggleSavedGym(gym.id)}
            />
          ))}
          {totalGymCount === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
              <MapPin size={32} className="mb-4 text-orange-500" />
              <p className="text-sm font-bold text-white">
                {showSavedOnly ? "No saved gyms yet." : "No gyms found."}
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {showSavedOnly ? "Save a gym to see it here" : "Try a different search area"}
              </p>
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="text-xs font-bold text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPreviousPage}
                  disabled={currentPage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={onNextPage}
                  disabled={currentPage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function DesktopGymCard({
  gym,
  selected,
  isSaved,
  onClick,
  onToggleSaved,
}: {
  gym: GymRecommendationItem;
  selected: boolean;
  isSaved: boolean;
  onClick: () => void;
  onToggleSaved: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer overflow-hidden rounded-[2rem] border transition-all duration-300 ${
        selected
          ? "border-orange-500/45 bg-card shadow-[0_0_40px_rgba(234,88,12,0.15)] ring-2 ring-orange-500/45"
          : "border-border/50 bg-card hover:border-primary/30"
      }`}
    >
      <div className="flex h-full items-stretch gap-0">
        <div className="relative h-auto w-[114px] shrink-0 bg-[#0a0a0a]">
          {gym.logoUrl ? (
            <img
              src={gym.logoUrl}
              alt=""
              className="h-full min-h-[116px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full min-h-[116px] w-full items-center justify-center bg-[#111]">
              <MapPin className="text-slate-700" size={22} />
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/80 px-2.5 py-1 backdrop-blur-md">
            <span
              className={`block h-1.5 w-1.5 rounded-full ${
                gym.currentlyOpen ? "bg-green-400" : "bg-red-400"
              }`}
            />
            <span className="text-[9px] font-black uppercase tracking-widest text-white">
              {gym.currentlyOpen ? "Open" : "Closed"}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4
                  className={`text-base font-black uppercase leading-tight tracking-tight ${
                    selected
                      ? "text-orange-500"
                      : "text-white transition-colors group-hover:text-orange-400"
                  }`}
                >
                  {gym.name}
                </h4>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <MapPin size={10} /> {gym.address}, {gym.city}
                </p>
              </div>

              <div className="flex shrink-0 items-start gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold text-orange-500">
                  <Navigation size={10} />
                  {formatDistance(gym.distanceMeters)}
                </span>
                <button
                  type="button"
                  aria-label={isSaved ? "Remove saved gym" : "Save gym"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSaved();
                  }}
                  className={`rounded-full border p-2 transition-colors ${
                    isSaved
                      ? "border-orange-500/30 bg-orange-500/12 text-orange-400"
                      : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-white"
                  }`}
                >
                  <Bookmark size={14} className={isSaved ? "fill-current" : ""} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-bold">
            {gym.occupancyPercent !== undefined && (
              <div className="rounded-lg bg-white/5 px-2 py-1">
                <span className="text-slate-300">Occupancy </span>
                <span className="text-white">{gym.occupancyPercent}%</span>
              </div>
            )}
            {gym.minimumAccessTier && (
              <div className="rounded-lg bg-white/5 px-2 py-1">
                <span className="text-slate-300">Tier </span>
                <span className="text-orange-400">{gym.minimumAccessTier}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GymsSidebarRail;
