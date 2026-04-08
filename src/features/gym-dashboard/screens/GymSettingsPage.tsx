import type { FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldAlert, Wifi } from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/client";
import { getGymDoorDeviceApi, getGymQrCodeApi } from "@/features/gym-dashboard/gym-checkins.api";
import type { CheckInAccessMode, DoorAccessMode } from "@/features/gym-dashboard/gym-checkins.model";

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const modeLabel = (mode: CheckInAccessMode | null | undefined) => {
  if (mode === "DOOR_ACK_REQUIRED") return "Manual door acknowledgment required";
  if (mode === "MANUAL") return "Automatic check-in (no door ACK)";
  return "Unavailable";
};

const doorModeLabel = (mode: DoorAccessMode | null | undefined) => {
  if (mode === "AUTOMATIC") return "Automatic unlock";
  if (mode === "MANUAL") return "Manual door control";
  return "Unavailable";
};

const GymSettingsPage: FC = () => {
  const qrQ = useQuery({ queryKey: ["gym-qr"], queryFn: getGymQrCodeApi });
  const deviceQ = useQuery({
    queryKey: ["gym-door-device"],
    queryFn: getGymDoorDeviceApi,
    retry: false,
  });

  return (
    <div className="max-w-[1600px] animate-fade-in">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
            <span className="inline-block h-px w-4 bg-orange-500" />
            Configuration
          </p>
          <h1 className="text-xl font-black uppercase tracking-tight">
            Gym <span className="text-gradient-fire">Settings</span>
          </h1>
          <p className="mt-1 text-[11px] text-zinc-600">Door, check-in, and device configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={card}>
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Check-in mode</p>

          {qrQ.isLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              <span className="text-xs text-zinc-600">Loading check-in settings…</span>
            </div>
          )}

          {qrQ.isError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-[12px] text-red-200">
              {getApiErrorMessage(qrQ.error)}
            </div>
          )}

          {qrQ.data && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Member check-in flow</div>
                <div className="mt-1 text-sm font-bold text-white">{modeLabel(qrQ.data.checkInAccessMode)}</div>
                <div className="mt-1 text-[11px] text-zinc-600">
                  If door acknowledgment is required, the member scan stays pending until the door device confirms.
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Door control</div>
                <div className="mt-1 text-sm font-bold text-white">{doorModeLabel(qrQ.data.doorAccessMode)}</div>
              </div>
            </div>
          )}
        </div>

        <div className={card}>
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Door device</p>

          {deviceQ.isLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              <span className="text-xs text-zinc-600">Loading device…</span>
            </div>
          )}

          {deviceQ.isError ? (
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-orange-400" />
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-orange-200">Device not provisioned</div>
                  <div className="mt-1 text-[11px] text-orange-200/80">
                    {getApiErrorMessage(deviceQ.error)}
                  </div>
                </div>
              </div>
            </div>
          ) : deviceQ.data ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Status</div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                      deviceQ.data.active
                        ? "border-green-400/20 bg-green-400/10 text-green-400"
                        : "border-yellow-400/20 bg-yellow-400/10 text-yellow-400"
                    }`}
                  >
                    <Wifi className="h-3 w-3" />
                    {deviceQ.data.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Device id</div>
                    <div className="mt-1 truncate text-[12px] font-semibold text-white">{deviceQ.data.deviceId}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Last seen</div>
                    <div className="mt-1 truncate text-[12px] font-semibold text-white">
                      {deviceQ.data.lastSeenAt ? new Date(deviceQ.data.lastSeenAt).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default GymSettingsPage;
