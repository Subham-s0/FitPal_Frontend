import { useState, type ChangeEvent } from "react";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/shared/api/client";
import { uploadProfileImageApi, deleteProfileImageApi } from "@/features/profile/api";
import { cn } from "@/shared/lib/utils";
import type { UserProfileResponse } from "@/features/profile/model";

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface ProfileImageSectionProps {
  profile: UserProfileResponse;
  onUpdate: () => void;
}

const buildInitials = (profile?: UserProfileResponse | null, email?: string | null) => {
  const candidate = [profile?.firstName, profile?.lastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();

  const base = candidate || email?.split("@")[0] || "FitPal Member";
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

export function ProfileImageSection({ profile, onUpdate }: ProfileImageSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const initials = buildInitials(profile, profile.email);
  const displayImageUrl = previewUrl || profile.profileImageUrl || "";

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!PROFILE_IMAGE_ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Upload a PNG, JPEG, or WEBP image");
      return;
    }

    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }

    try {
      setIsUploading(true);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      await uploadProfileImageApi(file);
      toast.success("Profile image updated successfully");
      onUpdate();

      // Clean up preview
      URL.revokeObjectURL(preview);
      setPreviewUrl("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload profile image"));
      // Revert preview on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!profile.profileImageUrl) return;

    try {
      setIsUploading(true);
      await deleteProfileImageApi();
      toast.success("Profile image removed successfully");
      onUpdate();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to remove profile image"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#111] p-6 shadow-xl transition-all duration-300 hover:border-white/10 sm:p-8">
      <div className="relative mx-auto mb-5 h-28 w-28 sm:mb-6 sm:h-36 sm:w-36">
        <div className="absolute inset-0 animate-pulse-slow rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10" />
        <div className="absolute inset-1 z-10 overflow-hidden rounded-full border-2 border-white/10 bg-[#0a0a0a]">
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt="Profile"
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500/10 to-orange-600/5 text-3xl font-black italic text-orange-500 sm:text-4xl">
              {initials}
            </div>
          )}
        </div>
        
        {displayImageUrl ? (
          <button
            type="button"
            aria-label={isUploading ? "Removing profile image" : "Remove profile image"}
            onClick={handleRemoveImage}
            disabled={isUploading}
            className={cn(
              "absolute bottom-0 right-0 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white transition-all duration-200 hover:scale-110 hover:border-red-500 hover:bg-red-500 hover:text-white active:scale-95 sm:h-10 sm:w-10",
              isUploading && "pointer-events-none opacity-50"
            )}
          >
            {isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        ) : (
          <label
            aria-label={isUploading ? "Uploading profile image" : "Upload profile image"}
            className={cn(
              "absolute bottom-0 right-0 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/80 text-white transition-all duration-200 hover:scale-110 hover:border-orange-500 hover:bg-orange-600 active:scale-95 sm:h-10 sm:w-10",
              isUploading && "pointer-events-none opacity-50"
            )}
          >
            {isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            <input
              type="file"
              aria-label="Upload profile image"
              accept={PROFILE_IMAGE_ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={handleImageSelect}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      <div className="text-center">
        <h2 className="text-xl font-black uppercase tracking-tight sm:text-2xl">
          {[profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.userName}
        </h2>
        <p className="mt-1 truncate text-xs font-semibold text-orange-500 sm:text-sm">
          {profile.email}
        </p>
        <p className="mt-2 text-[11px] text-slate-400 sm:mt-3 sm:text-xs">
          {profile.hasActiveSubscription
            ? "Active member with subscription access"
            : profile.hasSubscription
              ? "Membership selected. Activation pending"
              : "Profile saved. No subscription yet"}
        </p>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
