import { useState, useEffect } from "react";
import {
  Dumbbell,
  Activity,
  Timer,
  Trophy,
  Heart,
  Zap,
  Flame,
  BicepsFlexed,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerUserSchema, registerGymSchema } from "@/features/auth/model";
import type { AuthResponse, LoginRequest, RegisterGymRequest, RegisterUserRequest } from "@/features/auth/model";
import type { ApiErrorResponse } from "@/shared/api/model";
import { getApiErrorMessage } from "@/shared/api/client";
import { buildGoogleOAuthStartUrl } from "@/shared/api/config";
import { useLogin, useRegisterUser, useRegisterGym, useAuthState } from "@/features/auth/hooks";
import { authStore } from "@/features/auth/store";
import { getPostAuthRoute } from "@/features/auth/auth-routing";
import { toast } from "sonner";
import ProfileSecurityModal from "@/features/profile/components/ProfileSecurityModal";

type Mode = "login" | "register";
type UserType = "user" | "gym";
const OAUTH_MESSAGE_TYPE = "FITPAL_OAUTH_RESULT";

interface Props {
  initialMode?: Mode;
}

const LoginRegister = ({ initialMode = "login" }: Props) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [userType, setUserType] = useState<UserType>("user");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const auth = useAuthState();
  const isLoginMode = mode === "login";

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const hasAccessToken = Boolean(auth.accessToken);

    if (!hasAccessToken) {
      return;
    }

    navigate(
      getPostAuthRoute({
        role: auth.role,
        profileCompleted: auth.profileCompleted,
        hasSubscription: auth.hasSubscription,
        hasActiveSubscription: auth.hasActiveSubscription,
        hasDashboardAccess: auth.hasDashboardAccess,
      })
    );

  }, [auth.accessToken, auth.hasActiveSubscription, auth.hasDashboardAccess, auth.hasSubscription, auth.profileCompleted, auth.role, navigate]);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data as {
        type?: string;
        auth?: AuthResponse | null;
        error?: ApiErrorResponse | null;
      };

      if (payload?.type !== OAUTH_MESSAGE_TYPE) {
        return;
      }

      if (payload.auth?.accessToken) {
        authStore.setAuth(payload.auth);
        navigate(
          getPostAuthRoute({
            role: payload.auth.role,
            profileCompleted: payload.auth.profileCompleted,
            hasSubscription: payload.auth.hasSubscription,
            hasActiveSubscription: payload.auth.hasActiveSubscription,
            hasDashboardAccess: payload.auth.hasDashboardAccess,
          })
        );
        window.setTimeout(() => {
          toast.success(payload.auth?.message || "Signed in successfully");
        }, 0);
        return;
      }

      if (payload.error) {
        const message = payload.error.details[0] || payload.error.message || "Google sign-in failed";
        toast.error(message);
        return;
      }

      toast.error("Invalid Google authentication response");
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [navigate]);

  // Mutations
  const { mutate: login, isPending: isLoggingIn } = useLogin();
  const { mutate: registerUser, isPending: isRegisteringUser } = useRegisterUser();
  const { mutate: registerGym, isPending: isRegisteringGym } = useRegisterGym();

  const isRegistering = isRegisteringUser || isRegisteringGym;

  // Forms
  const loginForm = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerUserForm = useForm<RegisterUserRequest>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", userName: "" },
  });

  const registerGymForm = useForm<RegisterGymRequest>({
    resolver: zodResolver(registerGymSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", gymName: "" },
  });
  const loginEmail = loginForm.watch("email");

  const onLoginSubmit = (data: LoginRequest) => {
    login(data, {
      onSuccess: (response) => {
        toast.success("Welcome back!");
        navigate(
          getPostAuthRoute({
            role: response.role,
            profileCompleted: response.profileCompleted,
            hasSubscription: response.hasSubscription,
            hasActiveSubscription: response.hasActiveSubscription,
            hasDashboardAccess: response.hasDashboardAccess,
          }),
          { replace: true }
        );
      },
      onError: (error) => toast.error(getApiErrorMessage(error, "Failed to sign in")),
    });
  };

  const onRegisterUserSubmit = (data: RegisterUserRequest) => {
    registerUser(data, {
      onSuccess: (response) => {
        toast.success("Account created successfully!");
        navigate(
          getPostAuthRoute({
            role: response.role,
            profileCompleted: response.profileCompleted,
            hasSubscription: response.hasSubscription,
            hasActiveSubscription: response.hasActiveSubscription,
            hasDashboardAccess: response.hasDashboardAccess,
          }),
          { replace: true }
        );
      },
      onError: (error) => toast.error(getApiErrorMessage(error, "Registration failed")),
    });
  };

  const onRegisterGymSubmit = (data: RegisterGymRequest) => {
    registerGym(data, {
      onSuccess: (response) => {
        toast.success("Gym account created successfully!");
        navigate(
          getPostAuthRoute({
            role: response.role,
            profileCompleted: response.profileCompleted,
            hasSubscription: response.hasSubscription,
            hasActiveSubscription: response.hasActiveSubscription,
            hasDashboardAccess: response.hasDashboardAccess,
          }),
          { replace: true }
        );
      },
      onError: (error) => toast.error(getApiErrorMessage(error, "Registration failed")),
    });
  };

  const handleGoogleLogin = () => {
    if (mode === "register" && userType === "gym") {
      toast.info("Google sign-up is only available for user accounts. Please register gyms with email and password.");
      return;
    }

    const googleOAuthStartUrl = buildGoogleOAuthStartUrl(window.location.origin);
    const width = 520;
    const height = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popup = window.open(
      googleOAuthStartUrl,
      "fitpal-google-oauth",
      `width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      window.location.assign(googleOAuthStartUrl);
      return;
    }

    popup.focus();
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="relative flex min-h-screen items-start justify-center overflow-hidden px-3 py-4 sm:px-6 sm:py-8 md:items-center md:p-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* HSL Gradient & Blur Layers */}
          <div className="absolute inset-0 bg-background overflow-hidden">
             {/* Deep Orange Gradient Base */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,hsla(30,100%,20%,0.2),hsla(0,0%,0%,0))]" />
            
            {/* Orbiting Icons & Emojis Container */}
            <div className="absolute inset-0 hidden overflow-hidden perspective-[1000px] md:block">
              
              {/* Outer Orbit Ring (Counter-Clockwise) */}
              <div className="absolute inset-0 animate-[spin-90_60s_linear_infinite_reverse] opacity-30">
                 {/* Top Left */}
                 <div className="absolute top-[10%] left-[10%] transform -rotate-12 hover:scale-125 transition-transform duration-500">
                    <span className="text-6xl filter drop-shadow-[0_0_10px_hsla(30,100%,50%,0.5)]">💪</span>
                 </div>
                 {/* Bottom Right */}
                 <div className="absolute bottom-[15%] right-[10%] transform rotate-12 hover:scale-125 transition-transform duration-500">
                    <span className="text-6xl filter drop-shadow-[0_0_10px_hsla(15,100%,50%,0.5)]">🔥</span>
                 </div>
                 {/* Top Right */}
                 <div className="absolute top-[20%] right-[20%]">
                    <Dumbbell className="w-24 h-24 text-[hsla(30,100%,60%,0.4)] drop-shadow-[0_0_15px_hsla(30,100%,50%,0.3)]" />
                 </div>
                 {/* Bottom Left */}
                 <div className="absolute bottom-[25%] left-[5%]">
                    <Activity className="w-32 h-32 text-[hsla(15,100%,60%,0.2)] drop-shadow-[0_0_15px_hsla(15,100%,50%,0.2)]" />
                 </div>
              </div>

              {/* Inner Orbit Ring (Clockwise) */}
              <div className="absolute inset-[10%] animate-[spin-90_45s_linear_infinite] opacity-40">
                 {/* Top */}
                 <div className="absolute top-0 left-[50%] -translate-x-1/2">
                    <span className="text-5xl filter drop-shadow-[0_0_8px_hsla(40,100%,60%,0.5)]">🏃</span>
                 </div>
                 {/* Right */}
                 <div className="absolute top-[50%] right-0 -translate-y-1/2">
                    <Timer className="w-20 h-20 text-[hsla(35,100%,60%,0.5)] drop-shadow-[0_0_12px_hsla(35,100%,50%,0.4)]" />
                 </div>
                 {/* Bottom */}
                 <div className="absolute bottom-0 left-[50%] -translate-x-1/2">
                    <span className="text-5xl filter drop-shadow-[0_0_8px_hsla(25,100%,60%,0.5)]">🧡</span>
                 </div>
                 {/* Left */}
                 <div className="absolute top-[50%] left-0 -translate-y-1/2">
                    <Zap className="w-16 h-16 text-[hsla(45,100%,60%,0.6)] drop-shadow-[0_0_12px_hsla(45,100%,50%,0.5)]" />
                 </div>
              </div>

               {/* Floating Random Elements (Edges) */}
               <div className="absolute top-[5%] left-[5%] animate-bounce [animation-duration:4s]">
                  <Flame className="w-12 h-12 text-[hsla(0,100%,60%,0.5)] blur-[1px]" />
               </div>
               <div className="absolute bottom-[10%] right-[5%] animate-bounce [animation-duration:5s]">
                  <Trophy className="w-16 h-16 text-[hsla(50,100%,50%,0.4)] blur-[1px]" />
               </div>

               <div className="absolute bottom-[5%] left-[15%] animate-pulse [animation-duration:6s]">
                   <BicepsFlexed className="w-14 h-14 text-[hsla(280,50%,60%,0.3)] blur-[2px]" />
               </div>
               <div className="absolute top-[25%] right-[8%] animate-bounce [animation-duration:4.5s]">
                  <Heart className="w-12 h-12 text-[hsla(340,100%,60%,0.4)] blur-[1px]" />
               </div>
               <div className="absolute top-[12%] left-[40%] animate-pulse [animation-duration:7s]">
                   <span className="text-4xl opacity-40 filter drop-shadow-[0_0_5px_hsla(200,100%,50%,0.5)]">💧</span>
               </div>

               {/* Mid-ground Fixed Rotating Elements (Dumbbells & More) */}
               <div className="absolute top-[35%] left-[18%] animate-[spin-90_10s_linear_infinite]">
                  <Dumbbell className="w-12 h-12 text-[hsla(25,100%,60%,0.2)] drop-shadow-[0_0_8px_hsla(25,100%,50%,0.2)]" />
               </div>
               <div className="absolute bottom-[45%] right-[22%] animate-[spin-90_15s_linear_infinite_reverse]">
                  <Dumbbell className="w-16 h-16 text-[hsla(35,100%,60%,0.15)] drop-shadow-[0_0_8px_hsla(35,100%,50%,0.2)]" />
               </div>
               <div className="absolute top-[65%] right-[15%] animate-[spin-90_20s_linear_infinite]">
                  <Activity className="w-10 h-10 text-[hsla(45,100%,50%,0.2)]" />
               </div>
               <div className="absolute bottom-[30%] left-[8%] animate-[spin-90_12s_linear_infinite_reverse]">
                   <BicepsFlexed className="w-14 h-14 text-[hsla(280,50%,60%,0.3)] blur-[1px]" />
               </div>
               
               {/* Additional Spinning Dumbbells */}
               <div className="absolute top-[15%] right-[35%] animate-[spin-90_18s_linear_infinite]">
                  <Dumbbell className="w-10 h-10 text-[hsla(25,100%,60%,0.15)] drop-shadow-[0_0_8px_hsla(25,100%,50%,0.2)]" />
               </div>
               <div className="absolute bottom-[15%] left-[40%] animate-[spin-90_22s_linear_infinite_reverse]">
                  <Dumbbell className="w-14 h-14 text-[hsla(35,100%,60%,0.1)] drop-shadow-[0_0_8px_hsla(35,100%,50%,0.2)]" />
               </div>
               <div className="absolute top-[60%] left-[10%] animate-[spin-90_14s_linear_infinite]">
                  <Dumbbell className="w-12 h-12 text-[hsla(30,100%,60%,0.18)] drop-shadow-[0_0_8px_hsla(30,100%,50%,0.2)]" />
               </div>

            </div>
          </div>
        </div>

        <div className="relative w-full max-w-[30rem] sm:max-w-2xl md:max-w-5xl">
          <div className="bg-card border border-border rounded-[1.25rem] shadow-2xl overflow-hidden sm:rounded-2xl">
            <div className="grid md:grid-cols-2">
              <div className={`relative ${isLoginMode ? "order-2 md:order-1" : "order-1"}`}>
                {isLoginMode ? (
                  <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[linear-gradient(145deg,hsl(0_0%_10%),hsl(0_0%_6%))] p-6 sm:p-10 md:p-12">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(25_100%_50%/.15),transparent_50%)]" />
                    <div className="relative z-10 text-center">
                      <img src="/logo.svg" alt="FitPal Logo" className="mx-auto mb-4 h-16 w-16 sm:mb-6 sm:h-24 sm:w-24" />
                      <h2 className="mb-2 text-3xl font-bold sm:text-4xl">
                        <span className="text-gradient-fire">Fit</span>
                        <span className="text-white">Pal</span>
                      </h2>
                      <h3 className="mb-3 text-2xl font-bold text-white sm:mb-4 sm:text-3xl">Welcome Back!</h3>
                      <p className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8 sm:text-lg">
                        Access your <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent font-semibold">FitPass Hub</span> dashboard to manage workouts, subscriptions, and more.
                      </p>
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-sm text-foreground sm:text-base">Real-time gym access</span>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-sm text-foreground sm:text-base">Manage your membership</span>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-sm text-foreground sm:text-base">Track fitness progress</span>
                        </div>
                      </div>
                    </div>
                    
                    <Link
                      to="/"
                      className="group relative z-20 mt-8 inline-flex self-center md:absolute md:bottom-6 md:left-6 md:mt-0"
                      aria-label="Go to Home"
                    >
                      <div className="flex items-center justify-center rounded-full border border-[hsla(30,100%,50%,0.2)] bg-[hsla(30,100%,50%,0.05)] px-4 py-2.5 backdrop-blur-xl transition-all duration-300 hover:bg-[hsla(30,100%,50%,0.1)] sm:px-6 sm:py-3">
                        <span className="text-[11px] font-black uppercase leading-none tracking-[0.18em] text-white transition-colors group-hover:text-orange-500 sm:text-xs sm:tracking-widest">Home</span>
                      </div>
                    </Link>
                  </div>
                ) : (
                  <div className="p-4 sm:p-6 md:p-8">
                    <div className="mb-5 text-center sm:mb-6">
                      <h3 className="mb-2 text-xl font-bold text-white sm:text-2xl">Create Account</h3>
                      <p className="text-muted-foreground text-sm">Join the FitPass Hub community today.</p>
                    </div>
                    <div className="relative mb-5 flex w-full rounded-full border-2 border-[#FF6A00] bg-transparent sm:mb-6">
                      <div
                        className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-[#FF6A00] transition-transform duration-500 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)]"
                        style={{
                          transform: `translateX(${userType === "gym" ? "100%" : "0%"})`
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setUserType("user")}
                        className={`relative z-10 w-1/2 rounded-full py-2 text-xs font-semibold transition-colors duration-500 sm:py-2.5 sm:text-sm ${
                          userType === "user" ? "text-white" : "text-white/70 hover:text-white"
                        }`}
                      >
                        User
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserType("gym")}
                        className={`relative z-10 w-1/2 rounded-full py-2 text-xs font-semibold transition-colors duration-500 sm:py-2.5 sm:text-sm ${
                          userType === "gym" ? "text-white" : "text-white/70 hover:text-white"
                        }`}
                      >
                        Gym
                      </button>
                    </div>
                    
                    <form 
                      onSubmit={userType === "user" ? registerUserForm.handleSubmit(onRegisterUserSubmit) : registerGymForm.handleSubmit(onRegisterGymSubmit)}
                      className="space-y-3"
                    >
                      {userType === "user" ? (
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1.5">Username</label>
                          <input 
                            {...registerUserForm.register("userName")}
                            type="text" 
                            className={`w-full px-3 py-2 bg-input border rounded-full text-foreground text-sm ${registerUserForm.formState.errors.userName ? "border-red-500" : "border-border"}`} 
                            placeholder="johndoe123" 
                          />
                          {registerUserForm.formState.errors.userName && (
                            <p className="text-[10px] text-red-500 mt-1 pl-3">{registerUserForm.formState.errors.userName.message}</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1.5">Gym Name</label>
                          <input 
                            {...registerGymForm.register("gymName")}
                            type="text" 
                            className={`w-full px-3 py-2 bg-input border rounded-full text-foreground text-sm ${registerGymForm.formState.errors.gymName ? "border-red-500" : "border-border"}`} 
                            placeholder="FitZone Gym" 
                          />
                          {registerGymForm.formState.errors.gymName && (
                            <p className="text-[10px] text-red-500 mt-1 pl-3">{registerGymForm.formState.errors.gymName.message}</p>
                          )}
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1.5">Email</label>
                        <input 
                          {...(userType === "user" ? registerUserForm.register("email") : registerGymForm.register("email"))}
                          type="email" 
                          className={`w-full px-3 py-2 bg-input border rounded-full text-foreground text-sm ${(userType === "user" ? registerUserForm.formState.errors.email : registerGymForm.formState.errors.email) ? "border-red-500" : "border-border"}`} 
                          placeholder="you@example.com" 
                        />
                        {(userType === "user" ? registerUserForm.formState.errors.email : registerGymForm.formState.errors.email) && (
                           <p className="text-[10px] text-red-500 mt-1 pl-3">{(userType === "user" ? registerUserForm.formState.errors.email : registerGymForm.formState.errors.email)?.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            {...(userType === "user" ? registerUserForm.register("password") : registerGymForm.register("password"))}
                            type={showRegisterPassword ? "text" : "password"}
                            className={`w-full px-3 py-2 pr-10 bg-input border rounded-full text-foreground text-sm ${(userType === "user" ? registerUserForm.formState.errors.password : registerGymForm.formState.errors.password) ? "border-red-500" : "border-border"}`} 
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword((current) => !current)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                          >
                            {showRegisterPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {(userType === "user" ? registerUserForm.formState.errors.password : registerGymForm.formState.errors.password) && (
                           <p className="text-[10px] text-red-500 mt-1 pl-3">{(userType === "user" ? registerUserForm.formState.errors.password : registerGymForm.formState.errors.password)?.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1.5">Confirm Password</label>
                        <div className="relative">
                          <input
                            {...(userType === "user" ? registerUserForm.register("confirmPassword") : registerGymForm.register("confirmPassword"))}
                            type={showRegisterConfirmPassword ? "text" : "password"}
                            className={`w-full px-3 py-2 pr-10 bg-input border rounded-full text-foreground text-sm ${(userType === "user" ? registerUserForm.formState.errors.confirmPassword : registerGymForm.formState.errors.confirmPassword) ? "border-red-500" : "border-border"}`} 
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterConfirmPassword((current) => !current)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={showRegisterConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          >
                            {showRegisterConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {(userType === "user" ? registerUserForm.formState.errors.confirmPassword : registerGymForm.formState.errors.confirmPassword) && (
                           <p className="text-[10px] text-red-500 mt-1 pl-3">{(userType === "user" ? registerUserForm.formState.errors.confirmPassword : registerGymForm.formState.errors.confirmPassword)?.message}</p>
                        )}
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={isRegistering}
                        className="w-full py-2.5 px-6 bg-button-gradient text-white rounded-full font-bold transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
                      >
                        {isRegistering ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                        ) : (
                          "Create Account"
                        )}
                      </button>
                      
                      {userType === "user" ? (
                        <>
                          <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                              <span className="px-4 bg-card text-muted-foreground">Or</span>
                            </div>
                          </div>
                          
                          <button 
                            type="button" 
                            onClick={handleGoogleLogin}
                            className="w-full py-2.5 px-6 border border-[#FF6A00]/50 text-white rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:bg-[#FF6A00]/10 text-sm"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                              <path fill="#4285F4" d="M21.35 11.1c0-.72-.06-1.24-.19-1.78H12v3.22h5.32c-.11.9-.72 2.25-2.08 3.16l-.02.14 3.03 2.34.21.02c1.94-1.79 2.99-4.43 2.99-7.34z"/>
                              <path fill="#34A853" d="M12 22c2.71 0 4.99-.89 6.65-2.43l-3.17-2.45c-.85.6-2 .99-3.48 .99-2.67 0-4.94-1.79-5.74-4.2h-3.3l-.07.14C3.82 18.73 7.62 22 12 22z"/>
                              <path fill="#FBBC05" d="M6.26 13.91c-.2-.6-.31-1.25-.31-1.91s.11-1.31.31-1.91v-.13H2.96C2.33 10.9 2 11.92 2 13s.33 2.1.96 2.95l3.3-2.04z"/>
                              <path fill="#EA4335" d="M12 6.58c1.5 0 2.85 .52 3.91 1.54l2.86-2.78C16.99 3.59 14.71 2.6 12 2.6 7.62 2.6 3.82 5.27 2.96 9.05l3.3 2.04c.8-2.41 3.07-4.51 5.74-4.51z"/>
                            </svg>
                            Continue with Google
                          </button>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                          Gym sign-up uses email and password only. Google sign-up is available for member accounts.
                        </div>
                      )}
                      
                      <p className="text-xs text-center text-muted-foreground mt-4">
                        Already have an account?{" "}
                        <button type="button" onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Sign in</button>
                      </p>
                      <p className="text-[10px] text-muted-foreground text-center mt-2">
                        By signing up, you agree to our <span className="text-primary cursor-pointer hover:underline">Terms</span> and <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
                      </p>
                      </form>
                  </div>
                )}
              </div>

              <div className={`relative ${isLoginMode ? "order-1 md:order-2" : "order-2"}`}>
                {isLoginMode ? (
                  <div className="p-4 sm:p-8 md:p-12">
                    <div className="mb-6 text-center sm:mb-8">
                      <h3 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">Sign In</h3>
                      <p className="text-sm text-muted-foreground sm:text-lg">Continue your fitness journey</p>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={handleGoogleLogin} 
                      className="mb-5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#FF6A00] px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#FF6A00] sm:mb-6 sm:py-3 sm:text-base"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M21.35 11.1c0-.72-.06-1.24-.19-1.78H12v3.22h5.32c-.11.9-.72 2.25-2.08 3.16l-.02.14 3.03 2.34.21.02c1.94-1.79 2.99-4.43 2.99-7.34z"/>
                        <path fill="#34A853" d="M12 22c2.71 0 4.99-.89 6.65-2.43l-3.17-2.45c-.85.6-2 .99-3.48 .99-2.67 0-4.94-1.79-5.74-4.2h-3.3l-.07.14C3.82 18.73 7.62 22 12 22z"/>
                        <path fill="#FBBC05" d="M6.26 13.91c-.2-.6-.31-1.25-.31-1.91s.11-1.31.31-1.91v-.13H2.96C2.33 10.9 2 11.92 2 13s.33 2.1.96 2.95l3.3-2.04z"/>
                        <path fill="#EA4335" d="M12 6.58c1.5 0 2.85 .52 3.91 1.54l2.86-2.78C16.99 3.59 14.71 2.6 12 2.6 7.62 2.6 3.82 5.27 2.96 9.05l3.3 2.04c.8-2.41 3.07-4.51 5.74-4.51z"/>
                      </svg>
                      Continue with Google
                    </button>
                    
                    <div className="relative mb-5 sm:mb-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs sm:text-sm">
                        <span className="px-4 bg-card text-muted-foreground">Or continue with email</span>
                      </div>
                    </div>
                    
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3.5 sm:space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground sm:mb-2">Email</label>
                        <input 
                          {...loginForm.register("email")}
                          type="email" 
                          className={`w-full rounded-full border bg-input px-4 py-2.5 text-sm text-foreground sm:py-3 sm:text-base ${loginForm.formState.errors.email ? "border-red-500" : "border-border"}`} 
                          placeholder="you@example.com" 
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-xs text-red-500 mt-1 pl-4">{loginForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground sm:mb-2">Password</label>
                        <div className="relative">
                          <input 
                            {...loginForm.register("password")}
                            type={showLoginPassword ? "text" : "password"}
                            className={`w-full rounded-full border bg-input px-4 py-2.5 pr-10 text-sm text-foreground sm:py-3 sm:text-base ${loginForm.formState.errors.password ? "border-red-500" : "border-border"}`} 
                            placeholder="••••••••" 
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword((current) => !current)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={showLoginPassword ? "Hide password" : "Show password"}
                          >
                            {showLoginPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {loginForm.formState.errors.password && (
                          <p className="text-xs text-red-500 mt-1 pl-4">{loginForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="mt-2 flex justify-start text-sm sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setIsForgotPasswordOpen(true)}
                          className="text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={isLoggingIn}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-button-gradient px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 sm:mt-6 sm:py-3 sm:text-base"
                      >
                        {isLoggingIn ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Signing In...</>
                        ) : (
                          "Sign In"
                        )}
                      </button>
                      
                      <p className="mt-5 text-center text-sm text-muted-foreground sm:mt-6">
                        Don't have an account?{" "}
                        <button type="button" onClick={() => setMode("register")} className="text-primary font-semibold hover:underline">Sign up</button>
                      </p>
                    </form>
                  </div>
                ) : (
                  <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[linear-gradient(145deg,hsl(0_0%_10%),hsl(0_0%_6%))] p-6 sm:p-10 md:p-12">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,hsl(25_100%_50%/.15),transparent_50%)]" />
                    <div className="relative z-10 text-center">
                      <img src="/logo.svg" alt="FitPal Logo" className="mx-auto mb-4 h-16 w-16 sm:mb-6 sm:h-24 sm:w-24" />
                      <h2 className="mb-2 text-3xl font-bold sm:text-4xl">
                        <span className="text-gradient-fire">Fit</span>
                        <span className="text-white">Pal</span>
                      </h2>
                      <h3 className="mb-3 text-2xl font-bold text-white sm:mb-4 sm:text-3xl">Join the Elite!</h3>
                      <p className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8 sm:text-lg">
                        Start your transformation with <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent font-semibold">FitPass Hub</span>.
                      </p>
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-sm text-foreground sm:text-base">Access premium gyms</span>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-sm text-foreground sm:text-base">Personalized analytics</span>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-sm text-foreground sm:text-base">Expert community</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/"
                      className="group relative z-20 mt-8 inline-flex self-center md:absolute md:bottom-6 md:right-6 md:mt-0"
                      aria-label="Go to Home"
                    >
                      <div className="flex items-center justify-center rounded-full border border-[hsla(30,100%,50%,0.2)] bg-[hsla(30,100%,50%,0.05)] px-4 py-2.5 backdrop-blur-xl transition-all duration-300 hover:bg-[hsla(30,100%,50%,0.1)] sm:px-6 sm:py-3">
                        <span className="text-[11px] font-black uppercase leading-none tracking-[0.18em] text-white transition-colors group-hover:text-orange-500 sm:text-xs sm:tracking-widest">Home</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ProfileSecurityModal
        open={isForgotPasswordOpen}
        mode="forgot"
        email={loginEmail ?? ""}
        supportsLocalPassword
        allowForgotEmailEditing
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </main>
  );
};

export default LoginRegister;
