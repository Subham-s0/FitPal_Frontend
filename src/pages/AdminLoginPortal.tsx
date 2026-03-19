import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

import { loginApi } from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuthState } from "@/hooks/useAuth";
import { loginSchema, type LoginRequest } from "@/models/auth.model";
import { authStore } from "@/store/auth.store";
import { ADMIN_DASHBOARD_ROUTE } from "@/utils/auth-routing";

const ADMIN_ROLE = "SUPERADMIN";

const AdminLoginPortal = () => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const [showPassword, setShowPassword] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    setFocus("email");
  }, [setFocus]);

  useEffect(() => {
    if (auth.accessToken && auth.role?.toUpperCase() === ADMIN_ROLE) {
      navigate(ADMIN_DASHBOARD_ROUTE, { replace: true });
    }
  }, [auth.accessToken, auth.role, navigate]);

  const adminLogin = useMutation({
    mutationFn: loginApi,
    onSuccess: (response) => {
      if (response.role?.toUpperCase() !== ADMIN_ROLE) {
        authStore.clearAuth();
        setBannerMessage("This account does not have admin access.");
        toast.error("This account does not have admin access.");
        return;
      }

      authStore.setAuth(response);
      setBannerMessage(null);
      toast.success(response.message || "Admin signed in successfully");
      navigate(ADMIN_DASHBOARD_ROUTE, { replace: true });
    },
    onError: (error) => {
      setBannerMessage(getApiErrorMessage(error, "Invalid email or password."));
    },
  });

  const emailRegistration = register("email");
  const passwordRegistration = register("password");
  const showSessionNotice =
    Boolean(auth.accessToken) && auth.role?.toUpperCase() !== ADMIN_ROLE;

  const onSubmit = (values: LoginRequest) => {
    setBannerMessage(null);
    adminLogin.mutate({
      email: values.email.trim(),
      password: values.password,
    });
  };

  const clearSession = () => {
    authStore.clearAuth();
    setBannerMessage(null);
  };

  return (
    <main className="relative flex h-screen items-center justify-center overflow-hidden bg-background px-4 py-4 text-foreground sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,hsla(25,100%,50%,0.15)_0%,hsla(40,100%,50%,0.1)_40%,transparent_70%)] scale-150 md:scale-100" />
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-accent/15 blur-[100px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(hsl(0_0%_20%_/_0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_20%_/_0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <Link
        to="/"
        className="fixed bottom-4 right-4 z-20 inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm transition hover:border-primary/40 hover:text-foreground"
      >
        Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl animate-[fadeIn_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
        <div className="h-[3px] bg-gradient-fire" />

        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto px-6 py-8 sm:px-9 sm:py-10">
              <header className="mb-8 text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/50 px-4 py-2 backdrop-blur-sm">
                  <span className="text-sm text-muted-foreground">FitPal admin access</span>
                </div>

                <img
                  src="/logo.svg"
                  alt="FitPal Logo"
                  className="mx-auto mb-4 h-16 w-16"
                />

                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="text-[1.7rem] font-extrabold">
                    <span className="text-gradient-fire">Fit</span>
                    <span className="text-white">Pal</span>
                  </span>
                  <span className="rounded-md border border-primary/30 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary/80">
                    Admin
                  </span>
                </div>

                <p className="text-sm leading-6 text-muted-foreground">
                  Restricted access - authorized personnel only
                </p>
              </header>

              {showSessionNotice && (
                <div className="mb-5 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground">
                  <p className="font-semibold">Another account is already signed in.</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Current role: {auth.role}. Continue with a super admin account or clear this session first.
                  </p>
                  <button
                    type="button"
                    onClick={clearSession}
                    className="mt-3 inline-flex items-center rounded-full border border-border/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition hover:bg-secondary/50"
                  >
                    Clear Session
                  </button>
                </div>
              )}

              {bannerMessage && (
                <div
                  aria-live="assertive"
                  className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                  <span className="leading-5">{bannerMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="admin-email"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      {...emailRegistration}
                      id="admin-email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@fitpal.com"
                      onChange={(event) => {
                        setBannerMessage(null);
                        emailRegistration.onChange(event);
                      }}
                      className={`w-full rounded-full border bg-input py-3 pl-11 pr-4 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-orange-500/60 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.12)] ${
                        errors.email ? "border-red-500/70" : "border-border"
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="pl-4 pt-2 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      {...passwordRegistration}
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      onChange={(event) => {
                        setBannerMessage(null);
                        passwordRegistration.onChange(event);
                      }}
                      className={`w-full rounded-full border bg-input py-3 pl-11 pr-14 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-orange-500/60 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.12)] ${
                        errors.password ? "border-red-500/70" : "border-border"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="pl-4 pt-2 text-xs text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={adminLogin.isPending}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-6 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_8px_24px_-6px_rgba(249,115,22,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_rgba(249,115,22,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {adminLogin.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In to Admin
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">
                This area is restricted to FitPal administrators. Unauthorized access attempts are logged.
              </p>
        </div>
      </div>

      <p className="pointer-events-none fixed bottom-5 left-1/2 z-10 hidden -translate-x-1/2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40 lg:block">
        FitPal Admin Console
      </p>
    </main>
  );
};

export default AdminLoginPortal;
