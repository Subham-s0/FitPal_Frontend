import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FC, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/api/client";
import {
  deleteGymDocumentApi,
  getMyGymDocumentsApi,
  getMyGymProfileApi,
  patchGymBasicsStepApi,
  patchGymLocationStepApi,
  submitGymReviewSubmissionApi,
  uploadDocumentFileApi,
  upsertGymDocumentApi,
  verifyGymRegisteredEmailApi,
} from "@/api/profile.api";
import { useAuthState } from "@/hooks/useAuth";
import type {
  DocumentUploadResponse,
  GymDocumentResponse,
  GymProfileResponse,
  GymType as ApiGymType,
} from "@/models/profile.model";

type GymStepId = "gymInfo" | "location" | "docs" | "gymDone";

type DocTypeValue =
  | "REGISTRATION_CERTIFICATE"
  | "LICENSE"
  | "TAX_CERTIFICATE"
  | "OWNER_ID_PROOF"
  | "ADDRESS_PROOF"
  | "OTHER";

interface StepDef {
  id: GymStepId;
  label: string;
}

interface DocTypeDef {
  value: DocTypeValue;
  label: string;
  required: boolean;
}

interface DocRow {
  documentId?: number;
  type: DocTypeValue;
  fileName: string;
  fileUrl?: string;
  publicId?: string;
  resourceType?: string;
  uploaded: boolean;
}

