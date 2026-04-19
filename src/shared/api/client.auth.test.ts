import { beforeEach, describe, expect, it, vi } from "vitest";

const clientAuthMocks = vi.hoisted(() => ({
  authStore: {
    getSnapshot: vi.fn(() => ({
      accessToken: "token-123",
    })),
    clearAuth: vi.fn(),
  },
}));

vi.mock("@/features/auth/store", () => ({
  authStore: clientAuthMocks.authStore,
}));

import apiClient from "@/shared/api/client";

const getResponseRejectedHandler = () => {
  const handlers = (apiClient.interceptors.response as unknown as {
    handlers?: Array<{ rejected?: (error: unknown) => Promise<never> }>;
  }).handlers ?? [];

  const rejected = handlers.find((handler) => typeof handler?.rejected === "function")?.rejected;
  if (!rejected) {
    throw new Error("Response interceptor rejected handler was not registered.");
  }
  return rejected;
};

describe("api client unauthorized handling (FE-AUTH-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears auth and redirects member requests to the login page on 401", async () => {
    const mockLocation = {
      ...window.location,
      pathname: "/dashboard",
      href: "/dashboard",
    };
    vi.stubGlobal("location", mockLocation);
    const rejected = getResponseRejectedHandler();
    const error = {
      isAxiosError: true,
      response: { status: 401 },
    };

    await expect(rejected(error)).rejects.toBe(error);

    expect(clientAuthMocks.authStore.clearAuth).toHaveBeenCalledTimes(1);
    expect(mockLocation.href).toBe("/login");

    vi.unstubAllGlobals();
  });

  it("routes admin traffic to the admin login page and skips redirect loops on public auth pages", async () => {
    const mockLocation = {
      ...window.location,
      pathname: "/admin/dashboard",
      href: "/admin/dashboard",
    };
    vi.stubGlobal("location", mockLocation);
    const rejected = getResponseRejectedHandler();
    const error = {
      isAxiosError: true,
      response: { status: 401 },
    };

    await expect(rejected(error)).rejects.toBe(error);
    expect(mockLocation.href).toBe("/admin");

    mockLocation.pathname = "/login";
    mockLocation.href = "/login";

    await expect(rejected(error)).rejects.toBe(error);
    expect(clientAuthMocks.authStore.clearAuth).toHaveBeenCalledTimes(2);
    expect(mockLocation.href).toBe("/login");

    vi.unstubAllGlobals();
  });
});
