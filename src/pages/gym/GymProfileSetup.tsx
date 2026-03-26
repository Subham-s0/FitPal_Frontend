import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  FC,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/api/client";
import DefaultLayout from "@/components/DefaultLayout";
import { NumberInput } from "@/components/ui/number-input";
import { TimeInput } from "@/components/ui/time-picker";
import {
  deleteGymLogoApi,
  deleteUploadedAssetApi,
  deleteGymDocumentApi,
  deleteGymPhotoApi,
  createGymPhotoApi,
  getMyGymDocumentsApi,
  getMyGymPhotosApi,
  getMyGymProfileApi,
  patchGymBasicsStepApi,
  patchGymLocationStepApi,
  patchGymPayoutStepApi,
  submitGymReviewSubmissionApi,
  uploadDocumentFileApi,
  uploadGymLogoApi,
  uploadImageFileApi,
  updateGymPhotoApi,
  upsertGymDocumentApi,
  verifyGymRegisteredEmailApi,
} from "@/api/profile.api";
import { useAuthState } from "@/hooks/useAuth";
import type {
  DocumentUploadResponse,
  GymApprovalStatus,
  GymDocumentResponse,
  GymPhotoResponse,
  GymProfileResponse,
  GymType as ApiGymType,
} from "@/models/profile.model";
import { authStore } from "@/store/auth.store";

// ─── Types ────────────────────────────────────────────────────────────────────

type GymStepId =
  | "gymInfo"
  | "location"
  | "payout"
  | "docs"
  | "reviewSubmit"
  | "gymDone";

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

interface PhotoRow {
  photoId: number | null;
  publicId: string;
  resourceType: string;
  photoUrl: string;
  caption: string;
  displayOrder: number | null;
  cover: boolean;
}

interface LocationAddress {
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

interface LocationResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: LocationAddress;
}

interface PhotonProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  district?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

interface PhotonFeature {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: PhotonProperties;
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

interface FillFields {
  street: string;
  city: string;
  postal: string;
}

interface MapSectionProps {
  initialLatitude: number | null;
  initialLongitude: number | null;
  onLocationPicked: (
    lat: number | null,
    lng: number | null,
    data: LocationResult,
    fields?: FillFields,
  ) => void;
}

interface ActionsProps {
  label: string;
  step: number;
  totalSteps: number;
  hideBack?: boolean;
  disabled?: boolean;
  onBack: () => void;
  onNext: () => void;
}

type GymFieldKey =
  | "gymEmailVerified"
  | "gymName"
  | "gymType"
  | "gymEstablished"
  | "gymCapacity"
  | "gymAddressLine"
  | "gymCity"
  | "gymCountry"
  | "gymCoordinates"
  | "gymPhone"
  | "gymContactEmail"
  | "gymOpens"
  | "gymCloses"
  | "esewaWalletId"
  | "esewaAccountName"
  | "khaltiWalletId"
  | "khaltiAccountName"
  | "payoutSelection"
  | "documents"
  | "photos";

type GymFieldErrors = Partial<Record<GymFieldKey, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  { id: "gymInfo", label: "Basics" },
  { id: "location", label: "Location & Contact" },
  { id: "payout", label: "Payout Wallets" },
  { id: "docs", label: "Documents" },
  { id: "reviewSubmit", label: "Please Check Again" },
  { id: "gymDone", label: "Under Review" },
];

const TRACK_STEPS: StepDef[] = STEPS.filter(step => step.id !== "reviewSubmit");

// Derived step indices — no magic numbers scattered through the file
const DOCUMENTS_STEP_INDEX    = STEPS.findIndex(s => s.id === "docs");
const REVIEW_SUBMIT_STEP_INDEX = STEPS.findIndex(s => s.id === "reviewSubmit");
const FINAL_REVIEW_STEP_INDEX  = STEPS.length - 1;

const HEADERS: Record<GymStepId, [string, string, string]> = {
  gymInfo:      ["Basic Gym", "Information", "Gym name, type, optional registration number, optional established year, and capacity."],
  location:     ["Location &", "Operating Info", "Address, coordinates, contact details and opening hours."],
  payout:       ["Payout", "Wallets", "Link eSewa and/or Khalti for revenue payouts."],
  docs:         ["Verification", "Documents", "Upload required documents and at least one gym photo."],
  reviewSubmit: ["Please Check", "Again", "Review all uploaded details before final submission."],
  gymDone:      ["Submission", "Review", "Your profile is now under review and locked for edits."],
};

const GYM_TYPES = ["Commercial", "CrossFit", "Yoga", "Martial Arts", "Pilates", "Functional"];

const DOC_TYPES: DocTypeDef[] = [
  { value: "REGISTRATION_CERTIFICATE", label: "Registration Certificate",    required: true  },
  { value: "LICENSE",                  label: "Operating License / Permit",  required: true  },
  { value: "TAX_CERTIFICATE",          label: "Tax Certificate",             required: false },
  { value: "OWNER_ID_PROOF",           label: "Owner ID Proof",              required: false },
  { value: "ADDRESS_PROOF",            label: "Address Proof",               required: false },
  { value: "OTHER",                    label: "Other",                       required: false },
];

const REQUIRED_DOC_TYPES: DocTypeValue[] = ["REGISTRATION_CERTIFICATE", "LICENSE"];
const REQUIRED_DOC_TYPE_SET = new Set<DocTypeValue>(REQUIRED_DOC_TYPES);

const KTM_BOUNDS = { minLat: 27.58, maxLat: 27.83, minLng: 85.2, maxLng: 85.52 };
const KTM_CENTER: [number, number] = [27.7172, 85.324];

const KHALTI_LOGO_URL = "https://khaltibyime.khalti.com/wp-content/uploads/2025/07/Logo-for-Blog.png";
const ESEWA_LOGO_URL  = "https://esewa.com.np/common/images/esewa_logo.png";
const MAX_GYM_PHOTOS  = 12;
const MAX_GYM_DOCS    = 6;
const LOCATION_SEARCH_MIN_CHARS = 3;

const STEP1_FIELD_KEYS: readonly GymFieldKey[] = [
  "gymEmailVerified",
  "gymName",
  "gymType",
  "gymEstablished",
  "gymCapacity",
];

const STEP2_FIELD_KEYS: readonly GymFieldKey[] = [
  "gymAddressLine",
  "gymCity",
  "gymCountry",
  "gymCoordinates",
  "gymPhone",
  "gymContactEmail",
  "gymOpens",
  "gymCloses",
];

const STEP3_FIELD_KEYS: readonly GymFieldKey[] = [
  "payoutSelection",
  "esewaWalletId",
  "esewaAccountName",
  "khaltiWalletId",
  "khaltiAccountName",
];

const STEP4_FIELD_KEYS: readonly GymFieldKey[] = [
  "documents",
  "photos",
];

// Moved out of component — pure function, no closure needed
const isValidNepalMobileNumber = (value: string) => /^(98|97)\d{8}$/.test(value.trim());

const isInKtm = (lat: number, lng: number) =>
  lat >= KTM_BOUNDS.minLat && lat <= KTM_BOUNDS.maxLat &&
  lng >= KTM_BOUNDS.minLng && lng <= KTM_BOUNDS.maxLng;

const isRequiredDocType = (type: DocTypeValue) => REQUIRED_DOC_TYPE_SET.has(type);
const isSingletonDocType = (type: DocTypeValue) => type !== "OTHER";

const hasPhotoId = (photoId: number | null | undefined): photoId is number =>
  typeof photoId === "number" && photoId > 0;

// Helper: Validate wallet provider (reduces duplicate eSewa/Khalti validation)
const validateWalletProvider = (
  enabled: boolean,
  walletId: string,
  accountName: string,
  providerName: string
): { walletIdError?: string; accountNameError?: string } => {
  if (!enabled) return {};
  
  const errors: { walletIdError?: string; accountNameError?: string } = {};
  
  if (!walletId.trim()) {
    errors.walletIdError = `${providerName} wallet number is required.`;
  } else if (!isValidNepalMobileNumber(walletId)) {
    errors.walletIdError = "Must start with 98 or 97 followed by 8 digits.";
  }
  
  if (!accountName.trim()) {
    errors.accountNameError = `${providerName} account name is required.`;
  }
  
  return errors;
};

const photonFeatureToLocationResult = (feature: PhotonFeature): LocationResult | null => {
  const coordinates = feature.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;

  const [lon, lat] = coordinates;
  const properties = feature.properties ?? {};
  const streetLine = [properties.street ?? "", properties.housenumber ?? ""].filter(Boolean).join(" ").trim();
  const city = properties.city ?? properties.district ?? properties.county ?? "";
  const displayName = [
    properties.name ?? "",
    streetLine,
    city,
    properties.country ?? "",
  ].filter(Boolean).join(", ");

  return {
    lat: String(lat),
    lon: String(lon),
    display_name: displayName || `${lat}, ${lon}`,
    address: {
      road: properties.street,
      house_number: properties.housenumber,
      city: properties.city,
      county: properties.district ?? properties.county,
      postcode: properties.postcode,
    },
  };
};

