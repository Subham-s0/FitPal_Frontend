import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMySavedGymCountApi, getUserGymDiscoverApi, saveMyGymApi, unsaveMyGymApi } from "@/features/gyms/api";
import type { UserGymDiscoverRequest } from "@/features/gyms/model";
import { gymsQueryKeys } from "@/features/gyms/queryKeys";
import type {
  GymRecommendationItem,
  GymSortMode,
  GymStatusFilter,
  LocationPermissionState,
  RecommendationMode,
  SheetSnap,
} from "@/features/gyms/types";

type RequestedLocationMode = Exclude<RecommendationMode, "show-all">;
type Coordinates = { lat: number; lng: number };

const DISCOVER_PAGE_SIZE = 100;
const LOCATION_REFRESH_THRESHOLD_METERS = 50;

export interface GymsRecommendationState {
  locationPermission: LocationPermissionState;
  userCoords: Coordinates | null;
  mode: RecommendationMode;
  isDiscoverLoading: boolean;
  gyms: GymRecommendationItem[];
  filteredGyms: GymRecommendationItem[];
  selectedGym: GymRecommendationItem | null;
  sheetSnap: SheetSnap;
  searchQuery: string;
  isLocationPopupOpen: boolean;
  requestedLocationMode: RequestedLocationMode | null;
  savedGymCount: number;
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
  toggleSavedGym: (gymId: number) => void;
  toggleSavedOnly: () => void;
  setStatusFilter: (filter: GymStatusFilter) => void;
  setSortMode: (sortMode: GymSortMode) => void;
  resetFilters: () => void;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchAllDiscoverGyms(request: UserGymDiscoverRequest): Promise<GymRecommendationItem[]> {
  const firstPage = await getUserGymDiscoverApi({
    ...request,
    page: 0,
    size: DISCOVER_PAGE_SIZE,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      getUserGymDiscoverApi({
        ...request,
        page: index + 1,
        size: DISCOVER_PAGE_SIZE,
      })
    )
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.items);
}

function toggleSavedState(
  gyms: GymRecommendationItem[],
  gymId: number,
  isSaved: boolean,
  removeWhenSavedOnly: boolean
): GymRecommendationItem[] {
  if (removeWhenSavedOnly && !isSaved) {
    return gyms.filter((gym) => gym.gymId !== gymId);
  }

  return gyms.map((gym) => (gym.gymId === gymId ? { ...gym, isSaved } : gym));
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

function isPermissionDeniedError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 1;
}

export function useGymsRecommendation(): GymsRecommendationState & GymsRecommendationActions {
  const [locationPermission, setLocationPermission] = useState<LocationPermissionState>("loading");
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [mode, setModeRaw] = useState<RecommendationMode>("show-all");
  const [gyms, setGyms] = useState<GymRecommendationItem[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<number | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("closed");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocationPopupOpen, setLocationPopupOpen] = useState(false);
  const [requestedLocationMode, setRequestedLocationMode] = useState<RequestedLocationMode | null>(null);
  const [savedGymCount, setSavedGymCount] = useState(0);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<GymStatusFilter>("all");
  const [sortMode, setSortMode] = useState<GymSortMode>("recommended");
  const queryClient = useQueryClient();
  const watchIdRef = useRef<number | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const discoverRequest = useMemo<UserGymDiscoverRequest>(() => {
    const query = deferredSearchQuery.trim();
    return {
      query: query || undefined,
      mode,
      status: statusFilter,
      savedOnly: showSavedOnly || undefined,
      sort: sortMode,
      lat: userCoords?.lat,
      lng: userCoords?.lng,
    };
  }, [deferredSearchQuery, mode, showSavedOnly, sortMode, statusFilter, userCoords?.lat, userCoords?.lng]);

  const savedCountQuery = useQuery({
    queryKey: gymsQueryKeys.savedCount(),
    queryFn: getMySavedGymCountApi,
    staleTime: 30_000,
  });

  const discoverQuery = useQuery({
    queryKey: gymsQueryKeys.discover({
      query: discoverRequest.query,
      mode: discoverRequest.mode,
      status: discoverRequest.status,
      savedOnly: discoverRequest.savedOnly,
      sort: discoverRequest.sort,
      lat: discoverRequest.lat,
      lng: discoverRequest.lng,
    }),
    queryFn: () => fetchAllDiscoverGyms(discoverRequest),
    enabled: mode === "show-all" || Boolean(userCoords),
    staleTime: 30_000,
  });
  const isDiscoverLoading = discoverQuery.isLoading || (discoverQuery.isFetching && gyms.length === 0);

  const toggleSavedMutation = useMutation({
    mutationFn: async ({ gymId, nextIsSaved }: { gymId: number; nextIsSaved: boolean }) => {
      if (nextIsSaved) {
        await saveMyGymApi(gymId);
        return;
      }

      await unsaveMyGymApi(gymId);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.savedCount() }),
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.discoverLists() }),
      ]);
    },
  });

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
        } catch (error) {
          if (!mounted) return;
          if (isPermissionDeniedError(error)) {
            setLocationPermission("denied");
            setUserCoords(null);
          }
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
        const nextCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserCoords((current) => {
          if (
            current &&
            haversine(current.lat, current.lng, nextCoords.lat, nextCoords.lng) < LOCATION_REFRESH_THRESHOLD_METERS
          ) {
            return current;
          }
          return nextCoords;
        });
      },
      (error) => {
        if (isPermissionDeniedError(error)) {
          setLocationPermission("denied");
          setUserCoords(null);
        }
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

  useEffect(() => {
    if (!selectedGymId) return;
    const stillExists = gyms.some((gym) => gym.gymId === selectedGymId);
    if (!stillExists) {
      setSelectedGymId(null);
      setSheetSnap("closed");
    }
  }, [gyms, selectedGymId]);

  useEffect(() => {
    const locationUnavailable = locationPermission !== "granted" || !userCoords;
    if (!locationUnavailable) return;
    if (mode === "show-all") return;

    setModeRaw("show-all");
    setSelectedGymId(null);
    setSheetSnap("closed");
  }, [locationPermission, mode, userCoords]);

  useEffect(() => {
    if (typeof savedCountQuery.data?.count === "number") {
      setSavedGymCount(savedCountQuery.data.count);
    }
  }, [savedCountQuery.data?.count]);

  useEffect(() => {
    if (discoverQuery.data) {
      setGyms(discoverQuery.data);
      return;
    }

    if (discoverQuery.isError) {
      console.error("Failed to load discover gyms", discoverQuery.error);
      setGyms([]);
    }
  }, [discoverQuery.data, discoverQuery.error, discoverQuery.isError]);

  useEffect(() => {
    if (mode === "show-all") return;
    if (selectedGymId && gyms.some((gym) => gym.gymId === selectedGymId)) return;

    const nextSelected = gyms[0] ?? null;
    setSelectedGymId(nextSelected?.gymId ?? null);
    setSheetSnap(nextSelected ? "compact" : "closed");
  }, [gyms, mode, selectedGymId]);

  const filteredGyms = useMemo(() => gyms, [gyms]);

  const selectedGym = useMemo(() => {
    if (!selectedGymId) return null;
    return filteredGyms.find((gym) => gym.gymId === selectedGymId) ?? null;
  }, [filteredGyms, selectedGymId]);

  const applyRecommendedMode = useCallback((nextMode: RequestedLocationMode) => {
    setModeRaw(nextMode);
    setRequestedLocationMode(null);
    setLocationPopupOpen(false);
    setSelectedGymId(null);
    setSheetSnap("closed");
  }, []);

  const refreshGrantedLocation = useCallback(
    async (nextMode: RequestedLocationMode): Promise<boolean> => {
      try {
        const coords = await getCurrentPosition();
        setUserCoords(coords);
        setLocationPermission("granted");
        applyRecommendedMode(nextMode);
        return true;
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          setLocationPermission("denied");
          setUserCoords(null);
          setRequestedLocationMode(nextMode);
          setLocationPopupOpen(true);
          return false;
        }

        return false;
      }
    },
    [applyRecommendedMode]
  );

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
        applyRecommendedMode(requestedLocationMode);
      }

      setLocationPopupOpen(false);
      setRequestedLocationMode(null);
      return true;
    } catch (error) {
      setLocationPermission(isPermissionDeniedError(error) ? "denied" : "prompt");
      setUserCoords(null);
      setModeRaw("show-all");
      setSelectedGymId(null);
      setSheetSnap("closed");
      setLocationPopupOpen(false);
      setRequestedLocationMode(null);
      return false;
    }
  }, [applyRecommendedMode, requestedLocationMode]);

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
        if (locationPermission === "granted") {
          void refreshGrantedLocation(next);
          return;
        }

        setRequestedLocationMode(next);
        setLocationPopupOpen(true);
        return;
      }

      applyRecommendedMode(next);
    },
    [applyRecommendedMode, locationPermission, refreshGrantedLocation, userCoords]
  );

  const selectGym = useCallback((gym: GymRecommendationItem | null) => {
    setSelectedGymId(gym?.gymId ?? null);
    setSheetSnap(gym ? "compact" : "closed");
  }, []);

  const dismissLocationPopup = useCallback(() => {
    setLocationPopupOpen(false);
    setRequestedLocationMode(null);
  }, []);

  const toggleSavedGym = useCallback(
    (gymId: number) => {
      const currentGym = gyms.find((gym) => gym.gymId === gymId);
      if (!currentGym) return;

      const nextIsSaved = !currentGym.isSaved;
      const previousGyms = gyms;
      const previousSavedGymCount = savedGymCount;
      const nextGyms = toggleSavedState(previousGyms, gymId, nextIsSaved, showSavedOnly);

      setGyms(nextGyms);
      setSavedGymCount(Math.max(0, previousSavedGymCount + (nextIsSaved ? 1 : -1)));

      toggleSavedMutation.mutate(
        { gymId, nextIsSaved },
        {
          onError: (error) => {
            console.error("Failed to update saved gym", error);
            setGyms(previousGyms);
            setSavedGymCount(previousSavedGymCount);
          },
        }
      );
    },
    [gyms, savedGymCount, showSavedOnly, toggleSavedMutation]
  );

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
    isDiscoverLoading,
    gyms,
    filteredGyms,
    selectedGym,
    sheetSnap,
    searchQuery,
    isLocationPopupOpen,
    requestedLocationMode,
    savedGymCount,
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
