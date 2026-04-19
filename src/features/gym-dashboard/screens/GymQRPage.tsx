import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, AlertTriangle, Copy, KeyRound, Loader2, QrCode, RefreshCcw, Search, Shield, SlidersHorizontal, Wifi, WifiOff, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getGymCheckInAnalyticsApi,
  getGymCheckInsApi,
  getGymDoorDeviceApi,
  getGymQrCodeApi,
  getGymTodayCheckInsApi,
  manualUnlockGymDoorApi,
  provisionGymDoorDeviceApi,
  rotateGymDoorDeviceSecretApi,
  rotateGymQrCodeApi,
} from "@/features/gym-dashboard/gym-checkins.api";
import type {
  AccessTier,
  CheckInAccessMode,
  DoorAccessMode,
  GymCheckInDenyReason,
  GymCheckInStatus,
} from "@/features/gym-dashboard/gym-checkins.model";
import { getApiErrorMessage } from "@/shared/api/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const PAGE_SIZE = 10;
const PEAK_HOUR_START = 4;
const PEAK_HOUR_END = 24;
const steps = [
  { n: "1", title: "Member pays FitPal", sub: "Pro/Elite plan on the app. You never handle payment." },
  { n: "2", title: "Platform grants access", sub: "Pass marked valid for gyms matching the plan tier." },
  { n: "3", title: "Member scans your QR", sub: "Open FitPal -> tap Check-in -> scan your door QR." },
  { n: "4", title: "Platform validates", sub: "Checks: valid pass? correct tier? not expired?" },
  { n: "5", title: "Logged to you", sub: "Check-in appears here: name, plan, time, result." },
];


/** Toolbar pill button - consistent with peak hours styling */
const TB_BASE =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform";
const TB_IDLE =
  "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]";
const TB_ACTIVE = "border-orange-500/50 bg-orange-500 text-white";
const TB_REFRESH =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/20 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] disabled:opacity-50";

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
};

const avatarFallback = (name?: string | null) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
};

const hourLabel = (hour: number) => {
  const normalizedHour = hour % 24;
  const twelve = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  const suffix = normalizedHour < 12 ? "am" : "pm";
  if (hour === PEAK_HOUR_START) return `${twelve}${suffix}`;
  if (hour === PEAK_HOUR_END) return `${twelve}${suffix}`;
  return String(twelve);
};
const checkInModeLabel = (mode: CheckInAccessMode | null | undefined) => {
  if (mode === "DOOR_ACK_REQUIRED") return "Wait for Door ACK";
  if (mode === "MANUAL") return "Direct Check-in";
  return "Unavailable";
};

const doorModeLabel = (mode: DoorAccessMode | null | undefined) => {
  if (mode === "MANUAL") return "Manual Door Control";
  if (mode === "AUTOMATIC") return "Automatic Unlock";
  return "Unavailable";
};

const denyReasonLabel = (reason: GymCheckInDenyReason) =>
  reason
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");

function statusBadge(status: GymCheckInStatus) {
  switch (status) {
    case "CHECKED_IN":
      return {
        dot: "bg-green-400",
        cls: "border-green-500/30 bg-green-500/10 text-green-400",
        label: "Checked In",
      };
    case "CHECKED_OUT":
      return {
        dot: "bg-blue-400",
        cls: "border-blue-500/30 bg-blue-500/10 text-blue-400",
        label: "Checked Out",
      };
    case "DENIED":
      return {
        dot: "bg-red-400",
        cls: "border-red-500/30 bg-red-500/10 text-red-400",
        label: "Denied",
      };
    case "ACCESS_PENDING":
      return {
        dot: "bg-yellow-400",
        cls: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
        label: "Access Pending",
      };
    default:
      return {
        dot: "bg-yellow-400",
        cls: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
        label: status,
      };
  }
}

