const normalizeOrigin = (value?: string) => {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
};

const normalizePath = (value?: string) => {
  if (!value || value.trim() === "") {
    return "";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, "");
};

const API_BASE_PATH = normalizePath(import.meta.env.VITE_API_BASE_PATH) || "/api";
const BACKEND_ORIGIN = normalizeOrigin(import.meta.env.VITE_BACKEND_ORIGIN);

export const apiBasePath = API_BASE_PATH;
export const backendOrigin = BACKEND_ORIGIN;
export const apiBaseUrl = BACKEND_ORIGIN
  ? `${BACKEND_ORIGIN}${API_BASE_PATH}`
  : API_BASE_PATH;

export const buildApiUrl = (path = "") => {
  const normalizedPath = normalizePath(path);
  return normalizedPath ? `${apiBaseUrl}${normalizedPath}` : apiBaseUrl;
};

export const googleOAuthStartUrl = buildApiUrl("/oauth2/authorization/google");
