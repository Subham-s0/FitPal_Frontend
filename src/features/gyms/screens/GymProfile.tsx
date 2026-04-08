import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowUpDown, Bookmark, ChevronLeft, ChevronRight, Loader2, MapPin, MoreVertical, Pencil, RefreshCw, Search, Send, ShieldCheck, SlidersHorizontal, Star, Trash2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import icon from "leaflet/dist/images/marker-icon.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { DefaultLayout, getDashboardRole } from "@/shared/layout/dashboard-shell";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import { useAuthState } from "@/features/auth/hooks";
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
import { formatGymDistance } from "@/features/gyms/utils";
import { getApiErrorMessage } from "@/shared/api/client";
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
import type {
  PublicGymPhotoResponse,
  PublicGymProfileResponse,
  PublicGymReviewResponse,
  ReviewSortDirection,
  UserGymProfileViewResponse,
} from "@/features/gyms/model";
import { cn } from "@/shared/lib/utils";

const defaultMarkerIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultMarkerIcon;

const THEME_GALLERY_PHOTOS: PublicGymPhotoResponse[] = [
  {
    photoId: -1001,
    photoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80",
    caption: "Strength floor",
    displayOrder: 0,
    cover: true,
  },
  {
    photoId: -1002,
    photoUrl: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1600&q=80",
    caption: "Premium training zone",
    displayOrder: 1,
    cover: false,
  },
  {
    photoId: -1003,
    photoUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1600&q=80",
    caption: "Performance setup",
    displayOrder: 2,
    cover: false,
  },
];

const REVIEW_PAGE_SIZE = 5;
interface ViewerCoordinates {
  lat: number;
  lng: number;
}

function getCurrentCoordinates(): Promise<ViewerCoordinates | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
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
}

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

