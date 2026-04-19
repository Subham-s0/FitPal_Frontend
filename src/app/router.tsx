import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuthState } from "@/features/auth";
import {
  ADMIN_DASHBOARD_ROUTE,
  GYM_DASHBOARD_ROUTE,
  PROFILE_SETUP_ROUTE,
  getPostAuthRoute,
  isProfileSetupRoute,
} from "@/features/auth";

const Index = lazy(() => import("@/pages/Index"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const PublicGyms = lazy(() => import("@/pages/PublicGyms"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const LoginRegister = lazy(() => import("@/pages/LoginRegister"));
const GymProfile = lazy(() => import("@/pages/gym/GymProfile"));
const Payments = lazy(() => import("@/pages/user/Payments"));
const Profile = lazy(() => import("@/pages/user/Profile"));
const Settings = lazy(() => import("@/pages/user/Settings"));
const Membership = lazy(() => import("@/pages/user/Membership"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const OAuthCallback = lazy(() => import("@/pages/OAuthCallback"));
const Logout = lazy(() => import("@/pages/Logout"));
const EsewaPaymentCallback = lazy(() => import("@/pages/EsewaPaymentCallback"));
const KhaltiPaymentCallback = lazy(() => import("@/pages/KhaltiPaymentCallback"));
const UserProfileSetup = lazy(() => import("@/pages/user/UserProfileSetup"));
const GymProfileSetup = lazy(() => import("@/pages/gym/GymProfileSetup"));
const ProfileSetupEntry = lazy(() => import("@/pages/ProfileSetupEntry"));
const AdminLoginPortal = lazy(() => import("@/pages/admin/AdminLoginPortal"));
const WorkoutSession = lazy(() => import("@/pages/user/WorkoutSession"));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
      Loading FitPal...
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const auth = useAuthState();
  const location = useLocation();

  if (!auth.accessToken) {
    console.warn("Unauthorized access attempt. Redirecting to login.");
    return <Navigate to="/login" replace />;
  }

  const role = auth.role?.toUpperCase();
  const isSetupRoute = isProfileSetupRoute(location.pathname);

  if (role === "SUPERADMIN") {
    return <Navigate to={ADMIN_DASHBOARD_ROUTE} replace />;
  }

  if (isSetupRoute && location.pathname !== PROFILE_SETUP_ROUTE) {
    return <Navigate to={PROFILE_SETUP_ROUTE} replace state={location.state} />;
  }

  if (role === "USER") {
    if (!auth.profileCompleted && !isSetupRoute) {
      return <Navigate to={PROFILE_SETUP_ROUTE} replace />;
    }

    if (auth.profileCompleted && !auth.hasSubscription && !isSetupRoute) {
      return <Navigate to={PROFILE_SETUP_ROUTE} replace />;
    }

    // No live membership (unpaid, pending, or expired): finish or renew via profile setup (plan + payment steps).
    if (auth.profileCompleted && !auth.hasDashboardAccess && !isSetupRoute) {
      return <Navigate to={PROFILE_SETUP_ROUTE} replace />;
    }

    if (auth.profileCompleted && auth.hasDashboardAccess && isSetupRoute) {
      return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
  }

  if (!auth.profileCompleted && !isSetupRoute) {
    return <Navigate to={PROFILE_SETUP_ROUTE} replace />;
  }

  if (auth.profileCompleted && isSetupRoute) {
    return <Navigate to={role === "GYM" ? GYM_DASHBOARD_ROUTE : "/dashboard"} replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const auth = useAuthState();

  if (!auth.accessToken) {
    return <Navigate to="/admin" replace />;
  }

  if (auth.role?.toUpperCase() !== "SUPERADMIN") {
    return (
      <Navigate
        to={getPostAuthRoute({
          role: auth.role,
          profileCompleted: auth.profileCompleted,
          hasSubscription: auth.hasSubscription,
          hasActiveSubscription: auth.hasActiveSubscription,
          hasDashboardAccess: auth.hasDashboardAccess,
        })}
        replace
      />
    );
  }

  return <>{children}</>;
};

const GymsRoute = () => {
  const auth = useAuthState();

  if (!auth.accessToken) {
    return <PublicGyms />;
  }

  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
};

export const resolveDocumentTitle = (pathname: string) => {
  if (pathname === "/") {
    return "FitPal";
  }

  if (pathname === "/admin") {
    return "FitPal | Admin";
  }

  if (pathname === ADMIN_DASHBOARD_ROUTE) {
    return "FitPal | Admin Dashboard";
  }

  if (pathname === "/login") {
    return "FitPal | Login";
  }

  if (pathname === "/signup" || pathname === "/register") {
    return "FitPal | Sign Up";
  }

  if (pathname === "/dashboard") {
    return "FitPal | Dashboard";
  }

  if (pathname === GYM_DASHBOARD_ROUTE) {
    return "FitPal | Gym Dashboard";
  }

  if (pathname === "/gyms") {
    return "FitPal | Gyms";
  }

  if (pathname === "/routines") {
    return "FitPal | Routines";
  }

  if (pathname === "/exercises") {
    return "FitPal | Exercises";
  }

  if (pathname === "/workouts") {
    return "FitPal | Workouts";
  }

  if (pathname === "/notifications") {
    return "FitPal | Notifications";
  }

  if (pathname === "/check-ins" || pathname === "/checkin") {
    return "FitPal | Check-Ins";
  }

  if (pathname === "/profile") {
    return "FitPal | Profile";
  }

  if (pathname === "/settings") {
    return "FitPal | Settings";
  }

  if (pathname === "/membership" || pathname === "/membership/upgrade") {
    return "FitPal | Membership";
  }

  if (
    pathname === "/payments" ||
    pathname.startsWith("/payments/esewa/") ||
    pathname.startsWith("/payments/khalti/")
  ) {
    return "FitPal | Payments";
  }

  if (
    pathname === PROFILE_SETUP_ROUTE ||
    pathname === "/user-profile-setup" ||
    pathname === "/gym-profile-setup"
  ) {
    return "FitPal | Profile Setup";
  }

  if (pathname.startsWith("/gym/")) {
    return "FitPal | Gym";
  }

  if (pathname.startsWith("/workout-session/")) {
    return "FitPal | Workout Session";
  }

  return "FitPal";
};

const RouteTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = resolveDocumentTitle(location.pathname);
  }, [location.pathname]);

  return null;
};

const AppRouter = () => (
  <BrowserRouter>
    <RouteTitleManager />
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<AdminLoginPortal />} />
        <Route
          path={ADMIN_DASHBOARD_ROUTE}
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="/login" element={<LoginRegister initialMode="login" />} />
        <Route path="/signup" element={<LoginRegister initialMode="register" />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/oauth/validate" element={<OAuthCallback />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/payments/esewa/success" element={<EsewaPaymentCallback />} />
        <Route path="/payments/esewa/success/:paymentAttemptId" element={<EsewaPaymentCallback />} />
        <Route path="/payments/esewa/failure" element={<EsewaPaymentCallback />} />
        <Route path="/payments/esewa/failure/:paymentAttemptId" element={<EsewaPaymentCallback />} />
        <Route path="/payments/khalti/return" element={<KhaltiPaymentCallback />} />
        <Route path="/payments/khalti/return/:paymentAttemptId" element={<KhaltiPaymentCallback />} />

        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path={GYM_DASHBOARD_ROUTE}
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gym/:id"
          element={<GymProfile />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/gyms" element={<GymsRoute />} />
        {["/routines", "/exercises", "/workouts", "/notifications", "/check-ins"].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        ))}
        <Route path="/checkin" element={<Navigate to="/check-ins" replace />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/membership"
          element={
            <ProtectedRoute>
              <Membership />
            </ProtectedRoute>
          }
        />
        <Route path="/membership/upgrade" element={<Navigate to="/membership" replace />} />
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute>
              <ProfileSetupEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-profile-setup"
          element={
            <ProtectedRoute>
              <UserProfileSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gym-profile-setup"
          element={
            <ProtectedRoute>
              <GymProfileSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workout-session/:routineLogId"
          element={
            <ProtectedRoute>
              <WorkoutSession />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;
