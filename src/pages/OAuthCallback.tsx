import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ApiErrorResponse, AuthResponse } from "@/models/auth.model";
import { authStore } from "@/store/auth.store";
import { getPostAuthRoute } from "@/utils/auth-routing";
import { toast } from "sonner";

const OAUTH_MESSAGE_TYPE = "FITPAL_OAUTH_RESULT";

const parseOAuthPayload = <T,>(rawPayload: string | null): T | null => {
  if (!rawPayload) {
    return null;
  }

  try {
    return JSON.parse(rawPayload) as T;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(rawPayload)) as T;
    } catch {
      return null;
    }
  }
};

const getOAuthErrorMessage = (error: ApiErrorResponse) => {
  if (error.details.length > 0) {
    return error.details[0];
  }

  return error.message || "Google sign-in failed";
};

const OAuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);
    const authPayload = parseOAuthPayload<AuthResponse>(params.get("auth"));
    const errorPayload = parseOAuthPayload<ApiErrorResponse>(params.get("error"));
    const openerWindow = window.opener;

    if (openerWindow && !openerWindow.closed) {
      openerWindow.postMessage(
        {
          type: OAUTH_MESSAGE_TYPE,
          auth: authPayload,
          error: errorPayload,
        },
        window.location.origin
      );
      window.close();
      return;
    }

    if (authPayload?.accessToken) {
      authStore.setAuth(authPayload);
      toast.success(authPayload.message || "Signed in successfully");
      navigate(
        getPostAuthRoute({
          role: authPayload.role,
          profileCompleted: authPayload.profileCompleted,
          hasSubscription: authPayload.hasSubscription,
          hasActiveSubscription: authPayload.hasActiveSubscription,
        }),
        { replace: true }
      );
      return;
    }

    authStore.clearAuth();

    if (errorPayload) {
      toast.error(getOAuthErrorMessage(errorPayload));
      navigate("/login", { replace: true });
      return;
    }

    toast.error("Invalid Google authentication response");
    navigate("/login", { replace: true });
  }, [location.hash, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="flex items-center gap-3 rounded-full border border-border bg-card px-6 py-4 shadow-lg">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Completing Google sign-in...</span>
      </div>
    </main>
  );
};

export default OAuthCallback;
