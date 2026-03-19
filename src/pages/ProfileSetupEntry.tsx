import GymProfileSetup from "./GymProfileSetup";
import { UserProfileSetup as ProfileSetup } from "@/features/profile-setup";
import { useAuthState } from "@/hooks/useAuth";

const ProfileSetupEntry = () => {
  const auth = useAuthState();

  return auth.role?.toUpperCase() === "GYM" ? <GymProfileSetup /> : <ProfileSetup />;
};

export default ProfileSetupEntry;
