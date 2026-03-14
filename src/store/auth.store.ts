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
}

const getInitialState = (): AuthState => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuthState;
  } catch {
    // Ignore
  }
  return {
    accessToken: null,
    accountId: null,
    email: null,
    role: null,
    providers: [],
    profileCompleted: false,
  };
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
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentState));
    notify();
  },
  clearAuth: () => {
    currentState = {
      accessToken: null,
      accountId: null,
      email: null,
      role: null,
      providers: [],
      profileCompleted: false,
    };
    localStorage.removeItem(AUTH_STORAGE_KEY);
    notify();
  },
  isAuthenticated: () => !!currentState.accessToken,
};

export function useAuthState() {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
}
