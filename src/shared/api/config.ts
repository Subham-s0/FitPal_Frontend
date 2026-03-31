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
const API_PROXY_TARGET = normalizeOrigin(import.meta.env.VITE_API_PROXY_TARGET);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const isLoopbackHost = (hostname: string) => LOOPBACK_HOSTS.has(hostname.toLowerCase());

const resolveReachableOrigin = (origin: string) => {
  if (!origin) {
    return "";
  }

  if (typeof window === "undefined") {
    return origin;
  }

  try {
    const targetUrl = new URL(origin);
    const currentUrl = new URL(window.location.origin);

    if (isLoopbackHost(targetUrl.hostname) && !isLoopbackHost(currentUrl.hostname)) {
      targetUrl.hostname = currentUrl.hostname;
    }

    return normalizeOrigin(targetUrl.origin);
  } catch {
    return origin;
  }
};

const RUNTIME_BACKEND_ORIGIN = resolveReachableOrigin(BACKEND_ORIGIN);

export const apiBasePath = API_BASE_PATH;
export const backendOrigin = RUNTIME_BACKEND_ORIGIN;
export const apiBaseUrl = RUNTIME_BACKEND_ORIGIN
  ? `${RUNTIME_BACKEND_ORIGIN}${API_BASE_PATH}`
  : API_BASE_PATH;

export const buildApiUrl = (path = "") => {
  const normalizedPath = normalizePath(path);
  return normalizedPath ? `${apiBaseUrl}${normalizedPath}` : apiBaseUrl;
};

const resolveOAuthBackendOrigin = () => {
  if (RUNTIME_BACKEND_ORIGIN) {
    return RUNTIME_BACKEND_ORIGIN;
  }

  if (!API_PROXY_TARGET) {
    return "";
  }

  if (typeof window === "undefined") {
    return API_PROXY_TARGET;
  }

  try {
    const proxyUrl = new URL(API_PROXY_TARGET);
    const currentUrl = new URL(window.location.origin);

    if (isLoopbackHost(proxyUrl.hostname) && !isLoopbackHost(currentUrl.hostname)) {
      proxyUrl.hostname = currentUrl.hostname;
    }

    return normalizeOrigin(proxyUrl.origin);
  } catch {
    return API_PROXY_TARGET;
  }
};

export const buildGoogleOAuthStartUrl = (frontendOrigin?: string) => {
  const oauthBackendOrigin = resolveOAuthBackendOrigin();
  const oauthStartPath = `${API_BASE_PATH}/auth/oauth/google`;

  if (oauthBackendOrigin) {
    const url = new URL(`${oauthBackendOrigin}${oauthStartPath}`);
    const normalizedFrontendOrigin = normalizeOrigin(frontendOrigin);

    if (normalizedFrontendOrigin) {
      url.searchParams.set("frontendOrigin", normalizedFrontendOrigin);
    }

    return url.toString();
  }

  const baseUrl = buildApiUrl("/auth/oauth/google");
  const normalizedFrontendOrigin = normalizeOrigin(frontendOrigin);
  if (!normalizedFrontendOrigin || typeof window === "undefined") {
    return baseUrl;
  }

  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set("frontendOrigin", normalizedFrontendOrigin);
  return url.toString();
};
