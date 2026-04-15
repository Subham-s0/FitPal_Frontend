import { SlidersHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { GymSortMode, GymStatusFilter } from "@/features/gyms/types";

interface GymsFilterDropdownProps {
  statusFilter: GymStatusFilter;
  sortMode: GymSortMode;
  showSavedOnly: boolean;
  savedGymCount: number;
  onStatusFilterChange: (filter: GymStatusFilter) => void;
  onSortModeChange: (sortMode: GymSortMode) => void;
  onToggleSavedOnly: () => void;
  onResetFilters: () => void;
  className?: string;
  allowSavedGyms?: boolean;
}

const GymsFilterDropdown = ({
  statusFilter,
  sortMode,
  showSavedOnly,
  savedGymCount,
  onStatusFilterChange,
  onSortModeChange,
  onToggleSavedOnly,
  onResetFilters,
  className = "",
  allowSavedGyms = true,
}: GymsFilterDropdownProps) => {
  const hasActiveFilters =
    statusFilter !== "all" || sortMode !== "recommended" || (allowSavedGyms && showSavedOnly);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Filter gyms"
          className={`relative inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border transition-colors ${
            hasActiveFilters
              ? "border-orange-500/35 bg-orange-500/12 text-orange-400"
              : "border-[#2a2a2a] bg-[#141414] text-slate-300 hover:border-white/20 hover:text-white"
          } ${className}`}
        >
          <SlidersHorizontal size={16} />
          {hasActiveFilters && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-400" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-2xl border border-white/10 bg-[#141414] p-2 text-slate-200 shadow-2xl backdrop-blur-xl"
      >
        {hasActiveFilters && (
          <>
            <div className="flex justify-end px-1 pb-1">
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300"
                aria-label="Clear all filters"
              >
                <X size={11} />
                Clear
              </button>
            </div>
            <DropdownMenuSeparator className="my-2 bg-white/10" />
          </>
        )}

        <DropdownMenuLabel className="px-2 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          Status
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value as GymStatusFilter)}
        >
          <DropdownMenuRadioItem
            value="all"
            className="rounded-xl py-2 pl-3 pr-3 text-sm font-medium focus:bg-white/[0.05] focus:text-white data-[state=checked]:bg-orange-500/10 data-[state=checked]:text-orange-300 [&>span]:hidden"
          >
            All
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="open"
            className="rounded-xl py-2 pl-3 pr-3 text-sm font-medium focus:bg-white/[0.05] focus:text-white data-[state=checked]:bg-orange-500/10 data-[state=checked]:text-orange-300 [&>span]:hidden"
          >
            Open
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="closed"
            className="rounded-xl py-2 pl-3 pr-3 text-sm font-medium focus:bg-white/[0.05] focus:text-white data-[state=checked]:bg-orange-500/10 data-[state=checked]:text-orange-300 [&>span]:hidden"
          >
            Closed
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        {allowSavedGyms && (
          <>
            <DropdownMenuSeparator className="my-2 bg-white/10" />

            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onToggleSavedOnly();
              }}
              className={`rounded-xl py-2 pl-3 pr-3 text-sm font-medium focus:bg-white/[0.05] focus:text-white ${
                showSavedOnly ? "bg-orange-500/10 text-orange-300" : ""
              }`}
            >
              Saved only
              <DropdownMenuShortcut className={showSavedOnly ? "text-orange-300/80 opacity-100" : ""}>
                {savedGymCount}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="my-2 bg-white/10" />

        <DropdownMenuLabel className="px-2 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          Sort
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortMode}
          onValueChange={(value) => onSortModeChange(value as GymSortMode)}
        >
          <DropdownMenuRadioItem
            value="recommended"
            className="rounded-xl py-2 pl-3 pr-3 text-sm font-medium focus:bg-white/[0.05] focus:text-white data-[state=checked]:bg-orange-500/10 data-[state=checked]:text-orange-300 [&>span]:hidden"
          >
            Recommended
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="alphabetical"
            className="rounded-xl py-2 pl-3 pr-3 text-sm font-medium focus:bg-white/[0.05] focus:text-white data-[state=checked]:bg-orange-500/10 data-[state=checked]:text-orange-300 [&>span]:hidden"
          >
            A-Z
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GymsFilterDropdown;
