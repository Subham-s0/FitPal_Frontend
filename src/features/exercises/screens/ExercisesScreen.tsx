import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, X, XCircle } from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/client";
import {
  deleteCustomExerciseApi,
  getExerciseByIdApi,
  getExerciseLibraryApi,
  getExerciseLibraryEquipmentApi,
  getExerciseLibraryMusclesApi,
  getMyCustomExerciseByIdApi,
  getMyCustomExercisesApi,
} from "@/features/exercises/api";
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
import { CustomSelect } from "@/shared/ui/CustomSelect";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { AddCustomExerciseModal } from "@/features/exercises/components/AddCustomExerciseModal";
import { useAuthState } from "@/features/auth/hooks";
import type {
  CustomExerciseResponse,
  ExerciseHowToSectionResponse,
  ExerciseLibrarySummaryResponse,
  ExerciseMuscleAssignmentResponse,
  ExerciseType,
} from "@/features/exercises/model";

type ExerciseSource = "library" | "custom";

interface SidebarExerciseItem {
  key: string;
  source: ExerciseSource;
  id: number;
  name: string;
  equipmentName: string | null;
  coverUrl: string | null;
  exerciseType: ExerciseType;
  popular: boolean;
  primaryMuscles: string[];
}

interface SelectedExerciseRef {
  source: ExerciseSource;
  id: number;
}

type FullscreenCapableVideoElement = HTMLVideoElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function areSidebarExercisesEqual(
  left: SidebarExerciseItem | null,
  right: SidebarExerciseItem
) {
  if (!left) {
    return false;
  }

  return (
    left.key === right.key &&
    left.name === right.name &&
    left.equipmentName === right.equipmentName &&
    left.coverUrl === right.coverUrl &&
    left.exerciseType === right.exerciseType &&
    left.popular === right.popular &&
    left.primaryMuscles.length === right.primaryMuscles.length &&
    left.primaryMuscles.every((muscle, index) => muscle === right.primaryMuscles[index])
  );
}

function getExerciseInitials(name?: string | null) {
  if (!name) {
    return "EX";
  }

  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("");

  return letters || "EX";
}

function getMuscleNamesByType(
  assignments: ExerciseMuscleAssignmentResponse[] | undefined,
  muscleType: "PRIMARY" | "SECONDARY"
) {
  if (!assignments?.length) {
    return [];
  }

  return assignments
    .filter((assignment) => assignment.muscleType === muscleType && assignment.muscleName)
    .map((assignment) => assignment.muscleName as string);
}