interface AuthConfig {
  email: string;
  displayName: string;
  avatarUrl: string;
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  postcode?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

interface FillFields {
  street: string;
  city: string;
  postal: string;
}

interface MapSectionProps {
  onLocationPicked: (
    lat: number | null,
    lng: number | null,
    data: NominatimResult,
    fields?: FillFields,
  ) => void;
}

interface ActionsProps {
  label: string;
  step: number;
  totalSteps: number;
  hideBack?: boolean;
  onBack: () => void;
  onNext: () => void;
}

interface SidebarItem {
  label: string;
  icon: ReactNode;
}

const STEPS: StepDef[] = [
  { id: "gymInfo", label: "Basics" },
  { id: "location", label: "Location & Contact" },
  { id: "docs", label: "Documents" },
  { id: "gymDone", label: "Under Review" },
];

const HEADERS: Record<GymStepId, [string, string, string]> = {
  gymInfo: ["Basic Gym", "Information", "Gym name, type, optional registration number, optional established year, and capacity."],
  location: ["Location &", "Operating Info", "Address, coordinates, contact details and opening hours."],
  docs: ["Verification", "Documents", "Upload required documents. Encrypted and reviewed by our team."],
  gymDone: ["Submitted for", "Review", "Our team will verify your gym within 1-2 business days."],
};

const GYM_TYPES = [
  "Commercial",
  "CrossFit",
  "Yoga",
  "Martial Arts",
  "Pilates",
  "Functional",
];

const DOC_TYPES: DocTypeDef[] = [
  { value: "REGISTRATION_CERTIFICATE", label: "Registration Certificate", required: true },
  { value: "LICENSE", label: "Operating License / Permit", required: true },
  { value: "TAX_CERTIFICATE", label: "Tax Certificate", required: false },
  { value: "OWNER_ID_PROOF", label: "Owner ID Proof", required: false },
  { value: "ADDRESS_PROOF", label: "Address Proof", required: false },
  { value: "OTHER", label: "Other", required: false },
];

const KTM_BOUNDS = { minLat: 27.58, maxLat: 27.83, minLng: 85.2, maxLng: 85.52 };
const KTM_CENTER: [number, number] = [27.7172, 85.324];

const STYLE_PARTS = [
  `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --bg:#030303;--bg2:#080808;--muted:#121212;
  --border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.04);
  --text:#fff;--text-m:#a1a1aa;--text-d:#52525b;
  --orange:#f97316;--orange-glow:rgba(249,115,22,0.3);
  --fire:linear-gradient(135deg,#fcd34d 0%,#fb923c 45%,#ef4444 100%);
  --rl:1.5rem;--font:'Outfit',-apple-system,sans-serif
}
body{font-family:var(--font);background:var(--bg);color:#fff;min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
.fire-t{background:var(--fire);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.dash-nav{height:80px;padding:0 32px;background:rgba(10,10,10,.8);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;display:flex;align-items:center}
.nav-logo{display:flex;align-items:center;gap:8px;text-decoration:none}
.nav-logo-text{font-size:20px;font-weight:700;color:#fff}
.nav-search{flex:1;max-width:340px;margin:0 32px;position:relative}
.nav-search input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:8px 16px 8px 40px;color:#fff;font-family:var(--font);font-size:13px;outline:none;transition:border-color .2s}
.nav-search input:focus{border-color:rgba(234,88,12,.5)}
.nav-search input::placeholder{color:#6b7280}
.nav-si{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#6b7280;pointer-events:none}
.nav-right{display:flex;align-items:center;gap:16px;margin-left:auto}
.nav-bell{position:relative;padding:7px;border-radius:50%;background:none;border:none;cursor:pointer;color:#9ca3af;transition:background .2s}
.nav-bell:hover{background:rgba(255,255,255,.05);color:var(--orange)}
.nav-bell-dot{position:absolute;top:4px;right:8px;width:7px;height:7px;background:var(--orange);border-radius:50%}
.nav-checkin{background:rgba(234,88,12,.1);border:1px solid rgba(234,88,12,.2);color:var(--orange);padding:8px 16px;border-radius:10px;font-family:var(--font);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .2s}
.nav-checkin:hover{background:rgba(234,88,12,.2)}
.nav-div{width:1px;height:36px;background:rgba(255,255,255,.1)}
.nav-user{display:flex;align-items:center;gap:12px;cursor:pointer;transition:opacity .2s}
.nav-user:hover{opacity:.8}
.nav-ui{text-align:right;line-height:1}
.nav-un{font-size:13px;font-weight:900}
.nav-ur{font-size:9px;color:var(--orange);font-weight:700;text-transform:uppercase;letter-spacing:.15em;margin-top:3px}
.nav-av{width:48px;height:48px;border-radius:50%;border:2px solid var(--orange);padding:2px;overflow:hidden}
.nav-av img{width:100%;height:100%;border-radius:50%;object-fit:cover}
@media(max-width:640px){.nav-search,.nav-ui{display:none}}
.shell{display:flex;min-height:calc(100vh - 80px)}
.dash-sidebar{width:64px;background:rgba(8,8,8,.5);backdrop-filter:blur(15px);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:8px;transition:all .4s cubic-bezier(.19,1,.22,1);position:sticky;top:80px;height:calc(100vh - 80px);align-self:flex-start;z-index:90}
.dash-sidebar:hover{width:288px;padding:16px}
.sb-nav{flex:1;display:flex;flex-direction:column;gap:10px;overflow-y:auto}
.sb-btn{display:flex;align-items:center;width:100%;padding:12px;border-radius:999px;background:none;border:none;cursor:pointer;color:#6b7280;transition:all .3s;justify-content:center;font-family:var(--font)}
.dash-sidebar:hover .sb-btn:not(.active){border-radius:12px;justify-content:flex-start}
.dash-sidebar:hover .sb-btn.active{justify-content:flex-start}
.sb-btn:hover,.sb-btn.active{background:var(--orange);color:#000}
.sb-btn svg{min-width:22px;width:22px;height:22px;flex-shrink:0}
.sb-btn span{margin-left:14px;font-weight:700;font-size:13px;white-space:nowrap;opacity:0;display:none}
.dash-sidebar:hover .sb-btn span{opacity:1;display:block}
.sb-bottom{margin-top:auto;border-top:1px solid var(--border2);padding-top:12px;display:flex;flex-direction:column;gap:10px}
.sb-btn.logout:hover{background:#ef4444;color:#fff}
.sb-btn.logout svg{color:#ef4444}
.sb-btn.logout:hover svg{color:#fff}
@media(max-width:640px){.dash-sidebar{display:none}}
.content{flex:1;display:flex;flex-direction:column;align-items:center;padding:60px 24px 120px;background:var(--bg);position:relative;background-image:radial-gradient(circle at 10% 20%,rgba(249,115,22,.05) 0%,transparent 40%),radial-gradient(circle at 90% 80%,rgba(249,115,22,.05) 0%,transparent 40%)}
.content::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:56px 56px}
.progress-header{width:100%;max-width:580px;position:relative;z-index:1;margin-bottom:28px;display:flex;flex-direction:column;align-items:center;text-align:center;transition:max-width .4s cubic-bezier(.4,0,.2,1)}
.progress-kicker{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--orange);margin-bottom:8px}
.progress-kicker-line{height:1px;width:32px;background:var(--orange)}
.progress-title{font-size:26px;font-weight:900;letter-spacing:-.5px;text-transform:uppercase;line-height:1.1;margin-bottom:5px}
.progress-sub{font-size:13px;color:var(--text-m);line-height:1.55}
.progress-track{margin-top:20px;display:flex;align-items:center;justify-content:center;width:100%;padding-bottom:28px}
.pt-step{display:flex;flex-direction:column;align-items:center;flex-shrink:0;position:relative}
.pt-dot{width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(255,255,255,.15);background:var(--muted);color:var(--text-d);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;transition:all .3s cubic-bezier(.4,0,.2,1)}
.pt-dot.active{width:44px;height:44px;font-size:16px;background:var(--orange);border-color:rgba(255,255,255,.2);color:#fff;box-shadow:0 0 30px var(--orange-glow);transform:translateY(-2px)}
.pt-dot.done{background:var(--fire);border-color:transparent;color:#fff}
.pt-label{font-size:9px;color:var(--text-d);font-weight:700;text-transform:uppercase;letter-spacing:.05em;position:absolute;top:100%;margin-top:6px;left:50%;transform:translateX(-50%);white-space:nowrap}
.pt-label.active{color:var(--orange)}
.pt-line{flex:1;height:2px;background:rgba(255,255,255,.08);margin:0 4px;transition:background .4s;min-width:20px}
.pt-line.done{background:linear-gradient(90deg,#FF9900,#FF6A00)}
.card{width:100%;max-width:640px;background:rgba(20,20,20,.6);backdrop-filter:blur(40px);border:1px solid var(--border);border-radius:2rem;padding:48px;box-shadow:0 40px 100px -20px rgba(0,0,0,.8),inset 0 1px 1px rgba(255,255,255,.05);position:relative;z-index:10;transition:all .5s cubic-bezier(.19,1,.22,1)}
@media(max-width:500px){.card{padding:22px 16px 18px;border-radius:1.2rem}}
.screen{animation:fadeIn .2s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}
@keyframes pop{from{transform:scale(.4);opacity:0}60%{transform:scale(1.12)}to{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
.sec-label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:var(--orange);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:rgba(234,88,12,.2)}
.auth-badge{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;padding:4px 9px;border-radius:999px;color:#000;flex-shrink:0}
.auth-badge.gym{background:linear-gradient(135deg,#f59e0b,#d97706)}
.av-btn{margin-top:7px;font-size:11px;font-weight:700;color:var(--orange);background:rgba(234,88,12,.1);border:1px solid rgba(234,88,12,.25);border-radius:9px;padding:4px 11px;cursor:pointer;font-family:var(--font);transition:background .15s;text-transform:uppercase;letter-spacing:.05em}
.av-btn:hover{background:rgba(234,88,12,.2)}
.field{margin-bottom:14px}
.field label{display:block;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:var(--text-d);margin-bottom:6px;margin-left:3px}
.field input,.field select,.field textarea{width:100%;padding:14px 18px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:14px;color:#fff;font-family:var(--font);font-size:14px;font-weight:500;transition:all .2s;outline:none}
.field input:hover,.field select:hover,.field textarea:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15)}
.field input:focus,.field select:focus,.field textarea:focus{background:rgba(255,255,255,.08);border-color:var(--orange);box-shadow:0 0 0 4px var(--orange-glow)}
.field input[readonly]{background:rgba(255,255,255,.02);color:#4b5563;cursor:not-allowed}
.field textarea{resize:vertical;min-height:72px;line-height:1.5}
.field-hint{font-size:11px;color:#4b5563;margin-top:4px;margin-left:3px}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:420px){.frow{grid-template-columns:1fr}}
.pill-group{display:flex;flex-wrap:wrap;gap:7px}
.pill{padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid rgba(255,255,255,.1);background:var(--muted);color:var(--text-m);cursor:pointer;transition:all .14s;user-select:none}
.pill:hover{border-color:rgba(234,88,12,.5);color:#fff}
.pill.sel{background:var(--orange);border-color:transparent;color:#fff;box-shadow:0 2px 10px var(--orange-glow)}
.actions{display:flex;align-items:center;justify-content:space-between;padding-top:18px;border-top:1px solid rgba(255,255,255,.05);margin-top:8px}`,
  `+.btn-back{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-d);background:rgba(255,255,255,.03);border:1px solid var(--border);padding:10px 20px;border-radius:12px;cursor:pointer;transition:all .2s}
.btn-back:hover{color:#fff;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2)}
.btn-primary{padding:14px 32px;border-radius:14px;background:var(--fire);color:#fff;font-family:var(--font);font-size:13px;font-weight:800;border:none;cursor:pointer;box-shadow:0 10px 30px -10px var(--orange-glow);transition:all .3s;text-transform:uppercase;letter-spacing:.1em}
.btn-primary:hover{transform:translateY(-3px);box-shadow:0 15px 40px -10px var(--orange-glow)}
.btn-primary:active{transform:translateY(0)}
.step-count{font-size:11px;color:var(--text-d);font-weight:700}
.done-wrap{text-align:center;padding:12px 0 6px}
.done-icon{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;animation:pop .55s cubic-bezier(.34,1.56,.64,1) forwards}
.done-icon.pending{background:rgba(234,88,12,.1);border:1.5px solid rgba(234,88,12,.3);box-shadow:0 0 40px var(--orange-glow)}
.done-title{font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-.3px;margin-bottom:7px}
.done-sub{font-size:13px;color:var(--text-m);margin-bottom:24px;line-height:1.65;max-width:300px;margin-left:auto;margin-right:auto}
.done-btn{display:inline-flex;align-items:center;gap:7px;padding:13px 28px;border-radius:12px;background:var(--orange);color:#fff;font-family:var(--font);font-size:12px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 22px var(--orange-glow);transition:all .2s;text-transform:uppercase;letter-spacing:.08em}
.done-btn:hover{background:#dc4e05;transform:translateY(-2px)}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#1f2937;border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:#ea580c}
.map-search-wrap{position:relative;margin-bottom:8px}
.map-search-row{display:flex;gap:8px;align-items:stretch}
.map-search-inp-wrap{position:relative;flex:1;display:flex;align-items:center}
.map-search-icon-pos{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#4b5563;pointer-events:none;z-index:1;flex-shrink:0}
.map-search-inp{width:100%;padding:10px 14px 10px 36px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-family:var(--font);font-size:13px;outline:none;transition:border-color .2s,box-shadow .2s}
.map-search-inp:focus{border-color:rgba(234,88,12,.5);box-shadow:0 0 0 3px rgba(234,88,12,.08)}
.map-search-inp::placeholder{color:#4b5563}
.map-clear-btn{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#4b5563;padding:4px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:color .15s}
.map-clear-btn:hover{color:#9ca3af}
.map-search-btn{padding:10px 14px;background:var(--orange);border:none;border-radius:12px;color:#fff;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:800;white-space:nowrap;transition:background .18s,transform .15s;display:flex;align-items:center;gap:6px;flex-shrink:0}
.map-search-btn:hover{background:#dc4e05;transform:translateY(-1px)}
.map-search-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.map-results{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:9999;background:#111;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.85);animation:fadeIn .15s ease-out;max-height:240px;overflow-y:auto}
.map-result-item{padding:11px 14px;cursor:pointer;transition:background .12s;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:flex-start;gap:9px}
.map-result-item:last-child{border-bottom:none}
.map-result-item:hover,.map-result-item.highlighted{background:rgba(234,88,12,.12)}
.map-result-pin{color:var(--orange);margin-top:1px;flex-shrink:0}
.map-result-name{font-weight:700;color:#fff;font-size:13px;margin-bottom:2px}
.map-result-addr{font-size:11px;color:#6b7280;line-height:1.4}
.map-status{padding:14px;text-align:center;font-size:12px}
.map-status.loading{color:var(--orange);display:flex;align-items:center;justify-content:center;gap:8px}
.map-status.error{color:#6b7280}
.map-located-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#4ade80;margin-top:4px}
.spinner{width:14px;height:14px;border:2px solid rgba(249,115,22,.3);border-top-color:var(--orange);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;display:inline-block}
.loc-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:stretch;margin-top:4px}
@media(max-width:640px){.loc-grid{grid-template-columns:1fr}}
`,
];

const STYLE = STYLE_PARTS.join("\n");

const ChkWhite: FC = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 13 13">
    <path d="M2 6.5l3.5 3.5 5.5-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MapSection: FC<MapSectionProps> = ({ onLocationPicked }) => {
  const mapElRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRes, setShowRes] = useState(false);
  const [located, setLocated] = useState("");
  const [hiIdx, setHiIdx] = useState(-1);
  const [oob, setOob] = useState(false);

  const isInKtm = (lat: number, lng: number) =>
    lat >= KTM_BOUNDS.minLat &&
    lat <= KTM_BOUNDS.maxLat &&
    lng >= KTM_BOUNDS.minLng &&
    lng <= KTM_BOUNDS.maxLng;

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const lk = document.createElement("link");
      lk.id = "leaflet-css";
      lk.rel = "stylesheet";
      lk.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(lk);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!mapElRef.current || leafletRef.current || !L) return;

      const bounds = L.latLngBounds(
        [KTM_BOUNDS.minLat, KTM_BOUNDS.minLng],
        [KTM_BOUNDS.maxLat, KTM_BOUNDS.maxLng],
      );

      const map = L.map(mapElRef.current, {
        zoomControl: false,
        attributionControl: false,
        maxBounds: bounds,
        maxBoundsViscosity: 0.9,
        minZoom: 12,
      }).setView(KTM_CENTER, 14);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<div style="width:26px;height:26px;background:var(--orange);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 12px rgba(249,115,22,.6)"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

      const marker = L.marker(KTM_CENTER, { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        if (!isInKtm(p.lat, p.lng)) {
          marker.setLatLng(KTM_CENTER);
          map.flyTo(KTM_CENTER, 14);
          setOob(true);
          setTimeout(() => setOob(false), 4000);
          return;
        }

        void reverseGeocode(p.lat, p.lng);
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);
      leafletRef.current = map;
      markerRef.current = marker;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L) {
      setTimeout(init, 100);
      return;
    }

    const sc = document.createElement("script");
    sc.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    sc.onload = () => setTimeout(init, 100);
    document.head.appendChild(sc);

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleMouseDown = (event: Event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setShowRes(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, []);

  const fillFromNominatim = (data: NominatimResult) => {
    const address = data.address ?? {};
    const street = [address.road ?? address.pedestrian ?? address.footway ?? "", address.house_number ?? ""]
      .filter(Boolean)
      .join(" ");

    onLocationPicked(null, null, data, {
      street,
      city: address.city ?? address.town ?? address.village ?? address.county ?? "",
      postal: address.postcode ?? "",
    });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "FitPal/1.0" } },
      );
      const data: NominatimResult = await response.json();
      if (!data?.display_name) return;

      fillFromNominatim(data);
      const short = data.display_name.split(",").slice(0, 2).join(",").trim();
      setLocated(short);
      setQuery(short);
      onLocationPicked(lat, lng, data);
    } catch {
      // Ignore transient reverse geocode failures
    }
  };

  const doSearch = async () => {
    if (!query.trim() || query.trim().length < 2) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setLoading(true);
    setShowRes(true);
    setResults([]);
    setHiIdx(-1);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&accept-language=en&countrycodes=np&viewbox=${KTM_BOUNDS.minLng},${KTM_BOUNDS.maxLat},${KTM_BOUNDS.maxLng},${KTM_BOUNDS.minLat}&bounded=1`;
      const response = await fetch(url, {
        headers: { "User-Agent": "FitPal/1.0", "Accept-Language": "en" },
      });
      let data: NominatimResult[] = await response.json();
      data = (data ?? []).filter((item) => isInKtm(parseFloat(item.lat), parseFloat(item.lon)));
      setResults(data);
    } catch {
      // Ignore transient search failures
    }

    setLoading(false);
  };

  const selectResult = (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    if (!isInKtm(lat, lng)) {
      setOob(true);
      setTimeout(() => setOob(false), 4000);
      return;
    }

    if (leafletRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      leafletRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
    }

    fillFromNominatim(item);
    const short = item.display_name.split(",").slice(0, 2).join(",").trim();
    setQuery(short);
    setLocated(short);
    setShowRes(false);
    setResults([]);
    onLocationPicked(lat, lng, item);
  };

  const handleKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (hiIdx >= 0 && results[hiIdx]) {
        selectResult(results[hiIdx]);
        return;
      }

      void doSearch();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHiIdx((idx) => Math.min(idx + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHiIdx((idx) => Math.max(idx - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      setShowRes(false);
    }
  };

  const handleInput = (value: string) => {
    setQuery(value);
    if (value.trim().length >= 3) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void doSearch();
      }, 600);
      return;
    }

    setShowRes(false);
  };

  const OOBMsg: FC = () => (
    <div className="map-results">
      <div className="map-status error" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px" }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0, color: "#f97316" }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span style={{ color: "#e5e7eb", fontSize: 12 }}>
          <strong style={{ color: "#f97316" }}>Kathmandu Valley only.</strong> FitPal operates within Kathmandu, Lalitpur and Bhaktapur.
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="sec-label" style={{ marginBottom: 10 }}>Pin Gym Location</div>
      <div className="map-search-wrap" ref={wrapRef} style={{ marginBottom: 10 }}>
        <div className="map-search-row">
          <div className="map-search-inp-wrap">
            <svg className="map-search-icon-pos" width="14" height="14" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              className="map-search-inp"
              type="text"
              autoComplete="off"
              placeholder="Search address, landmark or area in Kathmandu..."
              value={query}
              onChange={(event) => handleInput(event.target.value)}
              onKeyDown={handleKey}
            />
            {query && (
              <button className="map-clear-btn" type="button" onClick={() => { setQuery(""); setShowRes(false); }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 14 14">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <button className="map-search-btn" type="button" disabled={loading} onClick={() => void doSearch()}>
            {loading ? (
              <span className="spinner" />
            ) : (
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            Search
          </button>
        </div>

        {showRes && (
          <div className="map-results">
            {loading && <div className="map-status loading"><span className="spinner" />Searching...</div>}
            {!loading && results.length === 0 && (
              <div className="map-status error" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px" }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0, color: "#f97316" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span style={{ color: "#e5e7eb", fontSize: 12 }}>
                  <strong style={{ color: "#f97316" }}>Outside Kathmandu Valley.</strong> FitPal operates within Kathmandu, Lalitpur and Bhaktapur only.
                </span>
              </div>
            )}
            {!loading && results.map((item, idx) => {
              const parts = item.display_name.split(",");
              return (
                <div
                  key={`${item.display_name}-${idx}`}
                  className={`map-result-item${hiIdx === idx ? " highlighted" : ""}`}
                  onClick={() => selectResult(item)}
                  onKeyDown={() => undefined}
                  role="button"
                  tabIndex={0}
                >
                  <svg className="map-result-pin" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <div>
                    <div className="map-result-name">{parts[0].trim()}</div>
                    <div className="map-result-addr">{parts.slice(1, 4).join(",").trim()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {oob && <OOBMsg />}
      </div>

      <div
        ref={mapElRef}
        style={{
          height: 300,
          width: "100%",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,.1)",
          background: "#0a0a0a",
          overflow: "hidden",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
        {located && (
          <span className="map-located-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            {located}
          </span>
        )}
        <div className="field-hint" style={{ marginTop: 0 }}>Search or drag the marker - coordinates saved automatically</div>
      </div>
    </div>
  );
};

const Actions: FC<ActionsProps> = ({ label, step, totalSteps, hideBack = false, onBack, onNext }) => (
  <div className="actions">
    {hideBack ? <span /> : <button className="btn-back" type="button" onClick={onBack}>Back</button>}
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="step-count">Step {step + 1} of {totalSteps}</span>
      <button className="btn-primary" type="button" onClick={onNext}>{label}</button>
    </div>
  </div>
);

const StepErrorBanner: FC<{ message: string }> = ({ message }) => (
  <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(239,68,68,.28)", background: "rgba(239,68,68,.08)", color: "#fca5a5", fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>
    {message}
  </div>
);

const FitPalGymSetup: FC = () => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadingDocIndex, setUploadingDocIndex] = useState<number | null>(null);
  const [activeDocumentIndex, setActiveDocumentIndex] = useState<number | null>(null);
  const [gymName, setGymName] = useState("");
  const [gymType, setGymType] = useState<ApiGymType | null>(null);
  const [gymRegNo, setGymRegNo] = useState("");
  const [gymEstablished, setGymEstablished] = useState("");
  const [gymCapacity, setGymCapacity] = useState("");
  const [gymEmailVerified, setGymEmailVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [gymContactEmail, setGymContactEmail] = useState("");
  const [gymPhone, setGymPhone] = useState("");
  const [gymWebsite, setGymWebsite] = useState("");
  const [gymDesc, setGymDesc] = useState("");
  const [gymLogoUrl, setGymLogoUrl] = useState("");
  const [gymLogoPublicId, setGymLogoPublicId] = useState("");
  const [gymLogoResourceType, setGymLogoResourceType] = useState("");
  const [gymAddressLine, setGymAddressLine] = useState("");
  const [gymCity, setGymCity] = useState("");
  const [gymCountry, setGymCountry] = useState("Nepal");
  const [gymPostal, setGymPostal] = useState("");
  const [gymLatitude, setGymLatitude] = useState<number | null>(null);
  const [gymLongitude, setGymLongitude] = useState<number | null>(null);
  const [gymOpens, setGymOpens] = useState("06:00");
  const [gymCloses, setGymCloses] = useState("22:00");
  const [docs, setDocs] = useState<DocRow[]>([
    { type: "REGISTRATION_CERTIFICATE", fileName: "", uploaded: false },
    { type: "LICENSE", fileName: "", uploaded: false },
  ]);

  const authEmail = auth.email ?? "gym.owner@fitpal.com";
  const authDisplayName = authEmail
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Gym Owner";
  const authConfig: AuthConfig = {
    email: authEmail,
    displayName: authDisplayName,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(authDisplayName)}&background=111&color=fb923c`,
  };

  const resumeStepIndex = (profile: GymProfileResponse) => {
    if (profile.submittedForReview || profile.approved || profile.dashboardAccessible) {
      return 3;
    }
    if (profile.onboardingStep >= 2) {
      return 2;
    }
    if (profile.onboardingStep >= 1) {
      return 1;
    }
    return 0;
  };

  const resolveUploadedFileName = (fileUrl?: string | null, fallback = "uploaded-file") => {
    if (!fileUrl) return fallback;
    const rawFileName = fileUrl.split("/").pop()?.split("?")[0];
    if (!rawFileName) return fallback;
    try {
      return decodeURIComponent(rawFileName);
    } catch {
      return rawFileName;
    }
  };

  const toDocRow = (document: GymDocumentResponse): DocRow => ({
    documentId: document.documentId,
    type: document.documentType as DocTypeValue,
    fileName: resolveUploadedFileName(document.fileUrl, document.documentType),
    fileUrl: document.fileUrl,
    publicId: document.publicId,
    resourceType: document.resourceType,
    uploaded: true,
  });

  const buildDocRows = (documents: GymDocumentResponse[]) => {
    const requiredRows: DocRow[] = (["REGISTRATION_CERTIFICATE", "LICENSE"] as DocTypeValue[]).map((type) => {
      const existing = documents.find((document) => document.documentType === type);
      return existing
        ? toDocRow(existing)
        : { type, fileName: "", uploaded: false };
    });

    const optionalRows = documents
      .filter((document) => document.documentType !== "REGISTRATION_CERTIFICATE" && document.documentType !== "LICENSE")
      .map(toDocRow);

    return [...requiredRows, ...optionalRows];
  };

  const applyProfileState = (profile: GymProfileResponse, documents?: GymDocumentResponse[]) => {
    setGymEmailVerified(profile.registeredEmailVerified);
    setGymName(profile.gymName ?? "");
    setGymType(profile.gymType ?? null);
    setGymRegNo(profile.registrationNo ?? "");
    setGymEstablished(profile.establishedAt != null ? String(profile.establishedAt) : "");
    setGymCapacity(profile.maxCapacity != null ? String(profile.maxCapacity) : "");
    setGymContactEmail(profile.contactEmail ?? "");
    setGymPhone(profile.phoneNo ?? "");
    setGymWebsite(profile.websiteUrl ?? "");
    setGymDesc(profile.description ?? "");
    setGymLogoUrl(profile.logoUrl ?? "");
    setGymLogoPublicId(profile.logoPublicId ?? "");
    setGymLogoResourceType(profile.logoResourceType ?? "");
    setGymAddressLine(profile.addressLine ?? "");
    setGymCity(profile.city ?? "");
    setGymCountry(profile.country ?? "Nepal");
    setGymPostal(profile.postalCode ?? "");
    setGymLatitude(profile.latitude ?? null);
    setGymLongitude(profile.longitude ?? null);
    setGymOpens(profile.opensAt ?? "06:00");
    setGymCloses(profile.closesAt ?? "22:00");
    if (documents) {
      setDocs(buildDocRows(documents));
    }
    setStep(resumeStepIndex(profile));
  };

  useEffect(() => {
    let injectedStyle: HTMLStyleElement | null = null;

    if (!document.getElementById("fitpal-gym-setup-css")) {
      const style = document.createElement("style");
      style.id = "fitpal-gym-setup-css";
      style.textContent = STYLE;
      document.head.appendChild(style);
      injectedStyle = style;
    }

    return () => {
      injectedStyle?.remove();
    };
  }, []);

  useEffect(() => {
    if (!auth.accessToken) return;
    let cancelled = false;

    const loadGymProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const [profile, documents] = await Promise.all([
          getMyGymProfileApi(),
          getMyGymDocumentsApi(),
        ]);
        if (cancelled) return;
        applyProfileState(profile, documents);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Failed to load gym onboarding profile"));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadGymProfile();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.accessToken]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    setStepError(null);
  }, [
    step,
    gymEmailVerified,
    gymName,
    gymType,
    gymRegNo,
    gymEstablished,
    gymCapacity,
    gymAddressLine,
    gymCity,
    gymCountry,
    gymPostal,
    gymLatitude,
    gymLongitude,
    gymPhone,
    gymContactEmail,
    gymWebsite,
    gymDesc,
    gymOpens,
    gymCloses,
    docs,
  ]);

  const stepId = STEPS[step]?.id ?? "gymInfo";
  const hdr = HEADERS[stepId];
  const isWide = stepId === "location" || stepId === "gymInfo";
  const cardMax = isWide ? "860px" : "580px";
  const currentYear = new Date().getFullYear();
  const establishedYearValue = Number(gymEstablished);
  const capacityValue = Number(gymCapacity);
  const hasRequiredDocuments =
    docs.some((doc) => doc.type === "REGISTRATION_CERTIFICATE" && doc.uploaded) &&
    docs.some((doc) => doc.type === "LICENSE" && doc.uploaded);
  const hasValidOperatingHours = Boolean(gymOpens && gymCloses && gymCloses > gymOpens);

  const getStep1Blocker = () => {
    if (!gymEmailVerified) return "Verify the registered email before continuing to Step 2.";
    if (!gymName.trim()) return "Gym name is required before continuing to Step 2.";
    if (!gymType) return "Select a gym type before continuing to Step 2.";
    if (gymEstablished.trim() && (!Number.isInteger(establishedYearValue) || establishedYearValue < 1900 || establishedYearValue > currentYear)) {
      return `Established year must be between 1900 and ${currentYear}.`;
    }
    if (!gymCapacity.trim()) return "Maximum member capacity is required before continuing to Step 2.";
    if (!Number.isFinite(capacityValue) || capacityValue < 10) {
      return "Maximum member capacity must be at least 10.";
    }
    return null;
  };

  const getStep2Blocker = () => {
    const step1Blocker = getStep1Blocker();
    if (step1Blocker) return "Complete Step 1 first. Step 2 stays locked until basics are complete.";
    if (!gymAddressLine.trim()) return "Street address is required before continuing to Step 3.";
    if (!gymCity.trim()) return "City is required before continuing to Step 3.";
    if (!gymCountry.trim()) return "Country is required before continuing to Step 3.";
    if (gymLatitude === null || gymLongitude === null) return "Pick the gym location on the map before continuing to Step 3.";
    if (!gymPhone.trim()) return "Phone number is required before continuing to Step 3.";
    if (!gymContactEmail.trim()) return "Contact email is required before continuing to Step 3.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gymContactEmail.trim())) {
      return "Enter a valid contact email before continuing to Step 3.";
    }
    if (!hasValidOperatingHours) return "Closing time must be after opening time before continuing to Step 3.";
    return null;
  };

  const getStep3Blocker = () => {
    const step2Blocker = getStep2Blocker();
    if (step2Blocker) return "Complete Step 2 first. Documents stay locked until location and contact details are complete.";
    if (!hasRequiredDocuments) return "Upload the required Registration Certificate and Operating License before submitting for review.";
    return null;
  };

  const isStep1Complete = getStep1Blocker() === null;
  const isStep2Complete = getStep2Blocker() === null;

  useEffect(() => {
    if (step > 0 && !isStep1Complete) {
      setStep(0);
      return;
    }
    if (step > 1 && !isStep2Complete) {
      setStep(1);
      return;
    }
    if (step > 2 && !hasRequiredDocuments) {
      setStep(2);
    }
  }, [step, isStep1Complete, isStep2Complete, hasRequiredDocuments]);

  const isBusy = isSavingStep || isUploadingLogo || uploadingDocIndex !== null;

  const goToLocationStep = async () => {
    if (isBusy) return;
    const blocker = getStep1Blocker();
    if (blocker) {
      setStepError(blocker);
      return;
    }

    setIsSavingStep(true);
    try {
      const profile = await patchGymBasicsStepApi({
        gymName: gymName.trim(),
        gymType: gymType ?? undefined,
        establishedAt: gymEstablished.trim() ? establishedYearValue : undefined,
        registrationNo: gymRegNo.trim() || undefined,
        maxCapacity: capacityValue,
      });
      applyProfileState(profile);
      setStep(1);
      toast.success("Basics saved");
    } catch (error) {
      setStepError(getApiErrorMessage(error, "Failed to save basics step"));
    } finally {
      setIsSavingStep(false);
    }
  };

  const goToDocumentsStep = async () => {
    if (isBusy) return;
    const blocker = getStep2Blocker();
    if (blocker) {
      setStepError(blocker);
      return;
    }

    setIsSavingStep(true);
    try {
      const profile = await patchGymLocationStepApi({
        addressLine: gymAddressLine.trim(),
        city: gymCity.trim(),
        country: gymCountry.trim(),
        postalCode: gymPostal.trim() || undefined,
        latitude: gymLatitude ?? undefined,
        longitude: gymLongitude ?? undefined,
        phoneNo: gymPhone.trim(),
        contactEmail: gymContactEmail.trim(),
        description: gymDesc.trim() || undefined,
        logoUrl: gymLogoUrl || undefined,
        logoPublicId: gymLogoPublicId || undefined,
        logoResourceType: gymLogoResourceType || undefined,
        websiteUrl: gymWebsite.trim() || undefined,
        opensAt: gymOpens,
        closesAt: gymCloses,
      });
      applyProfileState(profile);
      setStep(2);
      toast.success("Location and contact saved");
    } catch (error) {
      setStepError(getApiErrorMessage(error, "Failed to save location step"));
    } finally {
      setIsSavingStep(false);
    }
  };

  const goToReviewStep = async () => {
    if (isBusy) return;
    const blocker = getStep3Blocker();
    if (blocker) {
      setStepError(blocker);
      return;
    }

    setIsSavingStep(true);
    try {
      const profile = await submitGymReviewSubmissionApi();
      applyProfileState(profile);
      setStep(3);
      toast.success("Gym submitted for review");
    } catch (error) {
      setStepError(getApiErrorMessage(error, "Failed to submit gym for review"));
    } finally {
      setIsSavingStep(false);
    }
  };

  const verifyEmail = async () => {
    if (verifying || isBusy) return;
    setVerifying(true);
    try {
      const status = await verifyGymRegisteredEmailApi();
      setGymEmailVerified(status.registeredEmailVerified);
      toast.success("Registered email verified");
    } catch (error) {
      setStepError(getApiErrorMessage(error, "Failed to verify registered email"));
    } finally {
      setVerifying(false);
    }
  };

  const addDoc = () => {
    if (docs.length >= 6) {
      setStepError("You can upload at most 6 documents.");
      return;
    }
    const used = docs.map((doc) => doc.type);
    const next = DOC_TYPES.find((docType) => !docType.required && !used.includes(docType.value));
    setDocs((prev) => [...prev, { type: (next?.value ?? "OTHER") as DocTypeValue, fileName: "", uploaded: false }]);
  };

  const removeDoc = async (idx: number) => {
    const targetDoc = docs[idx];
    if (!targetDoc || targetDoc.type === "REGISTRATION_CERTIFICATE" || targetDoc.type === "LICENSE") return;

    if (targetDoc.documentId) {
      setUploadingDocIndex(idx);
      try {
        await deleteGymDocumentApi(targetDoc.documentId);
        toast.success("Document removed");
      } catch (error) {
        setStepError(getApiErrorMessage(error, "Failed to remove document"));
        setUploadingDocIndex(null);
        return;
      }
      setUploadingDocIndex(null);
    }

    setDocs((prev) => prev.filter((_, index) => index !== idx));
  };

  const setDocType = (idx: number, value: DocTypeValue) => {
    setDocs((prev) => prev.map((doc, index) => (index === idx ? { ...doc, type: value } : doc)));
  };

  const openLogoPicker = () => {
    if (isUploadingLogo) return;
    logoInputRef.current?.click();
  };

  const handleLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const uploadedAsset: DocumentUploadResponse = await uploadDocumentFileApi(file, "fitpal/gym-logos");
      setGymLogoUrl(uploadedAsset.secureUrl || uploadedAsset.url);
      setGymLogoPublicId(uploadedAsset.publicId);
      setGymLogoResourceType(uploadedAsset.resourceType);
      toast.success("Logo uploaded");
    } catch (error) {
      setStepError(getApiErrorMessage(error, "Failed to upload logo"));
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  };

  const openDocumentPicker = (idx: number) => {
    setActiveDocumentIndex(idx);
    documentInputRef.current?.click();
  };

  const handleDocumentSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const targetIndex = activeDocumentIndex;
    event.target.value = "";

    if (!file || targetIndex === null) {
      return;
    }

    const targetDoc = docs[targetIndex];
    if (!targetDoc) {
      return;
    }

    setUploadingDocIndex(targetIndex);
    try {
      if (targetDoc.type === "OTHER" && targetDoc.documentId) {
        await deleteGymDocumentApi(targetDoc.documentId);
      }

      const uploadedAsset = await uploadDocumentFileApi(file, "fitpal/gym-documents");
      const savedDocument = await upsertGymDocumentApi({
        documentType: targetDoc.type,
        publicId: uploadedAsset.publicId,
        resourceType: uploadedAsset.resourceType,
        fileUrl: uploadedAsset.secureUrl || uploadedAsset.url,
      });

      setDocs((prev) => prev.map((doc, index) => (
        index === targetIndex
          ? {
              ...doc,
              documentId: savedDocument.documentId,
              fileName: file.name,
              fileUrl: savedDocument.fileUrl,
              publicId: savedDocument.publicId,
              resourceType: savedDocument.resourceType,
              uploaded: true,
            }
          : doc
      )));
      toast.success("Document uploaded");
    } catch (error) {
      setStepError(getApiErrorMessage(error, "Failed to upload document"));
    } finally {
      setUploadingDocIndex(null);
      setActiveDocumentIndex(null);
    }
  };

  const onLocationPicked = useCallback((
    lat: number | null,
    lng: number | null,
    _data: NominatimResult,
    fields?: FillFields,
  ) => {
    if (lat !== null) setGymLatitude(lat);
    if (lng !== null) setGymLongitude(lng);
    if (!fields) return;
    if (fields.street) setGymAddressLine(fields.street);
    if (fields.city) setGymCity(fields.city);
    if (fields.postal) setGymPostal(fields.postal);
  }, []);

  const Track: FC = () => (
    <div className="progress-track">
      {STEPS.map((currentStep, index) => {
        const done = index < step;
        const active = index === step;

        return (
          <span key={currentStep.id} style={{ display: "contents" }}>
            <div className="pt-step">
              <div className={`pt-dot${done ? " done" : active ? " active" : ""}`}>
                {done ? <ChkWhite /> : index + 1}
              </div>
              <div className={`pt-label${active ? " active" : ""}`}>{currentStep.label}</div>
            </div>
            {index < STEPS.length - 1 && <div className={`pt-line${index < step ? " done" : ""}`} />}
          </span>
        );
      })}
    </div>
  );

  const ScreenGymInfo: FC = () => (
    <div className="screen animate-[screenFadeIn_0.2s_ease-out]">
      {stepError && <StepErrorBanner message={stepError} />}
      <input
        ref={logoInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
        style={{ display: "none" }}
        onChange={handleLogoSelected}
      />
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", alignItems: "start" }} className="lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">
        
        {/* Left Column: Owner Meta & Logo Upload */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Owner Details Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px", background: "#101010", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1.35rem", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--orange)", padding: 2, overflow: "hidden", flexShrink: 0 }}>
                <img src={authConfig.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{authConfig.displayName}</div>
                <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2, fontWeight: 600 }}>Registered Account</div>
              </div>
              <div className="auth-badge gym" style={{ alignSelf: "flex-start", marginTop: 4 }}>Owner</div>
            </div>
            
            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: `1px solid ${gymEmailVerified ? "rgba(52,211,153,.3)" : "rgba(255,255,255,.06)"}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}>
               <div style={{ flex: 1, minWidth: 0 }}>
                 <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-d)", marginBottom: 4 }}>Login Email</div>
                 <div style={{ fontSize: 12, color: gymEmailVerified ? "#4ade80" : "#9ca3af", overflow: "hidden", textOverflow: "ellipsis" }}>{authConfig.email}</div>
               </div>
               {!gymEmailVerified && (
                 <button type="button" onClick={verifyEmail} disabled={verifying} className="av-btn" style={{ margin: 0 }}>
                    {verifying ? "..." : "Verify"}
                 </button>
               )}
            </div>
          </div>
          
          {/* Gym Logo Upload Card */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px", background: "linear-gradient(180deg, rgba(120,63,23,0.32) 0%, rgba(27,18,11,0.96) 58%, rgba(15,15,15,1) 100%)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "1.45rem", alignItems: "center", boxShadow: "inset 0 1px 0 rgba(255,214,170,0.08)" }}>
             <div style={{ width: 96, height: 96, borderRadius: "50%", border: "2px solid var(--orange)", padding: 4, overflow: "hidden", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)", position: "relative" }}>
                {gymLogoUrl ? (
                   <img src={gymLogoUrl} alt="Gym Logo" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                   <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: "#4b5563" }}>
                     <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                     <circle cx="12" cy="13" r="4" />
                   </svg>
                )}
             </div>
             <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Gym Logo</div>
             <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16, textAlign: "center" }}>JPG or PNG - Max 2MB<br/>Used as your public profile photo.</div>
             <button type="button" onClick={openLogoPicker} disabled={isUploadingLogo} style={{ padding: "8px 16px", borderRadius: "0.9rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background="rgba(255,255,255,0.1)"} onMouseOut={(e) => e.currentTarget.style.background="rgba(255,255,255,0.05)"}>
               {isUploadingLogo ? "Uploading..." : gymLogoUrl ? "Change Logo" : "Upload Logo"}
             </button>
          </div>
        </div>

        {/* Right Column: Gym Details Form */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="sec-label" style={{ marginBottom: 14 }}>Core Gym Details</div>

          <div className="field">
            <label>Gym name <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="text" placeholder="e.g. FitZone Kathmandu" value={gymName} onChange={(event) => setGymName(event.target.value)} />
          </div>

          <div className="field">
            <label>Gym type <span style={{ color: "#ef4444" }}>*</span></label>
            <div className="pill-group">
              {GYM_TYPES.map((type) => (
                <div key={type} className={`pill${gymType === type ? " sel" : ""}`} onClick={() => setGymType((current) => current === type ? null : type as ApiGymType)}>
                  {type}
                </div>
              ))}
            </div>
          </div>

          <div className="frow">
            <div className="field">
              <label>Registration No.</label>
              <input type="text" placeholder="e.g. 123456/079/080" value={gymRegNo} onChange={(event) => setGymRegNo(event.target.value)} />
            </div>
            <div className="field">
              <label>Established Year <span style={{ color: "var(--text-d)" }}>optional</span></label>
              <input type="number" placeholder="e.g. 2018" min={1900} max={currentYear} value={gymEstablished} onChange={(event) => setGymEstablished(event.target.value)} />
            </div>
          </div>

          <div className="field" style={{ flex: 1 }}>
            <label>Maximum Member Capacity <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="number" placeholder="e.g. 150" min={10} value={gymCapacity} onChange={(event) => setGymCapacity(event.target.value)} />
            <div className="field-hint">Total concurrent members your facility can safely accommodate.</div>
          </div>
          
          <div style={{ alignSelf: "flex-end", width: "100%" }}>
            <Actions label="Save and Continue" step={step} totalSteps={STEPS.length} hideBack onBack={() => undefined} onNext={goToLocationStep} />
          </div>
        </div>
      </div>
    </div>
  );

  const ScreenLocation: FC = () => (
    <div className="screen animate-[screenFadeIn_0.2s_ease-out]">
      {stepError && <StepErrorBanner message={stepError} />}
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", alignItems: "start" }} className="lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">
        
        {/* Left Column: Map Picker */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px", background: "var(--muted)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "1.45rem" }}>
             <MapSection onLocationPicked={onLocationPicked} />
          </div>
        </div>

        {/* Right Column: Address and Contact details */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--orange)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              Address Details<span style={{ flex: 1, height: 1, background: "rgba(234,88,12,.2)" }} />
            </div>
            <div className="field">
              <label>Street address <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" placeholder="123 Durbar Marg" value={gymAddressLine} onChange={(event) => setGymAddressLine(event.target.value)} />
            </div>
            <div className="frow">
              <div className="field">
                <label>City <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" placeholder="Kathmandu" value={gymCity} onChange={(event) => setGymCity(event.target.value)} />
              </div>
              <div className="field">
                <label>Postal code</label>
                <input type="text" placeholder="44600" value={gymPostal} onChange={(event) => setGymPostal(event.target.value)} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Country <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" placeholder="Nepal" value={gymCountry} onChange={(event) => setGymCountry(event.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--orange)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              Contact and Operating Hours<span style={{ flex: 1, height: 1, background: "rgba(234,88,12,.2)" }} />
            </div>
            <div className="field">
              <label>Phone number <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="tel" placeholder="+977 01-xxxxxxx" value={gymPhone} onChange={(event) => setGymPhone(event.target.value)} />
            </div>
            <div className="field">
              <label>Contact email <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="email" placeholder="public@yourgym.com" value={gymContactEmail} onChange={(event) => setGymContactEmail(event.target.value)} />
              <div className="field-hint">Shown to members - separate from your login email</div>
            </div>
            <div className="field">
              <label>Website <span style={{ color: "var(--text-d)" }}>optional</span></label>
              <input type="url" placeholder="https://yourgym.com" value={gymWebsite} onChange={(event) => setGymWebsite(event.target.value)} />
            </div>
            <div className="frow">
              <div className="field">
                <label>Opens at <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="time" value={gymOpens} onChange={(event) => setGymOpens(event.target.value)} />
              </div>
              <div className="field">
                <label>Closes at <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="time" value={gymCloses} onChange={(event) => setGymCloses(event.target.value)} />
              </div>
            </div>
            <div className="field" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label>Description <span style={{ color: "var(--text-d)" }}>optional</span></label>
              <textarea placeholder="Describe your facilities, equipment, and what makes your gym unique..." value={gymDesc} onChange={(event) => setGymDesc(event.target.value)} style={{ flex: 1, minHeight: 80, resize: "none" }} />
            </div>
          </div>
          
          <div style={{ alignSelf: "flex-end", width: "100%", marginTop: "8px" }}>
            <Actions label="Save and Continue" step={step} totalSteps={STEPS.length} onBack={() => setStep(0)} onNext={goToDocumentsStep} />
          </div>
        </div>
      </div>
    </div>
  );

  const ScreenDocs: FC = () => {
    return (
      <div className="screen">
        {stepError && <StepErrorBanner message={stepError} />}
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
          style={{ display: "none" }}
          onChange={handleDocumentSelected}
        />
        <div className="sec-label">Verification Documents</div>
        <p style={{ fontSize: 12, color: "var(--text-m)", marginBottom: 18, lineHeight: 1.6 }}>
          All documents are reviewed by our team and never shared publicly. Uploads are encrypted.
        </p>

        {docs.map((doc, idx) => {
          const isRequired = doc.type === "REGISTRATION_CERTIFICATE" || doc.type === "LICENSE";
          const docLabel = (DOC_TYPES.find((docType) => docType.value === doc.type) ?? { label: doc.type }).label;

          return (
            <div key={`${doc.type}-${idx}`} style={{ background: "var(--muted)", border: `1px solid ${isRequired ? "rgba(249,115,22,.15)" : "rgba(255,255,255,.06)"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 12, position: "relative" }}>
              {isRequired && (
                <div style={{ position: "absolute", top: -1, right: 14, fontSize: 8, fontWeight: 900, color: "var(--orange)", background: "var(--muted)", padding: "2px 8px", borderRadius: "0 0 8px 8px", border: "1px solid rgba(249,115,22,.2)", borderTop: "none", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Required
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <select
                    disabled={isRequired || doc.uploaded}
                    value={doc.type}
                    onChange={(event) => setDocType(idx, event.target.value as DocTypeValue)}
                    style={{ width: "100%", padding: "11px 32px 11px 14px", background: isRequired ? "rgba(249,115,22,.06)" : "rgba(255,255,255,.04)", border: `1px solid ${isRequired ? "rgba(249,115,22,.2)" : "rgba(255,255,255,.08)"}`, borderRadius: 10, color: isRequired ? "var(--orange)" : "#e5e7eb", fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, outline: "none", appearance: "none", WebkitAppearance: "none", cursor: isRequired || doc.uploaded ? "default" : "pointer" }}
                  >
                    {isRequired ? (
                      <option value={doc.type}>{docLabel}</option>
                    ) : (
                      DOC_TYPES.filter((docType) => !docType.required).map((docType) => (
                        <option key={docType.value} value={docType.value}>{docType.label}</option>
                      ))
                    )}
                  </select>
                  <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#4b5563" }} width="10" height="6" fill="none" viewBox="0 0 10 6">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                {!isRequired && (
                  <button
                    type="button"
                    onClick={() => removeDoc(idx)}
                    style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", color: "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
                    onMouseOver={(event) => { const button = event.currentTarget; button.style.background = "rgba(239,68,68,.1)"; button.style.borderColor = "rgba(239,68,68,.25)"; button.style.color = "#ef4444"; }}
                    onMouseOut={(event) => { const button = event.currentTarget; button.style.background = "rgba(255,255,255,.02)"; button.style.borderColor = "rgba(255,255,255,.07)"; button.style.color = "#4b5563"; }}
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 14 14">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>

              {doc.uploaded ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: "rgba(52,211,153,.06)", border: "1.5px solid rgba(52,211,153,.2)", borderRadius: 12, marginTop: 10 }}>
                  <svg style={{ flexShrink: 0, color: "#4ade80" }} width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName}</span>
                  <button
                    type="button"
                    onClick={() => openDocumentPicker(idx)}
                    style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#4b5563", fontSize: 10, fontWeight: 700, fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: ".06em", padding: "2px 6px", borderRadius: 6 }}
                    onMouseOver={(event) => { event.currentTarget.style.color = "#ef4444"; }}
                    onMouseOut={(event) => { event.currentTarget.style.color = "#4b5563"; }}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 20, background: "rgba(255,255,255,.02)", border: "1.5px dashed rgba(255,255,255,.09)", borderRadius: 12, cursor: "pointer", transition: "all .18s", marginTop: 10 }}
                  onClick={() => openDocumentPicker(idx)}
                  onKeyDown={() => undefined}
                  role="button"
                  tabIndex={0}
                  onMouseOver={(event) => { const box = event.currentTarget; box.style.borderColor = "rgba(249,115,22,.4)"; box.style.background = "rgba(249,115,22,.03)"; }}
                  onMouseOut={(event) => { const box = event.currentTarget; box.style.borderColor = "rgba(255,255,255,.09)"; box.style.background = "rgba(255,255,255,.02)"; }}
                >
                  <svg style={{ color: "#4b5563" }} width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <path d="M10 13V7m0 0L7 10m3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#4b5563" }}>
                    {uploadingDocIndex === idx ? "Uploading..." : "Click to upload"}
                  </span>
                  <span style={{ fontSize: 10, color: "#374151", fontWeight: 600 }}>PDF / JPG / PNG - Max 10MB</span>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addDoc}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center", padding: 12, borderRadius: 12, border: "1.5px dashed rgba(249,115,22,.25)", background: "rgba(249,115,22,.03)", color: "var(--orange)", fontFamily: "var(--font)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .18s", textTransform: "uppercase", letterSpacing: ".07em", marginTop: 4 }}
          onMouseOver={(event) => { event.currentTarget.style.background = "rgba(249,115,22,.08)"; event.currentTarget.style.borderColor = "rgba(249,115,22,.45)"; }}
          onMouseOut={(event) => { event.currentTarget.style.background = "rgba(249,115,22,.03)"; event.currentTarget.style.borderColor = "rgba(249,115,22,.25)"; }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 14 14">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Document
        </button>

        {hasRequiredDocuments ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 12, marginTop: 16 }}>
            <svg style={{ color: "#4ade80", flexShrink: 0 }} width="15" height="15" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>Ready to submit - required documents uploaded.</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, marginTop: 16 }}>
            <svg style={{ color: "#52525b", flexShrink: 0 }} width="15" height="15" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#52525b" }}>Upload both required documents above to continue.</span>
          </div>
        )}

        <Actions label="Submit for Review" step={step} totalSteps={STEPS.length} onBack={() => setStep(1)} onNext={goToReviewStep} />
      </div>
    );
  };

  const ScreenGymDone: FC = () => (
    <div className="screen done-wrap">
      <div className="done-icon pending">
        <svg width="34" height="34" fill="none" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="13" stroke="#ea580c" strokeWidth="2" />
          <path d="M18 12v7l5 2.5" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="done-title">Pending Review</div>
      <div className="done-sub">
        Documents submitted. Our team will verify your gym within <strong style={{ color: "var(--orange)" }}>1-2 business days</strong>. Confirmation sent to <strong style={{ color: "#fff" }}>{authConfig.email}</strong>.
      </div>
      <button className="done-btn" type="button" onClick={() => navigate("/dashboard", { state: { activeSection: "profile" } })}>
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Track Verification
      </button>
    </div>
  );

  const ScreenLoading: FC = () => (
    <div className="screen" style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--orange)", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
        <span className="spinner" />
        Loading gym profile
      </div>
    </div>
  );

  const SIDEBAR_ITEMS: SidebarItem[] = [
    { label: "Dashboard", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" /><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" /><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" /><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" /></> },
    { label: "Gyms", icon: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></> },
    { label: "Routines", icon: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 000 4h6a2 2 0 000-4M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> },
    { label: "Exercises", icon: <path d="M6 4v4m0 0v4m0-4H4m2 0h2M18 4v4m0 0v4m0-4h-2m2 0h2M4 14h2m0 0v4m0-4v-2m0 6h2M16 14h2m0 0v4m0-4v-2m0 6h2M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> },
  ];

  const renderCurrentScreen = () => {
    if (isLoadingProfile) {
      return <ScreenLoading />;
    }

    switch (stepId) {
      case "gymInfo":
        return <ScreenGymInfo />;
      case "location":
        return <ScreenLocation />;
      case "docs":
        return <ScreenDocs />;
      case "gymDone":
        return <ScreenGymDone />;
      default:
        return <ScreenGymInfo />;
    }
  };

  const handleSidebarClick = (label: string) => {
    if (label === "Profile") {
      navigate("/dashboard", { state: { activeSection: "profile" } });
      return;
    }

    navigate("/dashboard");
  };

  return (
    <>
      <nav className="dash-nav">
        <a className="nav-logo" href="/dashboard">
          <img src="/logo.svg" alt="FitPal Logo" style={{ width: 48, height: 48, flexShrink: 0 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="nav-logo-text"><span className="fire-t">Fit</span>Pal</span>
            <span style={{ fontSize: 8, fontWeight: 900, color: "#fbbf24", background: "rgba(249,115,22,.1)", border: "1px solid rgba(249,115,22,.3)", borderRadius: 6, padding: "3px 8px", textTransform: "uppercase", letterSpacing: ".08em" }}>Gym</span>
          </div>
        </a>
        <div className="nav-search">
          <svg className="nav-si" width="15" height="15" fill="none" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input type="text" placeholder="Search routines..." />
        </div>
        <div className="nav-right">
          <button className="nav-bell" type="button">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="nav-bell-dot" />
          </button>
          <button className="nav-checkin" type="button">Check In</button>
          <div className="nav-div" />
          <div className="nav-user">
            <div className="nav-ui">
              <p className="nav-un">{authConfig.displayName}</p>
              <p className="nav-ur">Gym Owner</p>
            </div>
            <div className="nav-av"><img src={authConfig.avatarUrl} alt="" /></div>
          </div>
        </div>
      </nav>

      <div className="shell">
        <aside className="dash-sidebar">
          <nav className="sb-nav">
            {SIDEBAR_ITEMS.map(({ label, icon }) => (
              <button key={label} className="sb-btn" type="button" onClick={() => handleSidebarClick(label)}>
                <svg fill="none" viewBox="0 0 24 24">{icon}</svg>
                <span>{label}</span>
              </button>
            ))}
            <button className="sb-btn active" type="button" onClick={() => handleSidebarClick("Profile")}>
              <svg fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M4 20c0-4.418 3.582-7 8-7s8 2.582 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Profile</span>
            </button>
          </nav>
          <div className="sb-bottom">
            <button className="sb-btn" type="button" onClick={() => navigate("/profile")}>
              <svg fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>Settings</span>
            </button>
            <button className="sb-btn logout" type="button" onClick={() => navigate("/logout")}>
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="content">
          <div className="progress-header" style={{ maxWidth: cardMax }}>
            <div className="progress-kicker">
              <div className="progress-kicker-line" />FitPal Profile Setup
            </div>
            <h1 className="progress-title">{hdr[0]} <span className="fire-t">{hdr[1]}</span></h1>
            <p className="progress-sub">{hdr[2]}</p>
            <Track />
          </div>

          <div className="card" style={{ maxWidth: cardMax }}>
            {renderCurrentScreen()}
          </div>

          <p style={{ marginTop: 14, fontSize: 11, color: "#374151", textAlign: "center", position: "relative", zIndex: 1 }}>
            By continuing you agree to our <a href="#" style={{ color: "var(--orange)", textDecoration: "none" }}>Terms</a> and <a href="#" style={{ color: "var(--orange)", textDecoration: "none" }}>Privacy Policy</a>
          </p>
        </main>
      </div>
    </>
  );
};

export default FitPalGymSetup;
