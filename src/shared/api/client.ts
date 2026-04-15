import axios, { AxiosHeaders } from "axios";
import type { AxiosRequestConfig } from "axios";
import { apiBaseUrl } from "@/shared/api/config";
import type { ApiErrorResponse, ApiResponse } from "@/shared/api/model";
import { authStore } from "@/features/auth/store";
import { AUTH_STORAGE_KEY } from "@/features/auth/storage";

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 120_000,
});

// ── Request: attach JWT if available ──────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const accessToken = authStore.getSnapshot().accessToken;

  if (!accessToken) {
    return config;
  }

  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  config.headers = headers;

  return config;
});

// ── Response: handle 401 globally ─────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      authStore.clearAuth();
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

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.message || "Request failed");
  }

  return response.data as T;
}

export async function getApiData<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(url, config);
  return unwrapApiResponse(response.data);
}

export async function postApiData<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.post<ApiResponse<T>>(url, data, config);
  return unwrapApiResponse(response.data);
}

export async function putApiData<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.put<ApiResponse<T>>(url, data, config);
  return unwrapApiResponse(response.data);
}

export async function patchApiData<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
  return unwrapApiResponse(response.data);
}

export async function deleteApiData<T = void>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.delete<ApiResponse<T>>(url, config);
  return unwrapApiResponse(response.data);
}

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
        return fallback;
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

export function getApiErrorCode(error: unknown): string | null {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

  const extractCodeFromPayload = (payload: unknown): string | null => {
    if (!isRecord(payload)) {
      return null;
    }

    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "data")) {
      return extractCodeFromPayload(payload.data);
    }

    return null;
  };

  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return extractCodeFromPayload(error.response?.data);
  }

  return null;
}

export default apiClient;
