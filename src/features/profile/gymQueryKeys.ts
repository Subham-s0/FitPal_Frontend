/**
 * Centralized query keys for gym profile/setup data under profile feature.
 */
export const gymQueryKeys = {
  all: ["profile", "gym"] as const,

  setup: () => [...gymQueryKeys.all, "setup"] as const,

  profile: () => [...gymQueryKeys.all, "profile"] as const,

  documents: () => [...gymQueryKeys.all, "documents"] as const,

  photos: () => [...gymQueryKeys.all, "photos"] as const,
};

export const gymProfileQueryKeys = gymQueryKeys;
