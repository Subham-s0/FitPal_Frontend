import { useMutation } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { loginApi, registerUserApi, registerGymApi } from "@/features/auth/api";
import { authStore } from "@/features/auth/store";

export function useLogin() {
  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      authStore.setAuth(data);
    },
  });
}

export function useRegisterUser() {
  return useMutation({
    mutationFn: registerUserApi,
    onSuccess: (data) => {
      authStore.setAuth(data);
    },
  });
}

export function useRegisterGym() {
  return useMutation({
    mutationFn: registerGymApi,
    onSuccess: (data) => {
      authStore.setAuth(data);
    },
  });
}

export const useAuthState = () => {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
};

export function useLogout() {
  return () => {
    const redirectPath =
      authStore.getSnapshot().role?.toUpperCase() === "SUPERADMIN"
        ? "/admin"
        : "/login";
    authStore.clearAuth();
    window.location.href = redirectPath;
  };
}
