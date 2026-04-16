import { type FC, type ReactNode, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Loader2,
  QrCode,
  Settings,
  ShieldAlert,
  Wifi,
  WifiOff,
} from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/client";
import { getGymDoorDeviceApi, getGymQrCodeApi } from "@/features/gym-dashboard/gym-checkins.api";
import type {
  CheckInAccessMode,
  DoorAccessMode,
  GymDoorDeviceResponse,
} from "@/features/gym-dashboard/gym-checkins.model";
import { cn } from "@/shared/lib/utils";

type SectionId = "overview" | "checkin" | "device";
type StatusTone = "green" | "amber" | "red" | "slate";

const fireStyle = {
  background: "var(--gradient-fire)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const statusBadgeClass: Record<StatusTone, string> = {
  green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  red: "border-red-500/20 bg-red-500/10 text-red-300",
  slate: "border-white/10 bg-white/[0.04] text-slate-300",
};

const modeLabel = (mode: CheckInAccessMode | null | undefined) => {
  if (mode === "DOOR_ACK_REQUIRED") return "Door ACK required";
  if (mode === "MANUAL") return "Automatic check-in";
  return "Unavailable";
};

const doorModeLabel = (mode: DoorAccessMode | null | undefined) => {
  if (mode === "AUTOMATIC") return "Automatic";
  if (mode === "MANUAL") return "Manual";
  return "Unavailable";
};

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : "Never";

const getDeviceStatus = (device: GymDoorDeviceResponse | null | undefined) => {
  if (!device) {
    return {
      label: "Unavailable",
      tone: "slate" as const,
    };
  }

  if (!device.active) {
    return {
      label: "Inactive",
      tone: "red" as const,
    };
  }

  if (!device.lastSeenAt) {
    return {
      label: "Never seen",
      tone: "amber" as const,
    };
  }

  const diffMs = Date.now() - new Date(device.lastSeenAt).getTime();
  const thresholdMs = (device.pollIntervalSeconds ?? 60) * 3 * 1000;

  if (diffMs > thresholdMs) {
    return {
      label: "Stale",
      tone: "amber" as const,
    };
  }

  return {
    label: "Online",
    tone: "green" as const,
  };
};

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        statusBadgeClass[tone]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border table-border table-bg-alt px-3.5 py-3.5 sm:px-4 sm:py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-[13px] font-bold text-white sm:text-[14px]">{value}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[18px] border table-border table-bg px-4 py-4 text-[12px] table-text-muted">
      <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
      <span>{label}</span>
    </div>
  );
}

