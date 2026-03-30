/* ── Gyms Recommendation – Frontend-only types ── */

export type RecommendationMode = "nearest" | "best-match" | "show-all";
export type GymStatusFilter = "all" | "open" | "closed";
export type GymSortMode = "recommended" | "alphabetical";

export type LocationPermissionState = "loading" | "prompt" | "granted" | "denied" | "unsupported";

export interface GymRecommendationItem {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  currentlyOpen: boolean;

  /** 0-100, undefined when data is unavailable */
  occupancyPercent?: number;
  occupancyLabel?: string;

  /** e.g. 4.8 */
  rating?: number;

  /** e.g. "Basic" | "Pro" | "Elite" */
  minimumAccessTier?: string;
  checkInEnabled: boolean;
  logoUrl?: string;
}

export type SheetSnap = "closed" | "compact" | "expanded";
