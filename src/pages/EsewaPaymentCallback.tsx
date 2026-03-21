import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { confirmEsewaPaymentApi, markEsewaPaymentFailureApi } from "@/api/payment.api";
import { getMyProfileApi } from "@/api/profile.api";

type Status = "loading" | "success" | "failure";

const STEP_LABELS = ["Payment sent to eSewa", "Verifying with FitPal", "Activating membership"];

const CheckIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" stroke="#22c55e" strokeWidth="1.5" />
    <path d="M9 16.5l4.5 4.5 9-9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" stroke="#ef4444" strokeWidth="1.5" />
    <path d="M11 11l10 10M21 11l-10 10" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EsewaPaymentCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { paymentAttemptId: paymentAttemptIdParam } = useParams<{ paymentAttemptId?: string }>();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("Payment could not be verified.");

  useEffect(() => {
    const process = async () => {
      const isSuccessPath = location.pathname.includes("/payments/esewa/success");
      const paymentAttemptId = paymentAttemptIdParam ?? searchParams.get("paymentAttemptId");
      const data = searchParams.get("data");
      const failureReason =
        searchParams.get("reason") ?? searchParams.get("status") ?? undefined;

      if (!paymentAttemptId) {
        setErrorMessage("Missing payment information.");
        setStatus("failure");
        return;
      }

      const parsed = Number(paymentAttemptId);
      if (!Number.isFinite(parsed)) {
        setErrorMessage("Invalid payment information.");
        setStatus("failure");
        return;
      }

      try {
        if (isSuccessPath) {
          if (!data) {
            setErrorMessage("Missing payment data from eSewa.");
            setStatus("failure");
            return;
          }
          await confirmEsewaPaymentApi({ paymentAttemptId: parsed, data });
        } else {
          await markEsewaPaymentFailureApi({
            paymentAttemptId: parsed,
            reason: failureReason,
          });
          setStatus("failure");
          return;
        }

        const profile = await getMyProfileApi();
        setStatus("success");

        setTimeout(() => {
          navigate(
            profile.hasActiveSubscription ? "/dashboard" : "/profile-setup",
            { replace: true }
          );
        }, 2000);
      } catch (err: any) {
        setErrorMessage(err?.message ?? "Payment verification failed.");
        setStatus("failure");
      }
    };

    void process();
  }, [location.pathname, navigate, paymentAttemptIdParam, searchParams]);

  const stepState = (i: number): "done" | "active" | "pending" => {
    if (status === "loading") {
      if (i === 0) return "done";
      if (i === 1) return "active";
      return "pending";
    }
    if (status === "success") return "done";
    if (i === 0) return "done";
    return "pending";
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(234,88,12,0.09) 0%, transparent 65%), #050505",
      }}
    >
      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-[1.75rem] border border-white/[0.07]"
        style={{ background: "rgba(17,17,17,0.97)" }}
      >
        {/* fire bar */}
        <div className="h-[3px] bg-[linear-gradient(90deg,#FF6A00,#FF9500,#FF6A00)]" />

        <div className="px-8 py-10">

          {/* icon ring */}
          <div
            className={`mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full border ${
              status === "loading"
                ? "border-orange-600/25 bg-orange-600/10"
                : status === "success"
                ? "border-green-500/25 bg-green-500/10"
                : "border-red-500/25 bg-red-500/10"
            }`}
          >
            {status === "loading" && (
              <div className="h-8 w-8 animate-spin rounded-full border-[2.5px] border-orange-600/20 border-t-orange-600" />
            )}
            {status === "success" && <CheckIcon />}
            {status === "failure" && <XIcon />}
          </div>

          {/* badge */}
          <div className="mb-5 flex justify-center">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                status === "loading"
                  ? "border-orange-600/25 text-orange-400"
                  : status === "success"
                  ? "border-green-500/25 text-green-400"
                  : "border-red-500/25 text-red-400"
              }`}
            >
              <span
                className={`h-[5px] w-[5px] rounded-full ${
                  status === "loading"
                    ? "animate-pulse bg-orange-500"
                    : status === "success"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              {status === "loading"
                ? "eSewa payment"
                : status === "success"
                ? "Payment confirmed"
                : "Payment failed"}
            </div>
          </div>

          {/* title */}
          <p className="mb-2 text-center text-[1.2rem] font-black text-white">
            {status === "loading"
              ? "Verifying your payment"
              : status === "success"
              ? "Membership activated!"
              : "Payment unsuccessful"}
          </p>

          {/* subtitle */}
          <p className="mb-5 text-center text-[0.8rem] leading-relaxed text-slate-400">
            {status === "loading"
              ? "Please wait, do not close or refresh this page."
              : status === "success"
              ? "Your FitPal subscription is now active. Redirecting to your dashboard shortly."
              : "Your payment could not be verified. No charge has been made."}
          </p>

          {/* loading shimmer bar */}
          {status === "loading" && (
            <div className="mb-5 h-[3px] overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#FF6A00,#FF9500)]"
                style={{ animation: "shimmer 2.4s ease-in-out infinite" }}
              />
            </div>
          )}

          {/* status detail box */}
          {status === "success" && (
            <div className="mb-4 rounded-[0.85rem] border border-green-500/15 bg-green-500/[0.06] px-4 py-2.5 text-center text-[0.72rem] leading-relaxed text-green-300">
              Subscription active — redirecting in 2 seconds
            </div>
          )}
          {status === "failure" && (
            <div className="mb-4 rounded-[0.85rem] border border-red-500/15 bg-red-500/[0.06] px-4 py-2.5 text-center text-[0.72rem] leading-relaxed text-red-300">
              {errorMessage}
            </div>
          )}

          {/* step tracker */}
          <div className="mb-1 flex flex-col gap-1.5">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-[0.85rem] border border-white/[0.04] bg-white/[0.025] px-3.5 py-2.5"
              >
                <span
                  className={`h-[7px] w-[7px] flex-shrink-0 rounded-full transition-all ${
                    stepState(i) === "done"
                      ? "bg-orange-600"
                      : stepState(i) === "active"
                      ? "bg-orange-400"
                      : "bg-white/10"
                  }`}
                  style={
                    stepState(i) === "active"
                      ? { animation: "pulse 1.2s ease-in-out infinite", boxShadow: "0 0 0 3px rgba(234,88,12,0.2)" }
                      : undefined
                  }
                />
                <span
                  className={`text-[0.72rem] font-semibold ${
                    stepState(i) === "active" ? "text-orange-400" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* failure actions */}
          {status === "failure" && (
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => navigate("/profile-setup", { replace: true })}
                className="w-full rounded-full bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-6 py-3 text-[0.78rem] font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_24px_-6px_rgba(249,115,22,0.35)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_28px_-6px_rgba(249,115,22,0.4)]"
              >
                Try again →
              </button>
              <button
                onClick={() => navigate("/profile-setup", { replace: true })}
                className="group flex w-full items-center justify-center rounded-full border border-[hsla(30,100%,50%,0.2)] bg-[hsla(30,100%,50%,0.05)] px-6 py-3 backdrop-blur-xl transition-all duration-300 hover:bg-[hsla(30,100%,50%,0.1)]"
              >
                <span className="text-xs font-black uppercase leading-none tracking-widest text-white transition-colors group-hover:text-orange-500">
                  Back to Profile Setup
                </span>
              </button>
            </div>
          )}
        </div>

        {/* footer */}
        <p className="pb-5 text-center text-[0.65rem] uppercase tracking-[0.12em] text-slate-700">
          FitPal · Secure checkout via eSewa
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </main>
  );
};

export default EsewaPaymentCallback;
