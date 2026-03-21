import { Navigate } from "react-router-dom";
import { useAuthState } from "@/hooks/useAuth";
import { getDashboardRole } from "@/components/dashboard-shell-config";
import GymDashboard from "@/pages/gym/GymDashboard";
import UserDashboard from "@/pages/user/UserDashboard";

const Dashboard = () => {
  const auth = useAuthState();
  const dashboardRole = getDashboardRole(auth.role);

  if (dashboardRole === "ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return dashboardRole === "GYM" ? <GymDashboard /> : <UserDashboard />;
};

export default Dashboard;
