import { Navigate } from "react-router-dom";
import { useAuthState } from "@/features/auth/hooks";
import { getDashboardRole } from "@/shared/layout/dashboard-shell";
import GymDashboardScreen from "@/features/gym-dashboard/screens/GymDashboard";
import UserDashboardScreen from "@/features/user-dashboard/screens/UserDashboard";

const Dashboard = () => {
  const auth = useAuthState();
  const dashboardRole = getDashboardRole(auth.role);

  if (dashboardRole === "ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return dashboardRole === "GYM" ? <GymDashboardScreen /> : <UserDashboardScreen />;
};

export default Dashboard;
