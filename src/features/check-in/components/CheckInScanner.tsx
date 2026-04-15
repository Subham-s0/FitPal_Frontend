import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Scanner } from "@yudiel/react-qr-scanner";
import { BrowserMultiFormatReader } from "@zxing/library";
import {
  AlertCircle,
  Camera,
  Clock,
  FileImage,
  FlipHorizontal,
  Loader2,
  LogOut,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/client";
import {
  checkOutMyCheckInApi,
  getMyCheckInsApi,
  scanMyCheckInApi,
} from "@/features/check-in/api";
import { checkInQueryKeys } from "@/features/check-in/queryKeys";
import { dashboardQueryKeys } from "@/features/user-dashboard/api";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import type { CheckInStatus, GymCheckInResponse } from "@/features/check-in/model";

interface CheckInScannerProps {
  onBack?: () => void;
}

type ScannerMode = "qr" | "image";
type DisplayStatus = CheckInStatus | "READY";
type FeedbackTone = "success" | "warning" | "error" | "info";
type ScanStateTone = "neutral" | FeedbackTone;
type ScanStatePhase = "idle" | "active" | "reading" | "verifying" | "result" | "error";

interface ActionFeedback {
  tone: FeedbackTone;
  title: string;
  detail: string | null;
}

interface InlineScanState {
  source: ScannerMode;
  phase: ScanStatePhase;
  tone: ScanStateTone;
  title: string;
  detail: string;
}

const EMPTY_CHECK_INS: GymCheckInResponse[] = [];

const TIER = {
  BASIC: { color: "#4ade80", border: "rgba(74,222,128,0.3)", bg: "rgba(74,222,128,0.1)", label: "Basic" },
  PRO: { color: "#FF9900", border: "rgba(255,153,0,0.3)", bg: "rgba(255,153,0,0.1)", label: "Pro" },
  ELITE: { color: "#60a5fa", border: "rgba(96,165,250,0.3)", bg: "rgba(96,165,250,0.1)", label: "Elite" },
} as const;

const STATUS_CONFIG: Record<
  DisplayStatus,
  { color: string; label: string; bg: string; border: string }
> = {
  READY: {
    color: "#6b7280",
    label: "Ready To Scan",
    bg: "rgba(107,114,128,0.12)",
    border: "rgba(107,114,128,0.25)",
  },
  ACCESS_PENDING: {
    color: "#FACC15",
    label: "Access Pending",
    bg: "rgba(250,204,21,0.10)",
    border: "rgba(250,204,21,0.28)",
  },
  CHECKED_IN: {
    color: "#4ade80",
    label: "Checked In",
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.28)",
  },
  CHECKED_OUT: {
    color: "#60a5fa",
    label: "Checked Out",
    bg: "rgba(96,165,250,0.10)",
    border: "rgba(96,165,250,0.28)",
  },
  DENIED: {
    color: "#f87171",
    label: "Access Denied",
    bg: "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.28)",
  },
};

const FEEDBACK_ACCENT: Record<FeedbackTone, string> = {
  success: "text-green-400 border-green-500/20 bg-green-500/6",
  warning: "text-yellow-300 border-yellow-500/20 bg-yellow-500/6",
  error: "text-red-300 border-red-500/20 bg-red-500/6",
  info: "text-blue-300 border-blue-500/20 bg-blue-500/6",
};

const SCAN_STATE_ACCENT: Record<
  ScanStateTone,
  { card: string; icon: string; label: string; chip: string }
