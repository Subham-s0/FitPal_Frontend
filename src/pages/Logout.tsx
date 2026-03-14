import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authStore } from "@/store/auth.store";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    authStore.clearAuth();
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      Signing out...
    </div>
  );
};

export default Logout;
