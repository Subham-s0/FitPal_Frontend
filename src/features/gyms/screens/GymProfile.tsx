import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Activity,
  ArrowRight,
  ArrowUpDown,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  MessageSquareReply,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthState } from "@/features/auth/hooks";
import Navbar from "@/features/marketing/components/Navbar";
import {
  createGymReviewApi,
  deleteMyGymReviewApi,
  getMyGymReviewApi,
  getPublicGymProfileApi,
  getPublicGymReviewsApi,
  getUserGymProfileViewApi,
  saveMyGymApi,
  unsaveMyGymApi,
  updateMyGymReviewApi,
} from "@/features/gyms/api";
import type {
  PublicGymPhotoResponse,
  PublicGymProfileResponse,
  ReviewSortDirection,
  UserGymProfileViewResponse,
} from "@/features/gyms/model";
import { gymsQueryKeys } from "@/features/gyms/queryKeys";
import { formatGymDistance } from "@/features/gyms/utils";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import { getApiErrorMessage } from "@/shared/api/client";
import { DefaultLayout, getDashboardRole } from "@/shared/layout/dashboard-shell";
import { resolveAvatarUrl, resolveDisplayName } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

type ViewerCoordinates = {
  lat: number;
  lng: number;
};

const REVIEW_PAGE_SIZE = 8;
const THEME_GALLERY_PHOTOS: PublicGymPhotoResponse[] = [
  {
    photoId: -1001,
    photoUrl:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=900&fit=crop",
    caption: "FitPal training floor",
    displayOrder: -3,
    cover: false,
  },
  {
    photoId: -1002,
    photoUrl:
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1200&h=900&fit=crop",
    caption: "Strength and conditioning zone",
    displayOrder: -2,
    cover: false,
  },
  {
    photoId: -1003,
    photoUrl:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&h=900&fit=crop",
    caption: "Cardio and free weights",
    displayOrder: -1,
    cover: false,
  },
];

const getCurrentCoordinates = async (): Promise<ViewerCoordinates | null> => {
  if (!navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 30_000,
      }
    );
  });
};

