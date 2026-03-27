import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown, ArrowUp, ArrowUpDown,
  Camera, Check, CheckCircle,
  ChevronDown, Eye,
  Loader2, MoreHorizontal,
  RefreshCcw, RotateCcw, Save, Search,
  Shield, SlidersHorizontal,
  Trash2, X, XCircle, Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  getAdminGymReviewApi,
  getAdminGymStatusCountsApi,
  getAdminGymsApi,
  patchAdminGymAccessApi,
  patchAdminGymApprovalApi,
  patchAdminGymDocumentsApi,
  patchAdminGymLocationApi,
  patchAdminGymPhotoCaptionApi,
  patchAdminGymPayoutApi,
} from "@/api/admin-gym.api";
import { getApiErrorMessage } from "@/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  AdminGymReviewResponse,
  AdminGymSummaryResponse,
  GymPayoutProvider,
} from "@/models/admin-gym.model";
import type {
  AccessTier,
  GymApprovalStatus,
  GymDocumentResponse,
  GymDocumentStatus,
  GymPhotoResponse,
  GymProfileResponse,
} from "@/models/profile.model";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZES    = ["5", "10", "15"] as const;
const REQUIRED_DOCS = ["REGISTRATION_CERTIFICATE", "LICENSE"] as const;
const DEFAULT_MAP_CENTER: [number, number] = [27.7172, 85.324];
const DEFAULT_MAP_ZOOM = 15;
const EMPTY_MAP_ZOOM = 13;