// ─── Styles ───────────────────────────────────────────────────────────────────
// Single string — STYLE_PARTS array was an arbitrary split with no benefit

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --bg:#030303;--bg2:#080808;--muted:#121212;
  --border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.04);
  --text:#fff;--text-m:#a1a1aa;--text-d:#52525b;
  --orange:#f97316;--orange-glow:rgba(249,115,22,0.3);
  --fire:linear-gradient(135deg,#fcd34d 0%,#fb923c 45%,#ef4444 100%);
  --font:'Outfit',-apple-system,sans-serif
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
.actions{display:flex;align-items:center;justify-content:space-between;padding-top:18px;border-top:1px solid rgba(255,255,255,.05);margin-top:8px}
.btn-back{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-d);background:rgba(255,255,255,.03);border:1px solid var(--border);padding:10px 20px;border-radius:12px;cursor:pointer;transition:all .2s}
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
.done-actions{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
.done-btn{display:inline-flex;align-items:center;gap:7px;padding:13px 28px;border-radius:999px;background:var(--orange);color:#fff;font-family:var(--font);font-size:12px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 22px var(--orange-glow);transition:all .2s;text-transform:uppercase;letter-spacing:.08em}
.done-btn:hover{background:#dc4e05;transform:translateY(-2px)}
.corner-action-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 24px;border-radius:999px;background:rgba(249,115,22,.05);border:1px solid rgba(249,115,22,.2);backdrop-filter:blur(20px);color:#fff;font-family:var(--font);cursor:pointer;transition:all .3s}
.corner-action-btn:hover{background:rgba(249,115,22,.1)}
.corner-action-btn span{font-size:11px;font-weight:900;text-transform:uppercase;line-height:1;letter-spacing:.18em;transition:color .3s}
.corner-action-btn:hover span{color:var(--orange)}
@media(max-width:500px){.done-actions{gap:8px}.corner-action-btn,.done-btn{padding:11px 18px}.corner-action-btn span{font-size:10px;letter-spacing:.14em}}
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
`;

// ─── Small components ─────────────────────────────────────────────────────────

const ChkWhite: FC = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 13 13">
    <path d="M2 6.5l3.5 3.5 5.5-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StepErrorBanner: FC<{ message: string }> = ({ message }) => (
  <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(239,68,68,.28)", background: "rgba(239,68,68,.08)", color: "#fca5a5", fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>
    {message}
  </div>
);

const FieldError: FC<{ message?: string }> = ({ message }) => (
  message ? (
    <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 5, marginLeft: 3, fontWeight: 600, lineHeight: 1.45 }}>
      {message}
    </div>
  ) : null
);

const StatusBanner: FC<{ title: string; message: string }> = ({ title, message }) => (
  <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(249,115,22,.28)", background: "rgba(249,115,22,.08)", color: "#fed7aa", lineHeight: 1.6 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: "#fb923c", marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 12, fontWeight: 600 }}>{message}</div>
  </div>
);

const Actions: FC<ActionsProps> = ({ label, step, totalSteps, hideBack = false, disabled = false, onBack, onNext }) => (
  <div className="actions">
    {hideBack ? <span /> : (
      <button className="btn-back" type="button" onClick={onBack} disabled={disabled} style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}>
        Back
      </button>
    )}
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="step-count">Step {step + 1} of {totalSteps}</span>
      <button className="btn-primary" type="button" onClick={onNext} disabled={disabled} style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, transform: "none" }}>
        {label}
      </button>
    </div>
  </div>
);

// ─── MapSection ───────────────────────────────────────────────────────────────

const MapSection: FC<MapSectionProps> = ({ initialLatitude, initialLongitude, onLocationPicked }) => {
  const mapElRef  = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef  = useRef<any>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRes, setShowRes] = useState(false);
  const [located, setLocated] = useState("");
  const [hiIdx,   setHiIdx]   = useState(-1);
  const [oob,     setOob]     = useState(false);

  const initialMapPosition: [number, number] =
    initialLatitude !== null && initialLongitude !== null && isInKtm(initialLatitude, initialLongitude)
      ? [initialLatitude, initialLongitude]
      : KTM_CENTER;

  const lastValidPositionRef = useRef<[number, number]>(initialMapPosition);

  const rememberValidPosition = (lat: number, lng: number) => {
    lastValidPositionRef.current = [lat, lng];
  };

  // Helper: Show out-of-bounds error (reduces duplicate OOB logic)
  const showOutOfBoundsError = useCallback(() => {
    setOob(true);
    setTimeout(() => setOob(false), 4000);
  }, []);

  const applyResolvedAddress = (data: LocationResult) => {
    const address = data.address ?? {};
    const street = [address.road ?? address.pedestrian ?? address.footway ?? "", address.house_number ?? ""]
      .filter(Boolean).join(" ").trim() || data.display_name.split(",")[0]?.trim() || "";
    onLocationPicked(null, null, data, {
      street,
      city:   address.city ?? address.town ?? address.village ?? address.county ?? "",
      postal: address.postcode ?? "",
    });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const url = new URL("https://photon.komoot.io/reverse");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      url.searchParams.set("limit", "1");
      url.searchParams.set("lang", "en");

      const res = await fetch(url.toString());
      const data: PhotonResponse = await res.json();
      const resolved = (data.features ?? [])
        .map(photonFeatureToLocationResult)
        .find((item): item is LocationResult =>
          item !== null && isInKtm(parseFloat(item.lat), parseFloat(item.lon)));
      if (!resolved?.display_name) return;
      rememberValidPosition(lat, lng);
      applyResolvedAddress(resolved);
      const short = resolved.display_name.split(",").slice(0, 2).join(",").trim();
      setLocated(short);
      setQuery(short);
      onLocationPicked(lat, lng, resolved);
    } catch {
      // Ignore transient reverse lookup failures
    }
  };

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const lk = document.createElement("link");
      lk.id = "leaflet-css"; lk.rel = "stylesheet";
      lk.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(lk);
    }

    const init = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!mapElRef.current || leafletRef.current || !L) return;

      const bounds = L.latLngBounds(
        [KTM_BOUNDS.minLat, KTM_BOUNDS.minLng],
        [KTM_BOUNDS.maxLat, KTM_BOUNDS.maxLng],
      );
      const initial = lastValidPositionRef.current;
      const map = L.map(mapElRef.current, {
        zoomControl: false, attributionControl: false,
        maxBounds: bounds, maxBoundsViscosity: 0.9, minZoom: 12,
      }).setView(initial, initial[0] === KTM_CENTER[0] && initial[1] === KTM_CENTER[1] ? 14 : 16);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<div style="width:26px;height:26px;background:var(--orange);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 12px rgba(249,115,22,.6)"></div>',
        iconSize: [26, 26], iconAnchor: [13, 26],
      });

      const marker = L.marker(initial, { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        if (!isInKtm(p.lat, p.lng)) {
          const fallback = lastValidPositionRef.current;
          marker.setLatLng(fallback);
          map.flyTo(fallback, fallback[0] === KTM_CENTER[0] && fallback[1] === KTM_CENTER[1] ? 14 : 16);
          showOutOfBoundsError();
          return;
        }
        rememberValidPosition(p.lat, p.lng);
        onLocationPicked(p.lat, p.lng, { lat: String(p.lat), lon: String(p.lng), display_name: "" });
        void reverseGeocode(p.lat, p.lng);
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);
      leafletRef.current = map;
      markerRef.current  = marker;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L) { setTimeout(init, 100); return; }

    const sc = document.createElement("script");
    sc.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    sc.onload = () => setTimeout(init, 100);
    document.head.appendChild(sc);

    return () => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; markerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialLatitude === null || initialLongitude === null || !isInKtm(initialLatitude, initialLongitude) || !leafletRef.current || !markerRef.current) return;
    rememberValidPosition(initialLatitude, initialLongitude);
    markerRef.current.setLatLng([initialLatitude, initialLongitude]);
    leafletRef.current.setView([initialLatitude, initialLongitude], 16, { animate: false });
  }, [initialLatitude, initialLongitude]);

  useEffect(() => {
    const handleMouseDown = (e: Event) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowRes(false);
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const doSearch = async (searchTerm = query) => {
    const trimmedQuery = searchTerm.trim();
    if (trimmedQuery.length < LOCATION_SEARCH_MIN_CHARS) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true); setShowRes(true); setResults([]); setHiIdx(-1);
    try {
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", trimmedQuery);
      url.searchParams.set("bbox", `${KTM_BOUNDS.minLng},${KTM_BOUNDS.minLat},${KTM_BOUNDS.maxLng},${KTM_BOUNDS.maxLat}`);
      url.searchParams.set("limit", "8");
      url.searchParams.set("lang", "en");

      const res = await fetch(url.toString());
      const data: PhotonResponse = await res.json();
      const nextResults = (data.features ?? [])
        .map(photonFeatureToLocationResult)
        .filter((item): item is LocationResult =>
          item !== null && isInKtm(parseFloat(item.lat), parseFloat(item.lon)));
      setResults(nextResults);
    } catch { /* Ignore transient search failures */ }
    setLoading(false);
  };

  const selectResult = (item: LocationResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isInKtm(lat, lng)) { showOutOfBoundsError(); return; }
    if (leafletRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      leafletRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
    }
    rememberValidPosition(lat, lng);
    applyResolvedAddress(item);
    const short = item.display_name.split(",").slice(0, 2).join(",").trim();
    setQuery(short); setLocated(short); setShowRes(false); setResults([]);
    onLocationPicked(lat, lng, item);
    void reverseGeocode(lat, lng);
  };

  const handleKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (hiIdx >= 0 && results[hiIdx]) { selectResult(results[hiIdx]); return; }
      void doSearch(); return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setHiIdx(i => Math.min(i + 1, results.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHiIdx(i => Math.max(i - 1, 0)); return; }
    if (e.key === "Escape") setShowRes(false);
  };

  const handleInput = (value: string) => {
    setQuery(value);
    if (value.trim().length >= LOCATION_SEARCH_MIN_CHARS) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void doSearch(value), 350);
      return;
    }
    setResults([]);
    setHiIdx(-1);
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
          <strong style={{ color: "#f97316" }}>Kathmandu Valley only.</strong>{" "}
          FitPal operates within Kathmandu, Lalitpur and Bhaktapur.
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
            <input className="map-search-inp" type="text" autoComplete="off"
              placeholder="Search address, landmark or area in Kathmandu..."
              value={query}
              onChange={e => handleInput(e.target.value)}
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
          <button className="map-search-btn" type="button" disabled={loading || query.trim().length < LOCATION_SEARCH_MIN_CHARS} onClick={() => void doSearch()}>
            {loading ? <span className="spinner" /> : (
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
                  <strong style={{ color: "#f97316" }}>No matching location found.</strong>{" "}
                  Try a more specific Kathmandu Valley landmark, street, or area name.
                </span>
              </div>
            )}
            {!loading && results.map((item, idx) => {
              const parts = item.display_name.split(",");
              return (
                <div key={`${item.display_name}-${idx}`}
                  className={`map-result-item${hiIdx === idx ? " highlighted" : ""}`}
                  onClick={() => selectResult(item)} onKeyDown={() => undefined} role="button" tabIndex={0}
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

      <div ref={mapElRef} style={{ height: 300, width: "100%", borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "#0a0a0a", overflow: "hidden" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
        {located && (
          <span className="map-located-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            {located}
          </span>
        )}
        <div className="field-hint" style={{ marginTop: 0 }}>Type at least 3 characters or drag the marker — coordinates save automatically</div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const FitPalGymSetup: FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const auth      = useAuthState();

  const logoInputRef             = useRef<HTMLInputElement>(null);
  const documentInputRef         = useRef<HTMLInputElement>(null);
  const photoInputRef            = useRef<HTMLInputElement>(null);
  // Tracks whether the user navigated here with editSubmission intent.
  // Stored in a ref so applyProfileState can read it synchronously without
  // triggering a re-render, and so the value survives the navigate() call
  // that clears location.state.
  const editSubmissionRequestedRef = useRef(
    Boolean((location.state as { editSubmission?: boolean } | null)?.editSubmission),
  );

  const [step,             setStep]             = useState(0);
  const [stepError,        setStepError]        = useState<string | null>(null);
  const [fieldErrors,      setFieldErrors]      = useState<GymFieldErrors>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingStep,     setIsSavingStep]     = useState(false);
  const [isUploadingLogo,  setIsUploadingLogo]  = useState(false);
  const [isRemovingLogo,   setIsRemovingLogo]   = useState(false);
  const [uploadingDocIndex, setUploadingDocIndex] = useState<number | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [activePhotoId,    setActivePhotoId]    = useState<number | null>(null);
  const [activeDocumentIndex, setActiveDocumentIndex] = useState<number | null>(null);

  // Single approval status — derived booleans below, no redundant state
  const [gymApprovalStatus, setGymApprovalStatus] = useState<GymApprovalStatus>("DRAFT");

  const [gymEmailVerified, setGymEmailVerified] = useState(false);
  const [verifying,        setVerifying]        = useState(false);
  const [gymName,          setGymName]          = useState("");
  const [gymType,          setGymType]          = useState<ApiGymType | null>(null);
  const [gymRegNo,         setGymRegNo]         = useState("");
  const [gymEstablished,   setGymEstablished]   = useState("");
  const [gymCapacity,      setGymCapacity]      = useState("");
  const [gymContactEmail,  setGymContactEmail]  = useState("");
  const [gymPhone,         setGymPhone]         = useState("");
  const [gymWebsite,       setGymWebsite]       = useState("");
  const [gymDesc,          setGymDesc]          = useState("");
  const [gymLogoUrl,       setGymLogoUrl]       = useState("");
  const [gymLogoPublicId,  setGymLogoPublicId]  = useState("");
  const [gymLogoResourceType, setGymLogoResourceType] = useState("");
  const [gymAddressLine,   setGymAddressLine]   = useState("");
  const [gymCity,          setGymCity]          = useState("");
  const [gymCountry,       setGymCountry]       = useState("Nepal");
  const [gymPostal,        setGymPostal]        = useState("");
  const [gymLatitude,      setGymLatitude]      = useState<number | null>(null);
  const [gymLongitude,     setGymLongitude]     = useState<number | null>(null);
  const [gymOpens,         setGymOpens]         = useState("06:00");
  const [gymCloses,        setGymCloses]        = useState("22:00");
  const [esewaEnabled,     setEsewaEnabled]     = useState(false);
  const [esewaWalletId,    setEsewaWalletId]    = useState("");
  const [esewaAccountName, setEsewaAccountName] = useState("");
  const [khaltiEnabled,    setKhaltiEnabled]    = useState(false);
  const [khaltiWalletId,   setKhaltiWalletId]   = useState("");
  const [khaltiAccountName, setKhaltiAccountName] = useState("");
  const [docs,   setDocs]   = useState<DocRow[]>([
    { type: "REGISTRATION_CERTIFICATE", fileName: "", uploaded: false },
    { type: "LICENSE",                  fileName: "", uploaded: false },
  ]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);

  // ── Derived auth values ────────────────────────────────────────────────────
  const authEmail       = auth.email ?? "gym.owner@fitpal.com";
  const authDisplayName =
    authEmail.split("@")[0].split(/[._-]+/).filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") || "Gym Owner";
  const authAvatarUrl   = `https://ui-avatars.com/api/?name=${encodeURIComponent(authDisplayName)}&background=111&color=fb923c`;

  // ── Derived approval flags — single source of truth ──────────────────────
  const isGymPendingReview = gymApprovalStatus === "PENDING_REVIEW";
  const isGymRejected      = gymApprovalStatus === "REJECTED";
  const isGymApproved      = gymApprovalStatus === "APPROVED";
  const hasRequiredDocs = useMemo(
    () => REQUIRED_DOC_TYPES.every(type => docs.some(doc => doc.type === type && doc.uploaded)),
    [docs],
  );
  const hasRequiredPhotos = photos.length >= 1;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resolveUploadedFileName = (fileUrl?: string | null, fallback = "uploaded-file") => {
    if (!fileUrl) return fallback;
    const raw = fileUrl.split("/").pop()?.split("?")[0];
    if (!raw) return fallback;
    try { return decodeURIComponent(raw); } catch { return raw; }
  };

  const toDocRow = (doc: GymDocumentResponse): DocRow => ({
    documentId:   doc.documentId,
    type:         doc.documentType as DocTypeValue,
    fileName:     resolveUploadedFileName(doc.fileUrl, doc.documentType),
    fileUrl:      doc.fileUrl,
    publicId:     doc.publicId,
    resourceType: doc.resourceType,
    uploaded:     true,
  });

  const buildDocRows = (documents: GymDocumentResponse[]) => {
    const requiredRows: DocRow[] = REQUIRED_DOC_TYPES.map(type => {
      const existing = documents.find(d => d.documentType === type);
      return existing ? toDocRow(existing) : { type, fileName: "", uploaded: false };
    });
    const optionalRows = documents
      .filter(d => !isRequiredDocType(d.documentType as DocTypeValue))
      .map(toDocRow);
    return [...requiredRows, ...optionalRows];
  };

  // Collapsed from two functions (deleteUploadedAsset + deleteUploadedAssetSilently)
  // into one with an optional silent flag
  const deleteAsset = async (publicId?: string | null, resourceType?: string | null, silent = false) => {
    if (!publicId) return;
    try { await deleteUploadedAssetApi({ publicId, resourceType: resourceType || undefined }); }
    catch (error) { if (!silent) throw error; }
  };

  const clearFieldError = useCallback((...keys: GymFieldKey[]) => {
    setFieldErrors(prev => {
      if (!keys.some(key => prev[key])) return prev;
      const next = { ...prev };
      keys.forEach(key => { delete next[key]; });
      return next;
    });
  }, []);

  const replaceFieldErrors = useCallback((keys: readonly GymFieldKey[], nextErrors: GymFieldErrors) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      keys.forEach(key => { delete next[key]; });
      Object.entries(nextErrors).forEach(([key, message]) => {
        if (message) next[key as GymFieldKey] = message;
      });
      return next;
    });
  }, []);

  const firstFieldError = (errors: GymFieldErrors): string | null => Object.values(errors)[0] ?? null;
  const hasFieldErrors = (errors: GymFieldErrors): boolean => Object.keys(errors).length > 0;
  const inputErrorStyle = (key: GymFieldKey) => fieldErrors[key] ? { borderColor: "rgba(239,68,68,.5)" } : undefined;

  const sortPhotos = (items: PhotoRow[]) =>
    [...items].sort((a, b) => {
      const oa = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const ob = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return (a.photoId ?? Number.MAX_SAFE_INTEGER) - (b.photoId ?? Number.MAX_SAFE_INTEGER);
    });

  const syncAuthOnboardingStatus = (
    profile: Pick<GymProfileResponse, "profileCompleted" | "registeredEmailVerified" | "submittedForReview" | "approved">,
  ) => {
    authStore.updateOnboardingStatus({
      profileCompleted: profile.profileCompleted,
      emailVerified: profile.registeredEmailVerified,
      submittedForReview: profile.submittedForReview,
      approved: profile.approved,
      hasSubscription: false,
      hasActiveSubscription: false,
    });
  };

  const syncLogoProfileState = (
    profile: Pick<GymProfileResponse, "approvalStatus" | "profileCompleted" | "registeredEmailVerified" | "submittedForReview" | "approved" | "logoUrl" | "logoPublicId" | "logoResourceType">,
  ) => {
    syncAuthOnboardingStatus(profile);
    setGymApprovalStatus(profile.approvalStatus);
    setGymLogoUrl(profile.logoUrl ?? "");
    setGymLogoPublicId(profile.logoPublicId ?? "");
    setGymLogoResourceType(profile.logoResourceType ?? "");
  };

  const toPhotoRow = (p: GymPhotoResponse): PhotoRow => ({
    photoId:      p.photoId ?? null,
    publicId:     p.publicId,
    resourceType: p.resourceType,
    photoUrl:     p.photoUrl,
    caption:      p.caption ?? "",
    displayOrder: p.displayOrder,
    cover:        p.cover,
  });

  const hydrateProfile = (
    profile: GymProfileResponse,
    documents?: GymDocumentResponse[],
    gymPhotos?: GymPhotoResponse[],
  ) => {
    syncAuthOnboardingStatus(profile);
    setGymApprovalStatus(profile.approvalStatus);
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
    const savedEsewa  = profile.esewaWalletId  ?? "";
    const savedKhalti = profile.khaltiWalletId ?? "";
    setEsewaEnabled(Boolean(savedEsewa));
    setEsewaWalletId(savedEsewa);
    setEsewaAccountName(profile.esewaAccountName ?? "");
    setKhaltiEnabled(Boolean(savedKhalti));
    setKhaltiWalletId(savedKhalti);
    setKhaltiAccountName(profile.khaltiAccountName ?? "");
    if (documents) setDocs(buildDocRows(documents));
    if (gymPhotos)  setPhotos(sortPhotos(gymPhotos.map(toPhotoRow)));
  };

  const resolveStep = (profile: GymProfileResponse): number => {
    if (editSubmissionRequestedRef.current && profile.approvalStatus === "REJECTED") {
      editSubmissionRequestedRef.current = false;
      return DOCUMENTS_STEP_INDEX;
    }

    editSubmissionRequestedRef.current = false;

    const isComplete =
      profile.approvalStatus === "APPROVED" ||
      profile.approvalStatus === "PENDING_REVIEW";

    return isComplete
      ? FINAL_REVIEW_STEP_INDEX
      : Math.max(0, Math.min(profile.onboardingStep ?? 0, REVIEW_SUBMIT_STEP_INDEX));
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  // Inject styles once; clean up on unmount
  useEffect(() => {
    if (document.getElementById("fitpal-gym-setup-css")) return;
    const el = document.createElement("style");
    el.id = "fitpal-gym-setup-css";
    el.textContent = STYLE;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  // Clear location.state so refreshing doesn't re-trigger editSubmission
  useEffect(() => {
    if (!editSubmissionRequestedRef.current) return;
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load profile on mount / token change
  useEffect(() => {
    if (!auth.accessToken) return;
    let cancelled = false;
    const load = async () => {
      setIsLoadingProfile(true);
      try {
        const [profile, documents, gymPhotos] = await Promise.all([
          getMyGymProfileApi(), getMyGymDocumentsApi(), getMyGymPhotosApi(),
        ]);
        if (cancelled) return;
        hydrateProfile(profile, documents, gymPhotos);
        setStep(resolveStep(profile));
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error, "Failed to load gym onboarding profile"));
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };
    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.accessToken]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);
  useEffect(() => { setFieldErrors({}); }, [step]);

  // Clear step errors when any relevant value changes
  useEffect(() => { setStepError(null); }, [
    step, gymEmailVerified, gymName, gymType, gymRegNo, gymEstablished, gymCapacity,
    gymLogoUrl, gymLogoPublicId, gymLogoResourceType,
    gymAddressLine, gymCity, gymCountry, gymPostal, gymLatitude, gymLongitude,
    gymPhone, gymContactEmail, gymWebsite, gymDesc, gymOpens, gymCloses,
    esewaEnabled, esewaWalletId, esewaAccountName,
    khaltiEnabled, khaltiWalletId, khaltiAccountName,
    docs, photos,
  ]);

  useEffect(() => {
    if (gymEmailVerified) clearFieldError("gymEmailVerified");
  }, [clearFieldError, gymEmailVerified]);

  useEffect(() => {
    if (hasRequiredDocs) clearFieldError("documents");
  }, [clearFieldError, hasRequiredDocs]);

  useEffect(() => {
    if (hasRequiredPhotos) clearFieldError("photos");
  }, [clearFieldError, hasRequiredPhotos]);

  // ── Step validation ────────────────────────────────────────────────────────
  // Each blocker calls the previous one — if a prior step is broken, we surface
  // a generic "complete step N first" rather than re-running all sub-checks.

  const currentYear = new Date().getFullYear();
  const establishedYearValue = Number(gymEstablished);
  const capacityValue        = Number(gymCapacity);

  const collectStep1FieldErrors = useCallback((): GymFieldErrors => {
    const errors: GymFieldErrors = {};
    if (!gymEmailVerified) errors.gymEmailVerified = "Verify the registered email to continue.";
    if (!gymName.trim()) errors.gymName = "Gym name is required.";
    if (!gymType) errors.gymType = "Select a gym type.";
    if (gymEstablished.trim() && (!Number.isInteger(establishedYearValue) || establishedYearValue < 1900 || establishedYearValue > currentYear)) {
      errors.gymEstablished = `Established year must be between 1900 and ${currentYear}.`;
    }
    if (!gymCapacity.trim()) errors.gymCapacity = "Maximum member capacity is required.";
    else if (!Number.isFinite(capacityValue) || capacityValue < 10) errors.gymCapacity = "Maximum member capacity must be at least 10.";
    return errors;
  }, [capacityValue, currentYear, establishedYearValue, gymCapacity, gymEmailVerified, gymEstablished, gymName, gymType]);

  const collectStep2FieldErrors = useCallback((): GymFieldErrors => {
    const errors: GymFieldErrors = {};
    if (!gymAddressLine.trim()) errors.gymAddressLine = "Street address is required.";
    if (!gymCity.trim()) errors.gymCity = "City is required.";
    if (!gymCountry.trim()) errors.gymCountry = "Country is required.";
    if (gymLatitude === null || gymLongitude === null) errors.gymCoordinates = "Pick the gym location on the map.";
    if (!gymPhone.trim()) errors.gymPhone = "Phone number is required.";
    else if (!isValidNepalMobileNumber(gymPhone)) errors.gymPhone = "Phone number must start with 98 or 97 and be exactly 10 digits.";
    if (!gymContactEmail.trim()) errors.gymContactEmail = "Contact email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gymContactEmail.trim())) errors.gymContactEmail = "Enter a valid contact email.";
    if (!gymOpens) errors.gymOpens = "Opening time is required.";
    if (!gymCloses) errors.gymCloses = "Closing time is required.";
    else if (gymOpens && gymCloses <= gymOpens) errors.gymCloses = "Closing time must be after opening time.";
    return errors;
  }, [gymAddressLine, gymCity, gymCloses, gymContactEmail, gymCountry, gymLatitude, gymLongitude, gymOpens, gymPhone]);

  const collectStep3FieldErrors = useCallback((): GymFieldErrors => {
    const errors: GymFieldErrors = {};
    const hasCompleteEsewaWallet = esewaEnabled && isValidNepalMobileNumber(esewaWalletId) && Boolean(esewaAccountName.trim());
    const hasCompleteKhaltiWallet = khaltiEnabled && isValidNepalMobileNumber(khaltiWalletId) && Boolean(khaltiAccountName.trim());

    if (hasCompleteEsewaWallet || hasCompleteKhaltiWallet) {
      return errors;
    }

    if (!esewaEnabled && !khaltiEnabled) {
      errors.payoutSelection = "Select at least one payout wallet.";
      return errors;
    }

    // Use helper to validate wallet providers
    const esewaErrors = validateWalletProvider(esewaEnabled, esewaWalletId, esewaAccountName, "eSewa");
    if (esewaErrors.walletIdError) errors.esewaWalletId = esewaErrors.walletIdError;
    if (esewaErrors.accountNameError) errors.esewaAccountName = esewaErrors.accountNameError;

    const khaltiErrors = validateWalletProvider(khaltiEnabled, khaltiWalletId, khaltiAccountName, "Khalti");
    if (khaltiErrors.walletIdError) errors.khaltiWalletId = khaltiErrors.walletIdError;
    if (khaltiErrors.accountNameError) errors.khaltiAccountName = khaltiErrors.accountNameError;

    return errors;
  }, [esewaAccountName, esewaEnabled, esewaWalletId, khaltiAccountName, khaltiEnabled, khaltiWalletId]);

  const collectStep4FieldErrors = useCallback((): GymFieldErrors => {
    const errors: GymFieldErrors = {};
    if (!hasRequiredDocs) errors.documents = "Upload the required Registration Certificate and Operating License.";
    if (!hasRequiredPhotos) errors.photos = "Upload at least 1 gym photo.";
    return errors;
  }, [hasRequiredDocs, hasRequiredPhotos]);

  // Step blocker configuration (reduces duplicate step blocker logic)
  const STEP_BLOCKERS = useMemo(() => [
    {
      check: () => firstFieldError(collectStep1FieldErrors()),
      message: null as string | null,
    },
    {
      check: () => firstFieldError(collectStep2FieldErrors()),
      message: "Complete Step 1 first. Step 2 stays locked until basics are complete.",
    },
    {
      check: () => firstFieldError(collectStep3FieldErrors()),
      message: "Complete Step 2 first. Payout setup stays locked until location and contact details are complete.",
    },
    {
      check: () => firstFieldError(collectStep4FieldErrors()),
      message: "Complete Step 3 first. Documents stay locked until payout setup is complete.",
    },
  ], [collectStep1FieldErrors, collectStep2FieldErrors, collectStep3FieldErrors, collectStep4FieldErrors]);

  const getStep1Blocker = useCallback((): string | null => {
    return STEP_BLOCKERS[0].check();
  }, [STEP_BLOCKERS]);

  const getStep2Blocker = useCallback((): string | null => {
    const step1Error = getStep1Blocker();
    if (step1Error) return STEP_BLOCKERS[1].message;
    return STEP_BLOCKERS[1].check();
  }, [STEP_BLOCKERS, getStep1Blocker]);

  const getStep3Blocker = useCallback((): string | null => {
    const step2Error = getStep2Blocker();
    if (step2Error) return STEP_BLOCKERS[2].message;
    return STEP_BLOCKERS[2].check();
  }, [STEP_BLOCKERS, getStep2Blocker]);

  const getStep4Blocker = useCallback((): string | null => {
    const step3Error = getStep3Blocker();
    if (step3Error) return STEP_BLOCKERS[3].message;
    return STEP_BLOCKERS[3].check();
  }, [STEP_BLOCKERS, getStep3Blocker]);

  const step1Complete = useMemo(
    () => getStep1Blocker() === null,
    [getStep1Blocker],
  );

  const step2Complete = useMemo(
    () => getStep2Blocker() === null,
    [getStep2Blocker],
  );

  const step3Complete = useMemo(
    () => getStep3Blocker() === null,
    [getStep3Blocker],
  );

  const step4Complete = useMemo(
    () => getStep4Blocker() === null,
    [getStep4Blocker],
  );

  const applyStep1Validation = useCallback(() => {
    const errors = collectStep1FieldErrors();
    replaceFieldErrors(STEP1_FIELD_KEYS, errors);
    return !hasFieldErrors(errors);
  }, [collectStep1FieldErrors, replaceFieldErrors]);

  const applyStep2Validation = useCallback(() => {
    const errors = collectStep2FieldErrors();
    replaceFieldErrors(STEP2_FIELD_KEYS, errors);
    return !hasFieldErrors(errors);
  }, [collectStep2FieldErrors, replaceFieldErrors]);

  const applyStep3Validation = useCallback(() => {
    const errors = collectStep3FieldErrors();
    replaceFieldErrors(STEP3_FIELD_KEYS, errors);
    return !hasFieldErrors(errors);
  }, [collectStep3FieldErrors, replaceFieldErrors]);

  const applyStep4Validation = useCallback(() => {
    const errors = collectStep4FieldErrors();
    replaceFieldErrors(STEP4_FIELD_KEYS, errors);
    return !hasFieldErrors(errors);
  }, [collectStep4FieldErrors, replaceFieldErrors]);

  // Guard: if the user somehow lands on a step they haven't unlocked, push them back
  useEffect(() => {
    if (step > 0 && !step1Complete) { setStep(0); return; }
    if (step > 1 && !step2Complete) { setStep(1); return; }
    if (step > 2 && !step3Complete) { setStep(2); return; }
    if (step > 3 && !step4Complete) { setStep(3); return; }
    if (step > REVIEW_SUBMIT_STEP_INDEX && !isGymPendingReview && !isGymApproved && !isGymRejected)
      setStep(REVIEW_SUBMIT_STEP_INDEX);
  }, [step, step1Complete, step2Complete, step3Complete, step4Complete, isGymPendingReview, isGymApproved, isGymRejected]);

  const isBusy = isSavingStep || isUploadingLogo || isRemovingLogo || uploadingDocIndex !== null || isUploadingPhotos || activePhotoId !== null;

  // ── Step save handlers ─────────────────────────────────────────────────────

  const goToLocationStep = async () => {
    if (isBusy) return;
    if (!applyStep1Validation()) return;
    setIsSavingStep(true);
    try {
      const profile = await patchGymBasicsStepApi({
        gymName: gymName.trim(), gymType: gymType ?? undefined,
        establishedAt: gymEstablished.trim() ? establishedYearValue : undefined,
        registrationNo: gymRegNo.trim() || undefined, maxCapacity: capacityValue,
      });
      hydrateProfile(profile);
      setStep(1);
      toast.success("Basics saved");
    } catch (error) { setStepError(getApiErrorMessage(error, "Failed to save basics step")); }
    finally { setIsSavingStep(false); }
  };

  const goToPayoutStep = async () => {
    if (isBusy) return;
    if (!step1Complete) {
      setStepError("Complete Step 1 first. Step 2 stays locked until basics are complete.");
      return;
    }
    if (!applyStep2Validation()) return;
    setIsSavingStep(true);
    try {
      const profile = await patchGymLocationStepApi({
        addressLine: gymAddressLine.trim(), city: gymCity.trim(), country: gymCountry.trim(),
        postalCode: gymPostal.trim() || undefined,
        latitude: gymLatitude ?? undefined, longitude: gymLongitude ?? undefined,
        phoneNo: gymPhone.trim(), contactEmail: gymContactEmail.trim(),
        description: gymDesc.trim() || undefined,
        websiteUrl: gymWebsite.trim() || undefined,
        opensAt: gymOpens, closesAt: gymCloses,
      });
      hydrateProfile(profile);
      setStep(2);
      toast.success("Location and contact saved");
    } catch (error) { setStepError(getApiErrorMessage(error, "Failed to save location step")); }
    finally { setIsSavingStep(false); }
  };

  const goToDocumentsStep = async () => {
    if (isBusy) return;
    if (!step2Complete) {
      setStepError("Complete Step 2 first. Payout setup stays locked until location and contact details are complete.");
      return;
    }
    if (!applyStep3Validation()) return;
    setIsSavingStep(true);
    try {
      const profile = await patchGymPayoutStepApi({
        esewaEnabled,
        esewaWalletId:    esewaEnabled  ? esewaWalletId.trim()    : undefined,
        esewaAccountName: esewaEnabled  ? esewaAccountName.trim() || undefined : undefined,
        khaltiEnabled,
        khaltiWalletId:    khaltiEnabled ? khaltiWalletId.trim()    : undefined,
        khaltiAccountName: khaltiEnabled ? khaltiAccountName.trim() || undefined : undefined,
      });
      hydrateProfile(profile);
      setStep(DOCUMENTS_STEP_INDEX);
      toast.success("Payout wallets saved");
    } catch (error) { setStepError(getApiErrorMessage(error, "Failed to save payout wallets")); }
    finally { setIsSavingStep(false); }
  };

  const goToReviewStep = async () => {
    if (isBusy) return;
    if (!step3Complete) {
      setStepError("Complete Step 3 first. Documents stay locked until payout setup is complete.");
      return;
    }
    if (!applyStep4Validation()) return;
    setIsSavingStep(true);
    const wasRejectedBeforeSubmit = isGymRejected;
    try {
      const profile = await submitGymReviewSubmissionApi();
      hydrateProfile(profile);
      setStep(resolveStep(profile));
      toast.success(wasRejectedBeforeSubmit ? "Gym resubmitted for review" : "Gym submitted for review");
    } catch (error) { setStepError(getApiErrorMessage(error, "Failed to submit gym for review")); }
    finally { setIsSavingStep(false); }
  };

  const goToReviewSubmitStep = () => {
    if (isBusy) return;
    if (!step3Complete) {
      setStepError("Complete Step 3 first. Documents stay locked until payout setup is complete.");
      return;
    }
    if (!applyStep4Validation()) return;
    setStep(REVIEW_SUBMIT_STEP_INDEX);
  };

  const verifyEmail = async () => {
    if (verifying || isBusy) return;
    setVerifying(true);
    try {
      const status = await verifyGymRegisteredEmailApi();
      setGymEmailVerified(status.registeredEmailVerified);
      toast.success("Registered email verified");
    } catch (error) { setStepError(getApiErrorMessage(error, "Failed to verify registered email")); }
    finally { setVerifying(false); }
  };

  const openEditSubmission = () => { setStepError(null); setStep(DOCUMENTS_STEP_INDEX); };

  // ── Document handlers ──────────────────────────────────────────────────────

  const addDoc = () => {
    if (docs.length >= MAX_GYM_DOCS) { setStepError(`You can upload at most ${MAX_GYM_DOCS} documents.`); return; }
    const used = docs.map(d => d.type);
    const next = DOC_TYPES.find(t => !isRequiredDocType(t.value) && isSingletonDocType(t.value) && !used.includes(t.value));
    setDocs(prev => [...prev, { type: (next?.value ?? "OTHER") as DocTypeValue, fileName: "", uploaded: false }]);
  };

  const resetDocRow = (doc: DocRow): DocRow => ({ type: doc.type, fileName: "", uploaded: false });

  const removeDoc = async (idx: number) => {
    const doc = docs[idx];
    if (!doc) return;
    const isRequired = isRequiredDocType(doc.type);
    if (doc.documentId) {
      setUploadingDocIndex(idx);
      try { await deleteGymDocumentApi(doc.documentId); toast.success("Document removed"); }
      catch (error) { setStepError(getApiErrorMessage(error, "Failed to remove document")); setUploadingDocIndex(null); return; }
      setUploadingDocIndex(null);
    }
    setDocs(prev => isRequired
      ? prev.map((d, i) => i === idx ? resetDocRow(d) : d)
      : prev.filter((_, i) => i !== idx)
    );
  };

  const setDocType = (idx: number, value: DocTypeValue) => {
    if (isRequiredDocType(value)) return;
    if (isSingletonDocType(value) && docs.some((doc, docIdx) => docIdx !== idx && doc.type === value)) {
      const label = DOC_TYPES.find(type => type.value === value)?.label ?? value;
      setStepError(`${label} has already been added.`);
      return;
    }
    setDocs(prev => prev.map((d, i) => i === idx ? { ...d, type: value } : d));
  };

  const openLogoPicker = () => { if (isUploadingLogo || isRemovingLogo) return; logoInputRef.current?.click(); };

  const handleLogoSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    setStepError(null);
    try {
      const profile = await uploadGymLogoApi(file);
      syncLogoProfileState(profile);
      toast.success("Logo uploaded");
    } catch (error) { setStepError(getApiErrorMessage(error, "Failed to upload logo")); }
    finally { setIsUploadingLogo(false); e.target.value = ""; }
  };

  const handleLogoRemoved = async () => {
    if (!gymLogoUrl || isUploadingLogo || isRemovingLogo) return;
    setIsRemovingLogo(true);
    setStepError(null);
    try {
      const profile = await deleteGymLogoApi();
      syncLogoProfileState(profile);
      toast.success("Logo removed");
    } catch (error) { setStepError(getApiErrorMessage(error, "Failed to remove logo")); }
    finally { setIsRemovingLogo(false); }
  };

  const openDocumentPicker = (idx: number) => { setActiveDocumentIndex(idx); documentInputRef.current?.click(); };

  const handleDocumentSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file        = e.target.files?.[0];
    const targetIndex = activeDocumentIndex;
    e.target.value    = "";
    if (!file || targetIndex === null) return;
    const doc = docs[targetIndex];
    if (!doc) return;
    const previousOtherDocumentId = doc.type === "OTHER" ? doc.documentId : undefined;
    setUploadingDocIndex(targetIndex);
    let asset: DocumentUploadResponse | null = null;
    try {
      asset = await uploadDocumentFileApi(file, "fitpal/gym-documents");
      const saved = await upsertGymDocumentApi({ documentType: doc.type, publicId: asset.publicId, resourceType: asset.resourceType, fileUrl: asset.secureUrl || asset.url });
      if (previousOtherDocumentId && previousOtherDocumentId !== saved.documentId) {
        try { await deleteGymDocumentApi(previousOtherDocumentId); }
        catch { toast.error("New document was saved, but the previous optional document could not be removed."); }
      }
      setDocs(prev => prev.map((d, i) => i === targetIndex
        ? { ...d, documentId: saved.documentId, fileName: file.name, fileUrl: saved.fileUrl, publicId: saved.publicId, resourceType: saved.resourceType, uploaded: true }
        : d
      ));
      clearFieldError("documents");
      toast.success("Document uploaded");
    } catch (error) {
      await deleteAsset(asset?.publicId, asset?.resourceType, true);
      setStepError(getApiErrorMessage(error, "Failed to upload document"));
    } finally { setUploadingDocIndex(null); setActiveDocumentIndex(null); }
  };

  // ── Photo handlers ─────────────────────────────────────────────────────────

  const openPhotoPicker = () => {
    if (isUploadingPhotos || activePhotoId !== null || photos.length >= MAX_GYM_PHOTOS) return;
    photoInputRef.current?.click();
  };

  const handlePhotoSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!selectedFiles.length) return;
    const slots = Math.max(MAX_GYM_PHOTOS - photos.length, 0);
    if (slots <= 0) { setStepError(`You can upload at most ${MAX_GYM_PHOTOS} photos.`); return; }
    const filesToUpload = selectedFiles.slice(0, slots);
    if (filesToUpload.length < selectedFiles.length)
      toast.info(`Only ${slots} photo(s) were queued. Maximum is ${MAX_GYM_PHOTOS}.`);
    setIsUploadingPhotos(true);
    let nextPhotos = [...photos];
    let uploadCount = 0;
    try {
      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) { setStepError(`${file.name} is not an image file.`); continue; }
        let asset: DocumentUploadResponse | null = null;
        try {
          asset = await uploadImageFileApi(file, "fitpal/gym-photos");
          let created = await createGymPhotoApi({
            publicId: asset.publicId, resourceType: asset.resourceType,
            photoUrl: asset.secureUrl || asset.url, caption: "",
            cover: !nextPhotos.some(p => p.cover),
          });
          if (!hasPhotoId(created.photoId)) {
            const refreshed = await getMyGymPhotosApi();
            const match = refreshed.find(p => p.publicId === created.publicId);
            if (match) created = match;
          }
          if (!ensurePhotoSynced(created.photoId)) throw new Error("Photo is still syncing. Refresh once and try again.");
          nextPhotos = sortPhotos([...nextPhotos, toPhotoRow(created)]);
          uploadCount++;
        } catch (error) {
          await deleteAsset(asset?.publicId, asset?.resourceType, true);
          setStepError(getApiErrorMessage(error, `Failed to upload photo: ${file.name}`));
        }
      }
      setPhotos(nextPhotos);
      if (uploadCount > 0) clearFieldError("photos");
      if (uploadCount > 0) toast.success(`${uploadCount} photo${uploadCount > 1 ? "s" : ""} uploaded`);
    } finally { setIsUploadingPhotos(false); }
  };

  // Helper: Check if photo is synced (reduces duplicate photo sync checks)
  const ensurePhotoSynced = useCallback((photoId: number | null): boolean => {
    if (!hasPhotoId(photoId)) {
      setStepError("Photo is still syncing. Refresh once and try again.");
      return false;
    }
    return true;
  }, []);

  const setCoverPhoto = async (photoId: number | null) => {
    if (!ensurePhotoSynced(photoId)) return;
    if (activePhotoId !== null || isUploadingPhotos) return;
    setActivePhotoId(photoId);
    try {
      const updated = await updateGymPhotoApi(photoId, { cover: true });
      setPhotos(prev => sortPhotos(prev.map(p => p.photoId === updated.photoId ? toPhotoRow(updated) : { ...p, cover: false })));
      toast.success("Cover photo updated");
    } catch (error) { setStepError(getApiErrorMessage(error, "Failed to update cover photo")); }
    finally { setActivePhotoId(null); }
  };

  const removePhoto = async (photoId: number | null) => {
    if (!ensurePhotoSynced(photoId)) return;
    if (activePhotoId !== null || isUploadingPhotos) return;
    const deletingPhoto = photos.find(p => p.photoId === photoId);
    setActivePhotoId(photoId);
    try {
      await deleteGymPhotoApi(photoId);
      let remaining = photos.filter(p => p.photoId !== photoId);
      const fallback = remaining.find(p => hasPhotoId(p.photoId));
      if (deletingPhoto?.cover && fallback && hasPhotoId(fallback.photoId)) {
        const updated = await updateGymPhotoApi(fallback.photoId, { cover: true });
        remaining = remaining.map(p => p.photoId === updated.photoId ? toPhotoRow(updated) : { ...p, cover: false });
      }
      setPhotos(sortPhotos(remaining));
      toast.success("Photo removed");
    } catch (error) { setStepError(getApiErrorMessage(error, "Failed to remove photo")); }
    finally { setActivePhotoId(null); }
  };

  const onLocationPicked = useCallback((lat: number | null, lng: number | null, _data: LocationResult, fields?: FillFields) => {
    if (lat !== null) {
      setGymLatitude(lat);
      clearFieldError("gymCoordinates");
    }
    if (lng !== null) {
      setGymLongitude(lng);
      clearFieldError("gymCoordinates");
    }
    if (!fields) return;
    if (fields.street) {
      setGymAddressLine(fields.street);
      clearFieldError("gymAddressLine");
    }
    if (fields.city) {
      setGymCity(fields.city);
      clearFieldError("gymCity");
    }
    if (fields.postal) setGymPostal(fields.postal);
  }, [clearFieldError]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const visibleStepIndex =
    step === REVIEW_SUBMIT_STEP_INDEX
      ? DOCUMENTS_STEP_INDEX
      : step > REVIEW_SUBMIT_STEP_INDEX
        ? step - 1
        : step;

  const renderTrack = () => (
    <div className="progress-track">
      {TRACK_STEPS.map((s, displayIdx) => {
        const done = displayIdx < visibleStepIndex;
        const active = displayIdx === visibleStepIndex;
        return (
          <span key={s.id} style={{ display: "contents" }}>
            <div className="pt-step">
              <div className={`pt-dot${done ? " done" : active ? " active" : ""}`}>
                {done ? <ChkWhite /> : displayIdx + 1}
              </div>
              <div className={`pt-label${active ? " active" : ""}`}>{s.label}</div>
            </div>
            {displayIdx < TRACK_STEPS.length - 1 && <div className={`pt-line${done ? " done" : ""}`} />}
          </span>
        );
      })}
    </div>
  );

  // ── Screen renders ─────────────────────────────────────────────────────────

  const renderGymInfoScreen = () => (
    <div className="screen">
      {stepError && <StepErrorBanner message={stepError} />}
      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleLogoSelected} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", alignItems: "start" }}
        className="lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">

        {/* Left: Owner Meta & Logo */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Owner card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px", background: "#101010", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1.35rem", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--orange)", padding: 2, overflow: "hidden", flexShrink: 0 }}>
                <img src={authAvatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{authDisplayName}</div>
                <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2, fontWeight: 600 }}>Registered Account</div>
              </div>
              <div className="auth-badge gym" style={{ alignSelf: "flex-start", marginTop: 4 }}>Owner</div>
            </div>
            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: `1px solid ${gymEmailVerified ? "rgba(52,211,153,.3)" : "rgba(255,255,255,.06)"}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-d)", marginBottom: 4 }}>Login Email</div>
                <div style={{ fontSize: 12, color: gymEmailVerified ? "#4ade80" : "#9ca3af", overflow: "hidden", textOverflow: "ellipsis" }}>{authEmail}</div>
              </div>
              {!gymEmailVerified && (
                <button type="button" onClick={verifyEmail} disabled={verifying} className="av-btn" style={{ margin: 0 }}>
                  {verifying ? "..." : "Verify"}
                </button>
              )}
            </div>
            <FieldError message={fieldErrors.gymEmailVerified} />
          </div>

          {/* Logo card */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px", background: "linear-gradient(180deg, rgba(120,63,23,0.32) 0%, rgba(27,18,11,0.96) 58%, rgba(15,15,15,1) 100%)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "1.45rem", alignItems: "center", textAlign: "center", boxShadow: "inset 0 1px 0 rgba(255,214,170,0.08)" }}>
            <div style={{ position: "relative", width: 96, height: 96, marginBottom: 12 }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "2px solid var(--orange)", padding: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)" }}>
                {gymLogoUrl ? (
                  <img src={gymLogoUrl} alt="Gym Logo" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "contain", objectPosition: "center", background: "rgba(0,0,0,0.22)", padding: 8 }} />
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#4b5563", display: "block" }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </div>
              {gymLogoUrl && (
                <button type="button" onClick={() => void handleLogoRemoved()} disabled={isUploadingLogo || isRemovingLogo} aria-label="Remove gym logo"
                  style={{ position: "absolute", top: 0, right: 0, width: 28, height: 28, borderRadius: "999px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.8)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: isUploadingLogo || isRemovingLogo ? "not-allowed" : "pointer", transition: "all .2s", zIndex: 1 }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)"; e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(0,0,0,0.8)"; }}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 14 14">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Gym Logo</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16, textAlign: "center" }}>JPG or PNG - Max 2MB<br />Used as your public profile photo.</div>
            <button type="button" onClick={openLogoPicker} disabled={isUploadingLogo || isRemovingLogo}
              style={{ padding: "8px 16px", borderRadius: "0.9rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", cursor: isUploadingLogo || isRemovingLogo ? "not-allowed" : "pointer", transition: "all 0.2s" }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseOut={e  => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
              {isUploadingLogo ? "Uploading..." : isRemovingLogo ? "Removing..." : gymLogoUrl ? "Change Logo" : "Upload Logo"}
            </button>
          </div>
        </div>

        {/* Right: Gym Details */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="sec-label" style={{ marginBottom: 14 }}>Core Gym Details</div>
          <div className="field">
            <label>Gym name <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              type="text"
              placeholder="e.g. FitZone Kathmandu"
              value={gymName}
              onChange={e => {
                setGymName(e.target.value);
                clearFieldError("gymName");
              }}
              style={inputErrorStyle("gymName")}
            />
            <FieldError message={fieldErrors.gymName} />
          </div>
          <div className="field">
            <label>Gym type <span style={{ color: "#ef4444" }}>*</span></label>
            <div className="pill-group">
              {GYM_TYPES.map(type => (
                <div key={type} className={`pill${gymType === type ? " sel" : ""}`}
                  onClick={() => {
                    setGymType(cur => cur === type ? null : type as ApiGymType);
                    clearFieldError("gymType");
                  }}>
                  {type}
                </div>
              ))}
            </div>
            <FieldError message={fieldErrors.gymType} />
          </div>
          <div className="frow">
            <div className="field">
              <label>Registration No.</label>
              <input type="text" placeholder="e.g. 123456/079/080" value={gymRegNo} onChange={e => setGymRegNo(e.target.value)} />
            </div>
            <div className="field">
              <label>Established Year <span style={{ color: "var(--text-d)" }}>optional</span></label>
              <NumberInput
                placeholder="e.g. 2018"
                min={1900}
                max={currentYear}
                step={1}
                value={gymEstablished}
                onChange={e => {
                  setGymEstablished(e.target.value);
                  clearFieldError("gymEstablished");
                }}
                style={inputErrorStyle("gymEstablished")}
              />
              <FieldError message={fieldErrors.gymEstablished} />
            </div>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Maximum Member Capacity <span style={{ color: "#ef4444" }}>*</span></label>
            <NumberInput
              placeholder="e.g. 150"
              min={10}
              step={1}
              value={gymCapacity}
              onChange={e => {
                setGymCapacity(e.target.value);
                clearFieldError("gymCapacity");
              }}
              style={inputErrorStyle("gymCapacity")}
            />
            <FieldError message={fieldErrors.gymCapacity} />
            <div className="field-hint">Total concurrent members your facility can safely accommodate.</div>
          </div>
          <div style={{ alignSelf: "flex-end", width: "100%" }}>
            <Actions label="Save and Continue" step={step} totalSteps={STEPS.length} hideBack disabled={isBusy} onBack={() => undefined} onNext={goToLocationStep} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderLocationScreen = () => (
    <div className="screen">
      {stepError && <StepErrorBanner message={stepError} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", alignItems: "start" }}
        className="lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">

        {/* Left: Map */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px", background: "var(--muted)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "1.45rem" }}>
            <MapSection initialLatitude={gymLatitude} initialLongitude={gymLongitude} onLocationPicked={onLocationPicked} />
            <FieldError message={fieldErrors.gymCoordinates} />
          </div>
        </div>

        {/* Right: Address + Contact */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--orange)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              Address Details <span style={{ flex: 1, height: 1, background: "rgba(234,88,12,.2)" }} />
            </div>
            <div className="field">
              <label>Street address <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                placeholder="123 Durbar Marg"
                value={gymAddressLine}
                onChange={e => {
                  setGymAddressLine(e.target.value);
                  clearFieldError("gymAddressLine");
                }}
                style={inputErrorStyle("gymAddressLine")}
              />
              <FieldError message={fieldErrors.gymAddressLine} />
            </div>
            <div className="frow">
              <div className="field">
                <label>City <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  placeholder="Kathmandu"
                  value={gymCity}
                  onChange={e => {
                    setGymCity(e.target.value);
                    clearFieldError("gymCity");
                  }}
                  style={inputErrorStyle("gymCity")}
                />
                <FieldError message={fieldErrors.gymCity} />
              </div>
              <div className="field">
                <label>Postal code</label>
                <input type="text" placeholder="44600" value={gymPostal} onChange={e => setGymPostal(e.target.value)} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Country <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                placeholder="Nepal"
                value={gymCountry}
                onChange={e => {
                  setGymCountry(e.target.value);
                  clearFieldError("gymCountry");
                }}
                style={inputErrorStyle("gymCountry")}
              />
              <FieldError message={fieldErrors.gymCountry} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--orange)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              Contact and Operating Hours <span style={{ flex: 1, height: 1, background: "rgba(234,88,12,.2)" }} />
            </div>
            <div className="field">
              <label>Phone number <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98XXXXXXXX"
                value={gymPhone}
                onChange={e => {
                  setGymPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                  clearFieldError("gymPhone");
                }}
                style={fieldErrors.gymPhone ? inputErrorStyle("gymPhone") : { borderColor: gymPhone && !isValidNepalMobileNumber(gymPhone) ? "rgba(239,68,68,.5)" : undefined }}
              />
              <FieldError message={fieldErrors.gymPhone} />
              {!fieldErrors.gymPhone && gymPhone && !isValidNepalMobileNumber(gymPhone) && (
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>
                  Must start with 98 or 97 followed by 8 digits.
                </div>
              )}
            </div>
            <div className="field">
              <label>Contact email <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="email"
                placeholder="public@yourgym.com"
                value={gymContactEmail}
                onChange={e => {
                  setGymContactEmail(e.target.value);
                  clearFieldError("gymContactEmail");
                }}
                style={inputErrorStyle("gymContactEmail")}
              />
              <FieldError message={fieldErrors.gymContactEmail} />
              <div className="field-hint">Shown to members — separate from your login email</div>
            </div>
            <div className="field">
              <label>Website <span style={{ color: "var(--text-d)" }}>optional</span></label>
              <input type="url" placeholder="https://yourgym.com" value={gymWebsite} onChange={e => setGymWebsite(e.target.value)} />
            </div>
            <div className="frow">
              <div className="field">
                <label>Opens at <span style={{ color: "#ef4444" }}>*</span></label>
                <TimeInput
                  className="w-full"
                  value={gymOpens}
                  onChange={e => {
                    setGymOpens(e.target.value);
                    clearFieldError("gymOpens");
                  }}
                  style={{ colorScheme: "dark", ...(inputErrorStyle("gymOpens") ?? {}) }}
                />
                <FieldError message={fieldErrors.gymOpens} />
              </div>
              <div className="field">
                <label>Closes at <span style={{ color: "#ef4444" }}>*</span></label>
                <TimeInput
                  className="w-full"
                  value={gymCloses}
                  onChange={e => {
                    setGymCloses(e.target.value);
                    clearFieldError("gymCloses");
                  }}
                  style={{ colorScheme: "dark", ...(inputErrorStyle("gymCloses") ?? {}) }}
                />
                <FieldError message={fieldErrors.gymCloses} />
              </div>
            </div>
            <div className="field" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label>Description <span style={{ color: "var(--text-d)" }}>optional</span></label>
              <textarea placeholder="Describe your facilities, equipment, and what makes your gym unique..." value={gymDesc} onChange={e => setGymDesc(e.target.value)} style={{ flex: 1, minHeight: 80, resize: "none" }} />
            </div>
          </div>

          <div style={{ alignSelf: "flex-end", width: "100%", marginTop: "8px" }}>
            <Actions label="Save and Continue" step={step} totalSteps={STEPS.length} disabled={isBusy} onBack={() => setStep(0)} onNext={goToPayoutStep} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayoutScreen = () => {
    const esewaWalletValid = isValidNepalMobileNumber(esewaWalletId);
    const khaltiWalletValid = isValidNepalMobileNumber(khaltiWalletId);

    // Shared styles for the provider containers to avoid repetition
    const providerBox = (enabled: boolean, accentRgb: string) => ({
      border: `1px solid ${enabled ? `rgba(${accentRgb},.4)` : "rgba(255,255,255,.08)"}`,
      borderRadius: 16,
      background: enabled ? `rgba(${accentRgb},.04)` : "rgba(255,255,255,.02)",
      overflow: "hidden",
      transition: "all .2s",
      marginBottom: 12,
    });

    return (
      <div className="screen">
        {stepError && <StepErrorBanner message={stepError} />}
        <div className="sec-label" style={{ marginBottom: 10 }}>Payout Wallet</div>
        <p style={{ fontSize: 12, color: "var(--text-m)", marginBottom: 18, lineHeight: 1.6 }}>
          Link the wallet where FitPal sends your revenue share. You can enable one or both.
        </p>
        <FieldError message={fieldErrors.payoutSelection} />

        {/* eSewa */}
        <div style={providerBox(esewaEnabled, "96,187,70")}>
          <button
            type="button"
            onClick={() => {
              setEsewaEnabled(prev => {
                const next = !prev;
                clearFieldError("payoutSelection");
                if (!next) clearFieldError("esewaWalletId", "esewaAccountName");
                return next;
              });
            }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: "transparent", border: "none", cursor: "pointer", color: "#fff", textAlign: "left" }}>
            <div style={{ width: 112, height: 56, borderRadius: 14, background: "rgba(96,187,70,.14)", border: "1px solid rgba(96,187,70,.22)", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", overflow: "hidden", flexShrink: 0 }}>
              <img src={ESEWA_LOGO_URL} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>eSewa</div>
              <div style={{ fontSize: 11, color: "var(--text-d)", marginTop: 2 }}>Manual admin verification before first payout</div>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${esewaEnabled ? "#60BB46" : "rgba(255,255,255,.15)"}`, background: esewaEnabled ? "#60BB46" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
              {esewaEnabled && <svg width="10" height="10" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>}
            </div>
          </button>
          {esewaEnabled && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "16px 18px 18px", background: "rgba(0,0,0,.15)" }}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>eSewa ID / Phone <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" maxLength={10} placeholder="98XXXXXXXX" value={esewaWalletId}
                  onChange={e => {
                    setEsewaWalletId(e.target.value.replace(/\D/g, "").slice(0, 10));
                    clearFieldError("payoutSelection", "esewaWalletId");
                  }}
                  style={fieldErrors.esewaWalletId
                    ? { background: "rgba(255,255,255,.04)", ...inputErrorStyle("esewaWalletId") }
                    : { background: "rgba(255,255,255,.04)", borderColor: esewaWalletId && !esewaWalletValid ? "rgba(239,68,68,.5)" : esewaWalletValid ? "rgba(96,187,70,.45)" : "rgba(255,255,255,.08)" }}
                />
                <FieldError message={fieldErrors.esewaWalletId} />
                {!fieldErrors.esewaWalletId && esewaWalletId && !esewaWalletValid && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>Must start with 98 or 97 followed by 8 digits.</div>}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Registered Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  placeholder="Full name on eSewa account"
                  value={esewaAccountName}
                  onChange={e => {
                    setEsewaAccountName(e.target.value);
                    clearFieldError("payoutSelection", "esewaAccountName");
                  }}
                  style={fieldErrors.esewaAccountName
                    ? { background: "rgba(255,255,255,.04)", ...inputErrorStyle("esewaAccountName") }
                    : { background: "rgba(255,255,255,.04)" }}
                />
                <FieldError message={fieldErrors.esewaAccountName} />
              </div>
            </div>
          )}
        </div>

        {/* Khalti */}
        <div style={providerBox(khaltiEnabled, "139,92,246")}>
          <button
            type="button"
            onClick={() => {
              setKhaltiEnabled(prev => {
                const next = !prev;
                clearFieldError("payoutSelection");
                if (!next) clearFieldError("khaltiWalletId", "khaltiAccountName");
                return next;
              });
            }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: "transparent", border: "none", cursor: "pointer", color: "#fff", textAlign: "left" }}>
            <div style={{ width: 112, height: 56, borderRadius: 14, background: "rgba(92,45,145,.16)", border: "1px solid rgba(139,92,246,.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", overflow: "hidden", flexShrink: 0 }}>
              <img src={KHALTI_LOGO_URL} alt="Khalti" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Khalti</div>
              <div style={{ fontSize: 11, color: "var(--text-d)", marginTop: 2 }}>Wallet will be reviewed during approval</div>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${khaltiEnabled ? "#8b5cf6" : "rgba(255,255,255,.15)"}`, background: khaltiEnabled ? "#8b5cf6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
              {khaltiEnabled && <svg width="10" height="10" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>}
            </div>
          </button>
          {khaltiEnabled && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "16px 18px 18px", background: "rgba(0,0,0,.15)" }}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Khalti ID / Phone <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" maxLength={10} placeholder="98XXXXXXXX" value={khaltiWalletId}
                  onChange={e => {
                    setKhaltiWalletId(e.target.value.replace(/\D/g, "").slice(0, 10));
                    clearFieldError("payoutSelection", "khaltiWalletId");
                  }}
                  style={fieldErrors.khaltiWalletId
                    ? { width: "100%", background: "rgba(255,255,255,.04)", ...inputErrorStyle("khaltiWalletId") }
                    : { width: "100%", background: "rgba(255,255,255,.04)", borderColor: khaltiWalletId && !khaltiWalletValid ? "rgba(239,68,68,.5)" : "rgba(255,255,255,.08)" }}
                />
                <FieldError message={fieldErrors.khaltiWalletId} />
                {!fieldErrors.khaltiWalletId && khaltiWalletId && !khaltiWalletValid && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>Must start with 98 or 97 followed by 8 digits.</div>}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Registered Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  placeholder="Full name on Khalti account"
                  value={khaltiAccountName}
                  onChange={e => {
                    setKhaltiAccountName(e.target.value);
                    clearFieldError("payoutSelection", "khaltiAccountName");
                  }}
                  style={fieldErrors.khaltiAccountName
                    ? { background: "rgba(255,255,255,.04)", ...inputErrorStyle("khaltiAccountName") }
                    : { background: "rgba(255,255,255,.04)" }}
                />
                <FieldError message={fieldErrors.khaltiAccountName} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.18)", borderRadius: 14, marginTop: 4 }}>
          <svg width="30" height="30" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0, color: "#60a5fa" }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", marginBottom: 4 }}>How payouts work</div>
            <div style={{ fontSize: 12, color: "var(--text-m)", lineHeight: 1.7 }}>Members pay FitPal subscriptions directly. FitPal sends your gym&apos;s revenue share to the wallet(s) you connect here.</div>
          </div>
        </div>

        <Actions label="Save and Continue" step={step} totalSteps={STEPS.length} disabled={isBusy} onBack={() => setStep(1)} onNext={goToDocumentsStep} />
      </div>
    );
  };

  const renderDocsScreen = () => (
    <div className="screen">
      {stepError && <StepErrorBanner message={stepError} />}
      <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" style={{ display: "none" }} onChange={handleDocumentSelected} />
      <input ref={photoInputRef}    type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoSelected} />

      <div className="sec-label">Verification Documents</div>
      <p style={{ fontSize: 12, color: "var(--text-m)", marginBottom: 18, lineHeight: 1.6 }}>All documents are reviewed by our team and never shared publicly. Uploads are encrypted.</p>
      <FieldError message={fieldErrors.documents} />

      {docs.map((doc, idx) => {
        const isRequired = isRequiredDocType(doc.type);
        const docLabel   = (DOC_TYPES.find(t => t.value === doc.type) ?? { label: doc.type }).label;
        const optionalDocTypes = DOC_TYPES.filter(type =>
          !isRequiredDocType(type.value) &&
          (type.value === doc.type || !isSingletonDocType(type.value) || !docs.some((existingDoc, existingIdx) => existingIdx !== idx && existingDoc.type === type.value))
        );
        return (
          <div key={`${doc.type}-${idx}`} style={{ background: "var(--muted)", border: `1px solid ${isRequired ? "rgba(249,115,22,.15)" : "rgba(255,255,255,.06)"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 12, position: "relative" }}>
            {isRequired && (
              <div style={{ position: "absolute", top: -1, right: 14, fontSize: 8, fontWeight: 900, color: "var(--orange)", background: "var(--muted)", padding: "2px 8px", borderRadius: "0 0 8px 8px", border: "1px solid rgba(249,115,22,.2)", borderTop: "none", textTransform: "uppercase", letterSpacing: ".08em" }}>Required</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <select disabled={isRequired || doc.uploaded} value={doc.type} onChange={e => setDocType(idx, e.target.value as DocTypeValue)}
                  style={{ width: "100%", padding: "11px 32px 11px 14px", background: isRequired ? "rgba(249,115,22,.06)" : "rgba(255,255,255,.04)", border: `1px solid ${isRequired ? "rgba(249,115,22,.2)" : "rgba(255,255,255,.08)"}`, borderRadius: 10, color: isRequired ? "var(--orange)" : "#e5e7eb", fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, outline: "none", appearance: "none", WebkitAppearance: "none", cursor: isRequired || doc.uploaded ? "default" : "pointer" }}>
                  {isRequired
                    ? <option value={doc.type}>{docLabel}</option>
                    : optionalDocTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)
                  }
                </select>
                <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#4b5563" }} width="10" height="6" fill="none" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              {!isRequired && (
                <button type="button" onClick={() => removeDoc(idx)}
                  style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", color: "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
                  onMouseOver={e => { e.currentTarget.style.background = "rgba(239,68,68,.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,.25)"; e.currentTarget.style.color = "#ef4444"; }}
                  onMouseOut={e  => { e.currentTarget.style.background = "rgba(255,255,255,.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; e.currentTarget.style.color = "#4b5563"; }}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </button>
              )}
            </div>

            {doc.uploaded ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: "rgba(52,211,153,.06)", border: "1.5px solid rgba(52,211,153,.2)", borderRadius: 12, marginTop: 10 }}>
                <svg style={{ flexShrink: 0, color: "#4ade80" }} width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName}</span>
                <button type="button" onClick={() => void removeDoc(idx)} disabled={uploadingDocIndex === idx}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: uploadingDocIndex === idx ? "not-allowed" : "pointer", color: "#fca5a5", fontSize: 10, fontWeight: 700, fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: ".06em", padding: "2px 6px", borderRadius: 6 }}
                  onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                  onMouseOut={e  => e.currentTarget.style.color = "#fca5a5"}
                >{uploadingDocIndex === idx ? "..." : "Remove"}</button>
                <button type="button" onClick={() => openDocumentPicker(idx)}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#4b5563", fontSize: 10, fontWeight: 700, fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: ".06em", padding: "2px 6px", borderRadius: 6 }}
                  onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                  onMouseOut={e  => e.currentTarget.style.color = "#4b5563"}
                >Replace</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 20, background: "rgba(255,255,255,.02)", border: "1.5px dashed rgba(255,255,255,.09)", borderRadius: 12, cursor: "pointer", transition: "all .18s", marginTop: 10 }}
                onClick={() => openDocumentPicker(idx)} onKeyDown={() => undefined} role="button" tabIndex={0}
                onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,.4)"; e.currentTarget.style.background = "rgba(249,115,22,.03)"; }}
                onMouseOut={e  => { e.currentTarget.style.borderColor = "rgba(255,255,255,.09)"; e.currentTarget.style.background = "rgba(255,255,255,.02)"; }}
              >
                <svg style={{ color: "#4b5563" }} width="20" height="20" fill="none" viewBox="0 0 20 20">
                  <path d="M10 13V7m0 0L7 10m3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#4b5563" }}>{uploadingDocIndex === idx ? "Uploading..." : "Click to upload"}</span>
                <span style={{ fontSize: 10, color: "#374151", fontWeight: 600 }}>PDF / JPG / PNG - Max 10MB</span>
              </div>
            )}
          </div>
        );
      })}

      <button type="button" onClick={addDoc}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center", padding: 12, borderRadius: 12, border: "1.5px dashed rgba(249,115,22,.25)", background: "rgba(249,115,22,.03)", color: "var(--orange)", fontFamily: "var(--font)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .18s", textTransform: "uppercase", letterSpacing: ".07em", marginTop: 4 }}
        onMouseOver={e => { e.currentTarget.style.background = "rgba(249,115,22,.08)"; e.currentTarget.style.borderColor = "rgba(249,115,22,.45)"; }}
        onMouseOut={e  => { e.currentTarget.style.background = "rgba(249,115,22,.03)"; e.currentTarget.style.borderColor = "rgba(249,115,22,.25)"; }}
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        Add Document
      </button>

      {/* Photos section */}
      <div className="sec-label green" style={{ marginTop: 24 }}>Gym Photos</div>
      <FieldError message={fieldErrors.photos} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, fontSize: 12, color: "var(--text-m)" }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style={{ color: "var(--orange)", flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        At least 1 photo is required. You can upload up to {MAX_GYM_PHOTOS} photos.
      </div>

      <button type="button" onClick={openPhotoPicker} disabled={isUploadingPhotos || activePhotoId !== null || photos.length >= MAX_GYM_PHOTOS}
        style={{ width: "100%", marginTop: 12, padding: "16px 14px", borderRadius: 12, border: "1.5px dashed rgba(249,115,22,.25)", background: "rgba(249,115,22,.03)", color: "var(--text-m)", cursor: isUploadingPhotos || activePhotoId !== null || photos.length >= MAX_GYM_PHOTOS ? "not-allowed" : "pointer", fontFamily: "var(--font)", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{isUploadingPhotos ? "Uploading photos..." : "Drop photos here or click to browse"}</div>
        <div style={{ fontSize: 11, marginTop: 4, color: "#4b5563" }}>JPG, PNG, WEBP - first photo becomes cover</div>
      </button>

      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginTop: 12 }}>
          {photos.map(photo => (
            <div key={photo.publicId} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,.02)" }}>
              <div style={{ position: "relative", width: "100%", height: 100, background: "#0d0d0d" }}>
                <img src={photo.photoUrl} alt="Gym" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {photo.cover && (
                  <div style={{ position: "absolute", top: 8, left: 8, fontSize: 9, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", background: "rgba(16,185,129,.92)", color: "#fff", borderRadius: 999, padding: "3px 8px" }}>Cover</div>
                )}
                <button type="button" onClick={() => void removePhoto(photo.photoId)} disabled={activePhotoId !== null || !hasPhotoId(photo.photoId)} aria-label="Remove gym photo"
                  style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "999px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.8)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: activePhotoId !== null || !hasPhotoId(photo.photoId) ? "not-allowed" : "pointer", transition: "all .2s", zIndex: 1, opacity: activePhotoId === photo.photoId ? 0.65 : 1 }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)"; e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(0,0,0,0.8)"; }}
                >
                  {!hasPhotoId(photo.photoId) || activePhotoId === photo.photoId
                    ? <span style={{ fontSize: 10, fontWeight: 900, lineHeight: 1 }}>...</span>
                    : <svg width="12" height="12" fill="none" viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  }
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, padding: 8 }}>
                <button type="button" onClick={() => void setCoverPhoto(photo.photoId)} disabled={photo.cover || activePhotoId !== null || !hasPhotoId(photo.photoId)}
                  style={{ flex: 1, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#e5e7eb", borderRadius: 8, fontSize: 10, fontWeight: 700, padding: "6px 8px", cursor: photo.cover || activePhotoId !== null || !hasPhotoId(photo.photoId) ? "not-allowed" : "pointer", textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {photo.cover ? "Cover" : !hasPhotoId(photo.photoId) ? "Syncing" : "Set Cover"}
                </button>
                <button type="button" onClick={() => void removePhoto(photo.photoId)} disabled={activePhotoId !== null || !hasPhotoId(photo.photoId)}
                  style={{ border: "1px solid rgba(239,68,68,.35)", background: "rgba(239,68,68,.08)", color: "#fca5a5", borderRadius: 8, fontSize: 10, fontWeight: 700, padding: "6px 8px", cursor: activePhotoId !== null || !hasPhotoId(photo.photoId) ? "not-allowed" : "pointer", textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {!hasPhotoId(photo.photoId) ? "Syncing" : activePhotoId === photo.photoId ? "..." : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--text-d)" }}>
        <span><strong style={{ color: "var(--text-m)" }}>{photos.length}</strong> / {MAX_GYM_PHOTOS} photos</span>
        <button type="button" onClick={openPhotoPicker} disabled={isUploadingPhotos || activePhotoId !== null || photos.length >= MAX_GYM_PHOTOS}
          style={{ color: "var(--orange)", background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.2)", borderRadius: 8, padding: "5px 12px", cursor: isUploadingPhotos || activePhotoId !== null || photos.length >= MAX_GYM_PHOTOS ? "not-allowed" : "pointer", fontFamily: "var(--font)", fontSize: 11, fontWeight: 700 }}>
          + Add More
        </button>
      </div>

      {hasRequiredDocs && hasRequiredPhotos ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 12, marginTop: 16 }}>
          <svg style={{ color: "#4ade80", flexShrink: 0 }} width="15" height="15" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>All required documents uploaded and at least 1 photo added. Ready to submit.</span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, marginTop: 16 }}>
          <svg style={{ color: "#52525b", flexShrink: 0 }} width="15" height="15" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#52525b" }}>Upload required documents and at least one gym photo to continue.</span>
        </div>
      )}

      <Actions label="Save and Continue" step={step} totalSteps={STEPS.length} disabled={isBusy} onBack={() => setStep(2)} onNext={goToReviewSubmitStep} />
    </div>
  );

  const renderReviewSubmitScreen = () => (
    <div className="screen">
      {stepError && <StepErrorBanner message={stepError} />}
      <div style={{ border: "1px solid rgba(249,115,22,.25)", background: "rgba(249,115,22,.08)", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
        <p style={{ margin: 0, color: "#fb923c", fontSize: 13, fontWeight: 800, letterSpacing: ".03em", textTransform: "uppercase" }}>Please Check Again</p>
        <p style={{ margin: "8px 0 0", color: "#f5f5f5", fontSize: 12 }}>Confirm your details, payouts, documents, and photos before submission. Once submitted, your data cannot be changed until admin review is completed or rejected.</p>
      </div>
      <div style={{ border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", borderRadius: 14, padding: "14px 16px", display: "grid", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--text-m)" }}>Required Documents</span>
          <strong style={{ fontSize: 12, color: "#fff" }}>{hasRequiredDocs ? "Complete" : "Missing"}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--text-m)" }}>Gym Photos</span>
          <strong style={{ fontSize: 12, color: "#fff" }}>{hasRequiredPhotos ? `Complete (${photos.length})` : "Missing"}</strong>
        </div>
      </div>
      <Actions label={isGymRejected ? "Resubmit for Review" : "Submit for Review"} step={step} totalSteps={STEPS.length} disabled={isBusy} onBack={() => setStep(DOCUMENTS_STEP_INDEX)} onNext={goToReviewStep} />
    </div>
  );

  const renderGymDoneScreen = () => (
    <div className="screen done-wrap">
      <div className="done-icon pending">
        <svg width="34" height="34" fill="none" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="13" stroke="#ea580c" strokeWidth="2" />
          <path d="M18 12v7l5 2.5" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="done-title">
        {isGymApproved ? "Gym Approved" : isGymRejected ? "Changes Requested" : "Pending Review"}
      </div>
      <div className="done-sub">
        {isGymApproved ? (
          <>Your gym has been approved and can now access the dashboard.</>
        ) : isGymRejected ? (
          <>Your submission was sent back for updates. Please edit your details, fix the requested items, and submit for review again.</>
        ) : (
          <>Thank you for submitting your application for our platform. Our team will review this application within <strong style={{ color: "var(--orange)" }}>1-2 business days</strong>, and confirmation will be shown on this page.</>
        )}
      </div>
      <div className="done-actions">
        {isGymRejected && (
          <button className="corner-action-btn" type="button" onClick={openEditSubmission}>
            <span>Edit Submission</span>
          </button>
        )}
        <button className="done-btn" type="button" onClick={() => window.location.reload()}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Refresh Status
        </button>
      </div>
    </div>
  );

  const renderLoadingScreen = () => (
    <div className="screen" style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--orange)", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
        <span className="spinner" />Loading gym profile
      </div>
    </div>
  );

  const stepId  = STEPS[step]?.id ?? "gymInfo";
  const hdr     = HEADERS[stepId];
  const isWide  = stepId === "location" || stepId === "gymInfo" || stepId === "payout" || stepId === "docs";
  const cardMax = isWide ? "860px" : "580px";

  const renderCurrentScreen = () => {
    if (isLoadingProfile) return renderLoadingScreen();
    switch (stepId) {
      case "gymInfo":      return renderGymInfoScreen();
      case "location":     return renderLocationScreen();
      case "payout":       return renderPayoutScreen();
      case "docs":         return renderDocsScreen();
      case "reviewSubmit": return renderReviewSubmitScreen();
      case "gymDone":      return renderGymDoneScreen();
      default:             return renderGymInfoScreen();
    }
  };

  const handleShellSectionChange = (section: string) => {
    if (section === "gymProfile") {
      navigate("/gym-profile-setup");
      return;
    }

    navigate("/dashboard", { state: { activeSection: section } });
  };

  return (
    <DefaultLayout
      role="GYM"
      activeSection="gymProfile"
      onSectionChange={handleShellSectionChange}
      onPrimaryAction={() => navigate("/gym-profile-setup")}
      onProfileClick={() => navigate("/gym-profile-setup")}
      contentClassName="p-0"
    >
        <div className="content">
          <div className="progress-header" style={{ maxWidth: cardMax }}>
            <div className="progress-kicker">
              <div className="progress-kicker-line" />FitPal Profile Setup
            </div>
            <h1 className="progress-title">{hdr[0]} <span className="fire-t">{hdr[1]}</span></h1>
            <p className="progress-sub">{hdr[2]}</p>
            {renderTrack()}
          </div>

          <div className="card" style={{ maxWidth: cardMax }}>
            {(isGymPendingReview || isGymRejected) && stepId !== "gymDone" && (
              <StatusBanner
                title={isGymRejected ? "Application Rejected — Editing Enabled" : "Submission Under Review"}
                message={isGymRejected
                  ? "You can now edit and fix the issues. Any save will reset your application to Draft and require resubmission."
                  : "Save actions are blocked until an admin rejects the application."}
              />
            )}
            {renderCurrentScreen()}
          </div>

          <p style={{ marginTop: 14, fontSize: 11, color: "#374151", textAlign: "center", position: "relative", zIndex: 1 }}>
            By continuing you agree to our{" "}
            <a href="#" style={{ color: "var(--orange)", textDecoration: "none" }}>Terms</a>{" "}and{" "}
            <a href="#" style={{ color: "var(--orange)", textDecoration: "none" }}>Privacy Policy</a>
          </p>
        </div>
    </DefaultLayout>
  );
};

export default FitPalGymSetup;
