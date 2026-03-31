import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Upload } from "lucide-react";
import { getApiErrorMessage } from "@/shared/api/client";
import { CustomSelect } from "@/shared/ui/CustomSelect";
import { MultiSelect } from "@/shared/ui/MultiSelect";
import { createCustomExerciseApi } from "@/features/exercises/api";
import { getExerciseLibraryEquipmentApi, getExerciseLibraryMusclesApi } from "@/features/exercises/api";
import type { CustomExerciseResponse, ExerciseType } from "@/features/exercises/model";

interface AddCustomExerciseModalProps {
  isOpen: boolean;
  onClose: (reason?: "dismiss" | "success") => void;
  onCreated?: (exercise: CustomExerciseResponse) => void;
}

const NO_EQUIPMENT_VALUE = "none";

const exerciseTypeOptions: { value: ExerciseType; label: ExerciseType }[] = [
  { value: "Weight Reps", label: "Weight Reps" },
  { value: "Reps Only", label: "Reps Only" },
  { value: "Weighted Bodyweight", label: "Weighted Bodyweight" },
  { value: "Assisted Bodyweight", label: "Assisted Bodyweight" },
  { value: "Duration", label: "Duration" },
  { value: "Weight & Duration", label: "Weight & Duration" },
  { value: "Distance & Duration", label: "Distance & Duration" },
  { value: "Weight & Distance", label: "Weight & Distance" },
];

export function AddCustomExerciseModal({
  isOpen,
  onClose,
  onCreated,
}: AddCustomExerciseModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("Weight Reps");
  const [primaryMuscleId, setPrimaryMuscleId] = useState("");
  const [secondaryMuscleIds, setSecondaryMuscleIds] = useState<string[]>([]);
  const [equipmentId, setEquipmentId] = useState(NO_EQUIPMENT_VALUE);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousDocumentOverscroll = documentElement.style.overscrollBehavior;

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      documentElement.style.overflow = previousDocumentOverflow;
      documentElement.style.overscrollBehavior = previousDocumentOverscroll;
    };
  }, [isOpen]);

  const muscleOptionsQuery = useQuery({
    queryKey: ["exercise-library-muscles"],
    queryFn: getExerciseLibraryMusclesApi,
  });

  const equipmentOptionsQuery = useQuery({
    queryKey: ["exercise-library-equipment"],
    queryFn: getExerciseLibraryEquipmentApi,
  });

  const createMutation = useMutation({
    mutationFn: createCustomExerciseApi,
    onSuccess: (createdExercise) => {
      queryClient.invalidateQueries({ queryKey: ["custom-exercises"] });
      onCreated?.(createdExercise);
      closeModal("success");
    },
    onError: (error) => {
      setError(getApiErrorMessage(error, "Failed to create custom exercise"));
    },
  });

  const muscleOptions = (muscleOptionsQuery.data ?? []).map((muscle) => ({
    value: muscle.muscleId.toString(),
    label: muscle.name,
  }));

  const equipmentOptions = [
    { value: NO_EQUIPMENT_VALUE, label: "None" },
    ...(equipmentOptionsQuery.data ?? []).map((equipment) => ({
      value: equipment.equipmentId.toString(),
      label: equipment.name,
    })),
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setCoverImage(null);
        setImagePreview(null);
        setError("Image must be 5MB or smaller");
        return;
      }
      
      if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
        setCoverImage(null);
        setImagePreview(null);
        setError("Image must be JPG, JPEG, PNG, or WEBP");
        return;
      }

      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handlePrimaryMuscleChange = (value: string) => {
    setPrimaryMuscleId(value);
    setSecondaryMuscleIds((current) => current.filter((muscleId) => muscleId !== value));
  };

  const handleRemoveImage = () => {
    setCoverImage(null);
    setImagePreview(null);
  };

  const resetForm = () => {
    setName("");
    setExerciseType("Weight Reps");
    setPrimaryMuscleId("");
    setSecondaryMuscleIds([]);
    setEquipmentId(NO_EQUIPMENT_VALUE);
    setCoverImage(null);
    setImagePreview(null);
    setError(null);
  };

  const closeModal = (reason: "dismiss" | "success" = "dismiss") => {
    resetForm();
    onClose(reason);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Exercise name is required");
      return;
    }

    if (!primaryMuscleId) {
      setError("Primary muscle is required");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      exerciseType,
      primaryMuscleId: Number(primaryMuscleId),
      equipmentId: equipmentId !== NO_EQUIPMENT_VALUE ? Number(equipmentId) : undefined,
      secondaryMuscleIds: secondaryMuscleIds.map(Number),
      coverImage: coverImage || undefined,
    });
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[260] flex items-start justify-center bg-black/85 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[max(1.25rem,env(safe-area-inset-top)+1rem)] sm:items-center sm:p-6">
      <div
        className="relative w-full max-w-[26rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#111] shadow-2xl sm:max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="custom-scrollbar max-h-[min(76dvh,38rem)] overflow-y-auto overscroll-contain p-5 sm:max-h-[min(88dvh,48rem)] sm:p-6"
          onWheelCapture={(event) => event.stopPropagation()}
          onTouchMoveCapture={(event) => event.stopPropagation()}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">
              Add <span className="text-gradient-fire">Custom Exercise</span>
            </h2>
            <button
              onClick={() => closeModal("dismiss")}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pr-1">
            {/* Cover Image Upload - Profile Pic Style */}
            <div className="flex justify-center">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-28 w-28 rounded-2xl border-2 border-white/10 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 transition-all hover:bg-white/10">
                  <Upload className="mb-1 h-8 w-8 text-gray-500" />
                  <p className="px-2 text-center text-[9px] font-bold uppercase text-gray-400">
                    Upload Image
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* Exercise Name */}
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-gray-400">
                Exercise Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter exercise name..."
                className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm font-medium text-slate-200 placeholder:text-slate-600 transition-all hover:border-orange-600/50 focus:border-orange-600/50 focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(234,88,12,0.08)]"
                maxLength={200}
                required
              />
            </div>

            {/* Exercise Type */}
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-gray-400">
                Exercise Type *
              </label>
              <CustomSelect
                options={exerciseTypeOptions}
                value={exerciseType}
                onChange={(value) => setExerciseType(value as ExerciseType)}
                placeholder="Select exercise type"
                className="h-11 w-full"
              />
            </div>

            {/* Primary Muscle */}
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-gray-400">
                Primary Muscle *
              </label>
              <CustomSelect
                options={muscleOptions}
                value={primaryMuscleId}
                onChange={handlePrimaryMuscleChange}
                placeholder="Select primary muscle"
                className="h-11 w-full"
              />
            </div>

            {/* Secondary Muscles - Multi-Select with Tags */}
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-gray-400">
                Secondary Muscles
              </label>
              <MultiSelect
                options={muscleOptions.filter((m) => m.value !== primaryMuscleId)}
                value={secondaryMuscleIds}
                onChange={setSecondaryMuscleIds}
                placeholder="Select secondary muscles"
                className="w-full"
              />
            </div>

            {/* Equipment */}
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-gray-400">
                Equipment
              </label>
              <CustomSelect
                options={equipmentOptions}
                value={equipmentId}
                onChange={setEquipmentId}
                placeholder="Select equipment"
                className="h-11 w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => closeModal("dismiss")}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 rounded-xl bg-button-gradient px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-orange-600/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