// Using CSS variables from index.css for table theming:
// table-bg, table-bg-alt, table-bg-hover, table-bg-expanded
// table-border, table-border-row, table-border-cell
// table-text, table-text-muted, table-header-bg, table-input-bg, table-input-border

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};
const adminMapPin = L.divIcon({
  html: "<div style=\"width:14px;height:14px;background:#ff6a00;border-radius:9999px;border:3px solid #000;box-shadow:0 0 12px rgba(255,106,0,0.7)\"></div>",
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (n?: string | null) =>
    (n ?? "").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase() || "GY";

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const parseNum = (v: string): number | null => {
  const n = Number(v); return isNaN(n) ? null : n;
};

const parseOptionalNum = (v: string): number | null =>
    v.trim() === "" ? null : parseNum(v);

const hasCoordinates = (lat?: number | null, lng?: number | null): lat is number =>
    typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);

const normalizeCoordinate = (value: number) => Number(value.toFixed(4));

function cloneReview(r: AdminGymReviewResponse): AdminGymReviewResponse {
  return {
    profile: { ...r.profile },
    documents: r.documents.map(d => ({ ...d })),
    payoutAccounts: r.payoutAccounts.map(p => ({ ...p })),
    photos: r.photos.map(p => ({ ...p })),
  };
}

interface ResolvedWallet {
  provider: GymPayoutProvider;
  walletId: string;
  accountName: string;
  verified: boolean;
}

function resolveWallets(r: AdminGymReviewResponse): ResolvedWallet[] {
  return (["ESEWA", "KHALTI"] as GymPayoutProvider[]).flatMap(prov => {
    const fromArr = r.payoutAccounts.find(a => a.provider === prov);
    if (fromArr?.walletIdentifier && fromArr?.accountName) {
      return [{ provider: prov, walletId: fromArr.walletIdentifier, accountName: fromArr.accountName, verified: fromArr.verified }];
    }
    const wid  = prov === "ESEWA" ? r.profile.esewaWalletId   : r.profile.khaltiWalletId;
    const name = prov === "ESEWA" ? r.profile.esewaAccountName : r.profile.khaltiAccountName;
    const ver  = prov === "ESEWA" ? r.profile.esewaWalletVerified : r.profile.khaltiWalletVerified;
    if (wid && name) return [{ provider: prov, walletId: wid, accountName: name, verified: ver }];
    return [];
  });
}

function hasVerifiedPayout(r: AdminGymReviewResponse | null) {
  if (!r) return false;
  return resolveWallets(r).some(w => w.verified);
}

function hasRequiredApprovedDocs(r: AdminGymReviewResponse | null) {
  if (!r) return false;
  return REQUIRED_DOCS.every(t =>
      r.documents.some(d => d.documentType === t && d.status === "APPROVED")
  );
}

function getBlockers(r: AdminGymReviewResponse | null): string[] {
  if (!r) return ["Load the gym review before making a decision."];
  const b: string[] = [];
  if (!hasRequiredApprovedDocs(r))
    b.push("Registration certificate and operating license must both be approved.");
  if (!hasVerifiedPayout(r))
    b.push("At least one payout wallet must be verified.");
  if (!r.photos.length)
    b.push("At least one gym photo is required.");
  return b;
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
type SortKey = null | "name-asc" | "name-desc" | "date-asc" | "date-desc";
const SORTS: { key: SortKey; label: string; Icon: React.ElementType }[] = [
  { key: null,         label: "Sort",     Icon: ArrowUpDown },
  { key: "name-asc",  label: "Name A→Z", Icon: ArrowUp     },
  { key: "name-desc", label: "Name Z→A", Icon: ArrowDown   },
  { key: "date-asc",  label: "Oldest",   Icon: ArrowUp     },
  { key: "date-desc", label: "Newest",   Icon: ArrowDown   },
];
function sortGyms(list: AdminGymSummaryResponse[], key: SortKey) {
  if (!key) return list;
  const s = [...list];
  if (key === "name-asc")  return s.sort((a, b) => (a.gymName ?? "").localeCompare(b.gymName ?? ""));
  if (key === "name-desc") return s.sort((a, b) => (b.gymName ?? "").localeCompare(a.gymName ?? ""));
  const t = (g: AdminGymSummaryResponse) => new Date(g.registeredAt ?? 0).getTime();
  return s.sort((a, b) => key === "date-asc" ? t(a) - t(b) : t(b) - t(a));
}

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIERS: Record<string, { label: string; desc: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  BASIC: { label: "Basic", desc: "All members",      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/25",  Icon: Check  },
  PRO:   { label: "Pro",   desc: "Pro & Elite only", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", Icon: Zap    },
  ELITE: { label: "Elite", desc: "Elite only",       color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/25",   Icon: Shield },
};

// ─── Tiny atoms ───────────────────────────────────────────────────────────────
function ApprovalPill({ status }: { status: GymApprovalStatus }) {
  const m: Record<string, { label: string; dot: string; cls: string }> = {
    APPROVED:       { label: "Approved", dot: "bg-green-400",  cls: "bg-green-500/10  text-green-400  border-green-500/25"  },
    PENDING_REVIEW: { label: "Pending",  dot: "bg-yellow-400", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
    REJECTED:       { label: "Rejected", dot: "bg-red-400",    cls: "bg-red-500/10    text-red-400    border-red-500/25"    },
    DRAFT:          { label: "Draft",    dot: "bg-zinc-400",   cls: "bg-zinc-500/10   text-zinc-400   border-zinc-500/25"   },
  };
  const cfg = m[status] ?? m.DRAFT;
  return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
    </span>
  );
}

function DocDot({ status }: { status: GymDocumentStatus }) {
  return (
      <span className={`inline-block w-[7px] h-[7px] rounded-full flex-shrink-0 ${
          status === "APPROVED"       ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]"
              : status === "REJECTED"     ? "bg-red-400"
                  : "bg-yellow-400"
      }`} />
  );
}

function Tog({ on, onClick, disabled = false }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`relative w-9 h-5 rounded-full border flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${on ? "bg-green-500/20 border-green-500/30" : "bg-white/[0.07] border-white/15"}`}
      >
        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${on ? "left-[18px] bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "left-0.5 bg-white/30"}`} />
      </button>
  );
}

function DC({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
      <div className={`table-bg table-border border rounded-2xl p-[18px_20px] ${className}`}>
        {children}
      </div>
  );
}

function DCTitle({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-500 whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-orange-500/10 min-w-0" />
        {right && <span className="text-[9px] font-black table-text-muted font-mono flex-shrink-0 ml-1">{right}</span>}
      </div>
  );
}

function DI({ label, children }: { label: string; children: React.ReactNode }) {
  return (
      <div className="flex justify-between items-center py-[7px] border-b table-border-row last:border-0 gap-2 min-w-0">
        <span className="text-[11px] table-text-muted font-medium flex-shrink-0 pr-2">{label}</span>
        <span className="text-[11px] font-semibold text-white text-right break-words min-w-0">{children}</span>
      </div>
  );
}

function DIInput({ value, onChange, type = "text", step }: {
  value: string | number; onChange: (v: string) => void;
  type?: string; step?: string;
}) {
  return (
      <input
          type={type} step={step} value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          className="px-[9px] py-[5px] table-input-bg table-input-border border rounded-lg text-white text-[11px] text-right outline-none focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)] transition-all w-full max-w-[160px]"
      />
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
interface AdminLocationMapProps {
  gymId: number;
  latitude: number | null;
  longitude: number | null;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
}

function AdminLocationMap({
  gymId,
  latitude,
  longitude,
  onCoordinatesChange,
}: AdminLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);

  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const center = hasCoordinates(latitude, longitude)
        ? [latitude, longitude] as [number, number]
        : DEFAULT_MAP_CENTER;
    const zoom = hasCoordinates(latitude, longitude) ? DEFAULT_MAP_ZOOM : EMPTY_MAP_ZOOM;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView(center, zoom);

    // ── FIX 1: contain Leaflet's stacking context to this component ──────────
    // Leaflet (ES module import) writes z-index 200/300/400 onto its internal
    // pane divs globally. Without isolation these panes float above the sidebar
    // and swallow the mouseleave event that collapses it.
    const container = map.getContainer();
    container.style.isolation = "isolate";
    container.style.zIndex    = "0";

    // ── FIX 2: make tile layer non-interactive so pointer events pass through ─
    // The tile pane sits at z-index 200 and captures every mousemove over the
    // map area. Setting pointer-events:none on the tile container lets those
    // events reach the layout beneath (sidebar hover boundary) while still
    // rendering tiles correctly. Marker and controls are unaffected.
    const tileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const tileContainer = tileLayer.getContainer();
    if (tileContainer) {
      tileContainer.style.pointerEvents = "none";
    }

    const marker = L.marker(center, {
      draggable: true,
      icon: adminMapPin,
    }).addTo(map);

    marker.on("dragend", () => {
      const next = marker.getLatLng();
      onCoordinatesChangeRef.current(normalizeCoordinate(next.lat), normalizeCoordinate(next.lng));
    });

    map.on("click", (event: L.LeafletMouseEvent) => {
      const next = event.latlng;
      marker.setLatLng(next);
      onCoordinatesChangeRef.current(normalizeCoordinate(next.lat), normalizeCoordinate(next.lng));
    });

    mapRef.current = map;
    markerRef.current = marker;

    const invalidate = () => map.invalidateSize();
    const timeouts = [0, 150, 400].map(delay => window.setTimeout(invalidate, delay));

    return () => {
      timeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [gymId]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) {
      return;
    }

    const center = hasCoordinates(latitude, longitude)
        ? [latitude, longitude] as [number, number]
        : DEFAULT_MAP_CENTER;
    const zoom = hasCoordinates(latitude, longitude) ? DEFAULT_MAP_ZOOM : EMPTY_MAP_ZOOM;

    markerRef.current.setLatLng(center);
    mapRef.current.setView(center, zoom, { animate: false });
    mapRef.current.invalidateSize();
  }, [latitude, longitude]);

  return (
      // ── FIX 3: overflow:hidden + isolation on the React container div ───────
      // overflow:hidden contains Leaflet's absolutely-positioned pane children
      // so they cannot bleed outside this element's bounds.
      // isolation:isolate creates a new stacking context, trapping any z-index
      // values Leaflet writes inside this subtree — they no longer compete with
      // the sidebar in the global stacking order.
      <div
          ref={containerRef}
          id={`gym-location-map-${gymId}`}
          className="w-full rounded-[11px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)]"
          style={{
            height: "220px",
            minHeight: "220px",
            zIndex: 0,
            overflow: "hidden",    // contains Leaflet pane children
            isolation: "isolate",  // traps z-indexes inside this stacking context
          }}
      />
  );
}

interface DetailProps {
  gymId: number;
  approvalStatus: GymApprovalStatus;
  registeredAt?: string | null;
  draftReview: AdminGymReviewResponse | null;
  isLoading: boolean;
  isMutating: boolean;
  onUpdateProfile: <K extends keyof GymProfileResponse>(k: K, v: GymProfileResponse[K]) => void;
  onUpdateDocStatus: (docId: number, s: GymDocumentStatus) => void;
  onUpdatePayoutVerified: (prov: GymPayoutProvider, v: boolean) => void;
  onUpdatePhotoCaption: (photoId: number, caption: string) => void;
  onSaveLocation: () => void;
  onSaveAccess: () => void;
  onSaveDocuments: () => void;
  onSavePayout: () => void;
  onSavePhotoCaption: (p: GymPhotoResponse) => void;
  onViewProfile: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function DetailPanel({
                       gymId, approvalStatus, registeredAt, draftReview: r, isLoading, isMutating,
                       onUpdateProfile, onUpdateDocStatus, onUpdatePayoutVerified, onUpdatePhotoCaption,
                       onSaveLocation, onSaveAccess, onSaveDocuments, onSavePayout, onSavePhotoCaption,
                       onViewProfile,
                       onApprove, onReject,
                     }: DetailProps) {
  if (isLoading || !r) {
    return (
        <div className="bg-[hsl(0,0%,6%)] flex items-center justify-center py-12 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
          <span className="text-[12px] text-[hsl(0,0%,35%)]">Loading review…</span>
        </div>
    );
  }

  const p       = r.profile;
  const docs    = r.documents;
  const photos  = r.photos;
  const wallets = resolveWallets(r);
  const blockers = getBlockers(r);

  const approvedDocs = docs.filter(d => d.status === "APPROVED").length;
  const reqOk        = hasRequiredApprovedDocs(r);
  const docPct       = docs.length ? Math.round(approvedDocs / docs.length * 100) : 0;
  const docBarCls    = reqOk ? "bg-green-400" : approvedDocs > 0 ? "bg-yellow-400" : "bg-red-400";

  const vWallets  = wallets.filter(w => w.verified).length;
  const hasPayout = hasVerifiedPayout(r);

  const coverSet = photos.some(ph => ph.cover);

  const tierKey = p.minimumAccessTier ?? "BASIC";
  const tier    = TIERS[tierKey] ?? TIERS.BASIC;
  const isApproved = approvalStatus === "APPROVED";
  const isPendingReview = approvalStatus === "PENDING_REVIEW";
  const isRejected = approvalStatus === "REJECTED";

  const [editMode, setEditMode] = useState(!isApproved);
  useEffect(() => {
    setEditMode(!isApproved);
  }, [gymId, isApproved]);

  const readOnlyApproved = isApproved && !editMode;

  const checklist = [
    { label: "Reg. Certificate approved",  ok: docs.find(d => d.documentType === "REGISTRATION_CERTIFICATE")?.status === "APPROVED" },
    { label: "Operating License approved", ok: docs.find(d => d.documentType === "LICENSE")?.status === "APPROVED"                   },
    { label: "Payout wallet verified",     ok: hasPayout                                                                               },
    { label: "Photos uploaded",            ok: photos.length > 0                                                                       },
  ];

  const SaveBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
      <button type="button" onClick={onClick} disabled={isMutating}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-[9px] rounded-[10px] text-white text-[10px] font-black uppercase tracking-wider transition-all hover:-translate-y-px disabled:opacity-50 shadow-[0_4px_16px_rgba(255,106,0,0.28)]"
              style={{ background: FIRE }}>
        {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        {label}
      </button>
  );

  const GhostBtn = ({ onClick, label, Icon }: { onClick: () => void; label: string; Icon: React.ElementType }) => (
      <button type="button" onClick={onClick} disabled={isMutating}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-[9px] rounded-[10px] bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,18%)] text-[hsl(0,0%,45%)] hover:border-white/20 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50">
        {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
        {label}
      </button>
  );

  return (
      <div className="bg-[hsl(0,0%,6%)] px-[22px] pb-[26px]">
        <div className="grid gap-3.5 pt-[18px] min-[1080px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] min-[1080px]:items-stretch">

          {/* ── LEFT ── */}
          <div className="flex flex-col gap-3.5 min-w-0">

            <DC>
              <DCTitle label="Gym Profile" />
              <DI label="Gym Name">      {p.gymName ?? "—"}</DI>
              <DI label="Email">         <span className="text-blue-400 break-all">{p.contactEmail ?? p.registeredEmail ?? "—"}</span></DI>
              <DI label="Phone">         {p.phoneNo ?? "—"}</DI>
              <DI label="Reg. No.">      {p.registrationNo ?? "—"}</DI>
              <DI label="Type">          {p.gymType ?? "—"}</DI>
              <DI label="Capacity">      {p.maxCapacity ? `${p.maxCapacity} members` : "—"}</DI>
              <DI label="Established">   {p.establishedAt ? String(p.establishedAt) : "—"}</DI>
              <DI label="Hours">         {p.opensAt && p.closesAt ? `${p.opensAt} – ${p.closesAt}` : "—"}</DI>
              <DI label="Registered">    {fmtDate(registeredAt)}</DI>
              {p.websiteUrl && (
                  <DI label="Website">
                    <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">{p.websiteUrl}</a>
                  </DI>
              )}
              {p.description && <DI label="Description"><span className="text-[hsl(0,0%,55%)] text-left">{p.description}</span></DI>}
            </DC>

            <div className="relative overflow-hidden border border-orange-500/30 rounded-2xl p-[18px_20px]"
                 style={{ background: "linear-gradient(145deg,rgba(255,106,0,0.04) 0%,rgba(0,0,0,0) 100%)" }}>
              <div className="absolute -top-[50px] -right-[50px] w-[160px] h-[160px] rounded-full pointer-events-none"
                   style={{ background: "radial-gradient(circle,rgba(255,106,0,0.09) 0%,transparent 70%)" }} />

              <div className="flex items-center justify-between gap-2.5 mb-[18px]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-orange-500/10 border border-orange-500/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(255,106,0,0.22)]">
                    <Shield className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-[12px] font-black uppercase tracking-wider text-white">Access Control</div>
                    <div className="text-[10px] text-[hsl(0,0%,35%)] mt-0.5">Who can enter · check-in radius</div>
                  </div>
                </div>
                <span className={`px-[11px] py-1 rounded-full text-[10px] font-black border flex-shrink-0 ${tier.bg} ${tier.border} ${tier.color}`}>
                {tier.label}
              </span>
              </div>

              <p className="text-[8.5px] font-black uppercase tracking-[0.15em] text-orange-500 mb-[7px]">Minimum membership tier</p>
              <div className="grid grid-cols-3 gap-[7px] mb-[10px]">
                {Object.entries(TIERS).map(([key, cfg]) => {
                  const active = tierKey === key;
                  return (
                      <button key={key} type="button"
                              disabled={readOnlyApproved}
                              onClick={() => onUpdateProfile("minimumAccessTier", key as AccessTier)}
                              className={`flex flex-col items-center gap-[5px] py-[11px] px-[7px] rounded-xl border transition-all font-['Outfit',system-ui,sans-serif] ${
                                  active
                                      ? `${cfg.bg} ${cfg.border} ${cfg.color} -translate-y-0.5 shadow-[0_5px_18px_rgba(0,0,0,0.35)]`
                                      : "bg-[hsl(0,0%,9%)] border-[hsl(0,0%,18%)] text-[hsl(0,0%,35%)] hover:-translate-y-0.5 hover:border-white/[0.18] hover:bg-[hsl(0,0%,12%)]"
                              } ${readOnlyApproved ? "opacity-50 cursor-not-allowed" : ""}`}>
                        <cfg.Icon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.09em]">{cfg.label}</span>
                      </button>
                  );
                })}
              </div>
              <div className={`flex items-center justify-between px-3 py-[9px] rounded-[10px] border mb-[14px] ${tier.bg} ${tier.border}`}>
                <span className={`text-[10.5px] font-bold ${tier.color}`}>{tier.desc}</span>
                <span className="text-[10px] text-[hsl(0,0%,35%)]">can enter</span>
              </div>

              <p className="text-[8.5px] font-black uppercase tracking-[0.15em] text-orange-500 mb-[7px]">Check-in</p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[140px] px-3 py-[9px] bg-[hsl(0,0%,9%)] rounded-[10px] border border-[hsl(0,0%,18%)]">
                  <Tog on={!!p.checkInEnabled} disabled={readOnlyApproved} onClick={() => onUpdateProfile("checkInEnabled", !p.checkInEnabled)} />
                  <span className={`text-[11px] font-bold ${p.checkInEnabled ? "text-white" : "text-[hsl(0,0%,35%)]"}`}>
                  {p.checkInEnabled ? "Enabled" : "Disabled"}
                </span>
                </div>
                <div className={`flex items-center gap-[5px] flex-shrink-0 transition-opacity ${p.checkInEnabled ? "" : "opacity-[0.38] pointer-events-none"}`}>
                  <input type="number" min={10} max={5000} step={10}
                         value={p.allowedCheckInRadiusMeters ?? 100}
                         disabled={!p.checkInEnabled || readOnlyApproved}
                         onChange={e => onUpdateProfile("allowedCheckInRadiusMeters", parseNum(e.target.value))}
                         className="w-[70px] px-[9px] py-[6px] text-right bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,18%)] rounded-lg text-white text-[12px] font-bold outline-none focus:border-orange-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] font-bold text-[hsl(0,0%,35%)]">m radius</span>
                </div>
              </div>
              <div className={`pt-[6px] pb-[2px] mt-2 transition-opacity ${p.checkInEnabled ? "" : "opacity-[0.38] pointer-events-none"}`}>
                <input type="range" min={10} max={1000} step={10}
                       value={Math.min(p.allowedCheckInRadiusMeters ?? 100, 1000)}
                        disabled={!p.checkInEnabled || readOnlyApproved}
                       onChange={e => onUpdateProfile("allowedCheckInRadiusMeters", +e.target.value)}
                       className="w-full h-1 rounded-sm cursor-pointer accent-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div className="flex justify-between text-[8.5px] text-[hsl(0,0%,35%)] mt-[5px]">
                  {["10m","250m","500m","750m","1km+"].map(l => <span key={l}>{l}</span>)}
                </div>
              </div>
              {!readOnlyApproved && <SaveBtn onClick={onSaveAccess} label="Save Access Settings" />}
            </div>

            {isApproved ? (
              <div className="bg-[rgba(96,165,250,0.05)] border border-blue-500/25 rounded-2xl p-[18px_20px]">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white whitespace-nowrap">Profile Actions</span>
                  <div className="flex-1 h-px bg-white/[0.05] min-w-0" />
                </div>
                <div className="text-[11px] text-[hsl(0,0%,55%)] mb-3">
                  Approved gyms are read-only by default. Use Edit mode to change profile details if needed.
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onViewProfile}
                    className="flex-1 flex items-center justify-center gap-1.5 py-[10px] rounded-[10px] bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 text-[11px] font-black uppercase tracking-[0.07em] transition-all"
                  >
                    <Eye className="w-3 h-3" />View Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(v => !v)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-[10px] rounded-[10px] bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,18%)] text-[hsl(0,0%,55%)] hover:text-white hover:border-white/20 text-[11px] font-black uppercase tracking-[0.07em] transition-all"
                  >
                    {editMode ? <X className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                    {editMode ? "Lock" : "Edit"}
                  </button>
                </div>
              </div>
            ) : isPendingReview ? (
              <div className="bg-[rgba(255,106,0,0.04)] border border-[rgba(255,106,0,0.28)] rounded-2xl p-[18px_20px]">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white whitespace-nowrap">Final Decision</span>
                  <div className="flex-1 h-px bg-white/[0.05] min-w-0" />
                </div>

                <div className="mb-3 space-y-[3px]">
                  {checklist.map((c, i) => (
                      <div key={i} className={`flex items-center gap-2 py-[5px] text-[10.5px] ${c.ok ? "text-[hsl(0,0%,65%)]" : "text-[hsl(0,0%,35%)]"}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        c.ok ? "bg-green-500/10 border-green-500/25" : "bg-[hsl(0,0%,12%)] border-[hsl(0,0%,18%)]"
                    }`}>
                      {c.ok && <Check className="w-[9px] h-[9px] text-green-400" strokeWidth={3} />}
                    </span>
                        {c.label}
                      </div>
                  ))}
                </div>

                {blockers.length > 0 ? (
                    <div className="space-y-1 mb-3">
                      {blockers.map((b, i) => (
                          <div key={i} className="flex items-start gap-2 p-[11px_13px] rounded-[10px] bg-yellow-500/10 border border-yellow-500/25 text-[11px] text-yellow-400">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{b}
                          </div>
                      ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-[11px_13px] rounded-[10px] mb-3 bg-green-500/10 border border-green-500/25 text-[11px] text-green-400 font-semibold">
                      <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />All requirements met - ready to approve.
                    </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={onReject} disabled={isMutating}
                          className="flex-1 flex items-center justify-center gap-1.5 py-[10px] rounded-[10px] bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500 hover:text-white hover:border-transparent text-[11px] font-black uppercase tracking-[0.07em] transition-all disabled:opacity-40">
                    {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" strokeWidth={2.5} />}Reject
                  </button>
                  <button type="button" onClick={onApprove} disabled={blockers.length > 0 || isMutating}
                          className="flex-[2] flex items-center justify-center gap-1.5 py-[10px] rounded-[10px] bg-green-400 text-[#071a0f] hover:bg-green-300 text-[11px] font-black uppercase tracking-[0.07em] transition-all disabled:opacity-35 disabled:cursor-not-allowed">
                    {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2.5} />}Approve Gym
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[rgba(239,68,68,0.05)] border border-red-500/20 rounded-2xl p-[18px_20px]">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white whitespace-nowrap">
                    {isRejected ? "Rejected" : "Review Status"}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.05] min-w-0" />
                </div>
                <div className="flex items-start gap-2 p-[11px_13px] rounded-[10px] bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,18%)] text-[11px] text-[hsl(0,0%,55%)]">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-400" />
                  <span>
                    Final approval decisions are only available while a gym is in pending review. This gym must return to pending review before it can be approved or rejected again.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT ── */}
          <div className="flex flex-col gap-3.5 min-w-0">

            <DC>
              <DCTitle label="Location & Coordinates" />

              <div className="mb-3">
                <AdminLocationMap
                    gymId={gymId}
                    latitude={p.latitude}
                    longitude={p.longitude}
                    onCoordinatesChange={(latitude, longitude) => {
                      onUpdateProfile("latitude", latitude);
                      onUpdateProfile("longitude", longitude);
                    }}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <label className="sm:col-span-2 xl:col-span-2">
                  <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.12em] text-[hsl(0,0%,35%)]">Address</span>
                  <input
                      type="text"
                      value={p.addressLine ?? ""}
                      disabled={readOnlyApproved}
                      onChange={e => onUpdateProfile("addressLine", e.target.value)}
                      placeholder="Street address"
                      className="w-full rounded-[9px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] px-2.5 py-[7px] text-[10px] text-white outline-none transition-all placeholder:text-[hsl(0,0%,35%)] focus:border-orange-500/40"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.12em] text-[hsl(0,0%,35%)]">City</span>
                  <input
                      type="text"
                      value={p.city ?? ""}
                      disabled={readOnlyApproved}
                      onChange={e => onUpdateProfile("city", e.target.value)}
                      placeholder="City"
                      className="w-full rounded-[9px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] px-2.5 py-[7px] text-[10px] text-white outline-none transition-all placeholder:text-[hsl(0,0%,35%)] focus:border-orange-500/40"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.12em] text-[hsl(0,0%,35%)]">Postal</span>
                  <input
                      type="text"
                      value={p.postalCode ?? ""}
                      disabled={readOnlyApproved}
                      onChange={e => onUpdateProfile("postalCode", e.target.value)}
                      placeholder="Postal code"
                      className="w-full rounded-[9px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] px-2.5 py-[7px] text-[10px] text-white outline-none transition-all placeholder:text-[hsl(0,0%,35%)] focus:border-orange-500/40"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.12em] text-[hsl(0,0%,35%)]">Country</span>
                  <input
                      type="text"
                      value={p.country ?? ""}
                      disabled={readOnlyApproved}
                      onChange={e => onUpdateProfile("country", e.target.value)}
                      placeholder="Country"
                      className="w-full rounded-[9px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] px-2.5 py-[7px] text-[10px] text-white outline-none transition-all placeholder:text-[hsl(0,0%,35%)] focus:border-orange-500/40"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.12em] text-[hsl(0,0%,35%)]">Latitude</span>
                  <input
                      type="number"
                      step="0.0001"
                      value={p.latitude ?? ""}
                      disabled={readOnlyApproved}
                      onChange={e => onUpdateProfile("latitude", parseOptionalNum(e.target.value))}
                      placeholder="27.7172"
                      className="w-full rounded-[9px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] px-2.5 py-[7px] text-[10px] text-white outline-none transition-all placeholder:text-[hsl(0,0%,35%)] focus:border-orange-500/40"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.12em] text-[hsl(0,0%,35%)]">Longitude</span>
                  <input
                      type="number"
                      step="0.0001"
                      value={p.longitude ?? ""}
                      disabled={readOnlyApproved}
                      onChange={e => onUpdateProfile("longitude", parseOptionalNum(e.target.value))}
                      placeholder="85.3240"
                      className="w-full rounded-[9px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] px-2.5 py-[7px] text-[10px] text-white outline-none transition-all placeholder:text-[hsl(0,0%,35%)] focus:border-orange-500/40"
                  />
                </label>
              </div>

              <p className="mt-2 text-[9px] leading-relaxed text-[hsl(0,0%,35%)]">
                Click the map, drag the pin, or type coordinates below. Latitude and longitude stay synchronized and should be saved together.
              </p>

              {!readOnlyApproved && <GhostBtn onClick={onSaveLocation} label="Save Location" Icon={Save} />}
            </DC>

            <div className="flex flex-1 flex-col gap-3.5 min-h-0 min-w-0">

              <DC className="flex flex-col overflow-hidden">
                <DCTitle label="Document Verification" right={`${approvedDocs}/${docs.length} · max 6`} />

                <div className="flex items-center gap-2 mb-[10px]">
                  <div className="flex-1 h-[3px] bg-[hsl(0,0%,12%)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${docBarCls}`} style={{ width: `${docPct}%` }} />
                  </div>
                  <span className={`flex items-center gap-1 text-[9px] font-bold whitespace-nowrap ${reqOk ? "text-green-400" : "text-[hsl(0,0%,35%)]"}`}>
                  {reqOk
                      ? <><Check className="w-[9px] h-[9px]" strokeWidth={3} />Req. OK</>
                      : <><AlertCircle className="w-[9px] h-[9px]" />Req. pending</>}
                </span>
                </div>

                <div className={`min-h-0 ${docs.length > 4 ? "max-h-[248px] overflow-y-auto pr-1" : ""}`}>
                  {docs.length === 0
                      ? <p className="text-[11px] text-[hsl(0,0%,35%)] py-3 text-center">No documents uploaded yet.</p>
                      : docs.map(d => {
                        const isReq   = (REQUIRED_DOCS as readonly string[]).includes(d.documentType);
                        const iconBg  = d.status === "APPROVED" ? "bg-green-500/10 border-green-500/25"
                            : d.status === "REJECTED" ? "bg-red-500/10 border-red-500/25"
                                : "bg-yellow-500/10 border-yellow-500/25";
                        return (
                            <div key={d.documentId} className="flex items-center gap-2.5 py-[11px] border-b border-[hsl(0,0%,10%)] last:border-0 last:pb-0">
                              <div className={`w-[26px] h-[26px] rounded-[7px] flex items-center justify-center flex-shrink-0 border ${iconBg}`}>
                                {d.status === "APPROVED"
                                    ? <Check className="w-3 h-3 text-green-400" strokeWidth={2.5} />
                                    : d.status === "REJECTED"
                                        ? <X className="w-3 h-3 text-red-400" strokeWidth={2.5} />
                                        : <AlertCircle className="w-3 h-3 text-yellow-400" strokeWidth={2.5} />}
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <span className="text-[11px] font-semibold truncate">{d.documentType.replace(/_/g, " ")}</span>
                                  {isReq && (
                                      <span className="flex-shrink-0 text-[7.5px] font-black uppercase tracking-[0.07em] text-orange-400 bg-orange-500/10 border border-orange-500/25 px-[5px] py-[1px] rounded-full">
                                  Req
                                </span>
                                  )}
                                </div>
                                <a href={d.fileUrl} target="_blank" rel="noreferrer"
                                   className="text-[10px] text-[hsl(0,0%,35%)] hover:text-blue-400 transition-colors">
                                  View ↗
                                </a>
                              </div>
                              <div className="flex bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,18%)] rounded-lg overflow-hidden flex-shrink-0">
                                {(["APPROVED","PENDING_REVIEW","REJECTED"] as GymDocumentStatus[]).map(s => (
                                    <button key={s} type="button" title={s}
                                          disabled={readOnlyApproved}
                                            onClick={() => onUpdateDocStatus(d.documentId, s)}
                                          className={`px-[11px] py-[5px] flex items-center justify-center border-l first:border-0 border-[hsl(0,0%,18%)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                                d.status === s
                                                    ? s === "APPROVED"       ? "bg-green-500/10  text-green-400"
                                                        : s === "PENDING_REVIEW" ? "bg-yellow-500/10 text-yellow-400"
                                                            : "bg-red-500/10 text-red-400"
                                                    : "text-[hsl(0,0%,35%)] hover:bg-white/5 hover:text-white"
                                            }`}>
                                      {s === "APPROVED"       ? <Check className="w-3 h-3" strokeWidth={2.5} />
                                          : s === "PENDING_REVIEW" ? <MoreHorizontal className="w-3 h-3" />
                                              : <X className="w-3 h-3" strokeWidth={2.5} />}
                                    </button>
                                ))}
                              </div>
                            </div>
                        );
                      })
                  }
                </div>
                {!readOnlyApproved && <GhostBtn onClick={onSaveDocuments} label="Save Document Reviews" Icon={Save} />}
              </DC>

              <DC className="flex flex-1 flex-col overflow-hidden">
                <DCTitle label="Payout Wallets" right={`${wallets.length}/2 · ${vWallets} verified`} />

                {wallets.length > 0 && (
                    <div className={`flex items-center justify-between mb-3 px-[11px] py-2 bg-[hsl(0,0%,9%)] rounded-[9px] border ${hasPayout ? "border-green-500/25" : "border-[hsl(0,0%,18%)]"}`}>
                  <span className="text-[10px] text-[hsl(0,0%,55%)] font-semibold">
                    {wallets.length} wallet{wallets.length > 1 ? "s" : ""} · {vWallets} verified
                  </span>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${hasPayout ? "bg-green-500/10 text-green-400 border-green-500/25" : "bg-red-500/10 text-red-400 border-red-500/25"}`}>
                    {hasPayout ? <><Check className="w-[9px] h-[9px]" strokeWidth={3} />Meets req</> : "Needs 1 verified"}
                  </span>
                    </div>
                )}

                {wallets.length === 0 && (
                    <div className="flex items-center gap-2 border border-dashed border-[hsl(0,0%,18%)] rounded-[10px] p-3.5 text-red-400 text-[11px] font-bold mb-3">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />No complete wallet submitted
                    </div>
                )}

                <div className={`flex flex-1 flex-col gap-2 ${wallets.length > 1 ? "max-h-[248px] overflow-y-auto pr-1" : ""}`}>
                  {wallets.map(w => (
                      <div key={w.provider}
                           className={`bg-[hsl(0,0%,9%)] border rounded-[10px] p-[11px_13px] ${w.verified ? "border-green-500/25" : "border-[hsl(0,0%,18%)]"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black text-[hsl(0,0%,55%)]">{w.provider === "ESEWA" ? "eSewa" : "Khalti"}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${w.verified ? "bg-green-500/10 text-green-400 border-green-500/25" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/25"}`}>
                        {w.verified ? "Verified" : "Unverified"}
                      </span>
                        </div>
                        <DI label="Wallet ID"><span className="font-mono text-[10px]">{w.walletId}</span></DI>
                        <DI label="Account">{w.accountName}</DI>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(0,0%,10%)]">
                          <span className="text-[10px] text-[hsl(0,0%,35%)]">Mark as verified</span>
                          <Tog on={w.verified} disabled={readOnlyApproved} onClick={() => onUpdatePayoutVerified(w.provider, !w.verified)} />
                        </div>
                      </div>
                  ))}
                </div>

                {wallets.length > 0 && !readOnlyApproved && (
                    <GhostBtn onClick={onSavePayout} label="Save Payout Verification" Icon={Save} />
                )}
              </DC>
            </div>

          </div>
        </div>

        <div className="mt-3.5">
          {photos.length === 0 ? (
              <div className="bg-[hsl(0,0%,7%)] border border-[hsl(0,0%,18%)] rounded-2xl p-[16px_18px]">
                <div className="border border-dashed border-red-500/30 rounded-xl p-[30px_20px] text-center bg-red-500/[0.09]">
                  <Camera className="w-8 h-8 text-red-400/60 mx-auto mb-3" strokeWidth={1.5} />
                  <div className="text-[12px] font-bold text-red-400 mb-1">No photos uploaded</div>
                  <div className="text-[10.5px] text-[hsl(0,0%,35%)]">At least 1 photo required before approval</div>
                </div>
              </div>
          ) : (
              <div className="bg-[hsl(0,0%,7%)] border border-[hsl(0,0%,18%)] rounded-2xl p-[16px_18px]">
                <div className="flex items-center justify-between mb-[10px]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-500">Gym Photos</span>
                    {coverSet
                        ? <span className="flex items-center gap-1 text-[9px] font-bold text-green-400"><Check className="w-[10px] h-[10px]" strokeWidth={2.5} />Cover set</span>
                        : <span className="flex items-center gap-1 text-[9px] font-bold text-yellow-400"><AlertCircle className="w-[10px] h-[10px]" />No cover set</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-[hsl(0,0%,35%)]">
                    <span>Hover to caption</span>
                    <span>{photos.filter(ph => ph.caption?.trim()).length} captioned</span>
                    <span className="font-mono">{photos.length}/12</span>
                  </div>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "220px" }}>
                  <div className="grid grid-cols-2 gap-[6px] sm:grid-cols-3 xl:grid-cols-6">
                    {photos.map(ph => (
                        <div key={ph.publicId ?? ph.photoId}
                             className="relative overflow-hidden rounded-[11px] border border-[hsl(0,0%,13%)] bg-[hsl(0,0%,9%)] cursor-pointer group transition-all hover:-translate-y-0.5 hover:border-orange-500/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                             style={{ aspectRatio: "4/3" }}>
                          <img src={ph.photoUrl} alt={ph.caption ?? "Gym photo"}
                               onError={e => e.currentTarget.parentElement!.style.opacity = "0.4"}
                               className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          {ph.cover && (
                              <div className="absolute top-[6px] left-[6px] text-[7px] font-black uppercase tracking-[0.1em] text-white px-[7px] py-[2px] rounded-full pointer-events-none shadow-[0_2px_8px_rgba(255,106,0,0.22)]"
                                   style={{ background: FIRE }}>Cover</div>
                          )}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-[9px]"
                               style={{ background: "linear-gradient(0deg,rgba(4,4,4,0.92) 0%,rgba(4,4,4,0.4) 55%,transparent 100%)" }}>
                            <div className="flex items-center gap-[5px]">
                              <input type="text" maxLength={60} placeholder="Add caption…"
                                     value={ph.caption ?? ""}
                                     disabled={readOnlyApproved}
                                     onChange={e => onUpdatePhotoCaption(ph.photoId, e.target.value)}
                                     onClick={e => e.stopPropagation()}
                                     onKeyDown={e => { if (e.key === "Enter") onSavePhotoCaption(ph); }}
                                     className="flex-1 min-w-0 px-2 py-1 text-[10px] text-white bg-white/10 border border-white/20 rounded-[6px] outline-none focus:bg-white/[0.16] focus:border-orange-400 placeholder:text-white/40 backdrop-blur-sm"
                              />
                              <button type="button" disabled={readOnlyApproved} onClick={() => onSavePhotoCaption(ph)}
                                      className="flex-shrink-0 w-[22px] h-[22px] flex items-center justify-center rounded-[5px] opacity-85 hover:opacity-100 transition-opacity"
                                      style={{ background: FIRE }}>
                                <Check className="w-[10px] h-[10px] text-white" strokeWidth={3} />
                              </button>
                            </div>
                            {!ph.caption?.trim() && (
                                <div className="text-[9px] text-white/35 mt-1 tracking-[0.04em]">✎ click to caption</div>
                            )}
                          </div>
                          {ph.caption?.trim() && (
                              <div className="absolute bottom-0 left-0 right-0 px-2 py-[4px] text-[9px] text-white/90 font-semibold truncate pointer-events-none group-hover:opacity-0 transition-opacity"
                                   style={{ background: "linear-gradient(transparent,rgba(4,4,4,0.78))" }}>
                                {ph.caption}
                              </div>
                          )}
                        </div>
                    ))}
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}

// ─── Per-row approval dropdown ────────────────────────────────────────────────
function ApprovalDropdown({
                            gymId, gymName, status,
                            onViewProfile, onDelete,
                          }: {
  gymId: number; gymName: string;
  status: GymApprovalStatus;
  onViewProfile: (id: number, name: string) => void;
  onDelete: (id: number, name: string) => void;
}) {
  return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Quick action"
            className="w-6 h-6 rounded-full border border-[hsl(0,0%,18%)] text-[hsl(0,0%,35%)] hover:border-orange-500/30 hover:text-orange-400 flex items-center justify-center transition-all"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          sideOffset={8}
          className="z-[80] min-w-[152px] bg-[hsl(0,0%,9%)] border-[hsl(0,0%,18%)] text-white rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.65)]"
        >
          <DropdownMenuLabel className="px-3 py-2 border-b border-[hsl(0,0%,13%)]">
            <p className="text-[8px] font-black uppercase tracking-widest text-[hsl(0,0%,35%)]">Quick action</p>
            <p className="text-[10px] font-semibold text-white truncate mt-0.5">{gymName}</p>
          </DropdownMenuLabel>

          {status === "APPROVED" && (
            <DropdownMenuItem
              onClick={() => onViewProfile(gymId, gymName)}
              className="cursor-pointer flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-blue-400 focus:bg-blue-500/10 focus:text-blue-400"
            >
              <Eye className="w-3.5 h-3.5 flex-shrink-0" />
              View profile
            </DropdownMenuItem>
          )}

          {status === "REJECTED" && (
            <DropdownMenuItem
              onClick={() => onDelete(gymId, gymName)}
              className="cursor-pointer flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-red-400 focus:bg-red-500/10 focus:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
interface PendingDecision { gymId: number; gymName: string; approved: boolean }

export default function ManageGyms() {
  const qc = useQueryClient();

  const [activeStatus, setActiveStatus]   = useState<GymApprovalStatus>("PENDING_REVIEW");
  const [searchInput, setSearchInput]     = useState("");
  const [debounced, setDebounced]         = useState("");
  const [page, setPage]                   = useState(0);
  const [pageSize, setPageSize]           = useState(10);
  const [expandedId, setExpandedId]       = useState<number | null>(null);
  const [draftReview, setDraftReview]     = useState<AdminGymReviewResponse | null>(null);
  const [pendingDecision, setPending]     = useState<PendingDecision | null>(null);
  const [sortIdx, setSortIdx]             = useState(0);
  const [filterOpen, setFilterOpen]       = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(searchInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => { setPage(0); setExpandedId(null); }, [activeStatus, debounced, pageSize]);
  useEffect(() => { setDraftReview(null); }, [expandedId]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const gymsQ = useQuery({
    queryKey: ["admin-gyms", activeStatus, debounced, page, pageSize],
    queryFn:  () => getAdminGymsApi({ approvalStatus: activeStatus, query: debounced || undefined, page, size: pageSize }),
    placeholderData: prev => prev,
  });
  const countsQ = useQuery({
    queryKey: ["admin-gym-counts"],
    queryFn:  getAdminGymStatusCountsApi,
    staleTime: 30_000,
  });
  const reviewQ = useQuery({
    queryKey: ["admin-gym-review", expandedId],
    queryFn:  () => getAdminGymReviewApi(expandedId as number),
    enabled:  expandedId !== null,
  });
  useEffect(() => {
    if (reviewQ.data) setDraftReview(cloneReview(reviewQ.data));
  }, [reviewQ.data]);

  const syncMutation = (r: AdminGymReviewResponse, msg: string) => {
    qc.setQueryData(["admin-gym-review", r.profile.gymId], r);
    setDraftReview(cloneReview(r));
    qc.invalidateQueries({ queryKey: ["admin-gyms"] });
    qc.invalidateQueries({ queryKey: ["admin-gym-counts"] });
    toast.success(msg);
  };

  const locMut = useMutation({
    mutationFn: ({ gymId, profile }: { gymId: number; profile: GymProfileResponse }) =>
        patchAdminGymLocationApi(gymId, {
          addressLine: profile.addressLine, city: profile.city,
          country: profile.country, postalCode: profile.postalCode,
          latitude: profile.latitude, longitude: profile.longitude,
        }),
    onSuccess: r => syncMutation(r, "Location updated"),
    onError:   e => toast.error(getApiErrorMessage(e, "Failed to update location")),
  });

  const accMut = useMutation({
    mutationFn: ({ gymId, profile }: { gymId: number; profile: GymProfileResponse }) =>
        patchAdminGymAccessApi(gymId, {
          minimumAccessTier: profile.minimumAccessTier,
          checkInEnabled: profile.checkInEnabled,
          allowedCheckInRadiusMeters: profile.allowedCheckInRadiusMeters,
        }),
    onSuccess: r => syncMutation(r, "Access settings updated"),
    onError:   e => toast.error(getApiErrorMessage(e, "Failed to update access settings")),
  });

  const docMut = useMutation({
    mutationFn: ({ gymId, docs }: { gymId: number; docs: GymDocumentResponse[] }) =>
        patchAdminGymDocumentsApi(gymId, {
          documentUpdates: docs.map(d => ({ documentId: d.documentId, status: d.status })),
        }),
    onSuccess: r => syncMutation(r, "Document reviews updated"),
    onError:   e => toast.error(getApiErrorMessage(e, "Failed to update documents")),
  });

  const payMut = useMutation({
    mutationFn: ({ gymId, review }: { gymId: number; review: AdminGymReviewResponse }) =>
        patchAdminGymPayoutApi(gymId, {
          payoutAccountUpdates: resolveWallets(review)
              .filter(w => w.walletId && w.accountName)
              .map(w => ({ provider: w.provider, verified: w.verified })),
        }),
    onSuccess: r => syncMutation(r, "Payout verification updated"),
    onError:   e => toast.error(getApiErrorMessage(e, "Failed to update payout")),
  });

  const capMut = useMutation({
    mutationFn: ({ gymId, photoId, caption }: { gymId: number; photoId: number; caption: string | null }) =>
        patchAdminGymPhotoCaptionApi(gymId, photoId, caption),
    onSuccess: r => syncMutation(r, "Caption saved"),
    onError:   e => toast.error(getApiErrorMessage(e, "Failed to save caption")),
  });

  const appMut = useMutation({
    mutationFn: ({ gymId, approved }: { gymId: number; approved: boolean }) =>
        patchAdminGymApprovalApi(gymId, { approved }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["admin-gyms"] });
      qc.invalidateQueries({ queryKey: ["admin-gym-counts"] });
      qc.invalidateQueries({ queryKey: ["admin-gym-review", v.gymId] });
      setExpandedId(null); setDraftReview(null); setPending(null);
      toast.success(v.approved ? "Gym approved" : "Gym rejected");
    },
    onError: e => toast.error(getApiErrorMessage(e, "Failed to update approval")),
  });

  const isMutating = locMut.isPending || accMut.isPending || docMut.isPending
      || payMut.isPending || capMut.isPending || appMut.isPending;

  const gyms        = gymsQ.data?.items ?? [];
  const total       = gymsQ.data?.totalItems ?? 0;
  const totalPages  = Math.max(gymsQ.data?.totalPages ?? 0, 1);
  const sortMode    = SORTS[sortIdx];
  const display     = sortGyms(gyms, sortMode.key);
  const SortIcon    = sortMode.Icon;
  const pendingCt   = countsQ.data?.pendingReview ?? 0;
  const approvedCt  = countsQ.data?.approved ?? 0;
  const rejectedCt  = countsQ.data?.rejected ?? 0;
  const countMap: Record<GymApprovalStatus, number> = {
    PENDING_REVIEW: pendingCt, APPROVED: approvedCt, REJECTED: rejectedCt, DRAFT: 0,
  };

  const updProf = <K extends keyof GymProfileResponse>(k: K, v: GymProfileResponse[K]) =>
      setDraftReview(r => r ? { ...r, profile: { ...r.profile, [k]: v } } : r);

  const updDoc = (docId: number, s: GymDocumentStatus) =>
      setDraftReview(r => r ? { ...r, documents: r.documents.map(d => d.documentId === docId ? { ...d, status: s } : d) } : r);

  const updPay = (prov: GymPayoutProvider, verified: boolean) =>
      setDraftReview(r => {
        if (!r) return r;
        const exists = r.payoutAccounts.some(a => a.provider === prov);
        if (exists)
          return { ...r, payoutAccounts: r.payoutAccounts.map(a => a.provider === prov ? { ...a, verified } : a) };
        return {
          ...r, profile: {
            ...r.profile,
            esewaWalletVerified:  prov === "ESEWA"  ? verified : r.profile.esewaWalletVerified,
            khaltiWalletVerified: prov === "KHALTI" ? verified : r.profile.khaltiWalletVerified,
          },
        };
      });

  const updCap = (photoId: number, caption: string) =>
      setDraftReview(r => r ? { ...r, photos: r.photos.map(p => p.photoId === photoId ? { ...p, caption } : p) } : r);

  const saveLoc  = () => { 
    if (!draftReview) return; 
    locMut.mutate({ gymId: draftReview.profile.gymId, profile: draftReview.profile }); 
  };
  const saveAcc  = () => { 
    if (!draftReview) return; 
    accMut.mutate({ gymId: draftReview.profile.gymId, profile: draftReview.profile }); 
  };
  const saveDocs = () => { 
    if (!draftReview) return; 
    if (!draftReview.documents.length) { 
      toast.info("No documents yet"); 
      return; 
    } 
    docMut.mutate({ gymId: draftReview.profile.gymId, docs: draftReview.documents }); 
  };
  const savePay  = () => { 
    if (!draftReview) return; 
    if (!resolveWallets(draftReview).length) { 
      toast.info("No wallets yet"); 
      return; 
    } 
    payMut.mutate({ gymId: draftReview.profile.gymId, review: draftReview }); 
  };
  const saveCap  = (ph: GymPhotoResponse) => { 
    if (!draftReview) return; 
    capMut.mutate({ gymId: draftReview.profile.gymId, photoId: ph.photoId, caption: ph.caption?.trim() || null }); 
  };
  const refresh  = async () => { await Promise.all([gymsQ.refetch(), countsQ.refetch()]); if (expandedId) await reviewQ.refetch(); toast.success("Refreshed"); };

  const switchTab = (s: GymApprovalStatus) => { setActiveStatus(s); setExpandedId(null); setFilterOpen(false); };
  const clearFilters = () => {
    setSearchInput("");
    setDebounced("");
    setSortIdx(0);
    setActiveStatus("PENDING_REVIEW");
    setFilterOpen(false);
    setExpandedId(null);
    setPage(0);
  };

  const handleQuickViewProfile = (gymId: number, gymName: string) => {
    setExpandedId(gymId);
    toast.info(`Opened ${gymName} profile`);
  };

  const handleQuickDeleteRejected = (gymId: number, gymName: string) => {
    toast.info(`Delete requested for ${gymName} (#${gymId}). Backend delete endpoint is not configured yet.`);
  };

  const TABS = [
    { key: "PENDING_REVIEW" as GymApprovalStatus, label: "Pending",  activeCls: "bg-[hsl(0,0%,9%)] text-yellow-400 border-yellow-500/20", ctCls: "bg-yellow-500/15 text-yellow-400" },
    { key: "APPROVED"       as GymApprovalStatus, label: "Approved", activeCls: "bg-[hsl(0,0%,9%)] text-green-400 border-green-500/20",   ctCls: "bg-green-500/15 text-green-400"   },
    { key: "REJECTED"       as GymApprovalStatus, label: "Rejected", activeCls: "bg-[hsl(0,0%,9%)] text-red-400 border-red-500/20",       ctCls: "bg-red-500/15 text-red-400"       },
  ];

  const COL_W = ["18%","9%","15%","15%","9%","10%","10%","8%","6%"];
  const colStyle = (i: number) => ({ width: COL_W[i] });

  return (
      <div className="space-y-5 font-['Outfit',system-ui,sans-serif]">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[32px] font-black tracking-tight text-white">
              Manage <span style={fireStyle}>Gyms</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border border-orange-500/25 bg-orange-500/10 text-orange-400">
            {pendingCt} Pending
          </span>
            <button type="button" onClick={() => void refresh()} disabled={gymsQ.isFetching || countsQ.isFetching}
                    className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border table-border table-bg table-text hover:text-white hover:border-white/20 text-[12px] font-bold transition-all disabled:opacity-50">
              {gymsQ.isFetching || countsQ.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="relative flex-1 max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 table-text-muted pointer-events-none" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                   placeholder="Search gym, email, address…"
                   className="w-full pl-9 pr-4 py-2 table-bg table-border border rounded-full text-[13px] font-medium text-white placeholder:table-text-muted outline-none focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)] transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => setSortIdx(i => (i + 1) % SORTS.length)}
                    className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border text-[12px] font-bold transition-all ${sortIdx !== 0 ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400"}`}>
              <SortIcon className="w-3.5 h-3.5" />{sortMode.label}
            </button>
            <div ref={filterRef} className="relative">
              <button type="button" onClick={() => setFilterOpen(v => !v)}
                      className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border text-[12px] font-bold transition-all ${filterOpen ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400"}`}>
                <SlidersHorizontal className="w-4 h-4" />Filter
              </button>
              {filterOpen && (
                  <div className="absolute top-[calc(100%+8px)] right-0 table-bg table-border border rounded-2xl p-1.5 min-w-[200px] z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                    <div className="text-[8px] font-black uppercase tracking-widest table-text-muted px-2.5 py-2">Filter by status</div>
                    {TABS.map(({ key, label }) => (
                        <button key={key} type="button" onClick={() => switchTab(key)}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${activeStatus === key ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}>
                          <span className="text-[12px] font-semibold table-text">{label}</span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-white/[0.06] table-text-muted">{countMap[key]}</span>
                        </button>
                    ))}
                  </div>
              )}
            </div>
            <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
              <SelectTrigger className="h-[34px] rounded-full table-border table-bg table-text text-[12px] font-bold w-auto px-3.5 focus:ring-orange-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="table-border table-bg-alt text-white">
                {PAGE_SIZES.map(v => <SelectItem key={v} value={v} className="text-[12px] focus:bg-white/[0.06]">{v} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <button type="button" onClick={clearFilters}
                    className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border table-border table-bg text-[12px] font-bold transition-all hover:border-orange-500/30 hover:text-orange-400 ${
                      (searchInput || sortIdx !== 0 || activeStatus !== "PENDING_REVIEW" || filterOpen)
                        ? "text-orange-400 border-orange-500/30"
                        : "table-text opacity-50"
                    }`}>
              <X className="w-3.5 h-3.5" />Clear
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-0.5 p-1 table-bg table-border border rounded-full">
            {TABS.map(({ key, label, activeCls, ctCls }) => {
              const active = activeStatus === key;
              return (
                  <button key={key} type="button" onClick={() => switchTab(key)}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-[12px] font-bold uppercase tracking-wider transition-all ${active ? activeCls : "bg-transparent border-transparent table-text-muted hover:table-text"}`}>
                    {label}
                    <span className={`text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${active ? ctCls : "bg-white/[0.06] table-text-muted"}`}>
                  {countMap[key]}
                </span>
                  </button>
              );
            })}
          </div>
          {total > 0 && <span className="text-[12px] table-text-muted">{total} gym{total !== 1 ? "s" : ""}</span>}
        </div>

        <div className="table-bg table-border border rounded-[18px] overflow-hidden">
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <thead>
            <tr className="table-header-bg table-border border-b">
              {["Gym","Type","Address","Email","Registered","Status","Documents","Payout",""].map((h, i) => (
                  <th key={i} style={colStyle(i)}
                      className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted first:pl-5">{h}</th>
              ))}
            </tr>
            </thead>
            <tbody>
            {gymsQ.isLoading ? (
                <tr><td colSpan={9} className="py-16 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-2" />
                  <div className="text-[13px] table-text-muted">Loading gyms…</div>
                </td></tr>
            ) : display.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center">
                  <Search className="w-8 h-8 table-text-muted mx-auto mb-2" strokeWidth={1.5} />
                  <div className="text-[16px] font-bold table-text">{debounced ? "No results found" : "No gyms here"}</div>
                  <div className="text-[13px] table-text-muted mt-1">{debounced ? `Nothing matches "${debounced}"` : "This list is currently empty"}</div>
                </td></tr>
            ) : display.flatMap(gym => {
              const isExp = expandedId === gym.gymId;

              const docTotal = gym.documentCount ?? 0;

              // Payout wallet status
              const hasEsewa = !!(gym.esewaWalletId && gym.esewaAccountName);
              const hasKhalti = !!(gym.khaltiWalletId && gym.khaltiAccountName);
              const hasVerifiedWallet = (hasEsewa && gym.esewaWalletVerified) || (hasKhalti && gym.khaltiWalletVerified);
              const hasNoPayoutWallet = !hasEsewa && !hasKhalti;
              
              // Display values
              const addressLine = gym.addressLine?.trim() || "—";
              const addressMeta = [gym.city, gym.country].filter(Boolean).join(", ") || "Location not provided";
              const contactEmail = gym.contactEmail?.trim() || "No contact email";
              const payoutMeta = [hasEsewa ? "eSewa" : null, hasKhalti ? "Khalti" : null].filter(Boolean).join(" + ") || "No payout wallet";

              return [
                <tr key={gym.gymId}
                    className={`border-b table-border-row last:border-0 transition-colors ${isExp ? "bg-orange-500/[0.05]" : "hover:bg-white/[0.025]"}`}>

                  <td className="p-0" style={colStyle(0)}>
                    <div className="flex items-center gap-2.5 px-3.5 py-3.5 pl-5 cursor-pointer"
                         onClick={() => setExpandedId(isExp ? null : gym.gymId)}>
                      {gym.logoUrl
                          ? <img src={gym.logoUrl} alt={gym.gymName ?? ""} className="w-10 h-10 rounded-[10px] object-cover flex-shrink-0 border border-orange-500/25" />
                          : <div className="w-10 h-10 rounded-[10px] bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-[12px] font-black text-orange-400 flex-shrink-0">{initials(gym.gymName)}</div>}
                      <div className="min-w-0">
                        <div className="text-[14px] font-bold truncate">{gym.gymName ?? "—"}</div>
                        <div className="text-[11px] table-text-muted truncate mt-0.5">#{gym.gymId}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-3.5 py-3.5 text-[12px] table-text font-medium truncate" style={colStyle(1)}>{gym.gymType ?? "—"}</td>
                  <td className="px-3.5 py-3.5" style={colStyle(2)}>
                    <div className="text-[12px] font-bold truncate">{addressLine}</div>
                    <div className="text-[11px] table-text-muted truncate mt-0.5">{addressMeta}</div>
                  </td>

                  <td className="px-3.5 py-3.5" style={colStyle(3)}>
                    <div className="text-[12px] font-bold truncate">{gym.registeredEmail ?? "—"}</div>
                    <div className="text-[11px] table-text-muted truncate mt-0.5">{contactEmail}</div>
                  </td>

                  <td className="px-3.5 py-3.5 text-[12px] table-text truncate" style={colStyle(4)}>{fmtDate(gym.registeredAt)}</td>

                  <td className="px-3.5 py-3.5" style={colStyle(5)}><ApprovalPill status={gym.approvalStatus} /></td>

                  <td className="px-3.5 py-3.5" style={colStyle(6)}>
                    {docTotal > 0 && (
                        <div className="flex gap-[3px] flex-wrap max-w-[52px] mb-1">
                          {Array.from({ length: docTotal }, (_, i) => (
                              <DocDot key={i} status={gym.requiredDocumentsUploaded && i < 2 ? "APPROVED" : "PENDING_REVIEW"} />
                          ))}
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-bold ${
                          gym.requiredDocumentsUploaded ? "text-green-400" : "text-yellow-400"
                      }`}>
                        {gym.requiredDocumentsUploaded ? "Req. OK" : "Pending"}
                      </span>
                      {docTotal > 0 && <span className="text-[10px] table-text-muted">{docTotal}/{gym.maxDocuments}</span>}
                    </div>
                  </td>

                  <td className="px-3.5 py-3.5" style={colStyle(7)}>
                    {hasNoPayoutWallet
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/25"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />None</span>
                        : hasVerifiedWallet
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/25"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Verified</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/25"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Unverified</span>}
                    <div className="text-[10px] table-text-muted truncate mt-1 max-w-full">{payoutMeta}</div>
                  </td>

                  <td className="px-2 py-3.5" style={colStyle(8)}>
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {(gym.approvalStatus === "APPROVED" || gym.approvalStatus === "REJECTED") && (
                          <ApprovalDropdown
                              gymId={gym.gymId}
                              gymName={gym.gymName ?? ""}
                            status={gym.approvalStatus}
                            onViewProfile={handleQuickViewProfile}
                            onDelete={handleQuickDeleteRejected}
                          />
                      )}
                      <button type="button" onClick={() => setExpandedId(isExp ? null : gym.gymId)}
                              className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isExp ? "bg-orange-500 border-orange-500 text-white shadow-[0_3px_12px_rgba(255,106,0,0.4)]" : "table-border table-text-muted hover:border-orange-500/30 hover:text-orange-400"}`}>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isExp ? "rotate-180" : ""}`} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>,

                isExp ? (
                    <tr key={`d-${gym.gymId}`} className="border-b table-border-cell">
                      <td colSpan={9} className="p-0">
                        <DetailPanel
                            gymId={gym.gymId}
                          approvalStatus={gym.approvalStatus}
                            registeredAt={gym.registeredAt}
                            draftReview={draftReview}
                            isLoading={reviewQ.isLoading}
                            isMutating={isMutating}
                            onUpdateProfile={updProf}
                            onUpdateDocStatus={updDoc}
                            onUpdatePayoutVerified={updPay}
                            onUpdatePhotoCaption={updCap}
                            onSaveLocation={saveLoc}
                            onSaveAccess={saveAcc}
                            onSaveDocuments={saveDocs}
                            onSavePayout={savePay}
                            onSavePhotoCaption={saveCap}
                            onViewProfile={() => handleQuickViewProfile(gym.gymId, gym.gymName ?? "")}
                            onApprove={() => setPending({ gymId: gym.gymId, gymName: gym.gymName ?? "", approved: true  })}
                            onReject ={() => setPending({ gymId: gym.gymId, gymName: gym.gymName ?? "", approved: false })}
                        />
                      </td>
                    </tr>
                ) : null,
              ].filter(Boolean) as React.ReactNode[];
            })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t table-border-cell pt-4">
          <p className="text-[11px] table-text-muted">
            {debounced ? `Search results for "${debounced}"` : `Showing ${activeStatus.toLowerCase().replace("_"," ")} gyms`}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 0 || gymsQ.isFetching} onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="px-4 py-1.5 rounded-full border table-border table-bg text-[11px] font-bold table-text hover:text-white hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Previous
            </button>
            <span className="px-4 py-1.5 rounded-full border table-border table-bg-alt text-[11px] font-semibold text-white">
            Page {page + 1} of {totalPages}
          </span>
            <button type="button" disabled={!gymsQ.data?.hasNext || gymsQ.isFetching} onClick={() => setPage(p => p + 1)}
                    className="px-4 py-1.5 rounded-full border table-border table-bg text-[11px] font-bold table-text hover:text-white hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>

        <AlertDialog open={pendingDecision !== null} onOpenChange={open => !open && setPending(null)}>
          <AlertDialogContent className="border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white rounded-[20px] shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
            <AlertDialogHeader>
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-1 bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,18%)]">
                {pendingDecision?.approved
                    ? <CheckCircle className="w-6 h-6 text-green-400" strokeWidth={1.8} />
                    : <XCircle    className="w-6 h-6 text-red-400"   strokeWidth={1.8} />}
              </div>
              <AlertDialogTitle className="text-[17px] font-black tracking-tight">
                {pendingDecision?.approved ? "Approve gym" : "Reject gym"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[12px] text-[hsl(0,0%,55%)] leading-relaxed">
                {pendingDecision?.approved
                    ? `Approve ${pendingDecision.gymName} and make it live on the platform.`
                    : `Reject ${pendingDecision?.gymName} and move it to the rejected list.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,18%)] text-[hsl(0,0%,55%)] hover:text-white hover:border-white/20 text-[11px] font-black uppercase tracking-wider">
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={e => {
                    if (!pendingDecision) return;
                    e.preventDefault();
                    appMut.mutate({ gymId: pendingDecision.gymId, approved: pendingDecision.approved });
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[11px] font-black uppercase tracking-wider transition-all ${
                      pendingDecision?.approved ? "bg-green-400 text-[#071a0f] hover:bg-green-300" : "bg-red-500 text-white hover:bg-red-400"
                  }`}>
                {appMut.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : pendingDecision?.approved
                        ? <Check   className="w-3.5 h-3.5" strokeWidth={2.5} />
                        : <XCircle className="w-3.5 h-3.5" />}
                {pendingDecision?.approved ? "Approve Gym" : "Reject Gym"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
