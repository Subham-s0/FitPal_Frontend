import type { GymRecommendationItem } from "@/features/gyms/types";

export function formatGymDistance(distanceMeters?: number | null): string {
  if (distanceMeters == null) return "Location off";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`;
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

export function getGymDisplayName(gym: Pick<GymRecommendationItem, "gymName">): string {
  return gym.gymName ?? "Gym";
}

export function getGymLocationLabel(
  gym: Pick<GymRecommendationItem, "addressLine" | "city">
): string {
  return [gym.addressLine, gym.city].filter((value): value is string => Boolean(value)).join(", ");
}

export function getGymCityLabel(gym: Pick<GymRecommendationItem, "city">): string {
  return gym.city ?? "Unknown";
}

export function getGymPreviewImageUrl(
  gym: Pick<GymRecommendationItem, "coverPhotoUrl" | "logoUrl">
): string | null {
  return gym.coverPhotoUrl ?? gym.logoUrl ?? null;
}

export function getGymMonogram(gym: Pick<GymRecommendationItem, "gymName">): string {
  const normalizedName = getGymDisplayName(gym).replace(/\s+/g, "").trim().toUpperCase();
  if (!normalizedName) {
    return "GY";
  }
  return normalizedName.slice(0, 2);
}

export function canCheckInAtGym(
  gym: Pick<GymRecommendationItem, "checkInEnabled" | "accessibleByCurrentUser">
): boolean {
  return gym.checkInEnabled && gym.accessibleByCurrentUser;
}
