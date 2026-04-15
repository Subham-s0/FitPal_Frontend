import { useNavigate } from "react-router-dom";
import Navbar from "@/features/marketing/components/Navbar";
import GymsScreen from "@/features/gyms/screens/GymsScreen";

const PublicGyms = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <div className="pt-14 sm:pt-16 md:pt-20">
        <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
          <GymsScreen
            variant="public"
            onSwitchToCheckIn={() => {
              navigate("/signup");
            }}
          />
        </div>
      </div>
    </main>
  );
};

export default PublicGyms;