function renderExerciseListItem(
  exercise: SidebarExerciseItem,
  selectedExerciseKey: string | null,
  onSelect: (exercise: SidebarExerciseItem) => void,
  onDelete?: (exercise: SidebarExerciseItem) => void,
  deleteDisabled = false
) {
  const isActive = selectedExerciseKey === exercise.key;
  const primaryLabel = exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles.join(", ") : "No primary muscle";
  const equipmentLabel = exercise.equipmentName ?? "No equipment";

  return (
    <div key={exercise.key} className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect(exercise)}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-[1.5rem] p-3 text-left transition-all ${
          isActive
            ? "active-exercise"
            : "border border-transparent hover:border-white/5 hover:bg-white/[0.02]"
        }`}
      >
        {exercise.coverUrl ? (
          <img
            src={exercise.coverUrl}
            alt={exercise.name}
            className="h-10 w-10 rounded-xl border border-white/10 object-cover"
          />
        ) : (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black text-xs font-black ${
              isActive ? "text-orange-600" : "text-gray-500"
            }`}
          >
            {getExerciseInitials(exercise.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={`truncate text-[10px] font-black uppercase leading-tight tracking-wide ${
                isActive ? "text-white" : "text-gray-300"
              }`}
            >
              {exercise.name}
            </h4>
            {exercise.source === "custom" ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest ${
                  isActive ? "bg-orange-600/20 text-orange-100" : "bg-white/5 text-orange-400"
                }`}
              >
                Custom
              </span>
            ) : null}
          </div>
          <p
            className={`truncate text-[8px] font-black uppercase tracking-widest ${
              isActive ? "text-orange-600/70" : "text-gray-500"
            }`}
          >
            {primaryLabel} / {equipmentLabel}
          </p>
        </div>
      </button>
      {exercise.source === "custom" && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(exercise)}
          disabled={deleteDisabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 transition-all hover:bg-red-500/20 disabled:opacity-50 disabled:hover:bg-red-500/10"
          title="Delete custom exercise"
        >
          <X className="h-3 w-3 text-red-400" />
        </button>
      )}
    </div>
  );
}

function toSidebarLibraryExercise(exercise: ExerciseLibrarySummaryResponse): SidebarExerciseItem {
  return {
    key: `library-${exercise.exerciseId}`,
    source: "library",
    id: exercise.exerciseId,
    name: exercise.name,
    equipmentName: exercise.equipmentName ?? null,
    coverUrl: exercise.coverUrl ?? null,
    exerciseType: exercise.exerciseType,
    popular: exercise.popular,
    primaryMuscles: exercise.primaryMuscles,
  };
}

function toSidebarCustomExercise(exercise: CustomExerciseResponse): SidebarExerciseItem {
  return {
    key: `custom-${exercise.customExerciseId}`,
    source: "custom",
    id: exercise.customExerciseId,
    name: exercise.name,
    equipmentName: exercise.equipment?.name ?? null,
    coverUrl: exercise.coverImgUrl ?? null,
    exerciseType: exercise.exerciseType,
    popular: false,
    primaryMuscles: exercise.primaryMuscle?.name ? [exercise.primaryMuscle.name] : [],
  };
}

function matchesCustomExerciseFilters(
  exercise: CustomExerciseResponse,
  query: string,
  selectedMuscle: string,
  selectedEquipment: string
) {
  const normalizedQuery = query.trim().toLowerCase();
  const exerciseMuscles = [
    exercise.primaryMuscle,
    ...exercise.secondaryMuscles,
  ].filter(Boolean);

  if (
    selectedMuscle !== "all" &&
    !exerciseMuscles.some((muscle) => muscle?.muscleId === Number(selectedMuscle))
  ) {
    return false;
  }

  if (
    selectedEquipment !== "all" &&
    exercise.equipment?.equipmentId !== Number(selectedEquipment)
  ) {
    return false;
  }

  if (!normalizedQuery) {
    return true;
  }

  const searchFields = [
    exercise.name,
    exercise.exerciseType,
    exercise.equipment?.name,
    exercise.primaryMuscle?.name,
    ...exercise.secondaryMuscles.map((muscle) => muscle.name),
  ];

  return searchFields.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

const ExercisesScreen = () => {
  const [selectedMuscle, setSelectedMuscle] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"stats" | "history" | "howto">("stats");
  const [selectedExerciseRef, setSelectedExerciseRef] = useState<SelectedExerciseRef | null>(null);
  const [selectedExercisePreview, setSelectedExercisePreview] =
    useState<SidebarExerciseItem | null>(null);
  const [pendingDeleteExercise, setPendingDeleteExercise] = useState<SidebarExerciseItem | null>(null);
  const [isCustomExerciseModalOpen, setIsCustomExerciseModalOpen] = useState(false);
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  const auth = useAuthState();
  const queryClient = useQueryClient();

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const hasAuthToken = Boolean(auth.accessToken);

  const muscleOptionsQuery = useQuery({
    queryKey: ["exercise-library-muscles"],
    queryFn: getExerciseLibraryMusclesApi,
    enabled: hasAuthToken,
  });

  const equipmentOptionsQuery = useQuery({
    queryKey: ["exercise-library-equipment"],
    queryFn: getExerciseLibraryEquipmentApi,
    enabled: hasAuthToken,
  });

  const exercisesQuery = useQuery({
    queryKey: ["exercise-library", deferredSearchQuery, selectedMuscle, selectedEquipment],
    queryFn: () =>
      getExerciseLibraryApi({
        query: deferredSearchQuery || undefined,
        muscleIds: selectedMuscle === "all" ? undefined : [Number(selectedMuscle)],
        equipmentIds: selectedEquipment === "all" ? undefined : [Number(selectedEquipment)],
      }),
    enabled: hasAuthToken,
    placeholderData: (previousData) => previousData,
  });

  const customExercisesQuery = useQuery({
    queryKey: ["custom-exercises"],
    queryFn: getMyCustomExercisesApi,
    enabled: hasAuthToken,
  });

  const exerciseDetailQuery = useQuery({
    queryKey: ["exercise-library-detail", selectedExerciseRef?.source === "library" ? selectedExerciseRef.id : null],
    queryFn: () => getExerciseByIdApi((selectedExerciseRef as SelectedExerciseRef).id),
    enabled: hasAuthToken && selectedExerciseRef?.source === "library",
  });

  const customExerciseDetailQuery = useQuery({
    queryKey: [
      "custom-exercise-detail",
      selectedExerciseRef?.source === "custom" ? selectedExerciseRef.id : null,
    ],
    queryFn: () => getMyCustomExerciseByIdApi((selectedExerciseRef as SelectedExerciseRef).id),
    enabled: hasAuthToken && selectedExerciseRef?.source === "custom",
  });

  const exercises = (exercisesQuery.data ?? []).map(toSidebarLibraryExercise);
  const customExercises = (customExercisesQuery.data ?? [])
    .filter((exercise) =>
      matchesCustomExerciseFilters(exercise, deferredSearchQuery, selectedMuscle, selectedEquipment)
    )
    .map(toSidebarCustomExercise);
  const popularExercises = exercises.filter((exercise) => exercise.popular);
  const allExercises = exercises.filter((exercise) => !exercise.popular);
  const selectedExerciseKey = selectedExerciseRef
    ? `${selectedExerciseRef.source}-${selectedExerciseRef.id}`
    : null;

  useEffect(() => {
    if (!selectedExerciseRef) {
      return;
    }

    const sourceExercises = selectedExerciseRef.source === "custom" ? customExercises : exercises;
    const matchingExercise = sourceExercises.find((exercise) => exercise.id === selectedExerciseRef.id);
    if (matchingExercise) {
      setSelectedExercisePreview((currentPreview) =>
        areSidebarExercisesEqual(currentPreview, matchingExercise)
          ? currentPreview
          : matchingExercise
      );
    }
  }, [customExercises, exercises, selectedExerciseRef]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const desktopMediaQuery = window.matchMedia("(min-width: 768px)");
    const handleViewportChange = (event: MediaQueryList | MediaQueryListEvent) => {
      if (event.matches) {
        setIsMobileLibraryOpen(false);
      }
    };

    handleViewportChange(desktopMediaQuery);

    if (typeof desktopMediaQuery.addEventListener === "function") {
      desktopMediaQuery.addEventListener("change", handleViewportChange);
      return () => desktopMediaQuery.removeEventListener("change", handleViewportChange);
    }

    desktopMediaQuery.addListener(handleViewportChange);
    return () => desktopMediaQuery.removeListener(handleViewportChange);
  }, []);

  const selectedLibraryExercise = selectedExerciseRef?.source === "library" ? exerciseDetailQuery.data : null;
  const selectedCustomExercise = selectedExerciseRef?.source === "custom" ? customExerciseDetailQuery.data : null;
  const selectedExerciseName =
    selectedLibraryExercise?.name ?? selectedCustomExercise?.name ?? selectedExercisePreview?.name ?? null;
  const selectedExerciseEquipment =
    selectedLibraryExercise?.equipment?.name ??
    selectedCustomExercise?.equipment?.name ??
    selectedExercisePreview?.equipmentName ??
    null;
  const selectedExerciseCoverUrl =
    selectedLibraryExercise?.coverUrl ??
    selectedCustomExercise?.coverImgUrl ??
    selectedExercisePreview?.coverUrl ??
    null;
  const selectedExerciseVideoUrl = selectedLibraryExercise?.videoUrl ?? null;
  const selectedExercisePrimaryMusclesFromDetail =
    selectedLibraryExercise
      ? getMuscleNamesByType(selectedLibraryExercise.muscleAssignments, "PRIMARY")
      : selectedCustomExercise?.primaryMuscle?.name
        ? [selectedCustomExercise.primaryMuscle.name]
        : [];
  const selectedExercisePrimaryMuscles =
    selectedExercisePrimaryMusclesFromDetail.length > 0
      ? selectedExercisePrimaryMusclesFromDetail
      : selectedExercisePreview?.primaryMuscles ?? [];
  const selectedExerciseSecondaryMuscles = selectedLibraryExercise
    ? getMuscleNamesByType(selectedLibraryExercise.muscleAssignments, "SECONDARY")
    : (selectedCustomExercise?.secondaryMuscles ?? []).map((muscle) => muscle.name);
  const selectedExerciseHowToSections: ExerciseHowToSectionResponse[] =
    selectedLibraryExercise?.howToSections ?? [];

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleFullscreen = () => {
    const videoElement = videoRef.current as FullscreenCapableVideoElement | null;
    if (!videoElement) {
      return;
    }

    if (videoElement.requestFullscreen) {
      videoElement.requestFullscreen();
      return;
    }

    videoElement.webkitRequestFullscreen?.();
  };

  const muscleOptions = [
    { value: "all", label: "All Muscles" },
    ...(muscleOptionsQuery.data ?? []).map((muscle) => ({
      value: String(muscle.muscleId),
      label: muscle.name,
    })),
  ];

  const equipmentOptions = [
    { value: "all", label: "All Equipment" },
    ...(equipmentOptionsQuery.data ?? []).map((equipment) => ({
      value: String(equipment.equipmentId),
      label: equipment.name,
    })),
  ];

  const libraryError =
    exercisesQuery.error ??
    customExercisesQuery.error ??
    muscleOptionsQuery.error ??
    equipmentOptionsQuery.error;
  const libraryErrorMessage = libraryError
    ? getApiErrorMessage(libraryError, "Failed to load exercise library.")
    : null;
  const detailError = exerciseDetailQuery.error ?? customExerciseDetailQuery.error;
  const detailErrorMessage = detailError
    ? getApiErrorMessage(detailError, "Failed to load exercise details.")
    : null;

  const deleteCustomExerciseMutation = useMutation({
    mutationFn: deleteCustomExerciseApi,
    onSuccess: (_, deletedExerciseId) => {
      queryClient.invalidateQueries({ queryKey: ["custom-exercises"] });
      setPendingDeleteExercise(null);
      setSelectedExerciseRef((currentSelection) =>
        currentSelection?.source === "custom" && currentSelection.id === deletedExerciseId
          ? null
          : currentSelection
      );
      setSelectedExercisePreview((currentPreview) =>
        currentPreview?.source === "custom" && currentPreview.id === deletedExerciseId
          ? null
          : currentPreview
      );
    },
  });

  const handleExerciseSelect = (exercise: SidebarExerciseItem) => {
    startTransition(() => {
      setSelectedExerciseRef({
        source: exercise.source,
        id: exercise.id,
      });
      setSelectedExercisePreview(exercise);
      setIsMobileLibraryOpen(false);
    });
  };

  const handleDeleteCustomExercise = (exercise: SidebarExerciseItem) => {
    if (exercise.source === "custom") {
      setPendingDeleteExercise(exercise);
    }
  };

  const handleConfirmDeleteCustomExercise = () => {
    if (!pendingDeleteExercise || pendingDeleteExercise.source !== "custom") {
      return;
    }

    deleteCustomExerciseMutation.mutate(pendingDeleteExercise.id);
  };

  const handleCustomExerciseCreated = (exercise: CustomExerciseResponse) => {
    const sidebarExercise = toSidebarCustomExercise(exercise);
    startTransition(() => {
      setSelectedExerciseRef({
        source: "custom",
        id: exercise.customExerciseId,
      });
      setSelectedExercisePreview(sidebarExercise);
      setActiveTab("stats");
      setIsMobileLibraryOpen(false);
    });
  };

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      setSearchQuery(value);
    });
  };

  const handleMuscleChange = (value: string) => {
    startTransition(() => {
      setSelectedMuscle(value);
    });
  };

  const handleEquipmentChange = (value: string) => {
    startTransition(() => {
      setSelectedEquipment(value);
    });
  };

  const libraryPanel = (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="space-y-3 border-b border-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Library</h3>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500 md:hidden">
              Select an exercise to load details
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCustomExerciseModalOpen(true)}
            className="rounded-lg border border-orange-600/20 bg-orange-600/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-orange-600 transition-all hover:bg-gradient-fire hover:text-white"
          >
            + Custom
          </button>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 pl-10 text-sm font-medium text-slate-200 transition-all placeholder:text-slate-500 hover:border-orange-600/50 focus:border-orange-600/50 focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(234,88,12,0.08)]"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>

          <CustomSelect
            options={muscleOptions}
            value={selectedMuscle}
            onChange={handleMuscleChange}
            placeholder="All Muscles"
            className="h-10 w-full"
            disabled={muscleOptionsQuery.isLoading}
          />

          <CustomSelect
            options={equipmentOptions}
            value={selectedEquipment}
            onChange={handleEquipmentChange}
            placeholder="All Equipment"
            className="h-10 w-full"
            disabled={equipmentOptionsQuery.isLoading}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-white">Popular Exercises</h3>
        <span className="text-[9px] font-bold text-orange-600">
          {exercisesQuery.isLoading ? "--" : `${popularExercises.length} TOTAL`}
        </span>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        <div className="space-y-2 border-b border-white/5 p-4">
          {customExercisesQuery.isLoading ? (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              Loading custom exercises...
            </p>
          ) : customExercises.length > 0 ? (
            <>
              {customExercises.map((exercise) =>
                renderExerciseListItem(
                  exercise,
                  selectedExerciseKey,
                  handleExerciseSelect,
                  handleDeleteCustomExercise,
                  deleteCustomExerciseMutation.isPending
                )
              )}
            </>
          ) : null}
          {exercisesQuery.isLoading ? (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              Loading...
            </p>
          ) : popularExercises.length > 0 ? (
            popularExercises.map((exercise) =>
              renderExerciseListItem(exercise, selectedExerciseKey, handleExerciseSelect, handleDeleteCustomExercise)
            )
          ) : (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              No popular exercises
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-white">All Exercises</h3>
          <span className="text-[9px] font-bold text-orange-600">
            {exercisesQuery.isLoading ? "--" : `${allExercises.length} TOTAL`}
          </span>
        </div>

        <div className="space-y-2 p-4">
          {exercisesQuery.isLoading ? (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              Loading...
            </p>
          ) : allExercises.length > 0 ? (
            allExercises.map((exercise) =>
              renderExerciseListItem(exercise, selectedExerciseKey, handleExerciseSelect, handleDeleteCustomExercise)
            )
          ) : exercises.length === 0 && customExercises.length === 0 ? (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              No exercises found
            </p>
          ) : (
            <p className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              No additional exercises
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full overflow-hidden font-sans text-white">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(234,88,12,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(234,88,12,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <main className="relative z-10 flex-grow overflow-y-auto custom-scrollbar p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-4xl font-black uppercase leading-none tracking-tighter text-white">
              <span className="text-gradient-fire">EXERCISES</span>
            </h1>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.4em] text-gray-500">
              Exercise Library
            </p>
          </div>

          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileLibraryOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl border border-orange-600/20 bg-orange-600/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400 transition-all hover:border-orange-500/40 hover:bg-orange-600/20 hover:text-white md:hidden"
            >
              {selectedExerciseRef ? "Change Exercise" : "Select Exercise"}
            </button>
          </div>

          {libraryErrorMessage ? (
            <div className="rounded-[1.75rem] border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-200">
              {libraryErrorMessage}
            </div>
          ) : null}

          {!selectedExerciseRef ? (
            <div className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#111] p-8">
              <div className="flex flex-col items-center gap-8 lg:flex-row">
                <div className="flex-grow">
                  <h1 className="mb-4 text-4xl font-black uppercase leading-none tracking-tighter text-gray-500">
                    Select an Exercise
                  </h1>
                  <div className="mb-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-[9px] font-black uppercase text-gray-500">Primary Muscle</p>
                      <p className="text-sm font-bold text-gray-700">--</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-[9px] font-black uppercase text-gray-500">Secondary Muscles</p>
                      <p className="text-sm font-bold text-gray-700">--</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-[9px] font-black uppercase text-gray-500">Equipment</p>
                      <p className="text-sm font-bold text-gray-700">--</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600">
                    {exercisesQuery.isLoading || customExercisesQuery.isLoading
                      ? "Loading exercises..."
                      : "Pick an exercise from the library to load details."}
                  </p>
                </div>
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/5 bg-black shadow-2xl lg:w-[350px]">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                      <svg className="h-8 w-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">No Cover</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#111] p-8 lg:flex-row">
              <div className="flex-grow">
                <div className="mb-4">
                  <h1 className="text-4xl font-black uppercase leading-none tracking-tighter text-white">
                    {selectedExerciseName ?? "Loading Exercise"}
                    <br />
                    <span className="text-gradient-fire">({selectedExerciseEquipment ?? "No Equipment"})</span>
                  </h1>
                </div>
                <div className="mb-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="mb-1 text-[9px] font-black uppercase text-gray-500">Primary Muscle</p>
                    <p className="text-sm font-bold text-orange-600">
                      {selectedExercisePrimaryMuscles.length > 0
                        ? selectedExercisePrimaryMuscles.join(", ")
                        : "--"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="mb-1 text-[9px] font-black uppercase text-gray-500">Secondary Muscles</p>
                    <p className="text-sm font-bold text-gray-200">
                      {selectedExerciseSecondaryMuscles.length > 0
                        ? selectedExerciseSecondaryMuscles.join(", ")
                        : "--"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="mb-1 text-[9px] font-black uppercase text-gray-500">Equipment</p>
                    <p className="text-sm font-bold text-gray-100">{selectedExerciseEquipment ?? "--"}</p>
                  </div>
                </div>
                {exerciseDetailQuery.isLoading || customExerciseDetailQuery.isLoading ? (
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    Loading exercise details...
                  </p>
                ) : null}
                {detailErrorMessage ? (
                  <div className="max-w-2xl rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                    {detailErrorMessage}
                  </div>
                ) : null}
              </div>
              <div className="w-full space-y-3 lg:w-[350px]">
                {selectedExerciseRef?.source === "custom" && selectedExercisePreview ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomExercise(selectedExercisePreview)}
                      disabled={deleteCustomExerciseMutation.isPending}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-black shadow-2xl">
                  {selectedExerciseVideoUrl ? (
                    <div className="group relative h-full w-full">
                      <video
                        ref={videoRef}
                        key={`${selectedExerciseRef?.source}-${selectedExerciseRef?.id}-${selectedExerciseVideoUrl}`}
                        src={selectedExerciseVideoUrl}
                        poster={selectedExerciseCoverUrl ?? undefined}
                        className="aspect-video h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onPlay={() => setIsVideoPlaying(true)}
                        onPause={() => setIsVideoPlaying(false)}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={handlePlayPause}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-fire text-white shadow-2xl transition-transform hover:scale-110"
                        >
                          {isVideoPlaying ? (
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg className="ml-0.5 h-6 w-6 fill-current" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <button
                        onClick={handleFullscreen}
                        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 transition-all group-hover:opacity-100 hover:bg-black/60"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                  ) : selectedExerciseCoverUrl ? (
                    <>
                      <img
                        src={selectedExerciseCoverUrl}
                        className="aspect-video h-full w-full object-cover"
                        alt={selectedExerciseName ?? "Exercise cover"}
                      />
                      <div className="absolute bottom-4 left-6 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">Cover Image</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex aspect-video items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-lg font-black text-orange-600">
                          {getExerciseInitials(selectedExerciseName)}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No Cover</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedExerciseRef !== null && (
            <>
              <div className="flex gap-2 border-b border-white/5">
                <button
                  onClick={() => setActiveTab("stats")}
                  className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === "stats"
                      ? "border-b-2 border-orange-600 text-orange-600"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  Stats
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === "history"
                      ? "border-b-2 border-orange-600 text-orange-600"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  History
                </button>
                <button
                  onClick={() => setActiveTab("howto")}
                  className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === "howto"
                      ? "border-b-2 border-orange-600 text-orange-600"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  How To
                </button>
              </div>

              {activeTab === "stats" && (
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 rounded-[2.5rem] border border-white/5 bg-[#111] p-8 lg:col-span-8">
                    <div className="mb-10 flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">
                        Weight Trend (12W)
                      </h3>
                      <div className="flex gap-2">
                        <span className="h-3 w-3 rounded-full bg-orange-600"></span>
                        <span className="text-[10px] font-bold uppercase text-gray-500">Weight (KG)</span>
                      </div>
                    </div>
                    <div className="relative h-64 w-full px-2">
                      <svg className="h-full w-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: "rgba(249, 115, 22, 0.2)", stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: "rgba(249, 115, 22, 0)", stopOpacity: 1 }} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,180 L150,160 L300,170 L450,130 L600,140 L750,90 L900,100 L1000,60"
                          fill="none"
                          stroke="rgba(249, 115, 22, 0.1)"
                          strokeWidth="40"
                          strokeLinecap="round"
                        />
                        <path
                          className="chart-line"
                          d="M0,180 L150,160 L300,170 L450,130 L600,140 L750,90 L900,100 L1000,60"
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        <circle cx="1000" cy="60" r="5" fill="#f97316" />
                        <circle cx="1000" cy="60" r="5" fill="#f97316" className="dot-pulse" />
                      </svg>
                      <div className="mt-6 flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-600">
                        <span>Week 1</span>
                        <span>Week 4</span>
                        <span>Week 8</span>
                        <span>Week 12</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 space-y-4 lg:col-span-4">
                    <div className="rounded-[2.5rem] border border-white/5 bg-[#111] p-6">
                      <p className="mb-4 text-[9px] font-black uppercase tracking-widest text-gray-500">
                        Personal Best
                      </p>
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-black text-white">92.5</span>
                        <span className="mb-1 text-xl font-black uppercase text-orange-600">kg</span>
                      </div>
                      <p className="mt-2 text-[10px] font-bold uppercase text-gray-600">Achieved: Oct 12, 2023</p>
                    </div>
                    <div className="glass-card rounded-[2.5rem] border-t-4 border-t-orange-600 p-6">
                      <p className="mb-4 text-[9px] font-black uppercase tracking-widest text-gray-500">
                        Estimated 1RM
                      </p>
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-black text-white">104</span>
                        <span className="mb-1 text-xl font-black uppercase text-orange-600">kg</span>
                      </div>
                      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div className="bg-gradient-fire h-full w-[85%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 glass-card rounded-[2.5rem] p-8">
                    <h3 className="mb-8 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                      Recent History
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                        <div>
                          <p className="text-[10px] font-black uppercase text-white">Dec 15, 2023</p>
                          <p className="mt-1 text-[9px] font-bold uppercase text-gray-600">4 Sets â€¢ 12 Reps</p>
                        </div>
                        <p className="text-lg font-black text-orange-600">
                          80.0<span className="ml-1 text-[10px]">KG</span>
                        </p>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4 opacity-60">
                        <div>
                          <p className="text-[10px] font-black uppercase text-white">Dec 08, 2023</p>
                          <p className="mt-1 text-[9px] font-bold uppercase text-gray-600">4 Sets â€¢ 10 Reps</p>
                        </div>
                        <p className="text-lg font-black text-orange-600">
                          77.5<span className="ml-1 text-[10px]">KG</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "howto" && (
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 rounded-[2.5rem] border border-white/5 bg-[#111] p-8">
                    <h3 className="mb-8 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                      Instructions
                    </h3>
                    {exerciseDetailQuery.isLoading || customExerciseDetailQuery.isLoading ? (
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
                        Loading instructions...
                      </p>
                    ) : detailErrorMessage ? (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                        {detailErrorMessage}
                      </div>
                    ) : selectedExerciseHowToSections.length ? (
                      <div className="space-y-6">
                        {selectedExerciseHowToSections.map((section, index) => (
                          <div key={section.howToSectionId} className="flex gap-6">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-orange-600/20 bg-orange-600/10 font-black text-orange-600">
                              {String(section.displayOrder ?? index + 1).padStart(2, "0")}
                            </div>
                            <p className="text-xs font-bold uppercase leading-relaxed text-gray-400">
                              {section.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
                        No instructions available.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <aside className="relative z-10 hidden w-80 shrink-0 flex-col border-l border-white/5 bg-[#0a0a0a]/95 backdrop-blur-sm md:flex">
        {libraryPanel}
      </aside>

      <Sheet open={isMobileLibraryOpen} onOpenChange={setIsMobileLibraryOpen}>
        <SheetContent
          side="right"
          className="w-[min(24rem,92vw)] gap-0 border-l border-white/5 bg-[#0a0a0a]/95 p-0 text-white"
        >
          <SheetTitle className="sr-only">Exercise Library</SheetTitle>
          {libraryPanel}
        </SheetContent>
      </Sheet>

      {/* Add Custom Exercise Modal */}
      <AddCustomExerciseModal 
        isOpen={isCustomExerciseModalOpen} 
        onClose={() => setIsCustomExerciseModalOpen(false)} 
        onCreated={handleCustomExerciseCreated}
      />

      <AlertDialog
        open={pendingDeleteExercise !== null}
        onOpenChange={(open) => {
          if (!open && !deleteCustomExerciseMutation.isPending) {
            setPendingDeleteExercise(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-[20px] border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
          <AlertDialogHeader>
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)]">
              <XCircle className="h-6 w-6 text-red-400" strokeWidth={1.8} />
            </div>
            <AlertDialogTitle className="text-[17px] font-black tracking-tight">
              Delete custom exercise
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-relaxed text-[hsl(0,0%,55%)]">
              {pendingDeleteExercise
                ? `Delete ${pendingDeleteExercise.name} from your custom exercise library. This action cannot be undone.`
                : "Delete this custom exercise from your library. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={deleteCustomExerciseMutation.isPending}
              className="mt-0 flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] py-2.5 text-[11px] font-black uppercase tracking-wider text-[hsl(0,0%,55%)] hover:border-white/20 hover:text-white"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDeleteCustomExercise();
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-red-500 py-2.5 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-red-400"
            >
              {deleteCustomExerciseMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {deleteCustomExerciseMutation.isPending ? "Deleting..." : "Delete Exercise"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExercisesScreen;
