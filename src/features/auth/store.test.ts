import type { AuthResponse } from "@/features/auth/model";

const AUTH_KEY = "fitpal_auth";

const createStorageMock = (initial: Record<string, string> = {}): Storage => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    clear: vi.fn(() => {
      values.clear();
    }),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    get length() {
      return values.size;
    },
  } as Storage;
};

const installStorage = (storage: Storage) => {
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
};

const createAuthResponse = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
  message: "ok",
  accessToken: "token-123",
  tokenType: "Bearer",
  expiresIn: 3600,
  accountId: 42,
  email: "member@fitpal.com",
  role: "USER",
  providers: ["LOCAL"],
  profileCompleted: false,
  emailVerified: false,
  submittedForReview: false,
  approved: false,
  hasSubscription: false,
  hasActiveSubscription: false,
  hasDashboardAccess: false,
  ...overrides,
});

describe("auth store hydration and persistence (FE-AUTH-07)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("hydrates persisted auth flags without inferring dashboard access", async () => {
    const storage = createStorageMock({
      [AUTH_KEY]: JSON.stringify({
        accessToken: "stored-token",
        role: "USER",
        providers: "LOCAL",
        profileCompleted: true,
        hasSubscription: true,
        hasActiveSubscription: true,
      }),
    });
    installStorage(storage);

    const { authStore } = await import("@/features/auth/store");
    const snapshot = authStore.getSnapshot();

    expect(snapshot.accessToken).toBe("stored-token");
    expect(snapshot.providers).toEqual([]);
    expect(snapshot.profileCompleted).toBe(true);
    expect(snapshot.hasActiveSubscription).toBe(true);
    expect(snapshot.hasDashboardAccess).toBe(false);
  });

  it("falls back to default state when storage is malformed", async () => {
    const storage = createStorageMock({
      [AUTH_KEY]: "{not-valid-json",
    });
    installStorage(storage);

    const { authStore } = await import("@/features/auth/store");
    const snapshot = authStore.getSnapshot();

    expect(snapshot.accessToken).toBeNull();
    expect(snapshot.role).toBeNull();
    expect(snapshot.profileCompleted).toBe(false);
    expect(snapshot.hasSubscription).toBe(false);
    expect(snapshot.hasDashboardAccess).toBe(false);
  });

  it("persists auth payload updates and clears state on logout", async () => {
    const storage = createStorageMock();
    installStorage(storage);

    const { authStore } = await import("@/features/auth/store");

    authStore.setAuth(
      createAuthResponse({
        providers: ["LOCAL", "GOOGLE"],
        profileCompleted: true,
        hasSubscription: true,
        hasActiveSubscription: true,
        hasDashboardAccess: true,
      }),
    );

    expect(authStore.isAuthenticated()).toBe(true);
    expect(authStore.getSnapshot().providers).toEqual(["LOCAL", "GOOGLE"]);
    expect(storage.setItem).toHaveBeenCalledWith(AUTH_KEY, expect.any(String));

    authStore.updateOnboardingStatus({
      profileCompleted: true,
      hasSubscription: true,
      hasActiveSubscription: false,
      hasDashboardAccess: false,
      emailVerified: true,
      submittedForReview: true,
      approved: true,
    });

    const afterUpdate = authStore.getSnapshot();
    expect(afterUpdate.providers).toEqual(["LOCAL", "GOOGLE"]);
    expect(afterUpdate.emailVerified).toBe(true);
    expect(afterUpdate.submittedForReview).toBe(true);
    expect(afterUpdate.approved).toBe(true);
    expect(afterUpdate.hasActiveSubscription).toBe(false);
    expect(afterUpdate.hasDashboardAccess).toBe(false);

    authStore.clearAuth();
    expect(authStore.isAuthenticated()).toBe(false);
    expect(authStore.getSnapshot().accessToken).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(AUTH_KEY);
  });
});
