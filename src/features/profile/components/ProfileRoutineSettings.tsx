import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Loader2,
  PlayCircle,
  RotateCw,
} from "lucide-react";

import { getMyRoutineSettingsApi } from "@/features/routines/routineApi";
import type { UserRoutineSettingItemResponse } from "@/features/routines/routineTypes";
import { SectionLabel } from "@/features/profile/components/ProfileSetupShell";
import { getApiErrorMessage } from "@/shared/api/client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { formatDateTime, formatRoutineType, formatStructureType } from "@/shared/lib/formatters";

function RoutineSettingCard({ setting }: { setting: UserRoutineSettingItemResponse }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        setting.active
          ? "border-orange-500/25 bg-orange-500/5"
          : "border-white/5 bg-black/20 hover:border-white/10"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-black uppercase tracking-tight text-white">
              {setting.routineName}
            </p>
            <Badge
              className={cn(
                "border-0",
                setting.active
                  ? "bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-white/10 text-slate-300"
              )}
            >
              {setting.active ? "ACTIVE" : "INACTIVE"}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-orange-400">
            {formatStructureType(setting.structureType)} · {formatRoutineType(setting.routineType)}
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
          {setting.totalDays} day{setting.totalDays === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Current Day</p>
          <p className="mt-1 text-sm font-bold text-white">{setting.currentDayName || "Not set"}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {setting.currentDayOrder != null ? `Day ${setting.currentDayOrder}` : "No tracked day"}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Cycles Completed</p>
          <p className="mt-1 text-sm font-black text-white">{setting.cyclesCompleted}</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Activated</p>
          <p className="mt-1 text-xs text-slate-200">{formatDateTime(setting.activatedAt)}</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Last Session</p>
          <p className="mt-1 text-xs text-slate-200">{formatDateTime(setting.lastSessionAt)}</p>
          {!setting.active && setting.deactivatedAt && (
            <p className="mt-1 text-[10px] text-slate-500">Ended {formatDateTime(setting.deactivatedAt)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfileRoutineSettings() {
  const navigate = useNavigate();
  const routineSettingsQuery = useQuery({
    queryKey: ["user-routine-settings"],
    queryFn: getMyRoutineSettingsApi,
  });

  const data = routineSettingsQuery.data ?? null;

  const summary = useMemo(() => {
    const settings = data?.settings ?? [];
    return {
      tracked: settings.length,
      active: settings.filter((item) => item.active).length,
      cycles: settings.reduce((sum, item) => sum + item.cyclesCompleted, 0),
    };
  }, [data]);

  if (routineSettingsQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm font-bold text-red-200">Routine settings could not be loaded.</p>
        <p className="mt-2 text-xs text-slate-400">
          {getApiErrorMessage(routineSettingsQuery.error, "Try refreshing the page.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in sm:space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-gradient-to-br from-[#111] to-[#0b0b0b] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionLabel className="!mb-2">Routine Settings</SectionLabel>
            <p className="text-xs text-slate-400">
              Review active routine progress, tracked cycles, and last session timing.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
            <Dumbbell className="h-3.5 w-3.5 text-orange-400" />
            {summary.tracked} tracked routines
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-400">Active Routines</p>
            <p className="mt-1 text-xl font-black text-white">{summary.active}</p>
          </div>
          <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sky-400">Cycles Completed</p>
            <p className="mt-1 text-xl font-black text-white">{summary.cycles}</p>
          </div>
          <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-orange-400">Current Focus</p>
            <p className="mt-1 text-sm font-black text-white">
              {data?.activeSetting ? formatRoutineType(data.activeSetting.routineType) : "No active routine"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-black/20 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-white">Active Routine</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Current day progression and routine activation state.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void routineSettingsQuery.refetch()}
              className="border-white/10 bg-[#111] text-slate-200 hover:bg-white/5 hover:text-white"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard", { state: { activeSection: "routines" } })}
              className="border-white/10 bg-[#111] text-slate-200 hover:bg-white/5 hover:text-white"
            >
              Open Routines
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {routineSettingsQuery.isLoading ? (
        <div className="space-y-3">
          {/* Loading skeleton for routine settings */}
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
                </div>
                <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="h-2 w-16 animate-pulse rounded bg-white/10" />
                  <div className="mt-3 h-4 w-24 animate-pulse rounded bg-white/10" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              <span className="text-sm text-slate-400">Loading routine settings...</span>
            </div>
          </div>
        </div>
      ) : data?.activeSetting ? (
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-orange-400" />
                <p className="text-sm font-black uppercase tracking-tight text-white">
                  {data.activeSetting.routineName}
                </p>
              </div>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-orange-400">
                {formatStructureType(data.activeSetting.structureType)} ·{" "}
                {formatRoutineType(data.activeSetting.routineType)}
              </p>
            </div>
            <Badge className="border-0 bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/20">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              ACTIVE
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Current Day</p>
              <p className="mt-1 text-sm font-bold text-white">{data.activeSetting.currentDayName || "Not set"}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Activated</p>
              <p className="mt-1 text-xs text-slate-200">{formatDateTime(data.activeSetting.activatedAt)}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Last Session</p>
              <p className="mt-1 text-xs text-slate-200">{formatDateTime(data.activeSetting.lastSessionAt)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-black/20 px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
            <CalendarDays className="h-7 w-7 text-orange-400" />
          </div>
          <p className="text-sm font-bold text-white">No active routine</p>
          <p className="mt-2 text-xs text-slate-400">
            Activate a routine from the routines dashboard to start tracking progression here.
          </p>
        </div>
      )}

      {data?.settings?.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Tracked Routine History</p>
            <p className="text-[11px] text-slate-400">{data.settings.length} entries</p>
          </div>
          {data.settings.map((setting) => (
            <RoutineSettingCard key={setting.userRoutineSettingId} setting={setting} />
          ))}
        </div>
      ) : !routineSettingsQuery.isLoading ? (
        <div className="rounded-2xl border border-white/5 bg-black/20 px-6 py-12 text-center">
          <p className="text-sm font-bold text-white">No tracked routine settings yet</p>
          <p className="mt-2 text-xs text-slate-400">
            Activate a routine first and the progress settings will appear here.
          </p>
        </div>
      ) : null}
    </div>
  );
}