const formatAccessMode = (mode: string | null) => {
  if (!mode) return "-";
  return mode.replace(/_/g, " ");
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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const distanceRefreshAttemptRef = useRef<string | null>(null);
  const roleValue = auth.role ?? "USER";
  const dashboardRole = getDashboardRole(roleValue);
  const activeSection = dashboardRole === "GYM" ? "home" : "gyms";
  const gymId = Number(id);

  const [profileView, setProfileView] = useState<UserGymProfileViewResponse | null>(null);
  const [myReview, setMyReview] = useState<PublicGymReviewResponse | null>(null);
  const [communityReviews, setCommunityReviews] = useState<PublicGymReviewResponse[]>([]);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(0);
  const [reviewsSortDirection, setReviewsSortDirection] = useState<ReviewSortDirection>("DESC");
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
  const slideIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isDeleteReviewDialogOpen, setDeleteReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isDesktopGallery, setIsDesktopGallery] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });

  const profile = profileView?.profile ?? null;
  const canCheckIn = Boolean(profile?.checkInEnabled && profileView?.accessibleByCurrentUser);
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
  const getReviewerAvatar = (name: string | null, reviewerAvatarUrl?: string | null) =>
    reviewerAvatarUrl && reviewerAvatarUrl.trim().length > 0
      ? reviewerAvatarUrl
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? "FitPal Member")}&background=111827&color=fb923c`;

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

  const loadReviews = async (page: number, sortDirection: ReviewSortDirection) => {
    if (!Number.isFinite(gymId) || gymId <= 0) {
      return;
    }

    setIsReviewsLoading(true);
    try {
      const [communityPageResult, myReviewResult] = await Promise.allSettled([
        getPublicGymReviewsApi(gymId, {
          page,
          size: REVIEW_PAGE_SIZE,
          sortDirection,
          query: reviewsQuery.trim() || undefined,
          rating:
            reviewsFilter === "5_STAR" ? 5 :
            reviewsFilter === "4_STAR" ? 4 :
            undefined,
        }),
        dashboardRole === "USER" ? getMyGymReviewApi(gymId) : Promise.resolve(null),
      ]);

      if (communityPageResult.status === "fulfilled") {
        setCommunityReviews(communityPageResult.value.items);
        setReviewsPage(communityPageResult.value.page);
        setReviewsTotalPages(communityPageResult.value.totalPages);
      } else {
        console.error("Failed to load community gym reviews", communityPageResult.reason);
        setCommunityReviews([]);
        setReviewsPage(0);
        setReviewsTotalPages(0);
      }

      if (myReviewResult.status === "fulfilled") {
        setMyReview(myReviewResult.value);
      } else {
        console.error("Failed to load my gym review", myReviewResult.reason);
        setMyReview(null);
      }
    } catch (error) {
      console.error("Failed to load gym reviews", error);
      setCommunityReviews([]);
      setReviewsPage(0);
      setReviewsTotalPages(0);
      setMyReview(null);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  const handleReviewSortChange = async (nextSortDirection: ReviewSortDirection) => {
    if (nextSortDirection === reviewsSortDirection) {
      return;
    }
    setReviewsSortDirection(nextSortDirection);
    await loadReviews(0, nextSortDirection);
  };

  const handleReviewPageChange = async (nextPage: number) => {
    if (nextPage < 0 || nextPage >= reviewsTotalPages || nextPage === reviewsPage) {
      return;
    }
    await loadReviews(nextPage, reviewsSortDirection);
  };

  useEffect(() => {
    if (!Number.isFinite(gymId) || gymId <= 0) return;
    void loadReviews(0, reviewsSortDirection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewsFilter, reviewsQuery]);

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

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const payload = {
        rating: reviewRating,
        comments: reviewComment.trim() || undefined,
      };

      if (isEditingReview && myReview) {
        await updateMyGymReviewApi(gymId, payload);
        toast.success("Review updated");
      } else {
        await createGymReviewApi(gymId, payload);
        toast.success("Review submitted");
      }

      resetReviewComposer();
      const targetPage = reviewsSortDirection === "DESC" ? 0 : reviewsPage;
      await loadReviews(targetPage, reviewsSortDirection);
    } catch (error) {
      setReviewError(getApiErrorMessage(error, "Failed to submit review"));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview) {
      return;
    }

    setIsDeletingReview(true);

    try {
      await deleteMyGymReviewApi(gymId);
      setDeleteReviewDialogOpen(false);
      resetReviewComposer();
      if (reviewsFilter === "ME") {
        setReviewsFilter("ALL");
      }
      await loadReviews(0, reviewsSortDirection);
      toast.success("Review deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete review"));
    } finally {
      setIsDeletingReview(false);
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

  const loadGymProfile = async () => {
    if (!Number.isFinite(gymId) || gymId <= 0) {
      setIsNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsNotFound(false);
    setErrorMessage(null);

    try {
      if (dashboardRole === "USER") {
        try {
          const gymProfileView = await getUserGymProfileViewApi(
            gymId,
            viewerCoords ? { lat: viewerCoords.lat, lng: viewerCoords.lng } : undefined
          );
          setProfileView(gymProfileView);
          setIsSaved(gymProfileView.isSaved);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            setIsNotFound(true);
            return;
          }

          const publicProfile = await getPublicGymProfileApi(gymId);
          const fallbackProfileView = buildFallbackProfileView(publicProfile);
          setProfileView(fallbackProfileView);
          setIsSaved(fallbackProfileView.isSaved);
        }
      } else {
        const publicProfile = await getPublicGymProfileApi(gymId);
        const fallbackProfileView = buildFallbackProfileView(publicProfile);
        setProfileView(fallbackProfileView);
        setIsSaved(fallbackProfileView.isSaved);
      }

      void loadReviews(0, reviewsSortDirection);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setIsNotFound(true);
      } else {
        setErrorMessage(getApiErrorMessage(error, "Failed to load gym profile"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGymProfile();
  }, [gymId]);

  useEffect(() => {
    if (
      dashboardRole !== "USER" ||
      !viewerCoords ||
      !profileView ||
      profileView.profile.gymId !== gymId ||
      profileView.distanceMeters != null
    ) {
      return;
    }

    const refreshKey = `${gymId}:${viewerCoords.lat.toFixed(6)}:${viewerCoords.lng.toFixed(6)}`;
    if (distanceRefreshAttemptRef.current === refreshKey) {
      return;
    }
    distanceRefreshAttemptRef.current = refreshKey;

    let cancelled = false;

    const refreshDistance = async () => {
      try {
        const gymProfileView = await getUserGymProfileViewApi(gymId, {
          lat: viewerCoords.lat,
          lng: viewerCoords.lng,
        });
        if (cancelled) {
          return;
        }
        setProfileView(gymProfileView);
        setIsSaved(gymProfileView.isSaved);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to refresh gym distance", error);
        }
      }
    };

    void refreshDistance();

    return () => {
      cancelled = true;
    };
  }, [dashboardRole, gymId, profileView, viewerCoords]);

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
    setIsSaving(true);

    try {
      if (nextSaved) {
        await saveMyGymApi(profile.gymId);
      } else {
        await unsaveMyGymApi(profile.gymId);
      }

      setProfileView((current) => (current ? { ...current, isSaved: nextSaved } : current));
    } catch (error) {
      setIsSaved(!nextSaved);
      setErrorMessage(getApiErrorMessage(error, "Failed to update saved gym"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSidebarChange = (section: string) => {
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

  const renderEmptyState = (title: string, description: string, retry = false) => (
    <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-white/10 bg-[#101010]/80 p-8 text-center">
      <h2 className="text-xl font-black uppercase tracking-tight text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-white/[0.08]"
        >
          Go Back
        </button>
        {retry ? (
          <button
            type="button"
            onClick={() => void loadGymProfile()}
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
        onClick={() => navigate(-1)}
        className="mb-6 flex w-fit items-center gap-2 text-gray-500 transition-colors hover:text-orange-600"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={3} />
        <span className="text-xs font-black uppercase tracking-widest">Back to List</span>
      </button>

      {isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-[#101010]/80">
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
                <div className="flex h-[280px] md:h-[320px] w-full items-center justify-center rounded-[1.5rem] border border-white/10 bg-[#0f0f0f] text-sm font-bold text-gray-500">
                  No gallery photos uploaded yet.
                </div>
              )}
            </div>

            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 flex flex-col gap-6 lg:col-span-8">
                <div className="rounded-[2rem] border border-white/10 bg-[#111]/85 p-6">
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
                      <button
                        type="button"
                        disabled={!canCheckIn}
                        onClick={() => navigate("/dashboard", { state: { activeSection: "checkin", checkInView: "scanner" } })}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-500/40 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-500/10 hover:border-emerald-500/60 hover:shadow-[inset_0_0_16px_rgba(16,185,129,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Check In
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">Hours</p>
                      <p className="mt-1 text-xs font-bold text-white">{formatOperatingWindow(profile.opensAt, profile.closesAt)}</p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">Access Tier</p>
                      <p className="mt-1 text-xs font-bold text-white">{profile.minimumAccessTier ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">Distance</p>
                      <p className={cn("mt-1 text-xs font-bold", getDistanceToneClass(profileView.distanceMeters))}>
                        {formatDistance(profileView.distanceMeters)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-[#111]/85 p-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Live Occupancy</h3>
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
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-500/55">
                    <div
                      className="h-full bg-orange-600 transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, profile.occupancyPercent ?? 0))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    {profile.occupancyPercent != null ? `${profile.occupancyPercent}%` : "-"}{" "}
                    {profile.occupancyLabel ? `(${profile.occupancyLabel})` : ""}
                  </p>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-[#111]/85 p-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">About Facility</h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-gray-300">
                    {profile.description?.trim() || "No description available."}
                  </p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[13px] text-gray-300">
                      <p><span className="text-gray-500">Established:</span> {profile.establishedAt ?? "-"}</p>
                      <p><span className="text-gray-500">Phone:</span> {profile.phoneNo ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[13px] text-gray-300">
                      <p><span className="text-gray-500">Email:</span> {profile.contactEmail ?? "-"}</p>
                      <p><span className="text-gray-500">Website:</span> {profile.websiteUrl ?? "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-[#111]/85 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Gym Reviews</h3>
                    <div className="flex items-center gap-4">
                      <div className="inline-flex items-center gap-2 text-orange-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-lg font-black">{profile.rating?.toFixed(1) ?? "-"}</span>
                        <span className="text-xs font-bold text-gray-400">({profile.reviewCount})</span>
                      </div>
                      {!showReviewForm && !myReview && (
                        <button
                          type="button"
                          onClick={openCreateReviewForm}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-300 transition-colors hover:bg-orange-500/20"
                        >
                          <Star className="h-3 w-3" />
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
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-orange-500/50 focus:outline-none focus:ring-0 resize-none"
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">All Reviews</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="relative w-[220px]">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          <input
                            value={reviewsQuery}
                            onChange={(e) => setReviewsQuery(e.target.value)}
                            placeholder="Search reviews..."
                            className="h-[34px] w-full rounded-full border border-white/10 bg-white/[0.03] pl-9 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-orange-500/40"
                          />
                        </div>
                        <div ref={sortRef} className="relative">
                          <button type="button" onClick={() => setSortOpen(v => !v)}
                                  className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border text-[12px] font-bold transition-all ${sortOpen ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400"}`}>
                            <ArrowUpDown className="w-3.5 h-3.5" />Sort
                          </button>
                          {sortOpen && (
                            <div className="absolute top-[calc(100%+8px)] right-0 table-bg table-border border rounded-2xl p-1.5 min-w-[160px] z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
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
                                  className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border text-[12px] font-bold transition-all ${filterOpen ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400"}`}>
                            <SlidersHorizontal className="w-3.5 h-3.5" />Filter
                          </button>
                          {filterOpen && (
                            <div className="absolute top-[calc(100%+8px)] right-0 table-bg table-border border rounded-2xl p-1.5 min-w-[160px] z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
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
                      <div className="flex min-h-[90px] items-center justify-center rounded-xl border border-white/8 bg-white/[0.02]">
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
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:border-white/[0.08] hover:bg-white/[0.035]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <img
                                  src={getReviewerAvatar(review.reviewerName, review.reviewerAvatarUrl)}
                                  alt={review.reviewerName ?? "FitPal Member"}
                                  className="h-8 w-8 rounded-full border border-white/15 object-cover"
                                  loading="lazy"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-xs font-black uppercase tracking-[0.1em] text-orange-300">
                                      {review.reviewerName ?? "FitPal Member"}
                                    </p>
                                    {isOwnReview ? (
                                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-300">
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
                            <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">
                              <p className="text-[13px] leading-relaxed text-zinc-300">
                                {review.comments ?? "No comment"}
                              </p>
                            </div>
                            {review.gymReply ? (
                              <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/[0.03] p-3 transition-colors hover:bg-orange-500/[0.05]">
                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-orange-300">
                                  Gym reply
                                </p>
                                <p className="mt-1 text-[12px] text-orange-100">{review.gymReply}</p>
                                {review.gymReplyAt ? (
                                  <p className="mt-1 text-[10px] text-orange-200/70">
                                    {formatReviewDate(review.gymReplyAt)}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-gray-400">
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
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={isReviewsLoading || reviewsTotalPages === 0 || reviewsPage >= reviewsTotalPages - 1}
                        onClick={() => void handleReviewPageChange(reviewsPage + 1)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>

                    {!showReviewForm && !myReview && (
                      <div className="mt-2 flex justify-center pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={openCreateReviewForm}
                          className="inline-flex w-full justify-center items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-orange-300 transition-colors hover:bg-orange-500/20"
                        >
                          <Star className="h-4 w-4" />
                          Write a Review
                        </button>
                      </div>
                    )}
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
                        <AlertDialogCancel className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]">
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
                <div className="sticky top-6 overflow-hidden rounded-[2rem] border border-orange-500/20 bg-[#111]/85 shadow-2xl">
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
                        className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/[0.08]"
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
