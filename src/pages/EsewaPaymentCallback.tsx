import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@/api/client";
import {
  confirmEsewaPaymentApi,
  markEsewaPaymentFailureApi,
} from "@/api/payment.api";
import { getMyProfileApi } from "@/api/profile.api";
import { useAuthState } from "@/hooks/useAuth";
import { authStore } from "@/store/auth.store";

const EsewaPaymentCallback = () => {
  const auth = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isSuccessPath = location.pathname.endsWith("/success");
  const paymentAttemptId = searchParams.get("paymentAttemptId");
  const data = searchParams.get("data");
  const failureReason = searchParams.get("reason") ?? searchParams.get("status") ?? undefined;
  const [statusText, setStatusText] = useState(
    isSuccessPath ? "Verifying your eSewa payment..." : "Processing your eSewa payment result..."
  );
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let isCancelled = false;
    let redirectTimer: number | undefined;

    const syncPaymentResult = async () => {
      if (!auth.accessToken) {
        setErrorText("Sign in again to finish verifying this payment result.");
        return;
      }

      if (!paymentAttemptId) {
        setErrorText("Missing payment attempt reference in the callback URL.");
        return;
      }

      const parsedPaymentAttemptId = Number(paymentAttemptId);
      if (!Number.isFinite(parsedPaymentAttemptId)) {
        setErrorText("Invalid payment attempt reference in the callback URL.");
        return;
      }

      if (isSuccessPath && !data) {
        setErrorText("Missing eSewa callback payload.");
        return;
      }

      try {
        const paymentStatus = isSuccessPath
          ? await confirmEsewaPaymentApi({
              paymentAttemptId: parsedPaymentAttemptId,
              data: data!,
            })
          : await markEsewaPaymentFailureApi({
              paymentAttemptId: parsedPaymentAttemptId,
              reason: failureReason,
            });

        const profile = await getMyProfileApi();
        authStore.updateOnboardingStatus({
          profileCompleted: profile.profileCompleted,
          hasSubscription: profile.hasSubscription,
          hasActiveSubscription: profile.hasActiveSubscription,
        });

        if (isCancelled) {
          return;
        }

        if (profile.hasActiveSubscription) {
          setStatusText("Payment verified. Redirecting to your dashboard...");
          redirectTimer = window.setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 1200);
          return;
        }

        setStatusText(
          isSuccessPath
            ? paymentStatus.gatewayResponseMessage || "Payment was received, but the subscription is still pending."
            : "Payment was not completed. Redirecting you back to setup..."
        );
        redirectTimer = window.setTimeout(() => {
          navigate("/profile-setup", { replace: true });
        }, 1600);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setErrorText(getApiErrorMessage(error, "Failed to verify the eSewa payment result."));
      }
    };

    void syncPaymentResult();

    return () => {
      isCancelled = true;
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [auth.accessToken, data, failureReason, isSuccessPath, navigate, paymentAttemptId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-white/10 bg-[#101010] p-8 text-center shadow-[0_20px_80px_-30px_rgba(0,0,0,0.7)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-orange-600/10 text-orange-500">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">
          eSewa Payment
        </p>
        <h1 className="mb-3 text-2xl font-black text-white">
          {errorText ? "Payment Verification Failed" : "Finalizing Membership"}
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          {errorText || statusText}
        </p>
        {errorText && (
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/profile-setup", { replace: true })}
              className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition-all hover:bg-[#dc4e05]"
            >
              Back To Setup
            </button>
            {!auth.accessToken && (
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition-all hover:bg-white/10"
              >
                Sign In
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default EsewaPaymentCallback;
