import { Navigate, useLocation } from "react-router-dom";
import { useAuthState } from "@/features/auth/hooks";
import { GYM_DASHBOARD_ROUTE } from "@/features/auth";
import { getDashboardRole } from "@/shared/layout/dashboard-shell";
import GymDashboardScreen from "@/features/gym-dashboard/screens/GymDashboard";
import UserDashboardScreen from "@/features/user-dashboard/screens/UserDashboard";

const Dashboard = () => {
  const auth = useAuthState();
  const location = useLocation();
  const dashboardRole = getDashboardRole(auth.role);

  if (dashboardRole === "ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (dashboardRole === "GYM" && location.pathname !== GYM_DASHBOARD_ROUTE) {
    return <Navigate to={GYM_DASHBOARD_ROUTE} replace state={location.state} />;
  }

  return dashboardRole === "GYM" ? <GymDashboardScreen /> : <UserDashboardScreen />;
};

export default Dashboard;
