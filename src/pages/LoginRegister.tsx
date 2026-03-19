import { useState, useEffect, useRef } from "react";
import { Dumbbell, Activity, Timer, Trophy, Heart, Zap, Flame, BicepsFlexed } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerUserSchema, registerGymSchema } from "@/models/auth.model";
import type { ApiErrorResponse, AuthResponse, LoginRequest, RegisterGymRequest, RegisterUserRequest } from "@/models/auth.model";
import { getApiErrorMessage } from "@/api/client";
import { googleOAuthStartUrl } from "@/config/api";
import { useLogin, useRegisterUser, useRegisterGym, useAuthState } from "@/hooks/useAuth";
import { authStore } from "@/store/auth.store";
import { getPostAuthRoute } from "@/utils/auth-routing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Mode = "login" | "register";
type UserType = "user" | "gym";
const OAUTH_MESSAGE_TYPE = "FITPAL_OAUTH_RESULT";

interface Props {
  initialMode?: Mode;
}

const LoginRegister = ({ initialMode = "login" }: Props) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [userType, setUserType] = useState<UserType>("user");
  const navigate = useNavigate();
  const auth = useAuthState();
  const previousAccessTokenRef = useRef(auth.accessToken);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const hadAccessToken = Boolean(previousAccessTokenRef.current);
    const hasAccessToken = Boolean(auth.accessToken);

    if (!hasAccessToken) {
      previousAccessTokenRef.current = auth.accessToken;
      return;
    }

    navigate(
      getPostAuthRoute({
        role: auth.role,
        profileCompleted: auth.profileCompleted,
        hasSubscription: auth.hasSubscription,
        hasActiveSubscription: auth.hasActiveSubscription,
      })
    );

    previousAccessTokenRef.current = auth.accessToken;
  }, [auth.accessToken, auth.hasActiveSubscription, auth.hasSubscription, auth.profileCompleted, auth.role, navigate]);

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
        toast.success(payload.auth.message || "Signed in successfully");
        navigate(
          getPostAuthRoute({
            role: payload.auth.role,
            profileCompleted: payload.auth.profileCompleted,
            hasSubscription: payload.auth.hasSubscription,
            hasActiveSubscription: payload.auth.hasActiveSubscription,
          })
        );
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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden pt-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* HSL Gradient & Blur Layers */}
          <div className="absolute inset-0 bg-background overflow-hidden">
             {/* Deep Orange Gradient Base */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,hsla(30,100%,20%,0.2),hsla(0,0%,0%,0))]" />
            
            {/* Soft Glowing Orbs (Layer Blur) */}
            <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-[hsla(30,100%,50%,0.08)] blur-[100px] animate-pulse [animation-duration:8s]" />
            <div className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-[hsla(15,100%,60%,0.05)] blur-[120px] animate-pulse [animation-duration:10s]" />
            <div className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-[hsla(40,100%,50%,0.05)] blur-[80px] animate-pulse [animation-duration:12s]" />

            {/* Orbiting Icons & Emojis Container */}
            <div className="absolute inset-0 overflow-hidden perspective-[1000px]">
              
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

        <div className="relative w-full max-w-5xl">
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="relative">
                {mode === "login" ? (
                  <div className="flex flex-col justify-center items-center p-12 bg-[linear-gradient(145deg,hsl(0_0%_10%),hsl(0_0%_6%))] relative overflow-hidden h-full">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(25_100%_50%/.15),transparent_50%)]" />
                    <div className="relative z-10 text-center">
                      <img src="/logo.svg" alt="FitPal Logo" className="w-24 h-24 mx-auto mb-6" />
                      <h2 className="text-4xl font-bold mb-2">
                        <span className="text-gradient-fire">Fit</span>
                        <span className="text-white">Pal</span>
                      </h2>
                      <h3 className="text-3xl font-bold mb-4 text-white">Welcome Back!</h3>
                      <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                        Access your <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent font-semibold">FitPass Hub</span> dashboard to manage workouts, subscriptions, and more.
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-foreground">Real-time gym access</span>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-foreground">Manage your membership</span>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-foreground">Track fitness progress</span>
                        </div>
                      </div>
                    </div>
                    
                    <Link to="/" className="absolute bottom-6 left-6 z-20 group" aria-label="Go to Home">
                      <div className="flex items-center justify-center px-6 py-3 rounded-full bg-[hsla(30,100%,50%,0.05)] border border-[hsla(30,100%,50%,0.2)] hover:bg-[hsla(30,100%,50%,0.1)] backdrop-blur-xl transition-all duration-300">
                        <span className="text-xs font-black uppercase leading-none text-white tracking-widest group-hover:text-orange-500 transition-colors">Home</span>
                      </div>
                    </Link>
                  </div>
                ) : (
                  <div className="p-6 md:p-8">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">Create Account</h3>
                      <p className="text-muted-foreground text-sm">Join the FitPass Hub community today.</p>
                    </div>
                    <div className="mb-6 rounded-full border-2 border-[#FF6A00] bg-transparent relative flex w-full">
                      <div
                        className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-[#FF6A00] transition-transform duration-500 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)]"
                        style={{
                          transform: `translateX(${userType === "gym" ? "100%" : "0%"})`
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setUserType("user")}
                        className={`relative z-10 w-1/2 py-2.5 text-sm font-semibold transition-colors duration-500 rounded-full ${
                          userType === "user" ? "text-white" : "text-white/70 hover:text-white"
                        }`}
                      >
                        User
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserType("gym")}
                        className={`relative z-10 w-1/2 py-2.5 text-sm font-semibold transition-colors duration-500 rounded-full ${
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
                        <input
                          {...(userType === "user" ? registerUserForm.register("password") : registerGymForm.register("password"))}
                          type="password"
                          className={`w-full px-3 py-2 bg-input border rounded-full text-foreground text-sm ${(userType === "user" ? registerUserForm.formState.errors.password : registerGymForm.formState.errors.password) ? "border-red-500" : "border-border"}`} 
                          placeholder="••••••••"
                        />
                        {(userType === "user" ? registerUserForm.formState.errors.password : registerGymForm.formState.errors.password) && (
                           <p className="text-[10px] text-red-500 mt-1 pl-3">{(userType === "user" ? registerUserForm.formState.errors.password : registerGymForm.formState.errors.password)?.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1.5">Confirm Password</label>
                        <input
                          {...(userType === "user" ? registerUserForm.register("confirmPassword") : registerGymForm.register("confirmPassword"))}
                          type="password"
                          className={`w-full px-3 py-2 bg-input border rounded-full text-foreground text-sm ${(userType === "user" ? registerUserForm.formState.errors.confirmPassword : registerGymForm.formState.errors.confirmPassword) ? "border-red-500" : "border-border"}`} 
                          placeholder="••••••••"
                        />
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

              <div className="relative">
                {mode === "login" ? (
                  <div className="p-8 md:p-12">
                    <div className="text-center mb-8">
                      <h3 className="text-3xl font-bold text-foreground mb-2">Sign In</h3>
                      <p className="text-muted-foreground text-lg">Continue your fitness journey</p>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={handleGoogleLogin} 
                      className="w-full py-3 px-6 border-2 border-[#FF6A00] text-white rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2 mb-6 hover:bg-[#FF6A00]"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M21.35 11.1c0-.72-.06-1.24-.19-1.78H12v3.22h5.32c-.11.9-.72 2.25-2.08 3.16l-.02.14 3.03 2.34.21.02c1.94-1.79 2.99-4.43 2.99-7.34z"/>
                        <path fill="#34A853" d="M12 22c2.71 0 4.99-.89 6.65-2.43l-3.17-2.45c-.85.6-2 .99-3.48 .99-2.67 0-4.94-1.79-5.74-4.2h-3.3l-.07.14C3.82 18.73 7.62 22 12 22z"/>
                        <path fill="#FBBC05" d="M6.26 13.91c-.2-.6-.31-1.25-.31-1.91s.11-1.31.31-1.91v-.13H2.96C2.33 10.9 2 11.92 2 13s.33 2.1.96 2.95l3.3-2.04z"/>
                        <path fill="#EA4335" d="M12 6.58c1.5 0 2.85 .52 3.91 1.54l2.86-2.78C16.99 3.59 14.71 2.6 12 2.6 7.62 2.6 3.82 5.27 2.96 9.05l3.3 2.04c.8-2.41 3.07-4.51 5.74-4.51z"/>
                      </svg>
                      Continue with Google
                    </button>
                    
                    <div className="relative mb-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-card text-muted-foreground">Or continue with email</span>
                      </div>
                    </div>
                    
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                        <input 
                          {...loginForm.register("email")}
                          type="email" 
                          className={`w-full px-4 py-3 bg-input border rounded-full text-foreground ${loginForm.formState.errors.email ? "border-red-500" : "border-border"}`} 
                          placeholder="you@example.com" 
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-xs text-red-500 mt-1 pl-4">{loginForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                        <input 
                          {...loginForm.register("password")}
                          type="password" 
                          className={`w-full px-4 py-3 bg-input border rounded-full text-foreground ${loginForm.formState.errors.password ? "border-red-500" : "border-border"}`} 
                          placeholder="••••••••" 
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-xs text-red-500 mt-1 pl-4">{loginForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded border-border bg-input" />
                          <span className="text-muted-foreground">Remember me</span>
                        </label>
                        <button type="button" className="text-primary hover:underline">Forgot password?</button>
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full py-3 px-6 bg-button-gradient text-white rounded-full font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 mt-6"
                      >
                        {isLoggingIn ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Signing In...</>
                        ) : (
                          "Sign In"
                        )}
                      </button>
                      
                      <p className="text-sm text-center text-muted-foreground mt-6">
                        Don't have an account?{" "}
                        <button type="button" onClick={() => setMode("register")} className="text-primary font-semibold hover:underline">Sign up</button>
                      </p>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center items-center p-12 bg-[linear-gradient(145deg,hsl(0_0%_10%),hsl(0_0%_6%))] relative overflow-hidden h-full">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,hsl(25_100%_50%/.15),transparent_50%)]" />
                    <div className="relative z-10 text-center">
                      <img src="/logo.svg" alt="FitPal Logo" className="w-24 h-24 mx-auto mb-6" />
                      <h2 className="text-4xl font-bold mb-2">
                        <span className="text-gradient-fire">Fit</span>
                        <span className="text-white">Pal</span>
                      </h2>
                      <h3 className="text-3xl font-bold mb-4 text-white">Join the Elite!</h3>
                      <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                        Start your transformation with <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent font-semibold">FitPass Hub</span>.
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-foreground">Access premium gyms</span>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-foreground">Personalized analytics</span>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-foreground">Expert community</span>
                        </div>
                      </div>
                    </div>

                    <Link to="/" className="absolute bottom-6 right-6 z-20 group" aria-label="Go to Home">
                      <div className="flex items-center justify-center px-6 py-3 rounded-full bg-[hsla(30,100%,50%,0.05)] border border-[hsla(30,100%,50%,0.2)] hover:bg-[hsla(30,100%,50%,0.1)] backdrop-blur-xl transition-all duration-300">
                        <span className="text-xs font-black uppercase leading-none text-white tracking-widest group-hover:text-orange-500 transition-colors">Home</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LoginRegister;

