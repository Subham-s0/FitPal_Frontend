import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GymRecommendationItem,
  LocationPermissionState,
  GymSortMode,
  GymStatusFilter,
  RecommendationMode,
  SheetSnap,
} from "./gyms.types";
import { SEED_GYMS } from "./gyms.data";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bestMatchScore(gym: GymRecommendationItem): number {
  let score = 0;
  if (gym.currentlyOpen) score += 10_000;
  if (gym.distanceMeters !== undefined) {
    score -= gym.distanceMeters / 100;
  }
  if (gym.occupancyPercent !== undefined) {
    score -= gym.occupancyPercent;
  }
  return score;
}

function sortGyms(gyms: GymRecommendationItem[], mode: RecommendationMode): GymRecommendationItem[] {
  return [...gyms].sort((a, b) => {
    if (mode === "nearest") {
      return (a.distanceMeters ?? Number.POSITIVE_INFINITY) - (b.distanceMeters ?? Number.POSITIVE_INFINITY);
    }

    if (mode === "best-match") {
      return bestMatchScore(b) - bestMatchScore(a);
    }

    if (a.currentlyOpen !== b.currentlyOpen) {
      return Number(b.currentlyOpen) - Number(a.currentlyOpen);
    }

    const distanceDiff =
      (a.distanceMeters ?? Number.POSITIVE_INFINITY) - (b.distanceMeters ?? Number.POSITIVE_INFINITY);
    if (distanceDiff !== 0) return distanceDiff;

    return a.name.localeCompare(b.name);
  });
}

function sortVisibleGyms(gyms: GymRecommendationItem[], sortMode: GymSortMode): GymRecommendationItem[] {
  if (sortMode === "alphabetical") {
    return [...gyms].sort((a, b) => a.name.localeCompare(b.name));
  }

  return gyms;
}

type RequestedLocationMode = Exclude<RecommendationMode, "show-all">;
const SAVED_GYMS_STORAGE_KEY = "fitpal.saved-gyms";

export interface GymsRecommendationState {
  locationPermission: LocationPermissionState;
  userCoords: { lat: number; lng: number } | null;
  mode: RecommendationMode;
  gyms: GymRecommendationItem[];
  filteredGyms: GymRecommendationItem[];
  selectedGym: GymRecommendationItem | null;
  sheetSnap: SheetSnap;
  searchQuery: string;
  isLocationPopupOpen: boolean;
  requestedLocationMode: RequestedLocationMode | null;
  savedGymIds: string[];
  showSavedOnly: boolean;
  statusFilter: GymStatusFilter;
  sortMode: GymSortMode;
}

export interface GymsRecommendationActions {
  requestLocation: () => Promise<boolean>;
  setMode: (mode: RecommendationMode) => void;
  selectGym: (gym: GymRecommendationItem | null) => void;
  setSheetSnap: (snap: SheetSnap) => void;
  setSearchQuery: (query: string) => void;
  setLocationPopupOpen: (open: boolean) => void;
  dismissLocationPopup: () => void;
  toggleSavedGym: (gymId: string) => void;
  toggleSavedOnly: () => void;
  setStatusFilter: (filter: GymStatusFilter) => void;
  setSortMode: (sortMode: GymSortMode) => void;
  resetFilters: () => void;
}

type Coordinates = { lat: number; lng: number };

function buildGymDataset(userCoords: Coordinates | null): GymRecommendationItem[] {
  return SEED_GYMS.map((gym) => ({
    ...gym,
    distanceMeters: userCoords
      ? haversine(userCoords.lat, userCoords.lng, gym.latitude, gym.longitude)
      : undefined,
  }));
}

function filterVisibleGyms(
  gyms: GymRecommendationItem[],
  searchQuery: string,
  showSavedOnly: boolean,
  savedGymIds: string[],
  statusFilter: GymStatusFilter,
  sortMode: GymSortMode
): GymRecommendationItem[] {
  const query = searchQuery.trim().toLowerCase();
  const filtered = gyms.filter((gym) => {
    if (showSavedOnly && !savedGymIds.includes(gym.id)) return false;
    if (statusFilter === "open" && !gym.currentlyOpen) return false;
    if (statusFilter === "closed" && gym.currentlyOpen) return false;
    if (!query) return true;

    return (
      gym.name.toLowerCase().includes(query) ||
      gym.address.toLowerCase().includes(query) ||
      gym.city.toLowerCase().includes(query)
    );
  });

  return sortVisibleGyms(filtered, sortMode);
}

async function getPermissionState(): Promise<LocationPermissionState> {
  if (!navigator.geolocation) return "unsupported";

  if (!("permissions" in navigator) || typeof navigator.permissions.query !== "function") {
    return "prompt";
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    switch (result.state) {
      case "granted":
        return "granted";
      case "denied":
        return "denied";
      default:
        return "prompt";
    }
  } catch {
    return "prompt";
  }
}

function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  });
}

