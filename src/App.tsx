import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

const queryClient = new QueryClient();
const DISABLE_ROUTE_GUARDS = true;

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuthState();

  if (DISABLE_ROUTE_GUARDS) {
    return <>{children}</>;
  }
  
  if (!auth.accessToken) {
    console.warn("Unauthorized access attempt. Redirecting to login.");
    return <Navigate to="/login" replace />;
  }

  // If we need profile completion but it's not done, redirect to setup
  if (!auth.profileCompleted && window.location.pathname !== "/profile-setup") {
    return <Navigate to="/profile-setup" replace />;
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
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginRegister initialMode="login" />} />
          <Route path="/signup" element={<LoginRegister initialMode="register" />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/oauth/validate" element={<OAuthCallback />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/gym/:id" element={<GymProfile />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/profile-setup" element={<ProtectedRoute><div className="flex bg-background min-h-screen text-foreground items-center justify-center p-8">Complete your profile (Implementation Pending)</div></ProtectedRoute>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
