type IdentityRole = "USER" | "GYM" | "ADMIN";

export interface UiAvatarOptions {
  background?: string;
  color?: string;
}

export interface ResolvedAvatarOptions extends UiAvatarOptions {
  primaryUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  role?: IdentityRole | string | null;
  fallbackName?: string;
}

const DEFAULT_BACKGROUND = "111";
const DEFAULT_COLOR = "fb923c";

export const getRoleFallbackName = (
  role: IdentityRole | string | null | undefined,
  fallbackName?: string,
) => {
  if (fallbackName?.trim()) {
    return fallbackName.trim();
  }

  const normalizedRole = role?.toUpperCase();

  if (normalizedRole === "GYM") {
    return "Gym Owner";
  }

  if (normalizedRole === "ADMIN" || normalizedRole === "SUPERADMIN") {
    return "Admin";
  }

  return "Member";
};

export const getDisplayNameFromEmail = (
  email: string | null | undefined,
  role: IdentityRole | string | null | undefined,
  fallbackName?: string,
) => {
  const fallback = getRoleFallbackName(role, fallbackName);

  if (!email) {
    return fallback;
  }

  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();

  if (!cleaned) {
    return fallback;
  }

  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const resolveDisplayName = ({
  displayName,
  email,
  role,
  fallbackName,
}: Pick<ResolvedAvatarOptions, "displayName" | "email" | "role" | "fallbackName">) => {
  const trimmedDisplayName = displayName?.trim();
  return trimmedDisplayName || getDisplayNameFromEmail(email, role, fallbackName);
};

export const buildUiAvatarUrl = (
  name: string,
  { background = DEFAULT_BACKGROUND, color = DEFAULT_COLOR }: UiAvatarOptions = {},
) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${encodeURIComponent(background)}&color=${encodeURIComponent(color)}`;

export const resolveAvatarUrl = ({
  primaryUrl,
  displayName,
  email,
  role,
  fallbackName,
  background,
  color,
}: ResolvedAvatarOptions) => {
  const trimmedPrimaryUrl = primaryUrl?.trim();

  if (trimmedPrimaryUrl) {
    return trimmedPrimaryUrl;
  }

  return buildUiAvatarUrl(resolveDisplayName({ displayName, email, role, fallbackName }), {
    background,
    color,
  });
};