> = {
  neutral: {
    card: "border-white/8 bg-white/[0.02]",
    icon: "border-white/10 bg-white/[0.04] text-white/60",
    label: "text-white/35",
    chip: "border-white/10 bg-white/[0.04] text-white/55",
  },
  info: {
    card: "border-orange-500/20 bg-orange-500/[0.05]",
    icon: "border-orange-500/20 bg-orange-500/10 text-orange-400",
    label: "text-orange-300/75",
    chip: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  },
  success: {
    card: "border-green-500/20 bg-green-500/[0.05]",
    icon: "border-green-500/20 bg-green-500/10 text-green-400",
    label: "text-green-300/75",
    chip: "border-green-500/20 bg-green-500/10 text-green-300",
  },
  warning: {
    card: "border-yellow-500/20 bg-yellow-500/[0.05]",
    icon: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    label: "text-yellow-200/80",
    chip: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
  },
  error: {
    card: "border-red-500/20 bg-red-500/[0.05]",
    icon: "border-red-500/20 bg-red-500/10 text-red-300",
    label: "text-red-200/80",
    chip: "border-red-500/20 bg-red-500/10 text-red-200",
  },
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildDeviceInfo() {
  if (typeof navigator === "undefined") {
    return null;
  }

  return navigator.userAgent.slice(0, 500);
}

function getOpenVisit(checkIns: GymCheckInResponse[]) {
  return checkIns.find((checkIn) => checkIn.status === "CHECKED_IN" || checkIn.status === "ACCESS_PENDING") ?? null;
}

async function getCurrentCoordinates() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { latitude: null, longitude: null };
  }

  return new Promise<{ latitude: number | null; longitude: number | null }>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve({ latitude: null, longitude: null }),
      {
        enableHighAccuracy: true,
        timeout: 8_000,
        maximumAge: 30_000,
      }
    );
  });
}

async function decodeQrTokenFromImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only QR image files are supported right now.");
  }

  const objectUrl = URL.createObjectURL(file);
  const reader = new BrowserMultiFormatReader();

  try {
    const result = await reader.decodeFromImageUrl(objectUrl);
    return result.getText();
  } finally {
    reader.reset();
    URL.revokeObjectURL(objectUrl);
  }
}

function toFeedback(response: GymCheckInResponse): ActionFeedback {
  if (response.status === "CHECKED_IN") {
    return {
      tone: "success",
      title: "Access Granted",
      detail: response.message ?? formatEnumLabel(response.status),
    };
  }

  if (response.status === "ACCESS_PENDING") {
    return {
      tone: "warning",
      title: "Door Confirmation Pending",
      detail: response.message ?? formatEnumLabel(response.status),
    };
  }

  if (response.status === "DENIED") {
    return {
      tone: "error",
      title: "Access Denied",
      detail: formatEnumLabel(response.denyReason ?? response.status),
    };
  }

  return {
    tone: "info",
    title: "Session Updated",
    detail: response.message ?? null,
  };
}

function getIdleScanState(source: ScannerMode): InlineScanState {
  if (source === "qr") {
    return {
      source,
      phase: "idle",
      tone: "neutral",
      title: "Scanner idle",
      detail: "Activate the camera to start scanning a gym QR code.",
    };
  }

  return {
    source,
    phase: "idle",
    tone: "neutral",
    title: "Image upload idle",
    detail: "Choose a QR image and FitPal will decode it before verifying access.",
  };
}

function getActiveCameraState(): InlineScanState {
  return {
    source: "qr",
    phase: "active",
    tone: "info",
    title: "Camera active",
    detail: "Waiting for a gym QR code. Hold your phone steady inside the frame.",
  };
}

function getReadingImageState(fileName: string): InlineScanState {
  return {
    source: "image",
    phase: "reading",
    tone: "info",
    title: "Reading QR image",
    detail: `Scanning ${fileName} for a gym QR code.`,
  };
}

function getVerifyingScanState(source: ScannerMode): InlineScanState {
  return {
    source,
    phase: "verifying",
    tone: "info",
    title: "Verifying access",
    detail:
      source === "qr"
        ? "QR detected. Checking your access with FitPal now."
        : "QR found in the image. Checking your access with FitPal now.",
  };
}

