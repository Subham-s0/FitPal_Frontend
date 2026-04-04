/** User profile photos: JPEG and PNG only (aligned with backend PROFILE_IMAGE_* policy). */

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PROFILE_IMAGE_ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"] as const;

/**
 * Hints for `<input type="file" accept={...} />`: MIME types plus extensions so desktop
 * file dialogs default to “Custom files” / filter to JPG and PNG instead of all images.
 */
export const PROFILE_IMAGE_FILE_INPUT_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  ".png",
  ".jpg",
  ".jpeg",
].join(",");

export function isAllowedProfileImageMimeType(type: string): boolean {
  const normalized = type.trim().toLowerCase();
  return (PROFILE_IMAGE_ACCEPTED_MIME_TYPES as readonly string[]).includes(normalized);
}
