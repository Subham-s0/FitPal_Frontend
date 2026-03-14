import axios from "axios";
import { apiBaseUrl } from "@/config/api";
import type { ApiErrorResponse } from "@/models/auth.model";

const AUTH_STORAGE_KEY = "fitpal_auth";

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ── Request: attach JWT if available ──────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const { accessToken } = JSON.parse(raw) as { accessToken?: string };
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
  } catch {
    // corrupt storage — ignore
  }
  return config;
});

// ── Response: handle 401 globally ─────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      // Only redirect if not already on an auth page
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/signup")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export { AUTH_STORAGE_KEY };

export function getApiErrorMessage(
  error: unknown,
  fallback = "Request failed"
) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const payload = error.response?.data;
    if (payload?.details?.length) {
      return payload.details[0];
    }
    if (payload?.message) {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default apiClient;