function toInlineScanState(source: ScannerMode, feedback: ActionFeedback): InlineScanState {
  return {
    source,
    phase: feedback.tone === "error" ? "error" : "result",
    tone: feedback.tone,
    title: feedback.title,
    detail:
      feedback.detail ??
      (feedback.tone === "success"
        ? "The scan completed successfully."
        : feedback.tone === "warning"
          ? "The scan completed, but it still needs a response."
          : feedback.tone === "error"
            ? "The scan could not be completed."
            : "The latest scanner action finished."),
  };
}

const CheckInScanner: React.FC<CheckInScannerProps> = ({ onBack }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scannerMode, setScannerMode] = useState<ScannerMode>("qr");
  const [showScanner, setShowScanner] = useState(false);
  const [mirrored, setMirrored] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [scanState, setScanState] = useState<InlineScanState>(() => getIdleScanState("qr"));
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [activeDurationSeconds, setActiveDurationSeconds] = useState(0);

  const checkInsQuery = useQuery({
    queryKey: checkInQueryKeys.lists(),
    queryFn: getMyCheckInsApi,
  });

  const checkIns = checkInsQuery.data ?? EMPTY_CHECK_INS;
  const openVisit = useMemo(() => getOpenVisit(checkIns), [checkIns]);
  const latestVisit = openVisit ?? checkIns[0] ?? null;
  const displayStatus: DisplayStatus = openVisit?.status ?? latestVisit?.status ?? "READY";
  const statusConfig = STATUS_CONFIG[displayStatus];
  const currentTier = latestVisit?.membershipTierAtCheckIn
    ? TIER[latestVisit.membershipTierAtCheckIn]
    : null;
  const isBusy = checkInsQuery.isLoading;

  useEffect(() => {
    if (!openVisit || openVisit.status !== "CHECKED_IN") {
      setActiveDurationSeconds(0);
      return;
    }

    const updateDuration = () => {
      const startedAt = new Date(openVisit.checkInAt).getTime();
      setActiveDurationSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    updateDuration();
    const intervalId = window.setInterval(updateDuration, 1_000);
    return () => window.clearInterval(intervalId);
  }, [openVisit]);

  async function refreshCheckInQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: checkInQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
    ]);

    await Promise.all([
      queryClient.refetchQueries({ queryKey: checkInQueryKeys.all, type: "all" }),
      queryClient.refetchQueries({ queryKey: dashboardQueryKeys.all, type: "all" }),
    ]);
  }

  const switchScannerMode = (mode: ScannerMode) => {
    setScannerMode(mode);
    setShowScanner(false);
    setActionFeedback(null);
    setUploadedFileName(null);
    setScanState(getIdleScanState(mode));
  };

  const activateScanner = () => {
    setScannerMode("qr");
    setShowScanner(true);
    setActionFeedback(null);
    setUploadedFileName(null);
    setScanState(getActiveCameraState());
  };

  const stopScanner = () => {
    setShowScanner(false);
    setScanState(getIdleScanState("qr"));
  };

  const scanMutation = useMutation({
    mutationFn: async ({ qrToken }: { qrToken: string; source: ScannerMode }) => {
      const coordinates = await getCurrentCoordinates();
      return scanMyCheckInApi({
        qrToken,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        deviceInfo: buildDeviceInfo(),
      });
    },
    onSuccess: async (response, variables) => {
      const feedback = toFeedback(response);
      setActionFeedback(feedback);
      setScanState(toInlineScanState(variables.source, feedback));
      setShowScanner(false);
      await refreshCheckInQueries();
    },
    onError: (error, variables) => {
      const feedback: ActionFeedback = {
        tone: "error",
        title: variables.source === "image" ? "Upload Failed" : "Scan Failed",
        detail: getApiErrorMessage(
          error,
          variables.source === "image"
            ? "Unable to verify the QR code from that image."
            : "Unable to verify the QR code."
        ),
      };
      setActionFeedback(feedback);
      setScanState(toInlineScanState(variables.source, feedback));
      setShowScanner(false);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (checkInId: string) => {
      const coordinates = await getCurrentCoordinates();
      return checkOutMyCheckInApi(checkInId, {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
    },
    onSuccess: async (response) => {
      setActionFeedback({
        tone: "info",
        title: "Checked Out",
        detail: response.message ?? "Your gym session has been closed.",
      });
      await refreshCheckInQueries();
    },
    onError: (error) => {
      setActionFeedback({
        tone: "error",
        title: "Check-Out Failed",
        detail: getApiErrorMessage(error, "Unable to check out right now."),
      });
    },
  });

  const handleTokenDetected = async (qrToken: string, source: ScannerMode) => {
    if (!qrToken || scanMutation.isPending || checkOutMutation.isPending) {
      return;
    }

    setScanState(getVerifyingScanState(source));
    await scanMutation.mutateAsync({ qrToken, source });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadedFileName(file.name);
    setActionFeedback(null);
    setShowScanner(false);
    setScanState(getReadingImageState(file.name));

    try {
      const qrToken = await decodeQrTokenFromImage(file);
      await handleTokenDetected(qrToken, "image");
    } catch (error) {
      const feedback: ActionFeedback = {
        tone: "error",
        title: "Upload Failed",
        detail: getApiErrorMessage(error, "Unable to read a QR code from that image."),
      };
      setActionFeedback(feedback);
      setScanState(toInlineScanState("image", feedback));
    }
  };

  const scanStateAccent = SCAN_STATE_ACCENT[scanState.tone];
  const scanSourceLabel = scanState.source === "qr" ? "QR Scanner" : "QR Image";
  const scanStateIcon =
    scanState.phase === "verifying" ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : scanState.phase === "active" ? (
      <Camera className="h-4 w-4" />
    ) : scanState.phase === "reading" ? (
      <FileImage className="h-4 w-4" />
    ) : scanState.phase === "error" ? (
      <AlertCircle className="h-4 w-4" />
    ) : scanState.tone === "warning" ? (
      <Clock className="h-4 w-4" />
    ) : scanState.tone === "success" ? (
      <ShieldCheck className="h-4 w-4" />
    ) : scanState.source === "qr" ? (
      <QrCode className="h-4 w-4" />
    ) : (
      <Upload className="h-4 w-4" />
    );

  const isLiveBadgeVerifying = scanMutation.isPending || scanState.phase === "verifying";
  const liveBadgeLabel = isLiveBadgeVerifying ? "Verifying" : "Camera Live";
  const liveBadgeTone = isLiveBadgeVerifying
    ? "border-orange-500/30 bg-black/70 text-orange-200 shadow-[0_0_20px_rgba(255,153,0,0.16)]"
    : "border-emerald-500/25 bg-black/70 text-emerald-100 shadow-[0_0_18px_rgba(74,222,128,0.12)]";
  const liveBadgeIcon = isLiveBadgeVerifying ? (
    <Loader2 className="h-3 w-3 animate-spin" />
  ) : (
    <Camera className="h-3 w-3" />
  );

  const renderScanStatePanel = (className = "") => (
    <div
      className={`${className} rounded-[1.25rem] border px-4 py-3 ${scanStateAccent.card}`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[1rem] border ${scanStateAccent.icon}`}>
          {scanStateIcon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${scanStateAccent.label}`}>
              Scan State
            </span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${scanStateAccent.chip}`}>
              {scanSourceLabel}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-bold leading-tight text-white">{scanState.title}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-white/70">{scanState.detail}</p>
        </div>
      </div>
    </div>
  );

  return (
    <UserSectionShell
      title={
        <>
          Member <span className="text-gradient-fire">Check-In</span>
        </>
      }
      description="Scan QR and manage access."
      actions={
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-[hsla(30,100%,50%,0.2)] bg-[hsla(30,100%,50%,0.1)] px-3 py-1.5 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-orange-500 backdrop-blur-xl transition-all duration-200 hover:border-[hsla(30,100%,50%,0.35)] hover:bg-[hsla(30,100%,50%,0.14)] hover:text-white active:scale-95"
        >
          View Recents
        </button>
      }
      headerClassName="!flex-row !mb-4 !text-left justify-between items-center"
      bodyClassName="space-y-0"
      titleClassName="tracking-tighter !text-xl sm:!text-2xl"
    >
      <div className="flex h-full flex-col gap-3 overflow-hidden font-sans text-white">

        {/* Main grid — fills remaining height */}
        <div className="grid grid-cols-1 gap-3 flex-1 min-h-0 lg:grid-cols-[minmax(0,1.18fr)_300px] xl:grid-cols-[minmax(0,1.28fr)_320px]">
          {/* ── Left column: scanner ── */}
          <div className="flex flex-col gap-2 min-h-0 overflow-y-auto">
            <div className="bg-[#111] border border-white/5 rounded-[1.75rem] flex flex-col min-h-0 overflow-hidden">
              <div className="flex w-full flex-1 flex-col">
                {/* Tab bar */}
                <div className="px-3 pt-3 flex-shrink-0">
                  <div className="flex gap-2 border-b border-white/5 mb-2">
                    <button
                      onClick={() => switchScannerMode("qr")}
                      className={`flex-1 rounded-t-[1rem] px-3 py-2 border-b-2 transition-all duration-200 text-[11px] font-extrabold uppercase tracking-wider ${
                        scannerMode === "qr"
                          ? "border-orange-600 bg-orange-500/[0.07] text-orange-500"
                          : "border-transparent text-white/40 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/70"
                      }`}
                    >
                      <QrCode className="inline-block w-3.5 h-3.5 mr-1.5 align-middle" />
                      QR Scanner
                    </button>
                    <button
                      onClick={() => switchScannerMode("image")}
                      className={`flex-1 rounded-t-[1rem] px-3 py-2 border-b-2 transition-all duration-200 text-[11px] font-extrabold uppercase tracking-wider ${
                        scannerMode === "image"
                          ? "border-orange-600 bg-orange-500/[0.07] text-orange-500"
                          : "border-transparent text-white/40 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/70"
                      }`}
                    >
                      <FileImage className="inline-block w-3.5 h-3.5 mr-1.5 align-middle" />
                      QR Image
                    </button>
                  </div>
                </div>

                {/* Scanner body */}
                <div className="px-3 pb-3 flex flex-col gap-3 flex-1 min-h-0">
                  {scannerMode === "qr" ? (
                    <>
                      {/* Camera viewport */}
                          <div className="relative mx-auto h-[30rem] w-full sm:h-[30rem] lg:h-[26rem] lg:w-[96%] xl:h-[30rem] xl:w-[94%] rounded-[1.5rem] overflow-hidden bg-[#080808] border border-white/5 flex-shrink-0 flex items-center justify-center">
                        {!showScanner ? (
                          <div className="flex flex-col items-center gap-3 p-4 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-orange-600/18 bg-orange-600/[0.05] shadow-[0_0_30px_rgba(255,153,0,0.08)]">
                              <QrCode className="h-7 w-7 text-orange-500/70" />
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-white/90">Ready to scan a gym QR</p>
                              <p className="mt-1 text-[10px] text-white/40">
                                Open the camera and point it at the gym&apos;s QR code.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Scanner
                              onScan={(detectedCodes) => {
                                const qrToken = detectedCodes[0]?.rawValue?.trim();
                                if (!qrToken) return;
                                void handleTokenDetected(qrToken, "qr");
                              }}
                              onError={(error) => {
                                const feedback: ActionFeedback = {
                                  tone: "error",
                                  title: "Camera Access Failed",
                                  detail: getApiErrorMessage(error, "Camera access failed."),
                                };
                                setActionFeedback(feedback);
                                setScanState(toInlineScanState("qr", feedback));
                                setShowScanner(false);
                              }}
                              paused={checkOutMutation.isPending}
                              scanDelay={800}
                              sound={false}
                              constraints={{ facingMode: "environment" }}
                              styles={{
                                container: {
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor: "#000",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                },
                                video: {
                                  width: "auto",
                                  height: "100%",
                                  maxWidth: "100%",
                                  objectFit: "contain",
                                  borderRadius: "1.25rem",
                                  transform: mirrored ? "scaleX(-1)" : undefined,
                                },
                              }}
                              classNames={{
                                container:
                                  "flex h-full w-full items-center justify-center overflow-hidden rounded-[1.5rem] bg-black ring-1 ring-inset ring-orange-600/15",
                                video: "h-full w-auto max-w-full rounded-[1.25rem] object-contain bg-transparent",
                              }}
                            >
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-orange-600 rounded-tl-[10px]" />
                                <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-orange-600 rounded-tr-[10px]" />
                                <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-orange-600 rounded-bl-[10px]" />
                                <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-orange-600 rounded-br-[10px]" />
                                <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-orange-600/95 to-transparent shadow-[0_0_14px_rgba(255,153,0,0.8)] animate-[scan-beam_1.8s_ease-in-out_infinite]" />
                              </div>
                            </Scanner>

                            <div className="absolute top-3 left-3 pointer-events-none">
                              <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] backdrop-blur-md ${liveBadgeTone}`}>
                                {liveBadgeIcon}
                                <span>{liveBadgeLabel}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {renderScanStatePanel()}

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        {!showScanner ? (
                          <button
                            onClick={activateScanner}
                            className="flex-1 px-3 py-2.5 rounded-[1.2rem] bg-gradient-to-r from-[#FACC15] via-[#FF9900] to-[#FF6A00] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-[0_3px_14px_rgba(249,115,22,0.22)] transition-all duration-200 hover:brightness-105 active:scale-[0.98] flex items-center justify-center gap-2"
                          >
                            <Camera className="w-3.5 h-3.5" /> Activate Scanner
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={stopScanner}
                              className="flex-1 px-3 py-2.5 rounded-[1.2rem] bg-white/5 border border-white/10 text-white/70 transition-all duration-200 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] flex items-center justify-center gap-2 text-[11px] font-extrabold uppercase tracking-wider"
                            >
                              <X className="w-3.5 h-3.5" /> Close Scanner
                            </button>
                            <button
                              onClick={() => setMirrored((c) => !c)}
                              title="Flip camera horizontally"
                              className="w-10 px-0 py-2.5 rounded-[1rem] bg-white/5 border border-white/10 text-white/70 transition-all duration-200 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] flex items-center justify-center"
                            >
                              <FlipHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Image upload mode */
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-[1.25rem] border-2 border-dashed border-orange-600/25 bg-orange-600/3 p-5 text-center transition-all hover:border-orange-600/45 hover:bg-orange-600/6"
                      >
                        <span className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-[1.25rem] border-2 border-orange-600/18 bg-orange-600/7">
                          <Upload className="h-7 w-7 text-orange-600/60" />
                        </span>
                        <p className="text-xs font-bold mb-1">Upload a QR image</p>
                        <p className="text-[10px] text-white/40 mb-1">
                          FitPal will extract the token in the browser.
                        </p>
                        <p className="text-[9px] text-white/30">Supported: JPG, PNG, WebP</p>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />

                      {uploadedFileName && (
                        <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.02] p-3">
                          <div className="flex items-center gap-2">
                            <FileImage className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-semibold">{uploadedFileName}</p>
                              <p className="text-[9px] text-white/30 mt-px">
                                Decoded client-side, sent through the scan endpoint.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {renderScanStatePanel()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column: status + actions ── */}
          <div className="flex flex-col gap-2 min-h-0 overflow-y-auto">
            {/* Query error — lives here, near the status panel */}
            {checkInsQuery.error && (
              <div className="flex-shrink-0 rounded-[1.25rem] border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-px" />
                <p className="text-[11px] text-red-200 leading-snug">
                  {getApiErrorMessage(checkInsQuery.error, "Unable to load your current check-in status.")}
                </p>
              </div>
            )}

            {/* Status card */}
            <div
              className="relative p-4 rounded-[1.75rem] border overflow-hidden flex-shrink-0"
              style={{
                borderColor: statusConfig.border,
                backgroundColor: statusConfig.bg,
              }}
            >
              <div
                className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${statusConfig.color}14, transparent 70%)`,
                }}
              />
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    displayStatus === "ACCESS_PENDING" || displayStatus === "CHECKED_IN" ? "animate-pulse" : ""
                  }`}
                  style={{
                    backgroundColor: statusConfig.color,
                    boxShadow: `0 0 6px ${statusConfig.color}`,
                  }}
                />
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: statusConfig.color }}>
                  {statusConfig.label}
                </span>
                {currentTier && (
                  <span
                    className="ml-auto px-2 py-px rounded-full text-[8px] font-extrabold uppercase tracking-wider border"
                    style={{
                      color: currentTier.color,
                      borderColor: currentTier.border,
                      backgroundColor: currentTier.bg,
                    }}
                  >
                    {currentTier.label}
                  </span>
                )}
              </div>

              {displayStatus === "READY" && (
                <div className="flex min-h-[170px] flex-col items-center justify-center text-center py-5">
                  <div className="relative inline-flex w-12 h-12 rounded-[1.25rem] bg-orange-600/7 border-2 border-orange-600/14 items-center justify-center mx-auto mb-2">
                    <div className="absolute inset-0 rounded-[1.25rem] border-2 border-orange-600/30 animate-ping" />
                    <div className="absolute inset-0 rounded-[1.25rem] bg-orange-600/5 animate-pulse" />
                    <QrCode className="relative w-6 h-6 text-orange-600/55" />
                  </div>
                  <p className="text-[13px] font-bold text-white/60 mb-1">No active session</p>
                  <p className="text-[10px] text-white/30">Scan a gym QR to start</p>
                </div>
              )}

              {latestVisit?.gymName && displayStatus === "ACCESS_PENDING" && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="w-3 h-3 text-yellow-500" />
                    <p className="text-[13px] font-black">{latestVisit.gymName}</p>
                  </div>
                  <div className="p-3 rounded-[1.25rem] border border-yellow-500/20 bg-yellow-500/4 mb-1">
                    <p className="text-[10px] text-white/55 leading-relaxed">
                      Waiting for door confirmation. Stay near the entrance or rescan if needed.
                    </p>
                  </div>
                  <p className="text-[9px] text-white/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Started {formatTime(latestVisit.checkInAt)}
                  </p>
                </div>
              )}

              {latestVisit?.gymName && displayStatus === "CHECKED_IN" && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="w-3 h-3 text-green-500" />
                    <p className="text-[13px] font-black">{latestVisit.gymName}</p>
                  </div>
                  <div className="p-3 rounded-[1.25rem] border border-green-500/20 bg-green-500/4 mb-1">
                    <p className="text-[7px] font-black uppercase tracking-widest text-green-500/55 mb-1">
                      Session Time
                    </p>
                    <p className="text-[26px] font-black text-green-500 leading-none tracking-tight font-mono">
                      {formatDuration(activeDurationSeconds)}
                    </p>
                    <p className="text-[9px] text-white/30 mt-0.5">
                      In since {formatTime(latestVisit.checkInAt)}
                    </p>
                  </div>
                </div>
              )}

              {latestVisit?.gymName && displayStatus === "CHECKED_OUT" && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    <p className="text-[13px] font-black">{latestVisit.gymName}</p>
                  </div>
                  <div className="flex gap-2.5 flex-wrap">
                    <div>
                      <p className="text-[8px] font-extrabold uppercase text-white/30 mb-0.5">In</p>
                      <p className="text-xs font-bold">{formatTime(latestVisit.checkInAt)}</p>
                    </div>
                    <div className="w-px bg-white/7" />
                    <div>
                      <p className="text-[8px] font-extrabold uppercase text-white/30 mb-0.5">Out</p>
                      <p className="text-xs font-bold">
                        {latestVisit.checkOutAt ? formatTime(latestVisit.checkOutAt) : "--"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {displayStatus === "DENIED" && (
                <div>
                  <div className="inline-flex w-10 h-10 rounded-[1rem] bg-red-500/10 border border-red-500/20 items-center justify-center mb-1.5">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <p className="text-xs font-bold text-red-200 mb-0.5">Last scan was denied</p>
                  <p className="text-[10px] text-white/40">
                    {formatEnumLabel(latestVisit?.denyReason ?? latestVisit?.status) ?? "Retry the scan when you are ready."}
                  </p>
                </div>
              )}
            </div>

            {/* Actions card */}
            <div className="p-4 rounded-[1.75rem] border border-white/6 bg-white/[0.015] flex-shrink-0">
              <p className="text-[7px] font-black uppercase tracking-widest text-white/25 mb-2">Actions</p>
              <div className="space-y-1.5">
                {(displayStatus === "READY" || displayStatus === "DENIED" || displayStatus === "CHECKED_OUT") && (
                  <button
                    onClick={activateScanner}
                    disabled={isBusy}
                    className="w-full px-3 py-2.5 rounded-[1.2rem] bg-gradient-to-r from-[#FACC15] via-[#FF9900] to-[#FF6A00] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-[0_3px_14px_rgba(249,115,22,0.22)] transition-all duration-200 hover:brightness-105 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                    Scan Gym QR
                  </button>
                )}

                {displayStatus === "ACCESS_PENDING" && (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-[1.25rem] border border-yellow-500/18 bg-yellow-500/4">
                      <Loader2 className="w-3 h-3 text-yellow-500 animate-spin flex-shrink-0" />
                      <span className="text-[10px] font-bold text-white/50">
                        Waiting for door confirmation...
                      </span>
                    </div>
                    <button
                      onClick={activateScanner}
                      className="w-full px-3 py-2 rounded-[1.2rem] bg-white/5 border border-yellow-500/22 text-yellow-500 text-[10px] font-bold transition-all duration-200 hover:bg-yellow-500/[0.08] hover:text-yellow-400 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3 h-3" /> Scan Again
                    </button>
                  </>
                )}

                {displayStatus === "CHECKED_IN" && latestVisit?.checkInId && (
                  <button
                    onClick={() => checkOutMutation.mutate(latestVisit.checkInId)}
                    disabled={checkOutMutation.isPending}
                    className="w-full px-3 py-2.5 rounded-[1.2rem] border border-red-500/35 bg-red-500/8 text-red-500 text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200 hover:bg-red-500/15 hover:text-red-400 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkOutMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Checking Out...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-3.5 h-3.5" />
                        Check Out
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Access rules notice */}
            <div className="p-3 rounded-[1.25rem] border border-red-500/16 bg-red-500/4 flex-shrink-0">
              <div className="flex gap-1.5 items-center text-red-500 mb-1">
                <AlertCircle className="w-3 h-3" />
                <span className="text-[7px] font-black uppercase tracking-wider">Access Rules</span>
              </div>
              <p className="text-[9px] text-white/45 leading-relaxed">
                Location is attached when available. Enable location permission before scanning if the gym uses radius checks.
              </p>
            </div>

            {/* Last result feedback */}
            {actionFeedback && (
              <div className={`rounded-[1.25rem] border p-3 flex-shrink-0 ${FEEDBACK_ACCENT[actionFeedback.tone]}`}>
                <div className="mb-1 flex gap-1.5 items-center">
                  <ShieldCheck className="w-3 h-3" />
                  <span className="text-[7px] font-black uppercase tracking-wider">Last Result</span>
                </div>
                <p className="text-[12px] font-bold text-white">{actionFeedback.title}</p>
                {actionFeedback.detail && (
                  <p className="mt-0.5 text-[10px] leading-relaxed text-white/70">{actionFeedback.detail}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-beam {
          0%, 100% { top: 12px; }
          50% { top: calc(100% - 12px); }
        }
      `}</style>
    </UserSectionShell>
  );
};

export default CheckInScanner;
