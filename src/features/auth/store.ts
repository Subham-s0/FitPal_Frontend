import type { AuthResponse } from "@/features/auth/model";
import { AUTH_STORAGE_KEY } from "@/features/auth/storage";

export interface AuthState {
  accessToken: string | null;
  accountId: number | null;
  email: string | null;
  role: string | null;
  providers: string[];
  profileCompleted: boolean;
  emailVerified: boolean;
  submittedForReview: boolean;
  approved: boolean;
  hasSubscription: boolean;
  hasActiveSubscription: boolean;
  hasDashboardAccess: boolean;
}

const defaultState: AuthState = {
  accessToken: null,
  accountId: null,
  email: null,
  role: null,
  providers: [],
  profileCompleted: false,
  emailVerified: false,
  submittedForReview: false,
  approved: false,
  hasSubscription: false,
  hasActiveSubscription: false,
  hasDashboardAccess: false,
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
        emailVerified: Boolean(parsed.emailVerified),
        submittedForReview: Boolean(parsed.submittedForReview),
        approved: Boolean(parsed.approved),
        hasSubscription: Boolean(parsed.hasSubscription),
        hasActiveSubscription: Boolean(parsed.hasActiveSubscription),
        // Never infer dashboard access from active-subscription alone (expired / pending payment must stay false).
        hasDashboardAccess: parsed.hasDashboardAccess === true,
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
      emailVerified: payload.emailVerified,
      submittedForReview: payload.submittedForReview,
      approved: payload.approved,
      hasSubscription: payload.hasSubscription,
      hasActiveSubscription: payload.hasActiveSubscription,
      hasDashboardAccess: payload.hasDashboardAccess,
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
    hasDashboardAccess: boolean;
    providers?: string[];
    emailVerified?: boolean;
    submittedForReview?: boolean;
    approved?: boolean;
  }) => {
    currentState = {
      ...currentState,
      providers: payload.providers ?? currentState.providers,
      profileCompleted: payload.profileCompleted,
      emailVerified: payload.emailVerified ?? currentState.emailVerified,
      submittedForReview: payload.submittedForReview ?? currentState.submittedForReview,
      approved: payload.approved ?? currentState.approved,
      hasSubscription: payload.hasSubscription,
      hasActiveSubscription: payload.hasActiveSubscription,
      hasDashboardAccess: payload.hasDashboardAccess,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentState));
    notify();
  },
  isAuthenticated: () => !!currentState.accessToken,
};
