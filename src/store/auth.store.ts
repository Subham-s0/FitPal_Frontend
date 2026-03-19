import { useSyncExternalStore } from "react";
import { AUTH_STORAGE_KEY } from "@/api/client";
import type { AuthResponse } from "@/models/auth.model";

export interface AuthState {
  accessToken: string | null;
  accountId: number | null;
  email: string | null;
  role: string | null;
  providers: string[];
  profileCompleted: boolean;
  hasSubscription: boolean;
  hasActiveSubscription: boolean;
}

const defaultState: AuthState = {
  accessToken: null,
  accountId: null,
  email: null,
  role: null,
  providers: [],
  profileCompleted: false,
  hasSubscription: false,
  hasActiveSubscription: false,
};

const getInitialState = (): AuthState => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AuthState>;
      return {
        ...defaultState,
        ...parsed,
        providers: Array.isArray(parsed.providers) ? parsed.providers : [],
        profileCompleted: Boolean(parsed.profileCompleted),
        hasSubscription: Boolean(parsed.hasSubscription),
        hasActiveSubscription: Boolean(parsed.hasActiveSubscription),
      };
    }
  } catch {
    // Ignore
  }
  return defaultState;
};

let currentState: AuthState = getInitialState();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const authStore = {
  getSnapshot: () => currentState,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setAuth: (payload: AuthResponse) => {
    currentState = {
      accessToken: payload.accessToken,
      accountId: payload.accountId,
      email: payload.email,
      role: payload.role,
      providers: payload.providers,
      profileCompleted: payload.profileCompleted,
      hasSubscription: payload.hasSubscription,
      hasActiveSubscription: payload.hasActiveSubscription,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentState));
    notify();
  },
  clearAuth: () => {
    currentState = { ...defaultState };
    localStorage.removeItem(AUTH_STORAGE_KEY);
    notify();
  },
  updateOnboardingStatus: (payload: {
    profileCompleted: boolean;
    hasSubscription: boolean;
    hasActiveSubscription: boolean;
  }) => {
    currentState = {
      ...currentState,
      profileCompleted: payload.profileCompleted,
      hasSubscription: payload.hasSubscription,
      hasActiveSubscription: payload.hasActiveSubscription,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentState));
    notify();
  },
  isAuthenticated: () => !!currentState.accessToken,
};

export function useAuthState() {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
}