function SectionCard({
  active,
  badge,
  children,
  icon: Icon,
  label,
  onToggle,
  summary,
}: {
  active: boolean;
  badge?: ReactNode;
  children: ReactNode;
  icon: React.ElementType;
  label: string;
  onToggle: () => void;
  summary: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[22px] border transition-all shadow-sm",
        active ? "border-orange-500/25 table-bg" : "table-border table-bg hover:border-white/15"
      )}
    >
      <button
        type="button"
        aria-expanded={active}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors sm:px-5 sm:py-4",
          !active && "hover:bg-white/[0.02]"
        )}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border transition-colors sm:h-11 sm:w-11",
              active
                ? "border-orange-500/30 bg-orange-500/15 text-orange-300"
                : "table-border table-bg-alt text-slate-400"
            )}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className={cn("text-[13px] font-black uppercase tracking-[0.12em]", active ? "text-white" : "text-slate-200")}>
              {label}
            </p>
            <p className="mt-0.5 text-[11px] table-text-muted">{summary}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {badge}
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] transition-colors",
              active && "border-orange-500/30 bg-orange-500/10"
            )}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-500 transition-transform duration-200",
                active && "rotate-180 text-orange-400"
              )}
            />
          </span>
        </div>
      </button>

      {active ? (
        <div className="border-t table-border-cell table-bg-alt px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

const GymSettingsPage: FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId | null>("overview");

  const qrQ = useQuery({ queryKey: ["gym-qr"], queryFn: getGymQrCodeApi });
  const deviceQ = useQuery({
    queryKey: ["gym-door-device"],
    queryFn: getGymDoorDeviceApi,
    retry: false,
  });

  const deviceStatus = useMemo(() => getDeviceStatus(deviceQ.data), [deviceQ.data]);

  const overviewStats = useMemo(
    () => [
      {
        label: "Check-in",
        value: qrQ.isLoading ? "Loading..." : qrQ.isError ? "Unavailable" : modeLabel(qrQ.data?.checkInAccessMode),
      },
      {
        label: "Door",
        value: qrQ.isLoading ? "Loading..." : qrQ.isError ? "Unavailable" : doorModeLabel(qrQ.data?.doorAccessMode),
      },
      {
        label: "Device",
        value: deviceQ.isLoading ? "Loading..." : deviceQ.isError ? "Provision required" : deviceStatus.label,
      },
      {
        label: "Poll",
        value: deviceQ.isLoading
          ? "Loading..."
          : deviceQ.data?.pollIntervalSeconds
            ? `${deviceQ.data.pollIntervalSeconds}s`
            : deviceQ.isError
              ? "-"
              : "Default",
      },
    ],
    [deviceQ.data, deviceQ.isError, deviceQ.isLoading, deviceStatus.label, qrQ.data, qrQ.isError, qrQ.isLoading]
  );

  const qrBadge = qrQ.isLoading
    ? <StatusBadge label="Loading" tone="slate" />
    : qrQ.isError
      ? <StatusBadge label="Unavailable" tone="red" />
      : <StatusBadge label={qrQ.data?.active ? "QR Active" : "QR Inactive"} tone={qrQ.data?.active ? "green" : "red"} />;

  const deviceBadge = deviceQ.isLoading
    ? <StatusBadge label="Loading" tone="slate" />
    : deviceQ.isError
      ? <StatusBadge label="Provision required" tone="amber" />
      : <StatusBadge label={deviceStatus.label} tone={deviceStatus.tone} />;

  const toggleSection = (section: SectionId) => {
    setActiveSection((current) => (current === section ? null : section));
  };

  return (
    <div className="dashboard-mobile-page space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[32px] font-black tracking-tight text-white">
          Gym <span style={fireStyle}>Settings</span>
        </h1>
      </div>

      <section className="space-y-3">
        <SectionCard
          active={activeSection === "overview"}
          icon={Settings}
          label="Overview"
          onToggle={() => toggleSection("overview")}
          summary="Live snapshot"
        >
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {overviewStats.map((item) => (
              <MetricCard key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          active={activeSection === "checkin"}
          badge={qrBadge}
          icon={QrCode}
          label="Check-In Access"
          onToggle={() => toggleSection("checkin")}
          summary="QR and entry flow"
        >
          {qrQ.isLoading ? (
            <LoadingState label="Loading check-in settings..." />
          ) : qrQ.isError ? (
            <div className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-[12px] text-red-200">
              {getApiErrorMessage(qrQ.error)}
            </div>
          ) : qrQ.data ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="QR Status" value={qrQ.data.active ? "Active" : "Inactive"} />
              <MetricCard label="Check-in Flow" value={modeLabel(qrQ.data.checkInAccessMode)} />
              <MetricCard label="Door Mode" value={doorModeLabel(qrQ.data.doorAccessMode)} />
            </div>
          ) : (
            <div className="rounded-[18px] border table-border table-bg px-4 py-4 text-[12px] table-text-muted">
              No check-in data available.
            </div>
          )}
        </SectionCard>

        <SectionCard
          active={activeSection === "device"}
          badge={deviceBadge}
          icon={deviceQ.data?.active ? Wifi : WifiOff}
          label="Door Device"
          onToggle={() => toggleSection("device")}
          summary="Provisioning and heartbeat"
        >
          {deviceQ.isLoading ? (
            <LoadingState label="Loading device details..." />
          ) : deviceQ.isError ? (
            <div className="rounded-[18px] border border-orange-500/20 bg-orange-500/10 px-4 py-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-orange-400" />
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-orange-200">Device not provisioned</div>
                  <div className="mt-1 text-[11px] text-orange-100/80">
                    {getApiErrorMessage(deviceQ.error)}
                  </div>
                </div>
              </div>
            </div>
          ) : deviceQ.data ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Status" value={deviceStatus.label} />
              <MetricCard label="Device ID" value={deviceQ.data.deviceId} />
              <MetricCard label="Last Seen" value={formatDateTime(deviceQ.data.lastSeenAt)} />
              <MetricCard
                label="Poll Interval"
                value={deviceQ.data.pollIntervalSeconds ? `${deviceQ.data.pollIntervalSeconds}s` : "Default"}
              />
              <MetricCard label="Provisioned" value={formatDateTime(deviceQ.data.createdAt)} />
            </div>
          ) : (
            <div className="rounded-[18px] border table-border table-bg px-4 py-4 text-[12px] table-text-muted">
              No device data available.
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
};

export default GymSettingsPage;
