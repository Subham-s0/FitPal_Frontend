import { useEffect } from "react";
import GymProfileSetup from "./gym/GymProfileSetup";
import { default as ProfileSetup } from "@/pages/user/UserProfileSetup";
import { useAuthState } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const ProfileSetupEntry = () => {
  const auth = useAuthState();
  const navigate = useNavigate();
  const isGymRole = auth.role?.toUpperCase() === "GYM";

  useEffect(() => {
    // Only redirect regular users with active subscriptions
    // Gym users don't require subscriptions
    if (!isGymRole && auth.hasActiveSubscription) {
      navigate("/dashboard", { replace: true });
    }
  }, [isGymRole, auth.hasActiveSubscription, navigate]);

  return isGymRole ? <GymProfileSetup /> : <ProfileSetup />;
};

export default ProfileSetupEntry;
