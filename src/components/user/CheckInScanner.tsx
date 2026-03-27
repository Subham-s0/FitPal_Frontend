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
  ScanLine,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { getApiErrorMessage } from "@/api/client";
import {
  checkOutMyCheckInApi,
  getMyCheckInsApi,
  scanMyCheckInApi,
} from "@/api/checkin.api";
import type { CheckInStatus, GymCheckInResponse } from "@/models/checkin.model";

interface CheckInScannerProps {
  onBack?: () => void;
}

type ScannerMode = "qr" | "image";
type DisplayStatus = CheckInStatus | "READY";
type FeedbackTone = "success" | "warning" | "error" | "info";

interface ActionFeedback {
  tone: FeedbackTone;
  title: string;
  detail: string | null;
}

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

const CheckInScanner: React.FC<CheckInScannerProps> = ({ onBack }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scannerMode, setScannerMode] = useState<ScannerMode>("qr");
  const [showScanner, setShowScanner] = useState(false);
  const [mirrored, setMirrored] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [activeDurationSeconds, setActiveDurationSeconds] = useState(0);

  const checkInsQuery = useQuery({
    queryKey: ["check-ins"],
    queryFn: getMyCheckInsApi,
  });

  const checkIns = checkInsQuery.data ?? [];
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
      queryClient.invalidateQueries({ queryKey: ["check-ins"] }),
      queryClient.invalidateQueries({ queryKey: ["check-in-history"] }),
      queryClient.invalidateQueries({ queryKey: ["check-in-history-summary"] }),
    ]);
  }

  const scanMutation = useMutation({
    mutationFn: async (qrToken: string) => {
      const coordinates = await getCurrentCoordinates();
      return scanMyCheckInApi({
        qrToken,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        deviceInfo: buildDeviceInfo(),
      });
    },
    onSuccess: async (response) => {
      setActionFeedback(toFeedback(response));
      setScannerError(null);
      setShowScanner(false);
      await refreshCheckInQueries();
    },
    onError: (error) => {
      setActionFeedback({
        tone: "error",
        title: "Scan Failed",
        detail: getApiErrorMessage(error, "Unable to verify the QR code."),
      });
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

  const handleTokenDetected = async (qrToken: string) => {
    if (!qrToken || scanMutation.isPending || checkOutMutation.isPending) {
      return;
    }

    await scanMutation.mutateAsync(qrToken);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadedFileName(file.name);

    try {
      const qrToken = await decodeQrTokenFromImage(file);
      await handleTokenDetected(qrToken);
    } catch (error) {
      setActionFeedback({
        tone: "error",
        title: "Upload Failed",
        detail: getApiErrorMessage(error, "Unable to read a QR code from that image."),
      });
    }
  };

  const statusSubtext =
    latestVisit?.status === "DENIED"
      ? formatEnumLabel(latestVisit.denyReason ?? latestVisit.status)
      : actionFeedback?.detail;

  return (
    <div className="w-full h-full text-white font-sans">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
              Member <span className="text-gradient-fire">Check-In</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mt-2">
              Access the gym
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl border border-orange-600/25 bg-orange-600/5 text-orange-600 text-[11px] font-bold uppercase tracking-wider hover:bg-orange-600/10 transition-all"
          >
            View Recents
          </button>
        </div>

        {(checkInsQuery.error || scannerError) && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-200">
            {scannerError ?? getApiErrorMessage(checkInsQuery.error, "Unable to load your current check-in status.")}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            <div className="bg-[#111] border border-white/5 rounded-[20px] overflow-hidden">
              <div className="p-6 pb-0">
                <div className="flex gap-2 border-b border-white/5 mb-6 relative">
                  {showScanner && scannerMode === "qr" && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-500">
                        LIVE
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setScannerMode("qr");
                      setShowScanner(false);
                    }}
                    className={`flex-1 px-6 py-4 border-b-2 transition-all text-sm font-extrabold uppercase tracking-wider ${
                      scannerMode === "qr"
                        ? "border-orange-600 text-orange-600"
                        : "border-transparent text-white/40 hover:text-white/60"
                    }`}
                  >
                    <QrCode className="inline-block w-4 h-4 mr-2 align-middle" />
                    QR Scanner
                  </button>
                  <button
                    onClick={() => {
                      setScannerMode("image");
                      setShowScanner(false);
                    }}
                    className={`flex-1 px-6 py-4 border-b-2 transition-all text-sm font-extrabold uppercase tracking-wider ${
                      scannerMode === "image"
                        ? "border-orange-600 text-orange-600"
                        : "border-transparent text-white/40 hover:text-white/60"
                    }`}
                  >
                    <FileImage className="inline-block w-4 h-4 mr-2 align-middle" />
                    QR Image
                  </button>
                </div>
              </div>

              <div className="p-6 pt-0">
                {scannerMode === "qr" ? (
                  <>
                    <div className="relative rounded-2xl overflow-hidden bg-[#080808] border border-white/5 aspect-video flex items-center justify-center">
                      {!showScanner ? (
                        <div className="flex flex-col items-center gap-5 p-12 text-center">
                          <div className="w-24 h-24 rounded-3xl bg-orange-600/7 border-2 border-orange-600/18 flex items-center justify-center animate-pulse">
                            <QrCode className="w-12 h-12 text-orange-600/55" />
                          </div>
                          <div>
                            <p className="text-base font-bold mb-2">Ready to scan a gym QR</p>
                            <p className="text-sm text-white/40">
                              Open the camera and point it at the gym&apos;s QR code.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Scanner
                            onScan={(detectedCodes) => {
                              const qrToken = detectedCodes[0]?.rawValue?.trim();
                              if (!qrToken) {
                                return;
                              }

                              void handleTokenDetected(qrToken);
                            }}
                            onError={(error) => {
                              setScannerError(getApiErrorMessage(error, "Camera access failed."));
                              setShowScanner(false);
                            }}
                            paused={scanMutation.isPending || checkOutMutation.isPending}
                            scanDelay={800}
                            sound={false}
                            constraints={{ facingMode: "environment" }}
                            styles={{
                              container: { width: "100%", height: "100%" },
                              video: {
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                transform: mirrored ? "scaleX(-1)" : undefined,
                              },
                            }}
                            classNames={{ container: "w-full h-full", video: "w-full h-full object-cover" }}
                          >
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-orange-600 rounded-tl-[10px]" />
                              <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-orange-600 rounded-tr-[10px]" />
                              <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-orange-600 rounded-bl-[10px]" />
                              <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-orange-600 rounded-br-[10px]" />
                              <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-orange-600/95 to-transparent shadow-[0_0_18px_rgba(255,153,0,0.8)] animate-[scan-beam_1.8s_ease-in-out_infinite]" />
                            </div>
                          </Scanner>

                          {scanMutation.isPending && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur flex flex-col items-center justify-center gap-4">
                              <div className="relative w-20 h-20">
                                <div className="absolute inset-0 rounded-full border-2 border-orange-600/12" />
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-600 animate-spin" />
                                <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-orange-600" />
                              </div>
                              <p className="text-[11px] font-extrabold uppercase tracking-widest text-orange-600">
                                Verifying Access...
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-4 flex gap-3">
                      {!showScanner ? (
                        <button
                          onClick={() => {
                            setScannerError(null);
                            setShowScanner(true);
                          }}
                          className="flex-1 px-6 py-5 rounded-xl bg-gradient-to-r from-[#FACC15] via-[#FF9900] to-[#FF6A00] text-white text-sm font-extrabold uppercase tracking-wider hover:shadow-[0_10px_32px_rgba(255,153,0,0.55)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
                        >
                          <Camera className="w-4 h-4" /> Activate Scanner
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowScanner(false)}
                            className="flex-1 px-6 py-5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-sm font-extrabold uppercase tracking-wider"
                          >
                            <X className="w-4 h-4" /> Close Scanner
                          </button>
                          <button
                            onClick={() => setMirrored((current) => !current)}
                            title="Flip camera horizontally"
                            className="w-14 px-0 py-5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all flex items-center justify-center"
                          >
                            <FlipHorizontal className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-2xl border-2 border-dashed border-orange-600/25 bg-orange-600/3 p-12 text-center transition-all hover:border-orange-600/45 hover:bg-orange-600/6"
                    >
                      <span className="inline-flex w-24 h-24 rounded-3xl bg-orange-600/7 border-2 border-orange-600/18 items-center justify-center mb-5 animate-pulse">
                        <Upload className="w-12 h-12 text-orange-600/55" />
                      </span>
                      <p className="text-base font-bold mb-3">Upload a QR image</p>
                      <p className="text-sm text-white/40 mb-2">
                        Choose a QR screenshot or photo and FitPal will extract the token in the browser.
                      </p>
                      <p className="text-xs text-white/30">Supported: JPG, PNG, WebP</p>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />

                    {uploadedFileName ? (
                      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
                        <div className="flex items-center gap-3">
                          <FileImage className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          <div>
                            <p className="text-[11px] font-semibold">{uploadedFileName}</p>
                            <p className="text-[9px] text-white/30 mt-0.5">
                              The token is decoded client-side and sent through the normal scan endpoint.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div
              className="relative p-5 rounded-[18px] border overflow-hidden"
              style={{
                borderColor: statusConfig.border,
                backgroundColor: statusConfig.bg,
              }}
            >
              <div
                className="absolute -top-12 -right-12 w-36 h-36 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${statusConfig.color}14, transparent 70%)`,
                }}
              />
              <div className="flex items-center gap-2 mb-4">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    displayStatus === "ACCESS_PENDING" || displayStatus === "CHECKED_IN" ? "animate-pulse" : ""
                  }`}
                  style={{
                    backgroundColor: statusConfig.color,
                    boxShadow: `0 0 7px ${statusConfig.color}`,
                  }}
                />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: statusConfig.color }}>
                  {statusConfig.label}
                </span>
                {currentTier ? (
                  <span
                    className="ml-auto px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border"
                    style={{
                      color: currentTier.color,
                      borderColor: currentTier.border,
                      backgroundColor: currentTier.bg,
                    }}
                  >
                    {currentTier.label}
                  </span>
                ) : null}
              </div>

              {displayStatus === "READY" && (
                <div className="text-center py-4">
                  <div className="inline-flex w-14 h-14 rounded-2xl bg-orange-600/7 border-2 border-orange-600/14 items-center justify-center mx-auto mb-3 animate-pulse">
                    <QrCode className="w-7 h-7 text-orange-600/55" />
                  </div>
                  <p className="text-[13px] font-bold text-white/55 mb-1">No active session</p>
                  <p className="text-[11px] text-white/30">Scan a gym QR to start</p>
                </div>
              )}

              {latestVisit?.gymName && displayStatus === "ACCESS_PENDING" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-yellow-500" />
                    <p className="text-[17px] font-black">{latestVisit.gymName}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/4 mb-2">
                    <p className="text-[11px] text-white/55 leading-relaxed">
                      Waiting for door confirmation. Stay near the entrance or rescan if the gym asks you to retry.
                    </p>
                  </div>
                  <p className="text-[11px] text-white/30 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Started {formatTime(latestVisit.checkInAt)}
                  </p>
                </div>
              )}

              {latestVisit?.gymName && displayStatus === "CHECKED_IN" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-[17px] font-black">{latestVisit.gymName}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/4 mb-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-green-500/55 mb-1.5">
                      Session Time
                    </p>
                    <p className="text-[40px] font-black text-green-500 leading-none tracking-tight font-mono">
                      {formatDuration(activeDurationSeconds)}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1.5">
                      In since {formatTime(latestVisit.checkInAt)}
                    </p>
                  </div>
                </div>
              )}

              {latestVisit?.gymName && displayStatus === "CHECKED_OUT" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-[17px] font-black">{latestVisit.gymName}</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <div>
                      <p className="text-[9px] font-extrabold uppercase text-white/30 mb-1">In</p>
                      <p className="text-[13px] font-bold">{formatTime(latestVisit.checkInAt)}</p>
                    </div>
                    <div className="w-px bg-white/7" />
                    <div>
                      <p className="text-[9px] font-extrabold uppercase text-white/30 mb-1">Out</p>
                      <p className="text-[13px] font-bold">
                        {latestVisit.checkOutAt ? formatTime(latestVisit.checkOutAt) : "--"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {displayStatus === "DENIED" && (
                <div>
                  <div className="inline-flex w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 items-center justify-center mb-3">
                    <XCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="text-[13px] font-bold text-red-200 mb-1">Last scan was denied</p>
                  <p className="text-[11px] text-white/40">
                    {formatEnumLabel(latestVisit?.denyReason ?? latestVisit?.status) ?? "Retry the scan when you are ready."}
                  </p>
                </div>
              )}
            </div>

            {actionFeedback ? (
              <div className={`rounded-2xl border px-4 py-3 ${FEEDBACK_ACCENT[actionFeedback.tone]}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">{actionFeedback.title}</p>
                {actionFeedback.detail ? (
                  <p className="mt-1 text-sm text-white/80">{actionFeedback.detail}</p>
                ) : null}
              </div>
            ) : null}

            <div className="p-5 rounded-2xl border border-white/6 bg-white/[0.015]">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-3">Actions</p>
              <div className="space-y-2.5">
                {(displayStatus === "READY" || displayStatus === "DENIED" || displayStatus === "CHECKED_OUT") && (
                  <button
                    onClick={() => {
                      setScannerMode("qr");
                      setScannerError(null);
                      setShowScanner(true);
                    }}
                    disabled={isBusy}
                    className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#FACC15] via-[#FF9900] to-[#FF6A00] text-white text-xs font-extrabold uppercase tracking-wider hover:shadow-[0_10px_32px_rgba(255,153,0,0.55)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                    Scan Gym QR
                  </button>
                )}

                {displayStatus === "ACCESS_PENDING" && (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-yellow-500/18 bg-yellow-500/4">
                      <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin flex-shrink-0" />
                      <span className="text-[11px] font-bold text-white/50">
                        Waiting for the gym door confirmation...
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setScannerMode("qr");
                        setScannerError(null);
                        setShowScanner(true);
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-yellow-500/22 text-yellow-500 text-[11px] font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3 h-3" /> Scan Again
                    </button>
                  </>
                )}

                {displayStatus === "CHECKED_IN" && latestVisit?.checkInId && (
                  <button
                    onClick={() => checkOutMutation.mutate(latestVisit.checkInId)}
                    disabled={checkOutMutation.isPending}
                    className="w-full px-6 py-4 rounded-xl border border-red-500/35 bg-red-500/8 text-red-500 text-xs font-extrabold uppercase tracking-wider hover:bg-red-500/15 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="p-3.5 rounded-xl border border-red-500/16 bg-red-500/4">
              <div className="flex gap-2 items-center text-red-500 mb-1.5">
                <AlertCircle className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-wider">Access Rules</span>
              </div>
              <p className="text-[11px] text-white/45 leading-relaxed">
                Location is attached when available. If a gym uses radius checks, enable location permission before scanning.
              </p>
            </div>

            {statusSubtext ? (
              <div className="p-3.5 rounded-xl border border-white/8 bg-white/[0.02]">
                <div className="flex gap-2 items-center text-white/70 mb-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Last Result</span>
                </div>
                <p className="text-[11px] text-white/55 leading-relaxed">{statusSubtext}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-beam {
          0%, 100% { top: 16px; }
          50% { top: calc(100% - 16px); }
        }
      `}</style>
    </div>
  );
};

export default CheckInScanner;
