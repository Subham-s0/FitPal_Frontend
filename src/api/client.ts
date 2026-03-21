import axios from "axios";
import { apiBaseUrl } from "@/config/api";
import type { ApiErrorResponse } from "@/models/auth.model";

const AUTH_STORAGE_KEY = "fitpal_auth";

interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

function isApiSuccessResponse<T>(value: unknown): value is ApiSuccessResponse<T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.success === "boolean" &&
    typeof candidate.message === "string" &&
    Object.prototype.hasOwnProperty.call(candidate, "data")
  );
}

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
  (response) => {
    if (isApiSuccessResponse(response.data)) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      const pathname = window.location.pathname;
      const isPublicAuthPage =
        pathname === "/admin" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/signup");

      if (!isPublicAuthPage) {
        window.location.href = pathname.startsWith("/admin") ? "/admin" : "/login";
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
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

  const extractMessageFromPayload = (payload: unknown): string | null => {
    if (!payload) {
      return null;
    }

    if (typeof payload === "string") {
      const trimmed = payload.trim();
      if (!trimmed) {
        return null;
      }
      try {
        return extractMessageFromPayload(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }

    if (!isRecord(payload)) {
      return null;
    }

    const details = payload.details;
    if (Array.isArray(details)) {
      const firstDetail = details.find(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
      );
      if (firstDetail) {
        return firstDetail;
      }
    }

    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }

    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "data")) {
      return extractMessageFromPayload(payload.data);
    }

    return null;
  };

  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const payloadMessage = extractMessageFromPayload(error.response?.data);
    if (payloadMessage) {
      return payloadMessage;
    }

    if (typeof error.response?.status === "number") {
      if (error.response.status >= 500) {
        return "Server error while processing payment verification.";
      }
      return `Request failed with status ${error.response.status}.`;
    }
  }

  if (error instanceof Error && error.message) {
    if (error.message.includes("status code")) {
      return fallback;
    }
    return error.message;
  }

  return fallback;
}

export default apiClient;
