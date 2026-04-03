import { useEffect } from "react";
import { useAuthState } from "@/features/auth/hooks";
import GymProfileSetupScreen from "@/features/profile/screens/GymProfileSetup";
import UserProfileSetupScreen from "@/features/profile/screens/UserProfileSetup";
import { useNavigate } from "react-router-dom";

const ProfileSetupEntry = () => {
  const auth = useAuthState();
  const navigate = useNavigate();
  const isGymRole = auth.role?.toUpperCase() === "GYM";

  useEffect(() => {
    // Only redirect regular users with active subscriptions
    // Gym users don't require subscriptions
    if (!isGymRole && auth.hasDashboardAccess) {
      navigate("/dashboard", { replace: true });
    }
  }, [isGymRole, auth.hasDashboardAccess, navigate]);

  return isGymRole ? <GymProfileSetupScreen /> : <UserProfileSetupScreen />;
};

export default ProfileSetupEntry;