/** Generates a QR code image URL using the free QR Server API */
function qrImageUrl(token: string, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(token)}&bgcolor=ffffff&color=111111&margin=8`;
}

type IssuedDoorSecret = {
  deviceId: string;
  deviceSecret: string;
  issuedAt: string | null;
};

const GymQRPage: FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<"ALL" | GymCheckInStatus>("ALL");
  const [tier, setTier] = useState<"ALL" | AccessTier>("ALL");
  const [denyReason, setDenyReason] = useState<"ALL" | GymCheckInDenyReason>("ALL");
  const [sortBy, setSortBy] = useState<"checkInAt" | "checkOutAt" | "status">("checkInAt");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [search, setSearch] = useState("");
  const [peakMode, setPeakMode] = useState<"today" | "week" | "all">("all");
  const [issuedSecret, setIssuedSecret] = useState<IssuedDoorSecret | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rotateSecretOpen, setRotateSecretOpen] = useState(false);
  const [rotateQrOpen, setRotateQrOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-checkin-filter-select='true']")) return;
      if (filterRef.current && !filterRef.current.contains(target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeFilterCount = [
    status !== "ALL" ? 1 : 0,
    tier !== "ALL" ? 1 : 0,
    denyReason !== "ALL" ? 1 : 0,
    (sortBy !== "checkInAt" || sortDirection !== "DESC") ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const qrQ = useQuery({ queryKey: ["gym-qr"], queryFn: getGymQrCodeApi });
  const todayQ = useQuery({ queryKey: ["gym-checkins-today"], queryFn: getGymTodayCheckInsApi });
  const analyticsQ = useQuery({ queryKey: ["gym-checkins-analytics"], queryFn: getGymCheckInAnalyticsApi });
  const deviceQ = useQuery({ queryKey: ["gym-door-device"], queryFn: getGymDoorDeviceApi });

  const tableQ = useQuery({
    queryKey: ["gym-checkins", page, status, tier, denyReason, sortBy, sortDirection, search],
    queryFn: () =>
      getGymCheckInsApi({
        page,
        size: PAGE_SIZE,
        statuses: status === "ALL" ? undefined : [status],
        membershipTier: tier === "ALL" ? undefined : tier,
        denyReason: denyReason === "ALL" ? undefined : denyReason,
        memberNamePrefix: search.trim() || undefined,
        sortBy,
        sortDirection,
      }),
    placeholderData: (prev) => prev,
  });

  const rotateQr = useMutation({
    mutationFn: rotateGymQrCodeApi,
    onSuccess: () => {
      toast.success("QR rotated successfully");
      queryClient.invalidateQueries({ queryKey: ["gym-qr"] });
      setRotateQrOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Failed to rotate QR")),
  });
  const provisionDoorDevice = useMutation({
    mutationFn: provisionGymDoorDeviceApi,
    onSuccess: (result) => {
      setIssuedSecret({
        deviceId: result.deviceId,
        deviceSecret: result.deviceSecret,
        issuedAt: result.provisionedAt,
      });
      toast.success("Door device provisioned with a one-time secret");
      queryClient.invalidateQueries({ queryKey: ["gym-door-device"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Failed to provision door device")),
  });
  const rotateDoorSecret = useMutation({
    mutationFn: rotateGymDoorDeviceSecretApi,
    onSuccess: (credentials) => {
      setIssuedSecret({
        deviceId: credentials.deviceId,
        deviceSecret: credentials.deviceSecret,
        issuedAt: credentials.secretIssuedAt,
      });
      toast.success("Door secret rotated. Copy it now");
      queryClient.invalidateQueries({ queryKey: ["gym-door-device"] });
      setRotateSecretOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Failed to rotate door secret")),
  });
  const manualUnlock = useMutation({
    mutationFn: manualUnlockGymDoorApi,
    onSuccess: () => toast.success("Manual unlock queued"),
    onError: (e) => toast.error(getApiErrorMessage(e, "Failed to trigger manual unlock")),
  });
  const doorDeviceErrorMessage = deviceQ.isError
    ? getApiErrorMessage(deviceQ.error, "Failed to load device")
    : null;
  const isDoorDeviceMissing = doorDeviceErrorMessage?.toLowerCase().includes("not been provisioned") ?? false;

  const copyToClipboard = async (value: string | null | undefined, successMessage: string) => {
    if (!value) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Clipboard access is unavailable");
    }
  };

  const downloadQr = () => {
    const token = qrQ.data?.qrToken;
    if (!token) {
      toast.error("QR token is not available");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = qrImageUrl(token, 640);
    anchor.download = `gym-qr-${qrQ.data?.gymId ?? "active"}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const peakRaw = peakMode === "today"
    ? analyticsQ.data?.peakToday
    : peakMode === "week"
      ? analyticsQ.data?.peakWeekAverage
      : analyticsQ.data?.peakAllTimeAverage;

  const peakData = useMemo(() => {
    const byHour = new Map<number, number>();
    for (const point of peakRaw ?? []) {
      if (point.hour >= PEAK_HOUR_START && point.hour <= PEAK_HOUR_END) {
        byHour.set(point.hour, point.count);
      }
    }
    return Array.from({ length: PEAK_HOUR_END - PEAK_HOUR_START + 1 }, (_, idx) => {
      const hour = PEAK_HOUR_START + idx;
      return {
        label: hourLabel(hour),
        count: byHour.get(hour) ?? 0,
      };
    });
  }, [peakRaw]);

  const successDeniedData = useMemo(
    () => [
      { name: "Success", value: analyticsQ.data?.successfulScans ?? 0, color: "#22c55e" },
      { name: "Denied", value: analyticsQ.data?.deniedScans ?? 0, color: "#ef4444" },
    ],
    [analyticsQ.data?.successfulScans, analyticsQ.data?.deniedScans]
  );

  const totalOutcomeCount = successDeniedData[0].value + successDeniedData[1].value;

  const topDeniedReasons = useMemo(
    () => (analyticsQ.data?.deniedReasons ?? []).filter((item) => item.count > 0).slice(0, 5),
    [analyticsQ.data?.deniedReasons]
  );

  const topDeniedReasonChartData = useMemo(
    () =>
      topDeniedReasons.map((item) => ({
        label: (() => {
          const text = denyReasonLabel(item.reason);
          return text.length > 14 ? `${text.slice(0, 14)}...` : text;
        })(),
        count: item.count,
      })),
    [topDeniedReasons]
  );

  return (
    <div className="dashboard-mobile-page max-w-[1600px] animate-fade-in space-y-5 font-['Outfit',system-ui,sans-serif]">
      {/*  Header  */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight text-white">
            QR &  <span style={fireStyle}>Check-Ins</span>
          </h1>
        </div>
      </div>

      {/*  Stat Cards  */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex h-full min-h-[102px] flex-col rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-3.5 transition-all hover:border-orange-500/40">
          <div className="flex min-w-0 items-center gap-2">
            <Activity className="h-4 w-4 flex-shrink-0 text-orange-400" />
            <p className="truncate text-[10px] font-black uppercase tracking-wider table-text-muted">Total Scans</p>
          </div>
          <div className="mt-2.5 flex min-h-[28px] items-center">
            <p className="text-2xl font-black leading-none text-orange-400">{String(analyticsQ.data?.totalScans ?? 0)}</p>
          </div>
        </div>
        <div className="flex h-full min-h-[102px] flex-col rounded-2xl border border-green-500/25 bg-green-500/[0.06] p-3.5 transition-all hover:border-green-500/40">
          <div className="flex min-w-0 items-center gap-2">
            <Shield className="h-4 w-4 flex-shrink-0 text-green-400" />
            <p className="truncate text-[10px] font-black uppercase tracking-wider table-text-muted">Successful</p>
          </div>
          <div className="mt-2.5 flex min-h-[28px] items-center">
            <p className="text-2xl font-black leading-none text-white">{String(analyticsQ.data?.successfulScans ?? 0)}</p>
          </div>
        </div>
        <div className="flex h-full min-h-[102px] flex-col rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-3.5 transition-all hover:border-red-500/40">
          <div className="flex min-w-0 items-center gap-2">
            <WifiOff className="h-4 w-4 flex-shrink-0 text-red-400" />
            <p className="truncate text-[10px] font-black uppercase tracking-wider table-text-muted">Denied</p>
          </div>
          <div className="mt-2.5 flex min-h-[28px] items-center">
            <p className="text-2xl font-black leading-none text-white">{String(analyticsQ.data?.deniedScans ?? 0)}</p>
          </div>
          {analyticsQ.data?.topDeniedReason && (
            <p className="mt-1 text-[10px] text-red-400">
              {analyticsQ.data.topDeniedReason.count} - {denyReasonLabel(analyticsQ.data.topDeniedReason.reason)}
            </p>
          )}
        </div>
        <div className="flex h-full min-h-[102px] flex-col rounded-2xl border border-blue-500/25 bg-blue-500/[0.06] p-3.5 transition-all hover:border-blue-500/40">
          <div className="flex min-w-0 items-center gap-2">
            <QrCode className="h-4 w-4 flex-shrink-0 text-blue-400" />
            <p className="truncate text-[10px] font-black uppercase tracking-wider table-text-muted">Today Check-ins</p>
          </div>
          <div className="mt-2.5 flex min-h-[28px] items-center">
            <p className="text-2xl font-black leading-none text-white">{String(todayQ.data?.length ?? 0)}</p>
          </div>
        </div>
      </div>

      {/*  Active QR & Door Device  */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Active QR */}
        <div className="rounded-2xl border table-border bg-[#121212] p-5 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">Active QR</span>
              <div className="h-px flex-1 bg-orange-500/10" />
            </div>
            <button
              type="button"
              className={`${TB_BASE} ${TB_ACTIVE} whitespace-nowrap`}
              onClick={() => setRotateQrOpen(true)}
              disabled={rotateQr.isPending}
            >
              {rotateQr.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              {rotateQr.isPending ? "Rotating..." : "Rotate QR"}
            </button>
          </div>
          {qrQ.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm table-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading QR...</div>
          ) : qrQ.isError ? (
            <p className="text-sm text-red-300">{getApiErrorMessage(qrQ.error, "Failed to load QR")}</p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {/* QR Code Image */}
              <div className="flex-shrink-0 rounded-2xl border border-white/10 bg-[#0a0a0a] p-3">
                <img
                  src={qrImageUrl(qrQ.data?.qrToken ?? "", 180)}
                  alt="Gym QR Code"
                  className="h-[180px] w-[180px] rounded-lg"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              {/* QR Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">Gym</p>
                  <p className="text-[14px] font-bold text-white">{qrQ.data?.gymName ?? "Gym"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">Token</p>
                  <p className="mt-0.5 rounded-lg border table-border-row bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-zinc-400 break-all">
                    {qrQ.data?.qrToken ?? ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`${TB_BASE} ${TB_IDLE} px-2.5 py-1 text-[10px]`}
                      onClick={() => copyToClipboard(qrQ.data?.qrToken, "QR token copied")}
                    >
                      <Copy className="h-3 w-3" /> Copy Token
                    </button>
                    <button
                      type="button"
                      className={`${TB_BASE} ${TB_IDLE} px-2.5 py-1 text-[10px]`}
                      onClick={downloadQr}
                    >
                      <QrCode className="h-3 w-3" /> Download QR
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">Created</p>
                    <p className="text-[12px] font-semibold table-text">{formatDateTime(qrQ.data?.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                    qrQ.data?.active
                      ? "border-green-500/30 bg-green-500/10 text-green-400"
                      : "border-red-500/30 bg-red-500/10 text-red-400"
                  }`}>
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${qrQ.data?.active ? "bg-green-400" : "bg-red-400"}`} />
                    {qrQ.data?.active ? "Active" : "Inactive"}
                  </span>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Door Device */}
        <div className="rounded-2xl border table-border bg-[#121212] p-5 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">Door Device</span>
            <div className="h-px flex-1 bg-orange-500/10" />
          </div>
          {deviceQ.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm table-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading device...</div>
          ) : deviceQ.isError ? (
            <div className="space-y-3">
              <p className="text-sm text-red-300">{doorDeviceErrorMessage}</p>
              {isDoorDeviceMissing && (
                <button
                  type="button"
                  className={`${TB_BASE} ${TB_ACTIVE} justify-center`}
                  onClick={() => provisionDoorDevice.mutate()}
                  disabled={provisionDoorDevice.isPending}
                >
                  {provisionDoorDevice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                  {provisionDoorDevice.isPending ? "Provisioning..." : "Provision Device"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                  deviceQ.data?.active
                    ? "border-green-500/25 bg-green-500/10"
                    : "border-zinc-500/25 bg-zinc-500/10"
                }`}>
                  {deviceQ.data?.active ? <Wifi className="h-5 w-5 text-green-400" /> : <WifiOff className="h-5 w-5 text-zinc-500" />}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">
                    {deviceQ.data?.active ? "Online" : "Offline"}
                  </p>
                  <p className="text-[11px] table-text-muted">Last seen: {formatDateTime(deviceQ.data?.lastSeenAt)}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border table-border-row bg-white/[0.02] px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wider table-text-muted">Check-in Mode</p>
                  <p className="mt-1 text-[11px] font-semibold text-white">{checkInModeLabel(qrQ.data?.checkInAccessMode)}</p>
                </div>
                <div className="rounded-lg border table-border-row bg-white/[0.02] px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wider table-text-muted">Door Mode</p>
                  <p className="mt-1 text-[11px] font-semibold text-white">{doorModeLabel(qrQ.data?.doorAccessMode)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={`${TB_BASE} ${TB_IDLE} flex-1 justify-center`}
                  onClick={() => setRotateSecretOpen(true)}
                  disabled={rotateDoorSecret.isPending}
                >
                  {rotateDoorSecret.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                  {rotateDoorSecret.isPending ? "Rotating..." : "Rotate Secret"}
                </button>
                <button
                  type="button"
                  className={`${TB_BASE} cursor-pointer border-emerald-500/40 bg-transparent text-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.2)] flex-1 justify-center transition-all hover:bg-emerald-500/10 hover:border-emerald-500/60 hover:shadow-[inset_0_0_16px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed`}
                  onClick={() => manualUnlock.mutate()}
                  disabled={manualUnlock.isPending || !deviceQ.data?.active}
                >
                  {manualUnlock.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" /> : <Activity className="h-3.5 w-3.5 text-emerald-400" />}
                  {manualUnlock.isPending ? "Sending..." : "Manual Unlock"}
                </button>
              </div>

              {issuedSecret && (
                <div className="rounded-xl border table-border-row bg-white/[0.02] p-3.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-orange-400">One-Time Device Secret</p>
                    <p className="text-[10px] table-text-muted">Issued: {formatDateTime(issuedSecret.issuedAt)}</p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">Device ID</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="flex-1 rounded-lg border table-border-row bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10px] text-zinc-300 break-all">
                          {issuedSecret.deviceId}
                        </p>
                        <button
                          type="button"
                          className={`${TB_BASE} ${TB_IDLE} px-2 py-1 text-[10px]`}
                          onClick={() => copyToClipboard(issuedSecret.deviceId, "Device ID copied")}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">Device Secret</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="flex-1 rounded-lg border table-border-row bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10px] text-zinc-300 break-all">
                          {issuedSecret.deviceSecret}
                        </p>
                        <button
                          type="button"
                          className={`${TB_BASE} ${TB_IDLE} px-2 py-1 text-[10px]`}
                          onClick={() => copyToClipboard(issuedSecret.deviceSecret, "Device secret copied")}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/*  Peak Hours  */}
      <div className="rounded-2xl border table-border bg-[#121212] p-5 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">Peak Hours</span>
            <div className="h-px flex-1 min-w-[40px] bg-orange-500/10" />
          </div>
          <div className="flex gap-1 rounded-full border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,11%)] p-1">
            {(["today", "week", "all"] as const).map((m) => (
              <button
                key={m}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all ${
                  peakMode === m
                    ? "border border-orange-500/50 bg-orange-500 text-white"
                    : "border-transparent bg-transparent !text-neutral-500 hover:border-white/10 hover:bg-white/[0.04] hover:!text-neutral-300"
                }`}
                onClick={() => setPeakMode(m)}
              >
                {m === "today" ? "Today" : m === "week" ? "This Week" : "All Time"}
              </button>
            ))}
          </div>
        </div>
        {analyticsQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm table-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading chart...</div>
        ) : analyticsQ.isError ? (
          <p className="text-sm text-red-300">{getApiErrorMessage(analyticsQ.error, "Failed to load peak hours")}</p>
        ) : peakData.length === 0 ? (
          <p className="text-sm table-text-muted">No peak hour data yet.</p>
        ) : (
          <div className="grid items-stretch gap-3 lg:grid-cols-[1.8fr_1fr_1fr]">
            <div className="flex min-h-[220px] flex-col rounded-xl border table-border-row bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Peak activity</p>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider table-text-muted">
                  4am to 12am
                </span>
              </div>
              <div className="flex-1 min-h-[0] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={peakData}
                    margin={{ top: 6, right: 6, left: -14, bottom: 0 }}
                    barCategoryGap="2%"
                    barGap={0}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 700 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.14)" }}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#71717a", fontSize: 10, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      width={26}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                        color: "#fff",
                      }}
                      labelStyle={{ color: "#f97316", fontWeight: 700, fontSize: 11 }}
                      formatter={(value: string | number) => [String(value), "Scans"]}
                    />
                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={14} minPointSize={2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex min-h-[220px] flex-col rounded-xl border table-border-row bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Success vs Denied</p>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider table-text-muted">
                  total {totalOutcomeCount}
                </span>
              </div>

              {totalOutcomeCount === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-[11px] table-text-muted">No scan outcomes for this period.</p>
                </div>
              ) : (
                <div className="flex-1 min-h-[0] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={successDeniedData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={48}
                        paddingAngle={2}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={1}
                      >
                        {successDeniedData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          background: "#0a0a0a",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "10px",
                          color: "#fff",
                        }}
                      formatter={(value: string | number, name: string | number) => [String(value), String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              )}

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-green-500/25 bg-green-500/10 px-2.5 py-1.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-green-300">Success</p>
                  <p className="text-sm font-black text-white">{analyticsQ.data?.successfulScans ?? 0}</p>
                </div>
                <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-red-300">Denied</p>
                  <p className="text-sm font-black text-white">{analyticsQ.data?.deniedScans ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="flex min-h-[220px] flex-col rounded-xl border table-border-row bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Top 5 denied reasons</p>
                <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-300">
                  {analyticsQ.data?.deniedScans ?? 0} denied
                </span>
              </div>

              {topDeniedReasonChartData.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-[11px] table-text-muted">No denied reasons in this period.</p>
                </div>
              ) : (
                <div className="flex-1 min-h-[0] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topDeniedReasonChartData}
                      margin={{ top: 4, right: 6, left: -8, bottom: 4 }}
                      barCategoryGap="22%"
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        type="category"
                        dataKey="label"
                        tick={{ fill: "#a1a1aa", fontSize: 9, fontWeight: 700 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.14)" }}
                        tickLine={false}
                      />
                      <YAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: "#71717a", fontSize: 10, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        width={24}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          background: "#0a0a0a",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "10px",
                          color: "#fff",
                        }}
                        formatter={(value: string | number) => [String(value), "Denied"]}
                      />
                      <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={14} minPointSize={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/*  Check-in Log Table  */}
      <div className="overflow-hidden rounded-[18px] border table-border bg-[#121212] shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">Check-in Log</span>
            <p className="mt-0.5 text-[10px] table-text-muted">Live check-in attempts and outcomes</p>
          </div>
          <button
            type="button"
            className={TB_REFRESH}
            onClick={() => { tableQ.refetch(); analyticsQ.refetch(); }}
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="dashboard-mobile-toolbar flex items-center justify-between gap-2 flex-wrap border-t table-border px-5 py-3">
          <div className="dashboard-mobile-search relative flex-1 max-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 table-text-muted pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search member..."
              className="h-9 rounded-full border table-border table-bg pl-9 pr-3 text-[12px] text-white placeholder:table-text-muted focus-visible:ring-orange-500/30"
            />
          </div>
          <div className="dashboard-mobile-actions flex items-center gap-2 flex-shrink-0">
            <div ref={filterRef} className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className={`${TB_BASE} ${filterOpen || activeFilterCount > 0 ? TB_ACTIVE : TB_IDLE}`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter & Sort
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-orange-500/20 px-1 text-[9px] font-black text-orange-400">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filterOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 table-bg table-border border rounded-2xl p-4 min-w-[280px] z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)] space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-widest table-text-muted">Filter & Sort</div>
                  
                  <Select value={status} onValueChange={(v) => { setStatus(v as "ALL" | GymCheckInStatus); setPage(0); }}>
                    <SelectTrigger className="h-9 w-full rounded-full border table-border table-bg px-3 text-[12px] font-bold text-white">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent data-checkin-filter-select="true" className="border table-border table-bg-alt text-white">
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                      <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
                      <SelectItem value="ACCESS_PENDING">Access Pending</SelectItem>
                      <SelectItem value="DENIED">Denied</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={tier} onValueChange={(v) => { setTier(v as "ALL" | AccessTier); setPage(0); }}>
                    <SelectTrigger className="h-9 w-full rounded-full border table-border table-bg px-3 text-[12px] font-bold text-white">
                      <SelectValue placeholder="All Tiers" />
                    </SelectTrigger>
                    <SelectContent data-checkin-filter-select="true" className="border table-border table-bg-alt text-white">
                      <SelectItem value="ALL">All Tiers</SelectItem>
                      <SelectItem value="BASIC">Basic</SelectItem>
                      <SelectItem value="PRO">Pro</SelectItem>
                      <SelectItem value="ELITE">Elite</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={denyReason} onValueChange={(v) => { setDenyReason(v as "ALL" | GymCheckInDenyReason); setPage(0); }}>
                    <SelectTrigger className="h-9 w-full rounded-full border table-border table-bg px-3 text-[12px] font-bold text-white">
                      <SelectValue placeholder="All Deny Reasons" />
                    </SelectTrigger>
                    <SelectContent data-checkin-filter-select="true" className="border table-border table-bg-alt text-white">
                      <SelectItem value="ALL">All Deny Reasons</SelectItem>
                      <SelectItem value="INACTIVE_TOKEN">Inactive Token</SelectItem>
                      <SelectItem value="GYM_NOT_APPROVED">Gym Not Approved</SelectItem>
                      <SelectItem value="GYM_CHECK_IN_DISABLED">Gym Check-in Disabled</SelectItem>
                      <SelectItem value="GYM_GEOFENCE_NOT_CONFIGURED">Gym Geofence Not Configured</SelectItem>
                      <SelectItem value="NO_ACTIVE_SUBSCRIPTION">No Active Subscription</SelectItem>
                      <SelectItem value="TIER_TOO_LOW">Tier Too Low</SelectItem>
                      <SelectItem value="OUTSIDE_RADIUS">Outside Radius</SelectItem>
                      <SelectItem value="ALREADY_VISITED_ANOTHER_GYM_TODAY">Already Visited Another Gym Today</SelectItem>
                      <SelectItem value="ALREADY_CHECKED_IN">Already Checked-In</SelectItem>
                      <SelectItem value="DOOR_DEVICE_UNAVAILABLE">Door Device Unavailable</SelectItem>
                      <SelectItem value="DOOR_COMMAND_FAILED">Door Command Failed</SelectItem>
                      <SelectItem value="DOOR_COMMAND_EXPIRED">Door Command Expired</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={`${sortBy}:${sortDirection}`}
                    onValueChange={(v) => {
                      const [nextSortBy, nextSortDirection] = v.split(":");
                      setSortBy(nextSortBy as "checkInAt" | "checkOutAt" | "status");
                      setSortDirection(nextSortDirection as "ASC" | "DESC");
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full rounded-full border table-border table-bg px-3 text-[12px] font-bold text-white">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent data-checkin-filter-select="true" className="border table-border table-bg-alt text-white">
                      <SelectItem value="checkInAt:DESC">Checked In (newest)</SelectItem>
                      <SelectItem value="checkInAt:ASC">Checked In (oldest)</SelectItem>
                      <SelectItem value="checkOutAt:DESC">Checked Out (newest)</SelectItem>
                      <SelectItem value="checkOutAt:ASC">Checked Out (oldest)</SelectItem>
                      <SelectItem value="status:ASC">Status (A-Z)</SelectItem>
                      <SelectItem value="status:DESC">Status (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatus("ALL");
                        setTier("ALL");
                        setDenyReason("ALL");
                        setSortBy("checkInAt");
                        setSortDirection("DESC");
                        setPage(0);
                      }}
                      className={`${TB_BASE} w-full justify-center text-orange-400 border-orange-500/30 hover:bg-orange-500/10`}
                    >
                      <X className="h-3 w-3" /> Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {tableQ.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            <span className="text-[13px] table-text-muted">Loading log...</span>
          </div>
        ) : tableQ.isError ? (
          <p className="px-5 py-8 text-sm text-red-300">{getApiErrorMessage(tableQ.error, "Failed to load check-ins")}</p>
        ) : (
          <>
            <div className="dashboard-mobile-table-scroll overflow-x-auto">
              <Table className="min-w-[780px] w-full border-collapse">
                <TableHeader>
                  <TableRow className="table-header-bg border-b table-border hover:bg-transparent">
                    {["Member", "Checked In", "Checked Out", "Tier", "Status", "Deny Reason"].map((h) => (
                      <TableHead key={h} className="h-auto px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tableQ.data?.items ?? []).length === 0 ? (
                    <TableRow className="border-b table-border-row hover:bg-transparent">
                      <TableCell colSpan={6} className="py-16 text-center">
                        <Search className="mx-auto mb-2 h-8 w-8 table-text-muted" strokeWidth={1.5} />
                        <div className="text-[14px] font-bold table-text">No entries match your filters</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (tableQ.data?.items ?? []).map((row) => {
                      const badge = statusBadge(row.status);
                      return (
                        <TableRow key={row.checkInId} className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]">
                          <TableCell className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-9 w-9 rounded-full border border-orange-500/25">
                                <AvatarImage src={row.memberProfileImageUrl ?? undefined} alt={row.memberName ?? "Member"} className="object-cover" />
                                <AvatarFallback className="rounded-full bg-orange-500/10 text-[11px] font-black text-orange-400">
                                  {avatarFallback(row.memberName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[13px] font-bold text-white">{row.memberName ?? "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-3.5 font-mono text-[11px] table-text">{formatDateTime(row.checkInAt)}</TableCell>
                          <TableCell className="px-5 py-3.5 font-mono text-[11px] table-text">{formatDateTime(row.checkOutAt)}</TableCell>
                          <TableCell className="px-5 py-3.5">
                            {row.membershipTierAtCheckIn ? (
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                row.membershipTierAtCheckIn === "ELITE"
                                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                  : row.membershipTierAtCheckIn === "PRO"
                                    ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                              }`}>
                                {row.membershipTierAtCheckIn}
                              </span>
                            ) : (
                              <span className="text-[11px] table-text-muted">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge.cls}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-[11px] table-text">
                            {row.denyReason ? denyReasonLabel(row.denyReason) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            <div className="dashboard-mobile-pagination flex items-center justify-between border-t table-border px-5 py-3">
              <p className="text-[12px] table-text-muted">
                Page {(tableQ.data?.page ?? 0) + 1} of {Math.max(1, tableQ.data?.totalPages ?? 1)}
              </p>
              <div className="dashboard-mobile-pagination-actions flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={!(tableQ.data?.hasPrevious ?? false)}
                  className="rounded-full border table-border table-bg px-3.5 py-1.5 text-[11px] font-bold table-text transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="dashboard-mobile-page-pill rounded-full border table-border table-bg-alt px-4 py-1.5 text-[11px] font-semibold text-white">
                  {(tableQ.data?.page ?? 0) + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!(tableQ.data?.hasNext ?? false)}
                  className="rounded-full border table-border table-bg px-3.5 py-1.5 text-[11px] font-bold table-text transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* How Member Access Works */}
      <div className="rounded-2xl border table-border bg-[#121212] overflow-hidden shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]">
        <div className="border-b table-border bg-gradient-to-r from-orange-500/[0.08] to-transparent px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">How Member Access Works</span>
            <div className="h-px flex-1 bg-orange-500/10" />
          </div>
        </div>
        <div className="dashboard-mobile-scroll-rail flex gap-0 overflow-x-auto p-4">
          {steps.map((s, i, arr) => (
            <div key={i} className="flex min-w-[140px] flex-1 items-stretch">
              <div className="flex-1 rounded-xl border table-border-row bg-white/[0.02] p-3 transition-all hover:bg-white/[0.04]">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 text-[10px] font-black text-orange-400">
                  {s.n}
                </div>
                <div className="mb-1 text-[11px] font-bold text-white leading-tight">{s.title}</div>
                <div className="text-[9px] leading-relaxed table-text-muted">{s.sub}</div>
              </div>
              {i < arr.length - 1 && (
                <div className="flex flex-shrink-0 items-center px-1.5">
                  <div className="text-orange-500/40 text-lg font-light">{">"}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rotate QR Confirmation Dialog */}
      <AlertDialog open={rotateQrOpen} onOpenChange={setRotateQrOpen}>
        <AlertDialogContent className="border-white/10 bg-[#0a0a0a] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Rotate QR Code?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will invalidate the current QR code. Any printed or displayed QR codes will stop working.
              Members will need to scan the new QR code to check in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rotateQr.mutate()}
              className="border-orange-500/30 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
            >
              {rotateQr.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Rotate QR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*  Rotate Secret Confirmation Dialog  */}
      <AlertDialog open={rotateSecretOpen} onOpenChange={setRotateSecretOpen}>
        <AlertDialogContent className="border-white/10 bg-[#0a0a0a] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Rotate Door Secret?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will invalidate the current door device secret. The door controller will need to be
              reconfigured with the new secret. The door will stop responding until updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rotateDoorSecret.mutate()}
              className="border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              {rotateDoorSecret.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Rotate Secret
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GymQRPage;



