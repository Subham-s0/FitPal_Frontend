import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PUBLIC_FRONTEND_MODE } from "@/config/frontend-access";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthState } from "@/hooks/useAuth";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import LoginRegister from "./pages/LoginRegister";
import GymProfile from "./pages/GymProfile";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import OAuthCallback from "./pages/OAuthCallback";
import Logout from "./pages/Logout";
import EsewaPaymentCallback from "./pages/EsewaPaymentCallback";
import { UserProfileSetup as ProfileSetup } from "@/features/profile-setup";
import GymProfileSetup from "./pages/GymProfileSetup";
import ProfileSetupEntry from "./pages/ProfileSetupEntry";
import {
  ADMIN_DASHBOARD_ROUTE,
  PROFILE_SETUP_ROUTE,
  getPostAuthRoute,
  isProfileSetupRoute,
} from "./utils/auth-routing";
import AdminLoginPortal from "./pages/AdminLoginPortal";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuthState();
  const location = useLocation();

  if (!auth.accessToken) {
    if (PUBLIC_FRONTEND_MODE) {
      return <>{children}</>;
    }

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

    if (auth.profileCompleted && !auth.hasActiveSubscription && !isSetupRoute) {
      return <Navigate to={PROFILE_SETUP_ROUTE} replace />;
    }

    if (auth.profileCompleted && auth.hasActiveSubscription && isSetupRoute) {
      return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
  }

  if (!auth.profileCompleted && !isSetupRoute) {
    return <Navigate to={PROFILE_SETUP_ROUTE} replace />;
  }

  if (auth.profileCompleted && isSetupRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuthState();

  if (!auth.accessToken) {
    if (PUBLIC_FRONTEND_MODE) {
      return <>{children}</>;
    }

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
        })}
        replace
      />
    );
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/admin" element={<AdminLoginPortal />} />
          <Route path={ADMIN_DASHBOARD_ROUTE} element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/login" element={<LoginRegister initialMode="login" />} />
          <Route path="/signup" element={<LoginRegister initialMode="register" />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/oauth/validate" element={<OAuthCallback />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/payments/esewa/success" element={<EsewaPaymentCallback />} />
          <Route path="/payments/esewa/failure" element={<EsewaPaymentCallback />} />
          <Route path="/gym/:id" element={<GymProfile />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetupEntry /></ProtectedRoute>} />
          <Route path="/user-profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
          <Route path="/gym-profile-setup" element={<ProtectedRoute><GymProfileSetup /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
