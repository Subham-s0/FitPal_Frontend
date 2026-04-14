import { toast } from "sonner";
import { getApiErrorMessage } from "@/shared/api/client";

export const showApiErrorToast = (error: unknown, fallbackMessage: string) => {
  toast.error(getApiErrorMessage(error, fallbackMessage));
};

export const showApiSuccessToast = (message: string) => {
  toast.success(message);
};

export const createApiErrorToastHandler =
  (fallbackMessage: string) =>
  (error: unknown) => {
    showApiErrorToast(error, fallbackMessage);
  };