export function useGymsRecommendation(): GymsRecommendationState & GymsRecommendationActions {
  const [locationPermission, setLocationPermission] = useState<LocationPermissionState>("loading");
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [mode, setModeRaw] = useState<RecommendationMode>("show-all");
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("closed");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocationPopupOpen, setLocationPopupOpen] = useState(false);
  const [requestedLocationMode, setRequestedLocationMode] = useState<RequestedLocationMode | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<GymStatusFilter>("all");
  const [sortMode, setSortMode] = useState<GymSortMode>("recommended");
  const [savedGymIds, setSavedGymIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(SAVED_GYMS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SAVED_GYMS_STORAGE_KEY, JSON.stringify(savedGymIds));
  }, [savedGymIds]);

  useEffect(() => {
    let mounted = true;

    const syncPermission = async () => {
      const permission = await getPermissionState();
      if (!mounted) return;

      setLocationPermission(permission);

      if (permission === "granted" && navigator.geolocation) {
        try {
          const coords = await getCurrentPosition();
          if (!mounted) return;
          setUserCoords(coords);
        } catch {
          if (!mounted) return;
          setLocationPermission("prompt");
        }
      }
    };

    void syncPermission();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation || locationPermission !== "granted") {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocationPermission("prompt");
        setUserCoords(null);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [locationPermission]);

  const gyms = useMemo(() => {
    const dataset = buildGymDataset(userCoords);
    return sortGyms(dataset, mode);
  }, [mode, userCoords]);

  const filteredGyms = useMemo(() => {
    return filterVisibleGyms(gyms, searchQuery, showSavedOnly, savedGymIds, statusFilter, sortMode);
  }, [gyms, savedGymIds, searchQuery, showSavedOnly, sortMode, statusFilter]);

  const selectedGym = useMemo(() => {
    if (!selectedGymId) return null;
    return filteredGyms.find((gym) => gym.id === selectedGymId) ?? null;
  }, [filteredGyms, selectedGymId]);

  useEffect(() => {
    if (!selectedGymId) return;
    const stillExists = gyms.some((gym) => gym.id === selectedGymId);
    if (!stillExists) {
      setSelectedGymId(null);
      setSheetSnap("closed");
    }
  }, [gyms, selectedGymId]);

  useEffect(() => {
    if (!selectedGymId) return;
    const stillVisible = filteredGyms.some((gym) => gym.id === selectedGymId);
    if (!stillVisible) {
      setSelectedGymId(null);
      setSheetSnap("closed");
    }
  }, [filteredGyms, selectedGymId]);

  useEffect(() => {
    const locationUnavailable = locationPermission !== "granted" || !userCoords;
    if (!locationUnavailable) return;
    if (mode === "show-all") return;

    setModeRaw("show-all");
    setSelectedGymId(null);
    setSheetSnap("closed");
  }, [locationPermission, mode, userCoords]);

  const requestLocation = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setLocationPermission("unsupported");
      setUserCoords(null);
      return false;
    }

    try {
      const coords = await getCurrentPosition();
      setUserCoords(coords);
      setLocationPermission("granted");

      if (requestedLocationMode) {
        setModeRaw(requestedLocationMode);
        const nextGyms = filterVisibleGyms(
          sortGyms(buildGymDataset(coords), requestedLocationMode),
          searchQuery,
          showSavedOnly,
          savedGymIds,
          statusFilter,
          sortMode
        );
        const nextSelected = nextGyms[0] ?? null;
        setSelectedGymId(nextSelected?.id ?? null);
        setSheetSnap(nextSelected ? "compact" : "closed");
      }

      setLocationPopupOpen(false);
      setRequestedLocationMode(null);
      return true;
    } catch {
      setLocationPermission("denied");
      setUserCoords(null);
      setModeRaw("show-all");
      setSelectedGymId(null);
      setSheetSnap("closed");
      setLocationPopupOpen(false);
      setRequestedLocationMode(null);
      return false;
    }
  }, [requestedLocationMode, savedGymIds, searchQuery, showSavedOnly, sortMode, statusFilter]);

  const setMode = useCallback(
    (next: RecommendationMode) => {
      if (next === "show-all") {
        setModeRaw("show-all");
        setRequestedLocationMode(null);
        setLocationPopupOpen(false);
        setSelectedGymId(null);
        setSheetSnap("closed");
        return;
      }

      if (!userCoords || locationPermission !== "granted") {
        setRequestedLocationMode(next);
        setLocationPopupOpen(true);
        return;
      }

      const sorted = filterVisibleGyms(
        sortGyms(buildGymDataset(userCoords), next),
        searchQuery,
        showSavedOnly,
        savedGymIds,
        statusFilter,
        sortMode
      );
      const nextSelected = sorted[0] ?? null;

      setModeRaw(next);
      setRequestedLocationMode(null);
      setSelectedGymId(nextSelected?.id ?? null);
      setSheetSnap(nextSelected ? "compact" : "closed");
    },
    [locationPermission, savedGymIds, searchQuery, showSavedOnly, sortMode, statusFilter, userCoords]
  );

  const selectGym = useCallback((gym: GymRecommendationItem | null) => {
    setSelectedGymId(gym?.id ?? null);
    setSheetSnap(gym ? "compact" : "closed");
  }, []);

  const dismissLocationPopup = useCallback(() => {
    setLocationPopupOpen(false);
    setRequestedLocationMode(null);
  }, []);

  const toggleSavedGym = useCallback((gymId: string) => {
    setSavedGymIds((current) =>
      current.includes(gymId) ? current.filter((id) => id !== gymId) : [...current, gymId]
    );
  }, []);

  const toggleSavedOnly = useCallback(() => {
    setShowSavedOnly((current) => !current);
  }, []);

  const resetFilters = useCallback(() => {
    setShowSavedOnly(false);
    setStatusFilter("all");
    setSortMode("recommended");
  }, []);

  return {
    locationPermission,
    userCoords,
    mode,
    gyms,
    filteredGyms,
    selectedGym,
    sheetSnap,
    searchQuery,
    isLocationPopupOpen,
    requestedLocationMode,
    savedGymIds,
    showSavedOnly,
    statusFilter,
    sortMode,
    requestLocation,
    setMode,
    selectGym,
    setSheetSnap,
    setSearchQuery,
    setLocationPopupOpen,
    dismissLocationPopup,
    toggleSavedGym,
    toggleSavedOnly,
    setStatusFilter,
    setSortMode,
    resetFilters,
  };
}
