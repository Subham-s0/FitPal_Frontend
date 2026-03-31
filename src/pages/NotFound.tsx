import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthState } from "@/features/auth/hooks";
import {
  ADMIN_DASHBOARD_ROUTE,
  PROFILE_SETUP_ROUTE,
  getPostAuthRoute,
} from "@/features/auth/auth-routing";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthState();
  const redirectTarget = auth.accessToken
    ? getPostAuthRoute({
        role: auth.role,
        profileCompleted: auth.profileCompleted,
        hasSubscription: auth.hasSubscription,
        hasActiveSubscription: auth.hasActiveSubscription,
      })
    : "/";

  const redirectLabel =
    redirectTarget === "/"
      ? "home"
      : redirectTarget === ADMIN_DASHBOARD_ROUTE
        ? "admin dashboard"
        : redirectTarget === PROFILE_SETUP_ROUTE
          ? "profile setup"
          : "dashboard";

  useEffect(() => {
    const attemptedPath = `${location.pathname}${location.search}${location.hash}`;
    console.error("404 Error: User attempted to access non-existent route:", attemptedPath);
  }, [location.hash, location.pathname, location.search]);

  const handleRedirect = () => {
    navigate(redirectTarget, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Page Not Found</h1>
        <p className="mb-6 text-xl text-muted-foreground">The page you requested does not exist.</p>
        <button
          onClick={handleRedirect}
          className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-500"
        >
          {redirectTarget === "/" ? "Return to Home" : `Go to ${redirectLabel[0].toUpperCase()}${redirectLabel.slice(1)}`}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
