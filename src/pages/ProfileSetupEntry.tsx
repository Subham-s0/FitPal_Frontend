import { useEffect } from "react";
import GymProfileSetup from "./GymProfileSetup";
import { UserProfileSetup as ProfileSetup } from "@/features/profile-setup";
import { useAuthState } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const ProfileSetupEntry = () => {
  const auth = useAuthState();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect regular users with active subscriptions
    // Gym users don't require subscriptions
    if (auth.role?.toUpperCase() !== "GYM" && auth.hasActiveSubscription) {
      navigate("/dashboard", { replace: true });
    }
  }, [auth.role, auth.hasActiveSubscription, navigate]);

  return auth.role?.toUpperCase() === "GYM" ? <GymProfileSetup /> : <ProfileSetup />;
};

export default ProfileSetupEntry;