const formatTimeLabel = (time: string | null) => {
  if (!time) return "-";
  const [hoursText, minutesText] = time.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return time;
  }

  const normalizedHours = ((hours % 24) + 24) % 24;
  const period = normalizedHours >= 12 ? "PM" : "AM";
  const twelveHour = normalizedHours % 12 === 0 ? 12 : normalizedHours % 12;
  return `${String(twelveHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

const formatOperatingWindow = (opensAt: string | null, closesAt: string | null) => {
  if (!opensAt && !closesAt) return "Schedule unavailable";
  return `${formatTimeLabel(opensAt)} - ${formatTimeLabel(closesAt)}`;
};

const formatDistance = (distanceMeters: number | null) => {
  if (distanceMeters == null) {
    return "No location";
  }
  return formatGymDistance(distanceMeters);
};

const getDistanceToneClass = (distanceMeters: number | null) => {
  if (distanceMeters == null) return "text-red-400";
  return distanceMeters <= 2000 ? "text-emerald-400" : "text-red-400";
};

const formatReviewDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const buildGallery = (profile: PublicGymProfileResponse): PublicGymPhotoResponse[] => {
  const actualPhotos = profile.photos.filter((photo) => Boolean(photo.photoUrl));
  const logoPhoto =
    profile.logoUrl && !actualPhotos.some((photo) => photo.photoUrl === profile.logoUrl)
      ? [
          {
            photoId: -1,
            photoUrl: profile.logoUrl,
            caption: profile.gymName ? `${profile.gymName} logo` : "Gym logo",
            displayOrder: actualPhotos.length,
            cover: false,
          } satisfies PublicGymPhotoResponse,
        ]
      : [];

  return [...THEME_GALLERY_PHOTOS, ...actualPhotos, ...logoPhoto];
};

const buildFallbackProfileView = (
  profile: PublicGymProfileResponse
): UserGymProfileViewResponse => ({
  profile,
  isSaved: false,
  accessibleByCurrentUser: false,
  distanceMeters: null,
});

const GymProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAuthState();
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const isAuthenticated = Boolean(auth.accessToken);
  const roleValue = auth.role ?? "USER";
  const dashboardRole = isAuthenticated ? getDashboardRole(roleValue) : null;
  const activeSection = dashboardRole === "GYM" ? "home" : "gyms";
  const gymId = Number(id);

  const [reviewsPage, setReviewsPage] = useState(0);
  const [reviewsSortDirection, setReviewsSortDirection] = useState<ReviewSortDirection>("DESC");
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [viewerCoords, setViewerCoords] = useState<ViewerCoordinates | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [reviewsFilter, setReviewsFilter] = useState<"ALL" | "ME" | "5_STAR" | "4_STAR">("ALL");
  const [reviewsQuery, setReviewsQuery] = useState("");

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);
  
  // Gallery navigation state
  const [galleryIndex, setGalleryIndex] = useState(0);
  const slideIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isDeleteReviewDialogOpen, setDeleteReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<number>>(new Set());
  const toggleReply = useCallback((id: number) => {
    setExpandedReplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const [isDesktopGallery, setIsDesktopGallery] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });

  const trimmedReviewsQuery = reviewsQuery.trim();
  const reviewFilterRating =
    reviewsFilter === "5_STAR" ? 5 : reviewsFilter === "4_STAR" ? 4 : undefined;

  const profileQuery = useQuery({
    queryKey: gymsQueryKeys.profileView(
      gymId,
      viewerCoords?.lat,
      viewerCoords?.lng,
      isAuthenticated && dashboardRole === "USER" ? "member" : "public"
    ),
    enabled: Number.isFinite(gymId) && gymId > 0,
    queryFn: async () => {
      if (isAuthenticated && dashboardRole === "USER") {
        try {
          return await getUserGymProfileViewApi(
            gymId,
            viewerCoords ? { lat: viewerCoords.lat, lng: viewerCoords.lng } : undefined
          );
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            throw error;
          }

          const publicProfile = await getPublicGymProfileApi(gymId);
          return buildFallbackProfileView(publicProfile);
        }
      }

      const publicProfile = await getPublicGymProfileApi(gymId);
      return buildFallbackProfileView(publicProfile);
    },
    retry: false,
  });

  const communityReviewsQuery = useQuery({
    queryKey: gymsQueryKeys.reviews(gymId, {
      page: reviewsPage,
      size: REVIEW_PAGE_SIZE,
      sortDirection: reviewsSortDirection,
      query: trimmedReviewsQuery || undefined,
      rating: reviewFilterRating,
    }),
    enabled: Number.isFinite(gymId) && gymId > 0,
    queryFn: () =>
      getPublicGymReviewsApi(gymId, {
        page: reviewsPage,
        size: REVIEW_PAGE_SIZE,
        sortDirection: reviewsSortDirection,
        query: trimmedReviewsQuery || undefined,
        rating: reviewFilterRating,
      }),
    placeholderData: (previousData) => previousData,
  });

  const myReviewQuery = useQuery({
    queryKey: gymsQueryKeys.myReview(gymId),
    enabled: isAuthenticated && dashboardRole === "USER" && Number.isFinite(gymId) && gymId > 0,
    queryFn: () => getMyGymReviewApi(gymId),
    retry: false,
  });

  const createReviewMutation = useMutation({
    mutationFn: (payload: { rating: number; comments?: string }) => createGymReviewApi(gymId, payload),
  });

  const updateReviewMutation = useMutation({
    mutationFn: (payload: { rating: number; comments?: string }) => updateMyGymReviewApi(gymId, payload),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: () => deleteMyGymReviewApi(gymId),
  });

  const toggleSaveMutation = useMutation({
    mutationFn: async ({ nextSaved }: { nextSaved: boolean }) => {
      if (!profileQuery.data?.profile?.gymId) {
        throw new Error("Gym profile is unavailable.");
      }

      if (nextSaved) {
        await saveMyGymApi(profileQuery.data.profile.gymId);
        return;
      }

      await unsaveMyGymApi(profileQuery.data.profile.gymId);
    },
  });

  const profileView = profileQuery.data ?? null;
  const profile = profileView?.profile ?? null;
  const myReview = myReviewQuery.data ?? null;
  const communityReviews = useMemo(
    () => communityReviewsQuery.data?.items ?? [],
    [communityReviewsQuery.data?.items]
  );
  const reviewsTotalPages = communityReviewsQuery.data?.totalPages ?? 0;
  const isLoading = profileQuery.isLoading;
  const isSaving = toggleSaveMutation.isPending;
  const isSubmittingReview = createReviewMutation.isPending || updateReviewMutation.isPending;
  const isDeletingReview = deleteReviewMutation.isPending;
  const isReviewsLoading =
    communityReviewsQuery.isFetching ||
    (isAuthenticated && dashboardRole === "USER" && myReviewQuery.isFetching && myReviewQuery.data === undefined);

  const canSaveGym = isAuthenticated && dashboardRole === "USER";
  const canWriteReview = isAuthenticated && dashboardRole === "USER";
  const canCheckIn = isAuthenticated
    ? Boolean(profile?.checkInEnabled && profileView?.accessibleByCurrentUser)
    : Boolean(profile?.checkInEnabled);
  const profileActionLabel = isAuthenticated ? "Check In" : "Get Started";
  const ProfileActionIcon = isAuthenticated ? ShieldCheck : ArrowRight;
  const gallery = useMemo(
    () => (profile ? buildGallery(profile) : []),
    [profile]
  );
  const visibleCommunityReviews = useMemo(
    () => (reviewsFilter === "ME" && myReview ? [myReview] : communityReviews),
    [communityReviews, reviewsFilter, myReview]
  );
  const displayedReviews = useMemo(
    () => visibleCommunityReviews,
    [visibleCommunityReviews]
  );
  const visibleGalleryCount = isDesktopGallery ? 3 : 1;
  const maxGalleryIndex = Math.max(0, gallery.length - visibleGalleryCount);
  
  const slideGalleryPrev = useCallback(() => {
    setGalleryIndex((prev) => (prev > 0 ? prev - 1 : maxGalleryIndex));
  }, [maxGalleryIndex]);

  const slideGalleryNext = useCallback(() => {
    setGalleryIndex((prev) => (prev < maxGalleryIndex ? prev + 1 : 0));
  }, [maxGalleryIndex]);

  const startContinuousSlide = useCallback((direction: "prev" | "next") => {
    const slideFn = direction === "prev" ? slideGalleryPrev : slideGalleryNext;
    slideIntervalRef.current = setInterval(slideFn, 400);
  }, [slideGalleryPrev, slideGalleryNext]);

  const stopContinuousSlide = useCallback(() => {
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
      slideIntervalRef.current = null;
    }
  }, []);

  const handleReviewSortChange = (nextSortDirection: ReviewSortDirection) => {
    if (nextSortDirection === reviewsSortDirection) {
      return;
    }
    setReviewsSortDirection(nextSortDirection);
    setReviewsPage(0);
  };

  const handleReviewPageChange = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= reviewsTotalPages || nextPage === reviewsPage) {
      return;
    }
    setReviewsPage(nextPage);
  };

  useEffect(() => {
    setReviewsPage(0);
  }, [reviewsFilter, trimmedReviewsQuery]);

  useEffect(() => {
    if (profileView) {
      setIsSaved(profileView.isSaved);
      setErrorMessage(null);
      setIsNotFound(false);
    }
  }, [profileView]);

  useEffect(() => {
    const error = profileQuery.error;
    if (!error) {
      return;
    }

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      setIsNotFound(true);
      return;
    }

    setErrorMessage(getApiErrorMessage(error, "Failed to load gym profile"));
  }, [profileQuery.error]);

  const resetReviewComposer = () => {
    setShowReviewForm(false);
    setIsEditingReview(false);
    setReviewRating(0);
    setReviewComment("");
    setReviewError(null);
  };

  const openCreateReviewForm = () => {
    setIsEditingReview(false);
    setReviewRating(0);
    setReviewComment("");
    setReviewError(null);
    setShowReviewForm(true);
  };

  const openEditReviewForm = () => {
    if (!myReview) {
      return;
    }

    setIsEditingReview(true);
    setReviewRating(myReview.rating ?? 0);
    setReviewComment(myReview.comments ?? "");
    setReviewError(null);
    setShowReviewForm(true);
  };

  // Review submission handler
  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      setReviewError("Please select a rating");
      return;
    }
    setReviewError(null);

    try {
      const payload = {
        rating: reviewRating,
        comments: reviewComment.trim() || undefined,
      };

      if (isEditingReview && myReview) {
        await updateReviewMutation.mutateAsync(payload);
        toast.success("Review updated");
      } else {
        await createReviewMutation.mutateAsync(payload);
        toast.success("Review submitted");
      }

      resetReviewComposer();
      if (reviewsSortDirection === "DESC") {
        setReviewsPage(0);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.reviewsLists(gymId) }),
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.myReview(gymId) }),
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.profileViews(gymId) }),
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.publicProfiles(gymId) }),
      ]);
    } catch (error) {
      setReviewError(getApiErrorMessage(error, "Failed to submit review"));
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview) {
      return;
    }

    try {
      await deleteReviewMutation.mutateAsync();
      setDeleteReviewDialogOpen(false);
      resetReviewComposer();
      if (reviewsFilter === "ME") {
        setReviewsFilter("ALL");
      }

      setReviewsPage(0);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.reviewsLists(gymId) }),
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.myReview(gymId) }),
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.profileViews(gymId) }),
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.publicProfiles(gymId) }),
      ]);
      toast.success("Review deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete review"));
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktopGallery(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setGalleryIndex((prev) => Math.min(prev, maxGalleryIndex));
  }, [maxGalleryIndex]);

  useEffect(() => {
    let cancelled = false;

    const resolveViewerCoords = async () => {
      const coords = await getCurrentCoordinates();
      if (!cancelled && coords) {
        setViewerCoords(coords);
      }
    };

    void resolveViewerCoords();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !mapRef.current || profile?.latitude == null || profile.longitude == null) {
      return;
    }

    const latLng: L.LatLngExpression = [profile.latitude, profile.longitude];
    const map = mapInstanceRef.current;
    if (!map) {
      const createdMap = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(latLng, 15);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(createdMap);
      markerRef.current = L.circleMarker(latLng, {
        radius: 8,
        color: "#ea580c",
        fillOpacity: 1,
      }).addTo(createdMap);
      mapInstanceRef.current = createdMap;

      requestAnimationFrame(() => createdMap.invalidateSize());
      setTimeout(() => createdMap.invalidateSize(), 120);
      return;
    }

    map.setView(latLng, 15);
    map.invalidateSize();
    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
    } else {
      markerRef.current = L.circleMarker(latLng, { radius: 8, color: "#ea580c", fillOpacity: 1 }).addTo(map);
    }
  }, [isLoading, profile?.latitude, profile?.longitude]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const host = mapRef.current;
    if (!map || !host) return;

    const invalidate = () => map.invalidateSize();
    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(host);
    window.addEventListener("resize", invalidate);
    const timer = window.setTimeout(invalidate, 80);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", invalidate);
      resizeObserver.disconnect();
    };
  }, [isLoading, profile?.gymId]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const handleToggleSave = async () => {
    if (!profile || isSaving) {
      return;
    }

    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setErrorMessage(null);

    try {
      await toggleSaveMutation.mutateAsync({ nextSaved });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.profileViews(gymId) }),
        queryClient.invalidateQueries({ queryKey: gymsQueryKeys.publicProfiles(gymId) }),
      ]);
    } catch (error) {
      setIsSaved(!nextSaved);
      setErrorMessage(getApiErrorMessage(error, "Failed to update saved gym"));
    }
  };

  const handleSidebarChange = (section: string) => {
    if (!isAuthenticated) {
      navigate("/gyms");
      return;
    }

    if (dashboardRole === "ADMIN") {
      navigate("/admin/dashboard", { state: { activeSection: section } });
      return;
    }

    if (dashboardRole === "USER" && section === "profile") {
      navigate("/profile");
      return;
    }

    navigate("/dashboard", { state: { activeSection: section } });
  };

  const handleBackToList = () => {
    if (!isAuthenticated) {
      navigate("/gyms");
      return;
    }

    if (dashboardRole === "ADMIN") {
      navigate("/admin/dashboard", { state: { activeSection: "gyms" } });
      return;
    }

    if (dashboardRole === "USER") {
      navigate("/dashboard", { state: { activeSection: "gyms" } });
      return;
    }

    navigate("/dashboard", { state: { activeSection: activeSection } });
  };

  const renderEmptyState = (title: string, description: string, retry = false) => (
    <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-white/10 user-surface-overlay p-8 text-center">
      <h2 className="text-xl font-black uppercase tracking-tight text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={handleBackToList}
          className="rounded-xl border border-white/10 user-surface-muted px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-white/[0.08]"
        >
          Go Back
        </button>
        {retry ? (
          <button
            type="button"
            onClick={() => void profileQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-orange-200 hover:bg-orange-500/15"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );

  const pageContent = (
    <div className="flex flex-col text-[13px]">
      <button
        type="button"
        onClick={handleBackToList}
        className="mb-6 flex w-fit items-center gap-2 text-gray-500 transition-colors hover:text-orange-600"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={3} />
        <span className="text-xs font-black uppercase tracking-widest">Back to List</span>
      </button>

      {isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 user-surface-overlay">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading gym profile...
          </div>
        </div>
      ) : null}

      {!isLoading && isNotFound
        ? renderEmptyState("Gym Not Found", "The gym does not exist or is not publicly available.")
        : null}

      {!isLoading && !isNotFound && errorMessage && !profile
        ? renderEmptyState("Failed to Load Profile", errorMessage, true)
        : null}

      {!isLoading && profile ? (
        <div>
          {errorMessage ? (
            <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
            ) : null}

            <div className="relative mb-8">
              {gallery.length > 0 ? (
                <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
                  {/* Main gallery container - 1 photo on mobile, 3 on desktop */}
                  <div className="relative h-[280px] md:h-[320px] overflow-hidden">
                    <div 
                      className="flex h-full transition-transform duration-500 ease-out"
                      style={{ 
                        transform: `translateX(-${galleryIndex * (100 / visibleGalleryCount)}%)`,
                      }}
                    >
                      {gallery.map((photo) => (
                        <div
                          key={photo.photoId}
                          className={cn(
                            "flex h-full min-w-full flex-shrink-0 items-center justify-center overflow-hidden",
                            "md:min-w-[33.333333%]"
                          )}
                        >
                          {photo.photoUrl ? (
                            <img 
                              src={photo.photoUrl} 
                              alt={photo.caption ?? "Gym gallery"} 
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">No image</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {gallery.length > visibleGalleryCount && (
                    <>
                      <button
                        type="button"
                        onClick={slideGalleryPrev}
                        onMouseDown={() => startContinuousSlide("prev")}
                        onMouseUp={stopContinuousSlide}
                        onMouseLeave={stopContinuousSlide}
                        onTouchStart={() => startContinuousSlide("prev")}
                        onTouchEnd={stopContinuousSlide}
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-110"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        type="button"
                        onClick={slideGalleryNext}
                        onMouseDown={() => startContinuousSlide("next")}
                        onMouseUp={stopContinuousSlide}
                        onMouseLeave={stopContinuousSlide}
                        onTouchStart={() => startContinuousSlide("next")}
                        onTouchEnd={stopContinuousSlide}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-110"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                  
                  {gallery.length > visibleGalleryCount && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {Array.from({ length: maxGalleryIndex + 1 }).map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGalleryIndex(idx)}
                          className={cn(
                            "h-2 w-2 rounded-full transition-all duration-300",
                            idx === galleryIndex 
                              ? "w-6 bg-orange-500" 
                              : "bg-white/40 hover:bg-white/60"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[280px] md:h-[320px] w-full items-center justify-center rounded-[1.5rem] border border-white/10 user-surface-strong text-sm font-bold text-gray-500">
                  No gallery photos uploaded yet.
                </div>
              )}
            </div>

            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 flex flex-col gap-6 lg:col-span-8">
                <div className="rounded-[2rem] border border-white/10 user-surface-overlay p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">
                        {profile.currentlyOpen ? "Open now" : "Closed"}
                      </p>
                      <h1 className="mt-1 break-words text-[clamp(30px,5vw,56px)] font-black uppercase leading-none tracking-[-0.04em]">
                        {(() => {
                          const name = profile.gymName ?? "Gym";
                          const midPoint = Math.ceil(name.length / 2);
                          return (
                            <>
                              <span className="text-white">{name.slice(0, midPoint)}</span>
                              <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                                {name.slice(midPoint)}
                              </span>
                            </>
                          );
                        })()}
                      </h1>
                      <p className="mt-2 text-sm text-gray-400">
                        {[profile.addressLine, profile.city, profile.country].filter(Boolean).join(", ") || "Location unavailable"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canSaveGym && (
                        <button
                          type="button"
                          onClick={() => void handleToggleSave()}
                          disabled={isSaving}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSaved
                              ? "border-orange-600 bg-orange-500 text-white hover:bg-orange-600"
                              : "border-white/20 bg-[#171717] text-white hover:border-orange-400/60 hover:bg-[#1f1f1f]"
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
                          )}
                          {isSaved ? "Saved" : "Save Gym"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!canCheckIn}
                        onClick={() => {
                          if (isAuthenticated) {
                            navigate("/dashboard", { state: { activeSection: "checkin", checkInView: "scanner" } });
                          } else {
                            navigate("/signup");
                          }
                        }}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-500/40 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-500/10 hover:border-emerald-500/60 hover:shadow-[inset_0_0_16px_rgba(16,185,129,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ProfileActionIcon className="h-3.5 w-3.5" />
                        {profileActionLabel}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-white/8 user-surface-soft px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">Hours</p>
                      <p className="mt-1 text-xs font-bold text-white">{formatOperatingWindow(profile.opensAt, profile.closesAt)}</p>
                    </div>
                    <div className="rounded-xl border border-white/8 user-surface-soft px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">Access Tier</p>
                      <p className="mt-1 text-xs font-bold text-white">{profile.minimumAccessTier ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/8 user-surface-soft px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">Distance</p>
                      <p className={cn("mt-1 text-xs font-bold", getDistanceToneClass(profileView.distanceMeters))}>
                        {formatDistance(profileView.distanceMeters)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 user-surface-overlay p-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Current Activity</h3>

                  {isAuthenticated && dashboardRole === "USER" ? (
                    <>
                      <div className="mt-4 flex items-end gap-3">
                        <div>
                          <p className="text-4xl font-black text-white">{profile.activeCheckIns ?? "-"}</p>
                          <p className="text-[10px] font-bold uppercase text-gray-500">Active</p>
                        </div>
                        <div className="mb-1 text-3xl text-gray-700">/</div>
                        <div>
                          <p className="text-xl font-black text-gray-400">{profile.maxCapacity ?? "-"}</p>
                          <p className="text-[10px] font-bold uppercase text-gray-500">Capacity</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {profile.occupancyLabel ? (
                          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">
                            {profile.occupancyLabel}
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                            profile.currentlyOpen
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-red-500/30 bg-red-500/10 text-red-300"
                          )}
                        >
                          {profile.currentlyOpen ? "Open now" : "Closed now"}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-gray-400">
                        Live check-ins and total capacity update in real time.
                      </p>
                    </>
                  ) : (
                    <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-orange-500/20 bg-gradient-to-r from-orange-500/[0.04] to-transparent p-5 sm:flex-row sm:p-4">
                      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                        <div className="flex shrink-0 -space-x-3">
                          <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-[#121212] bg-orange-500/20">
                            <Activity className="h-5 w-5 text-orange-400" />
                          </div>
                          <div className="relative z-0 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-[#121212] bg-white/10">
                            <Users className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight text-white">
                            Live Activity Tracking
                          </h4>
                          <p className="mt-1 text-xs text-gray-400 sm:mt-0.5">
                            Join to see real-time check-ins & capacity.
                          </p>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => navigate("/signup")}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_rgba(249,115,22,0.25)] transition-all hover:brightness-110 sm:w-auto"
                      >
                        Join to Unlock
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-[2rem] border border-white/10 user-surface-overlay p-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">About Facility</h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-gray-300">
                    {profile.description?.trim() || "No description available."}
                  </p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-white/8 user-surface-soft px-4 py-3 text-[13px] text-gray-300">
                      <p><span className="text-gray-500">Established:</span> {profile.establishedAt ?? "-"}</p>
                      <p><span className="text-gray-500">Phone:</span> {profile.phoneNo ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/8 user-surface-soft px-4 py-3 text-[13px] text-gray-300">
                      <p><span className="text-gray-500">Email:</span> {profile.contactEmail ?? "-"}</p>
                      <p><span className="text-gray-500">Website:</span> {profile.websiteUrl ?? "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 user-surface-overlay p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Gym Reviews</h3>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="inline-flex items-center gap-1.5 text-orange-400">
                        <Star className="h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" />
                        <span className="text-base font-black sm:text-lg">{profile.rating?.toFixed(1) ?? "-"}</span>
                        <span className="text-[10px] font-bold text-gray-400 sm:text-xs">({profile.reviewCount})</span>
                      </div>
                      {canWriteReview && !showReviewForm && !myReview && (
                        <button
                          type="button"
                          onClick={openCreateReviewForm}
                          className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/40 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_8px_16px_rgba(249,115,22,0.2)] transition-all hover:scale-[1.01] hover:brightness-110 sm:px-4 sm:py-2 sm:text-[10px] sm:shadow-[0_12px_28px_rgba(249,115,22,0.24)]"
                        >
                          <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          Write Review
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Review Form */}
                  {showReviewForm && (
                    <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-300">
                          {isEditingReview ? "Edit Your Review" : "Share Your Experience"}
                        </p>
                        <button
                          type="button"
                          onClick={resetReviewComposer}
                          className="text-xs text-gray-500 hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                      
                      {/* Star Rating */}
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className={cn(
                              "p-1 transition-all duration-200 hover:scale-110",
                              star <= reviewRating ? "text-orange-400" : "text-gray-600 hover:text-gray-400"
                            )}
                          >
                            <Star className={cn("h-6 w-6", star <= reviewRating && "fill-current")} />
                          </button>
                        ))}
                        <span className="ml-2 text-xs text-gray-400">
                          {reviewRating > 0 ? `${reviewRating}/5` : "Select rating"}
                        </span>
                      </div>
                      
                      {/* Comment */}
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Tell others about your experience (optional)..."
                        className="w-full rounded-lg border border-white/10 user-surface-muted px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-orange-500/50 focus:outline-none focus:ring-0 resize-none"
                        rows={3}
                      />
                      
                      {/* Error message */}
                      {reviewError && (
                        <p className="mt-2 text-xs text-red-400">{reviewError}</p>
                      )}
                      
                      {/* Submit button */}
                      <button
                        type="button"
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview || reviewRating === 0}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmittingReview ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {isEditingReview ? "Save Changes" : "Submit Review"}
                      </button>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                        All Reviews
                      </p>
                      <div className="flex w-full items-center gap-2 sm:w-auto">
                        <div className="relative flex-1 sm:w-[220px] sm:flex-none">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          <input
                            value={reviewsQuery}
                            onChange={(e) => setReviewsQuery(e.target.value)}
                            placeholder="Search reviews..."
                            className="h-[34px] w-full rounded-full border border-white/10 user-surface-muted pl-9 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-orange-500/40"
                          />
                        </div>
                        <div ref={sortRef} className="relative">
                          <button type="button" onClick={() => setSortOpen(v => !v)}
                                  className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border text-[12px] font-bold transition-all ${sortOpen ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "user-surface table-border table-text hover:border-orange-500/30 hover:text-orange-400"}`}>
                            <ArrowUpDown className="w-3.5 h-3.5" />Sort
                          </button>
                          {sortOpen && (
                            <div className="absolute top-[calc(100%+8px)] right-0 user-surface table-border border rounded-2xl p-1.5 min-w-[160px] z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                              <div className="text-[8px] font-black uppercase tracking-widest table-text-muted px-2.5 py-2">Sort by date</div>
                              <button type="button" onClick={() => { void handleReviewSortChange("DESC"); setSortOpen(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${reviewsSortDirection === "DESC" ? "bg-white/[0.06] text-white" : "hover:bg-white/[0.04] text-[hsl(0,0%,55%)]"}`}>
                                <span className="text-[12px] font-semibold">Newest First</span>
                              </button>
                              <button type="button" onClick={() => { void handleReviewSortChange("ASC"); setSortOpen(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${reviewsSortDirection === "ASC" ? "bg-white/[0.06] text-white" : "hover:bg-white/[0.04] text-[hsl(0,0%,55%)]"}`}>
                                <span className="text-[12px] font-semibold">Oldest First</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div ref={filterRef} className="relative">
                          <button type="button" onClick={() => setFilterOpen(v => !v)}
                                  className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border text-[12px] font-bold transition-all ${filterOpen ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "user-surface table-border table-text hover:border-orange-500/30 hover:text-orange-400"}`}>
                            <SlidersHorizontal className="w-3.5 h-3.5" />Filter
                          </button>
                          {filterOpen && (
                            <div className="absolute top-[calc(100%+8px)] right-0 user-surface table-border border rounded-2xl p-1.5 min-w-[160px] z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                              <div className="text-[8px] font-black uppercase tracking-widest table-text-muted px-2.5 py-2">Filter reviews</div>
                              <button type="button" onClick={() => { setReviewsFilter("ALL"); setFilterOpen(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${reviewsFilter === "ALL" ? "bg-white/[0.06] text-white" : "hover:bg-white/[0.04] text-[hsl(0,0%,55%)]"}`}>
                                <span className="text-[12px] font-semibold">All Reviews</span>
                              </button>
                              {myReview && (
                                <button type="button" onClick={() => { setReviewsFilter("ME"); setFilterOpen(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${reviewsFilter === "ME" ? "bg-white/[0.06] text-white" : "hover:bg-white/[0.04] text-[hsl(0,0%,55%)]"}`}>
                                  <span className="text-[12px] font-semibold">My Review</span>
                                </button>
                              )}
                              <button type="button" onClick={() => { setReviewsFilter("5_STAR"); setFilterOpen(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${reviewsFilter === "5_STAR" ? "bg-white/[0.06] text-white" : "hover:bg-white/[0.04] text-[hsl(0,0%,55%)]"}`}>
                                <span className="text-[12px] font-semibold">5 Stars Only</span>
                              </button>
                              <button type="button" onClick={() => { setReviewsFilter("4_STAR"); setFilterOpen(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${reviewsFilter === "4_STAR" ? "bg-white/[0.06] text-white" : "hover:bg-white/[0.04] text-[hsl(0,0%,55%)]"}`}>
                                <span className="text-[12px] font-semibold">4+ Stars</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isReviewsLoading ? (
                      <div className="flex min-h-[90px] items-center justify-center rounded-xl border border-white/8 user-surface-soft">
                        <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading reviews...
                        </div>
                      </div>
                    ) : displayedReviews.length > 0 ? (
                      displayedReviews.map((review) => {
                        const isOwnReview = myReview?.reviewId === review.reviewId;

                        return (
                          <div
                            key={review.reviewId}
                            className="rounded-2xl border border-white/8 user-surface-soft p-5 transition-colors hover:border-white/10"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <img
                                  src={resolveAvatarUrl({
                                    primaryUrl: review.reviewerAvatarUrl,
                                    displayName: review.reviewerName,
                                    fallbackName: "FitPal Member",
                                    background: "111827",
                                  })}
                                  alt={resolveDisplayName({
                                    displayName: review.reviewerName,
                                    fallbackName: "FitPal Member",
                                  })}
                                  className="h-8 w-8 rounded-full border border-white/15 object-cover"
                                  loading="lazy"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-xs font-black uppercase tracking-[0.1em] text-orange-300">
                                      {review.reviewerName ?? "FitPal Member"}
                                    </p>
                                    {isOwnReview ? (
                                      <span className="shrink-0 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-300">
                                        My Review
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[10px] text-gray-500">{formatReviewDate(review.createdAt)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={cn(
                                        "h-3 w-3",
                                        star <= (review.rating ?? 0)
                                          ? "text-orange-400 fill-current"
                                          : "text-gray-600"
                                      )}
                                    />
                                  ))}
                                </div>
                                {isOwnReview ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        aria-label="Review actions"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="border-white/10 bg-[#111214] text-white"
                                    >
                                      <DropdownMenuItem
                                        onClick={openEditReviewForm}
                                        className="cursor-pointer gap-2 focus:bg-white/10 focus:text-white"
                                      >
                                        <Pencil className="h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={isDeletingReview}
                                        onClick={() => setDeleteReviewDialogOpen(true)}
                                        className="cursor-pointer gap-2 text-red-300 focus:bg-red-500/15 focus:text-red-200"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                              <p className="text-[13px] leading-relaxed text-zinc-300">
                                {review.comments ?? "No comment"}
                              </p>
                            </div>
                            {review.gymReply ? (
                              <div className="mt-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleReply(review.reviewId)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all duration-200",
                                    expandedReplyIds.has(review.reviewId)
                                      ? "border-orange-500/30 bg-orange-500/[0.1] text-orange-300"
                                      : "border-white/[0.08] bg-white/[0.03] text-zinc-500 hover:border-orange-500/20 hover:text-orange-300"
                                  )}
                                >
                                  <MessageSquareReply className="h-3.5 w-3.5" />
                                  {expandedReplyIds.has(review.reviewId) ? "Hide reply" : "Gym replied · View"}
                                  <ChevronDown
                                    className={cn(
                                      "h-3 w-3 transition-transform duration-200",
                                      expandedReplyIds.has(review.reviewId) && "rotate-180"
                                    )}
                                  />
                                </button>
                                {expandedReplyIds.has(review.reviewId) && (
                                  <div className="mt-2 rounded-xl border border-white/[0.07] bg-[#111111] p-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-orange-300">
                                        Gym reply
                                      </p>
                                      {review.gymReplyAt ? (
                                        <p className="text-[10px] text-zinc-500">
                                          {formatReviewDate(review.gymReplyAt)}
                                        </p>
                                      ) : null}
                                    </div>
                                    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-300">{review.gymReply}</p>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-xl border border-white/8 user-surface-soft px-4 py-3 text-sm text-gray-400">
                        No community reviews on this page.
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <p className="mr-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        Page {reviewsTotalPages === 0 ? 0 : reviewsPage + 1} / {reviewsTotalPages}
                      </p>
                      <button
                        type="button"
                        disabled={isReviewsLoading || reviewsPage <= 0 || reviewsTotalPages === 0}
                        onClick={() => void handleReviewPageChange(reviewsPage - 1)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 user-surface-soft px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={isReviewsLoading || reviewsTotalPages === 0 || reviewsPage >= reviewsTotalPages - 1}
                        onClick={() => void handleReviewPageChange(reviewsPage + 1)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 user-surface-soft px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <AlertDialog open={isDeleteReviewDialogOpen} onOpenChange={setDeleteReviewDialogOpen}>
                    <AlertDialogContent className="border-white/10 bg-[#101010] text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Review</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          Are you sure you want to delete this review? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 user-surface-muted text-white hover:bg-white/[0.08]">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={isDeletingReview}
                          onClick={(event) => {
                            event.preventDefault();
                            void handleDeleteReview();
                          }}
                          className="bg-red-600 text-white hover:bg-red-500"
                        >
                          {isDeletingReview ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Deleting...
                            </span>
                          ) : (
                            "Delete"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4">
                <div className="sticky top-6 overflow-hidden rounded-[2rem] border border-orange-500/20 user-surface-overlay shadow-2xl">
                  {profile.latitude != null && profile.longitude != null ? (
                    <div ref={mapRef} className="h-[220px] w-full border-b border-white/10 bg-[#0a0a0a]" />
                  ) : (
                    <div className="flex h-[220px] items-center justify-center border-b border-white/10 bg-[#0a0a0a] text-sm text-gray-500">
                      Map unavailable
                    </div>
                  )}
                  <div className="space-y-4 p-6 text-sm text-gray-300">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">Address</p>
                      <p className="mt-1">
                        {[profile.addressLine, profile.city, profile.country].filter(Boolean).join(", ") || "-"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">Postal code: {profile.postalCode ?? "-"}</p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">Coordinates</p>
                      <p className="mt-1 inline-flex items-center gap-2 text-xs text-orange-300">
                        <MapPin className="h-3.5 w-3.5" />
                        {profile.latitude != null && profile.longitude != null
                          ? `${profile.latitude.toFixed(5)}, ${profile.longitude.toFixed(5)}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">Distance</p>
                      <p className={cn("mt-1 text-xs font-bold", getDistanceToneClass(profileView.distanceMeters))}>
                        {formatDistance(profileView.distanceMeters)}
                      </p>
                    </div>

                    {profile.websiteUrl ? (
                      <a
                        href={profile.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 user-surface-muted px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/[0.08]"
                      >
                        Open Website
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-20 sm:pt-24 md:pt-28">
          {pageContent}
        </div>
      </main>
    );
  }

  // Use UserLayout for USER role (has mobile bottom nav), DefaultLayout for others
  if (dashboardRole === "USER") {
    return (
      <UserLayout
        activeSection="gyms"
        onSectionChange={handleSidebarChange}
      >
        {pageContent}
      </UserLayout>
    );
  }

  return (
    <DefaultLayout
      role={roleValue}
      activeSection={activeSection}
      onSectionChange={handleSidebarChange}
    >
      {pageContent}
    </DefaultLayout>
  );
};

export default GymProfile;
