
import axios from "axios";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPlansApi } from "@/api/plan.api";
import {
  initiateEsewaPaymentApi,
} from "@/api/payment.api";
import { PUBLIC_FRONTEND_MODE } from "@/config/frontend-access";
import { useAuthState } from "@/hooks/useAuth";
import {
  getMyBillingProfileApi,
  getMyProfileApi,
  patchMyBillingProfileApi,
  patchOnboardingProfileApi,
  uploadProfileImageApi,
} from "@/api/profile.api";
import {
  getMySubscriptionApi,
  selectMySubscriptionApi,
} from "@/api/subscription.api";
import { authStore } from "@/store/auth.store";
import { getApiErrorMessage } from "@/api/client";
import type { BillingCycle, UserSubscriptionResponse } from "@/models/subscription.model";
import type {
  FitnessLevel,
  Gender,
  PrimaryFitnessFocus,
  StoredPaymentMethod,
  UpdateUserOnboardingRequest,
  UserProfileResponse,
} from "@/models/profile.model";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { CustomSelect } from "@/components/ui/CustomSelect";
import Pricing from "@/components/Pricing";
import {
  Field,
  FieldError,
  Pill,
  ProfileSetupShell,
  SectionLabel,
  SetupActions,
  TextInput,
  type StepDefinition,
} from "./ProfileSetupShell";

type StepId = "profile" | "demographics" | "goals" | "subscription" | "payment";
type PlanFrequency = "monthly" | "yearly";
type SubscriptionPlanId = string;
type PaymentMethodId = "khalti" | "esewa";

type ProfileSetupLocationState = {
  selectedPlan?: string;
  isYearly?: boolean;
};

interface UserSetupState {
  username: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  profileImagePublicId: string;
  profileImageResourceType: string;
  dob: string;
  gender: string;
  phone: string;
  weight: string;
  height: string;
  fitnessLevel: string;
  primaryFocus: string;
}

type UserField = keyof UserSetupState;
type UserValidationErrors = Partial<Record<UserField, string>>;

interface PaymentMethodDefinition {
  id: PaymentMethodId;
  name: string;
  subtitle: string;
  badge: string;
  colorClass: string;
  isAvailable: boolean;
  helperText?: string;
}

interface BillingFormState {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
}

type BillingField = keyof BillingFormState;
type BillingValidationErrors = Partial<Record<BillingField, string>>;

const USER_STEPS: StepDefinition[] = [
  { id: "profile", label: "Profile", titlePrefix: "Build Your", titleAccent: "Member Profile", subtitle: "Let gyms and trainers recognize you with your name, photo, and account basics." },
  { id: "demographics", label: "Details", titlePrefix: "Add Your", titleAccent: "Personal Details", subtitle: "A few basics help us tailor recommendations and progress tracking." },
  { id: "goals", label: "Goals", titlePrefix: "Set Your", titleAccent: "Training Goals", subtitle: "Capture your body metrics and what you want to achieve first." },
  { id: "subscription", label: "Plan", titlePrefix: "Choose Your", titleAccent: "Membership", subtitle: "Pick the FitPal plan that matches your training style and gym access needs." },
  { id: "payment", label: "Payment", titlePrefix: "Complete Your", titleAccent: "Payment", subtitle: "Review your selected membership, add billing details, and choose how you want to pay." },
];

const FITNESS_LEVEL_OPTIONS: Array<{ label: string; value: FitnessLevel }> = [
  { label: "Beginner", value: "BEGINNER" },
  { label: "Intermediate", value: "INTERMEDIATE" },
  { label: "Advanced", value: "ADVANCED" },
];

const FITNESS_FOCUS_OPTIONS: Array<{ label: string; value: PrimaryFitnessFocus }> = [
  { label: "Hypertrophy", value: "HYPERTROPHY" },
  { label: "Strength & Power", value: "STRENGTH_POWER" },
  { label: "Endurance & Cardio", value: "ENDURANCE_CARDIO" },
  { label: "Flexibility & Mobility", value: "FLEXIBILITY_MOBILITY" },
  { label: "Weight Loss", value: "WEIGHT_LOSS" },
];

const PAYMENT_METHODS: PaymentMethodDefinition[] = [
  {
    id: "khalti",
    name: "Khalti",
    subtitle: "Fast wallet checkout for Nepali users.",
    badge: "K",
    colorClass: "bg-[#5c2d91]/20 text-[#c4a2ff]",
    isAvailable: false,
    helperText: "Coming soon",
  },
  {
    id: "esewa",
    name: "eSewa",
    subtitle: "Popular digital wallet for direct payments.",
    badge: "e",
    colorClass: "bg-[#60bb46]/20 text-[#8ae36f]",
    isAvailable: true,
  },
];

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const INITIAL_USER_STATE: UserSetupState = {
  username: "", firstName: "", lastName: "", profileImageUrl: "", profileImagePublicId: "", profileImageResourceType: "", dob: "", gender: "", phone: "", weight: "", height: "", fitnessLevel: "", primaryFocus: "",
};
const INITIAL_BILLING_STATE: BillingFormState = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  city: "",
};

const toApiBillingCycle = (billingCycle: PlanFrequency): BillingCycle =>
  billingCycle === "yearly" ? "YEARLY" : "MONTHLY";

const fromApiBillingCycle = (billingCycle: BillingCycle): PlanFrequency =>
  billingCycle === "YEARLY" ? "yearly" : "monthly";

const normalizePlanType = (planType: string | null | undefined) =>
  planType?.trim().toLowerCase() ?? "";

const buildFrontendCallbackUrl = (pathname: string) =>
  new URL(pathname, window.location.origin).toString();

const toStoredPaymentMethod = (paymentMethod: PaymentMethodId | null): StoredPaymentMethod | undefined => {
  if (paymentMethod === "esewa") return "ESEWA";
  if (paymentMethod === "khalti") return "KHALTI";
  return undefined;
};

const fromStoredPaymentMethod = (paymentMethod: StoredPaymentMethod | null | undefined): PaymentMethodId | null => {
  if (paymentMethod === "ESEWA") return "esewa";
  if (paymentMethod === "KHALTI") return "khalti";
  return null;
};

const syncAuthOnboardingStatus = (profile: Pick<UserProfileResponse, "profileCompleted" | "hasSubscription" | "hasActiveSubscription">) => {
  authStore.updateOnboardingStatus({ profileCompleted: profile.profileCompleted, hasSubscription: profile.hasSubscription, hasActiveSubscription: profile.hasActiveSubscription });
};

const getUserResumeStepIndex = (profile: UserProfileResponse) => {
  const hasName = Boolean((profile.firstName ?? "").trim() || (profile.lastName ?? "").trim());
  const hasBasics = Boolean((profile.userName ?? "").trim()) && hasName;
  const hasPersonalDetails = Boolean(profile.dob) && Boolean(profile.gender);
  const hasBodyMetrics = profile.height != null && profile.weight != null;
  const hasGoals = Boolean(profile.fitnessLevel) && Boolean(profile.primaryFitnessFocus);
  if (profile.profileCompleted && profile.hasSubscription && !profile.hasActiveSubscription) return 4;
  if (profile.profileCompleted && !profile.hasActiveSubscription) return 3;
  if (!hasBasics) return 0;
  if (!hasPersonalDetails) return 1;
  if (!hasBodyMetrics || !hasGoals) return 2;
  return 3;
};

const ProfileSetup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthState();
  const isPublicPreview = PUBLIC_FRONTEND_MODE && !auth.accessToken;
  const locationState = location.state as ProfileSetupLocationState | null;
  const initialSelectedPlan = normalizePlanType(locationState?.selectedPlan);
  const {
    data: plans = [],
    isLoading: isLoadingPlans,
    isError: isPlansError,
  } = useQuery({
    queryKey: ["plans"],
    queryFn: getPlansApi,
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isProfileImageLoadFailed, setIsProfileImageLoadFailed] = useState(false);
  const [userErrors, setUserErrors] = useState<UserValidationErrors>({});
  const [billingErrors, setBillingErrors] = useState<BillingValidationErrors>({});
  const [paymentMethodError, setPaymentMethodError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>(initialSelectedPlan);
  const [billingCycle, setBillingCycle] = useState<PlanFrequency>(locationState?.isYearly ? "yearly" : "monthly");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodId | null>("esewa");
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscriptionResponse | null>(null);
  const [userData, setUserData] = useState<UserSetupState>(INITIAL_USER_STATE);
  const [billingData, setBillingData] = useState<BillingFormState>(INITIAL_BILLING_STATE);

  const currentStep = USER_STEPS[stepIndex] ?? USER_STEPS[0];
  const isWideStep = currentStep.id === "profile" || currentStep.id === "subscription" || currentStep.id === "payment";
  const isGoogle = (auth.providers ?? []).some((provider) => provider.toUpperCase() === "GOOGLE");
  const displayName = auth.email?.split("@")[0] || "FitPal Member";
  const firstNameLocked = isGoogle && Boolean(userData.firstName.trim());
  const lastNameLocked = isGoogle && Boolean(userData.lastName.trim());
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111&color=fb923c`;

  const transformedProfileImageUrl = useMemo(() => {
    const raw = userData.profileImageUrl?.trim();
    if (!raw) return "";
    if (raw.includes("res.cloudinary.com") && raw.includes("/upload/") && !raw.includes("/upload/f_")) {
      return raw.replace("/upload/", "/upload/f_auto,q_auto/");
    }
    return raw;
  }, [userData.profileImageUrl]);

  const resolvedAvatar = isProfileImageLoadFailed ? fallbackAvatar : transformedProfileImageUrl || fallbackAvatar;
  const fallbackPlan = plans.find((plan) => plan.mostPopular) ?? plans[0] ?? null;
  const selectedPlanDetails =
    plans.find((plan) => normalizePlanType(plan.planType) === selectedPlan) ?? fallbackPlan;
  const planPrice = selectedPlanDetails
    ? billingCycle === "yearly"
      ? selectedPlanDetails.yearlyBilledAmount
      : selectedPlanDetails.monthlyPrice
    : 0;
  const selectedPaymentMethodDetails =
    PAYMENT_METHODS.find((method) => method.id === selectedPaymentMethod) ?? null;

  useEffect(() => {
    if (!selectedPlanDetails) {
      return;
    }

    const normalizedPlanId = normalizePlanType(selectedPlanDetails.planType);
    if (!selectedPlan) {
      setSelectedPlan(normalizedPlanId);
      return;
    }

    const selectedPlanStillExists = plans.some(
      (plan) => normalizePlanType(plan.planType) === selectedPlan
    );

    if (!selectedPlanStillExists) {
      setSelectedPlan(normalizedPlanId);
    }
  }, [plans, selectedPlan, selectedPlanDetails]);
  useEffect(() => {
    setIsProfileImageLoadFailed(false);
  }, [transformedProfileImageUrl]);

  useEffect(() => {
    const derivedFullName = [userData.firstName.trim(), userData.lastName.trim()].filter(Boolean).join(" ");

    setBillingData((prev) => ({
      fullName: prev.fullName || derivedFullName,
      email: prev.email || auth.email || "",
      phone: prev.phone || userData.phone || "",
      addressLine1: prev.addressLine1,
      city: prev.city,
    }));
  }, [auth.email, userData.firstName, userData.lastName, userData.phone]);

  useEffect(() => {
    if (isPublicPreview || !auth.accessToken) return;
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const [profile, billingProfile, subscription] = await Promise.all([
          getMyProfileApi(),
          getMyBillingProfileApi(),
          getMySubscriptionApi().catch((error) => {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
              return null;
            }
            throw error;
          }),
        ]);
        if (cancelled) return;
        setUserData({
          username: profile.userName ?? "",
          firstName: profile.firstName ?? "",
          lastName: profile.lastName ?? "",
          profileImageUrl: profile.profileImageUrl ?? "",
          profileImagePublicId: profile.profileImagePublicId ?? "",
          profileImageResourceType: profile.profileImageResourceType ?? "",
          dob: profile.dob ?? "",
          gender: profile.gender ?? "",
          phone: profile.phoneNo ?? "",
          height: profile.height != null ? String(profile.height) : "",
          weight: profile.weight != null ? String(profile.weight) : "",
          fitnessLevel: profile.fitnessLevel ?? "",
          primaryFocus: profile.primaryFitnessFocus ?? "",
        });
        setBillingData({
          fullName: billingProfile.fullName ?? "",
          email: billingProfile.billingEmail ?? "",
          phone: billingProfile.phoneNumber ?? "",
          addressLine1: billingProfile.address ?? "",
          city: billingProfile.city ?? "",
        });
        setSelectedPaymentMethod(fromStoredPaymentMethod(billingProfile.preferredPaymentMethod) ?? "esewa");
        setSelectedSubscription(subscription);
        if (subscription) {
          setSelectedPlan(normalizePlanType(subscription.planType));
          setBillingCycle(fromApiBillingCycle(subscription.billingCycle));
        }
        setStepIndex(getUserResumeStepIndex(profile));
        syncAuthOnboardingStatus(profile);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load onboarding profile"));
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [auth.accessToken, isPublicPreview]);

  const clearError = (field: UserField) => {
    setUserErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setUser = (patch: Partial<UserSetupState>) => {
    setUserData((prev) => ({ ...prev, ...patch }));
  };

  const clearBillingError = (field: BillingField) => {
    setBillingErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setBilling = (patch: Partial<BillingFormState>) => {
    setBillingData((prev) => ({ ...prev, ...patch }));
  };

  const validateStep = (step: "profile" | "demographics" | "goals") => {
    const nextErrors: UserValidationErrors = {};

    if (step === "profile") {
      const username = userData.username.trim();
      if (!username) nextErrors.username = "Username is required";
      else if (username.length < 3) nextErrors.username = "At least 3 characters";
      else if (username.length > 50) nextErrors.username = "At most 50 characters";
      else if (!/^[A-Za-z0-9_]+$/.test(username)) nextErrors.username = "Letters, numbers, and underscores only";
      if (!userData.firstName.trim() && !userData.lastName.trim()) nextErrors.firstName = "Add your first name or last name";
    }

    if (step === "demographics") {
      if (!userData.dob) nextErrors.dob = "Date of birth is required";
      else {
        const dob = new Date(`${userData.dob}T00:00:00`);
        if (Number.isNaN(dob.getTime()) || dob >= new Date()) nextErrors.dob = "Must be a past date";
      }
      if (!userData.gender) nextErrors.gender = "Select your gender";
      if (userData.phone) {
        const phone = userData.phone.trim();
        if (phone.length > 20) nextErrors.phone = "At most 20 characters";
        else if (!/^(\+?[0-9\s\-()*]*)$/.test(phone)) nextErrors.phone = "Invalid characters";
      }
    }

    if (step === "goals") {
      if (!userData.weight) nextErrors.weight = "Enter your weight";
      else {
        const weight = Number(userData.weight);
        if (Number.isNaN(weight) || weight < 20 || weight > 300) nextErrors.weight = "Between 20 and 300 kg";
      }
      if (!userData.height) nextErrors.height = "Enter your height";
      else {
        const height = Number(userData.height);
        if (Number.isNaN(height) || height < 80 || height > 280) nextErrors.height = "Between 80 and 280 cm";
      }
      if (!userData.fitnessLevel) nextErrors.fitnessLevel = "Select your fitness level";
      if (!userData.primaryFocus) nextErrors.primaryFocus = "Select your primary focus";
    }

    setUserErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePaymentStep = () => {
    const nextErrors: BillingValidationErrors = {};

    if (!selectedPaymentMethod) {
      setPaymentMethodError("Select a payment method");
    } else {
      setPaymentMethodError("");
    }

    if (!billingData.fullName.trim()) {
      nextErrors.fullName = "Full name is required";
    }

    const email = billingData.email.trim();
    if (!email) {
      nextErrors.email = "Billing email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email";
    }

    const phone = billingData.phone.trim();
    if (!phone) {
      nextErrors.phone = "Phone number is required";
    } else if (!/^(\+?[0-9\s\-()*]*)$/.test(phone)) {
      nextErrors.phone = "Invalid characters";
    }

    setBillingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0 && Boolean(selectedPaymentMethod);
  };

  const persistStep = async (step: number) => {
    if (isPublicPreview) return true;
    const payload: UpdateUserOnboardingRequest = { step };

    if (step === 1) {
      payload.userName = userData.username.trim() || undefined;
      payload.firstName = userData.firstName.trim() || undefined;
      payload.lastName = userData.lastName.trim() || undefined;
      payload.profileImageUrl = userData.profileImageUrl.trim() || undefined;
      payload.profileImagePublicId = userData.profileImagePublicId.trim() || undefined;
      payload.profileImageResourceType = userData.profileImageResourceType.trim() || undefined;
    } else if (step === 2) {
      payload.dob = userData.dob || undefined;
      payload.gender = (userData.gender || undefined) as Gender | undefined;
      payload.phoneNo = userData.phone.trim() || undefined;
    } else if (step === 3) {
      payload.height = userData.height ? Number(userData.height) : undefined;
      payload.weight = userData.weight ? Number(userData.weight) : undefined;
      payload.fitnessLevel = (userData.fitnessLevel || undefined) as FitnessLevel | undefined;
      payload.primaryFitnessFocus = (userData.primaryFocus || undefined) as PrimaryFitnessFocus | undefined;
    }

    setIsSavingStep(true);
    try {
      const response = await patchOnboardingProfileApi(payload);
      syncAuthOnboardingStatus(response);
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save step"));
      return false;
    } finally {
      setIsSavingStep(false);
    }
  };

  const persistBillingProfile = async () => {
    if (isPublicPreview) return true;

    setIsSavingStep(true);
    try {
      const response = await patchMyBillingProfileApi({
        fullName: billingData.fullName.trim() || undefined,
        billingEmail: billingData.email.trim() || undefined,
        phoneNumber: billingData.phone.trim() || undefined,
        address: billingData.addressLine1.trim() || undefined,
        city: billingData.city.trim() || undefined,
        preferredPaymentMethod: toStoredPaymentMethod(selectedPaymentMethod),
      });

      setBillingData({
        fullName: response.fullName ?? "",
        email: response.billingEmail ?? "",
        phone: response.phoneNumber ?? "",
        addressLine1: response.address ?? "",
        city: response.city ?? "",
      });

      const savedPaymentMethod = fromStoredPaymentMethod(response.preferredPaymentMethod);
      if (savedPaymentMethod) {
        setSelectedPaymentMethod(savedPaymentMethod);
      }

      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save billing profile"));
      return false;
    } finally {
      setIsSavingStep(false);
    }
  };

  const persistSelectedSubscription = async () => {
    if (isPublicPreview) {
      return true;
    }

    if (!selectedPlanDetails) {
      toast.error(
        isPlansError
          ? "Plan details could not be loaded."
          : "Select a subscription plan before continuing."
      );
      return false;
    }

    setIsSavingStep(true);
    try {
      const response = await selectMySubscriptionApi({
        planId: selectedPlanDetails.planId,
        billingCycle: toApiBillingCycle(billingCycle),
      });

      setSelectedSubscription(response);
      setSelectedPlan(normalizePlanType(response.planType));
      setBillingCycle(fromApiBillingCycle(response.billingCycle));
      authStore.updateOnboardingStatus({
        profileCompleted: response.profileCompleted,
        hasSubscription: response.hasSubscription,
        hasActiveSubscription: response.hasActiveSubscription,
      });
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save selected plan"));
      return false;
    } finally {
      setIsSavingStep(false);
    }
  };

  const submitEsewaForm = (paymentUrl: string, formFields: Record<string, string>) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = paymentUrl;
    form.style.display = "none";

    Object.entries(formFields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    form.remove();
  };

  const startEsewaCheckout = async () => {
    if (isPublicPreview) {
      toast.success("Preview setup complete");
      navigate("/dashboard");
      return true;
    }

    if (selectedPaymentMethod !== "esewa") {
      setPaymentMethodError("Choose eSewa. Khalti checkout is not integrated yet.");
      toast.info("Khalti checkout is not integrated yet. Choose eSewa to continue.");
      return false;
    }

    const subscriptionMatchesSelection =
      selectedSubscription &&
      normalizePlanType(selectedSubscription.planType) === selectedPlan &&
      selectedSubscription.billingCycle === toApiBillingCycle(billingCycle);

    if (!subscriptionMatchesSelection && !(await persistSelectedSubscription())) {
      return false;
    }

    const activeSubscription =
      subscriptionMatchesSelection && selectedSubscription
        ? selectedSubscription
        : null;
    const checkoutSubscription =
      activeSubscription ??
      (await getMySubscriptionApi().catch((error) => {
        toast.error(getApiErrorMessage(error, "Failed to load saved subscription"));
        return null;
      }));

    if (!checkoutSubscription) {
      return false;
    }

    setSelectedSubscription(checkoutSubscription);
    setIsInitiatingPayment(true);
    try {
      const response = await initiateEsewaPaymentApi({
        subscriptionId: checkoutSubscription.subscriptionId,
        successUrl: buildFrontendCallbackUrl("/payments/esewa/success"),
        failureUrl: buildFrontendCallbackUrl("/payments/esewa/failure"),
        billingName: billingData.fullName.trim() || undefined,
        billingEmail: billingData.email.trim() || undefined,
        billingPhoneNumber: billingData.phone.trim() || undefined,
        billingAddress: billingData.addressLine1.trim() || undefined,
        billingCity: billingData.city.trim() || undefined,
      });

      submitEsewaForm(response.paymentUrl, response.formFields);
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to start eSewa payment"));
      return false;
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handlePhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!PROFILE_IMAGE_ACCEPTED_TYPES.includes(file.type)) {
      setUserErrors((prev) => ({ ...prev, profileImageUrl: "Only PNG, JPG, WEBP allowed" }));
      event.target.value = "";
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setUserErrors((prev) => ({ ...prev, profileImageUrl: "Max 5 MB" }));
      event.target.value = "";
      return;
    }
    if (isPublicPreview) {
      setUser({ profileImageUrl: URL.createObjectURL(file), profileImagePublicId: "", profileImageResourceType: "image" });
      clearError("profileImageUrl");
      toast.success("Preview photo applied");
      event.target.value = "";
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const uploaded = await uploadProfileImageApi(file);
      setUser({ profileImageUrl: uploaded.secureUrl || uploaded.url, profileImagePublicId: uploaded.publicId || "", profileImageResourceType: uploaded.resourceType || "image" });
      clearError("profileImageUrl");
      toast.success("Photo uploaded");
    } catch (error) {
      setUserErrors((prev) => ({ ...prev, profileImageUrl: getApiErrorMessage(error, "Upload failed") }));
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const nextStep = async () => {
    if (isSavingStep || isUploadingPhoto || isInitiatingPayment) return;
    if (currentStep.id === "profile") {
      if (!validateStep("profile") || !(await persistStep(1))) return;
      setStepIndex(1);
      return;
    }
    if (currentStep.id === "demographics") {
      if (!validateStep("demographics") || !(await persistStep(2))) return;
      setStepIndex(2);
      return;
    }
    if (currentStep.id === "goals") {
      if (!validateStep("goals") || !(await persistStep(3))) return;
      setStepIndex(3);
      return;
    }
    if (currentStep.id === "subscription") {
      if (!(await persistSelectedSubscription())) return;
      setStepIndex(4);
      return;
    }
    if (currentStep.id === "payment") {
      if (auth.hasActiveSubscription) {
        navigate("/dashboard");
        return;
      }
      if (!validatePaymentStep() || !(await persistBillingProfile())) return;
      await startEsewaCheckout();
    }
  };

  const prevStep = () => setStepIndex((prev) => Math.max(0, prev - 1));
  const busy = isSavingStep || isUploadingPhoto || isInitiatingPayment;
  const busyLabel = isInitiatingPayment
    ? "Redirecting..."
    : isUploadingPhoto
      ? "Uploading..."
      : "Saving...";

  const renderProfileStep = () => (
    <div className="animate-[screenFadeIn_0.2s_ease-out]">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)] lg:items-stretch lg:gap-4">
        <div className="flex flex-col gap-2 lg:grid lg:h-full lg:min-h-full lg:grid-rows-[auto_minmax(0,1fr)]">
          <div className="flex overflow-hidden flex-col gap-2 rounded-[1.35rem] border border-white/8 bg-[#101010] p-3.5">
            <div className="flex w-full items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-orange-600 p-0.5">
                <img src={resolvedAvatar} alt={displayName} className="h-full w-full rounded-full object-cover" onError={() => setIsProfileImageLoadFailed(true)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold text-white">{displayName}</p>
                <span className="text-[11px] font-semibold text-emerald-400">{isGoogle ? "Google linked" : "Registered account"}</span>
              </div>
              <span className="shrink-0 self-start rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white">Gym Member</span>
            </div>
            <p className="truncate text-[11px] text-slate-600" title={auth.email || ""}>{auth.email}</p>
          </div>

          <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[1.45rem] border border-orange-500/20 bg-[linear-gradient(180deg,rgba(120,63,23,0.32)_0%,rgba(27,18,11,0.96)_58%,rgba(15,15,15,1)_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,214,170,0.08)]">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mx-auto mb-2.5 h-[96px] w-[96px] overflow-hidden rounded-full border-2 border-orange-600 p-1">
                <img src={resolvedAvatar} alt={displayName} className="h-full w-full rounded-full object-cover" onError={() => setIsProfileImageLoadFailed(true)} />
              </div>
              <p className="text-[15px] font-black text-white">Profile Photo</p>
              <p className="mb-2 mt-1 text-[12px] text-slate-500">JPG, PNG, WEBP - Max 5 MB</p>
            </div>
            <div className="flex flex-col items-center gap-2.5 pt-1.5">
              <label className={cn("inline-flex cursor-pointer items-center justify-center rounded-[0.9rem] border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white transition-all hover:bg-white/10", busy && "pointer-events-none opacity-50")}>
                {isUploadingPhoto ? "Uploading..." : "Change Photo"}
                <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoSelected} />
              </label>
              {isProfileImageLoadFailed && <p className="text-[11px] text-amber-400">Unsupported format, fallback shown.</p>}
              <FieldError message={userErrors.profileImageUrl} />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:h-full lg:min-h-full lg:grid-rows-[auto_minmax(0,1fr)]">
          <SectionLabel className="!mb-3">Personal Information</SectionLabel>
          <div className="flex flex-1 flex-col gap-2.5 lg:h-full lg:justify-between">
            <Field label="Username" error={userErrors.username}>
              <TextInput type="text" placeholder="Username" value={userData.username} onChange={(event) => { setUser({ username: event.target.value }); clearError("username"); }} />
            </Field>
            <Field label="Email"><TextInput type="email" value={auth.email || ""} readOnly disabled /></Field>
            <Field label="First name" error={userErrors.firstName}>
              {firstNameLocked ? <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white">{userData.firstName}<span className="text-[10px] font-bold text-emerald-400">Google</span></div> : <TextInput type="text" placeholder="First name" value={userData.firstName} onChange={(event) => { setUser({ firstName: event.target.value }); clearError("firstName"); clearError("lastName"); }} />}
            </Field>
            <Field label="Last name">
              {lastNameLocked ? <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white">{userData.lastName}<span className="text-[10px] font-bold text-emerald-400">Google</span></div> : <TextInput type="text" placeholder="Last name" value={userData.lastName} onChange={(event) => { setUser({ lastName: event.target.value }); clearError("firstName"); clearError("lastName"); }} />}
            </Field>
          </div>
        </div>
      </div>
      <SetupActions nextLabel="Continue" stepIndex={stepIndex} totalSteps={USER_STEPS.length} busy={busy} busyLabel={busyLabel} onNext={nextStep} onBack={prevStep} hideBack />
    </div>
  );

  const renderDemographicsStep = () => (
    <div className="animate-[screenFadeIn_0.2s_ease-out] flex flex-col gap-4">
      <div className="rounded-[1.35rem] border border-white/8 bg-[#101010] p-4">
        <p className="text-sm font-bold text-white">A little context goes a long way.</p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-400">Your personal details help us tailor progress tracking, reminders, and recommendations across gyms.</p>
      </div>
      <SectionLabel>Personal Details</SectionLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date of Birth" error={userErrors.dob}>
          <CustomDatePicker value={userData.dob} onChange={(value) => { setUser({ dob: value }); clearError("dob"); }} invalid={Boolean(userErrors.dob)} />
        </Field>
        <Field label="Gender" error={userErrors.gender}>
          <CustomSelect options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }]} value={userData.gender} onChange={(value) => { setUser({ gender: value }); clearError("gender"); }} invalid={Boolean(userErrors.gender)} />
        </Field>
      </div>
      <Field label="Phone Number" error={userErrors.phone}>
        <TextInput type="tel" placeholder="+977 98xxxxxxxx" value={userData.phone} onChange={(event) => { setUser({ phone: event.target.value }); clearError("phone"); }} />
      </Field>
      <SetupActions nextLabel="Continue" stepIndex={stepIndex} totalSteps={USER_STEPS.length} busy={busy} busyLabel={busyLabel} onNext={nextStep} onBack={prevStep} />
    </div>
  );

  const renderGoalsStep = () => (
    <div className="animate-[screenFadeIn_0.2s_ease-out] flex flex-col gap-4">
      <div>
        <SectionLabel>Body Measurements</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Weight (kg)" error={userErrors.weight}>
            <TextInput type="number" placeholder="75.5" value={userData.weight} onChange={(event) => { setUser({ weight: event.target.value }); clearError("weight"); }} />
          </Field>
          <Field label="Height (cm)" error={userErrors.height}>
            <TextInput type="number" placeholder="175" value={userData.height} onChange={(event) => { setUser({ height: event.target.value }); clearError("height"); }} />
          </Field>
        </div>
      </div>

      <div>
        <SectionLabel>Fitness Experience</SectionLabel>
        <Field label="Current Level" error={userErrors.fitnessLevel}>
          <div className="mt-1 flex flex-wrap gap-2">
            {FITNESS_LEVEL_OPTIONS.map((option) => (
              <Pill key={option.value} label={option.label} selected={userData.fitnessLevel === option.value} onClick={() => { setUser({ fitnessLevel: userData.fitnessLevel === option.value ? "" : option.value }); clearError("fitnessLevel"); }} />
            ))}
          </div>
        </Field>
      </div>

      <div>
        <SectionLabel>Primary Fitness Focus</SectionLabel>
        <Field label="What do you want to achieve?" error={userErrors.primaryFocus}>
          <div className="mt-1 flex flex-wrap gap-2">
            {FITNESS_FOCUS_OPTIONS.map((option) => (
              <Pill key={option.value} label={option.label} selected={userData.primaryFocus === option.value} onClick={() => { setUser({ primaryFocus: userData.primaryFocus === option.value ? "" : option.value }); clearError("primaryFocus"); }} />
            ))}
          </div>
        </Field>
      </div>
      <SetupActions nextLabel="Continue" stepIndex={stepIndex} totalSteps={USER_STEPS.length} busy={busy} busyLabel={busyLabel} onNext={nextStep} onBack={prevStep} />
    </div>
  );

  const renderSubscriptionStep = () => (
    <div className="animate-[screenFadeIn_0.2s_ease-out]">
      <div className="mb-4 rounded-[1.35rem] border border-white/8 bg-[#101010] p-4">
        <p className="text-sm font-bold text-white">Choose the access level you want to unlock.</p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-400">You can adjust the plan later, but this gives us the right membership context for activation.</p>
      </div>
      {isPlansError && (
        <div className="mb-4 rounded-[1.35rem] border border-red-500/20 bg-red-500/5 p-4 text-[12px] text-red-200">
          Plans could not be loaded right now. Retry after refreshing the page.
        </div>
      )}
      <div className="-mx-2 px-2">
        <Pricing
          compact
          selectedPlanId={selectedPlan}
          billingCycle={billingCycle}
          onBillingChange={(isYearly) => setBillingCycle(isYearly ? "yearly" : "monthly")}
          onSelectPlan={(selected, isYearly) => {
            setSelectedPlan(selected as SubscriptionPlanId);
            setBillingCycle(isYearly ? "yearly" : "monthly");
          }}
        />
      </div>
      <SetupActions nextLabel="Continue" stepIndex={stepIndex} totalSteps={USER_STEPS.length} busy={busy} busyLabel={busyLabel} onNext={nextStep} onBack={prevStep} />
    </div>
  );

  const renderPaymentStep = () => (
    <div className="animate-[screenFadeIn_0.2s_ease-out]">
      <div className="mb-4 rounded-[1.35rem] border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm font-bold text-white">Your membership is ready for payment.</p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-300">Review the saved plan, fill in your billing details, and continue to eSewa to activate the membership.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-[1.35rem] border border-white/8 bg-[#101010] p-5">
            <SectionLabel className="!mb-4">Selected Membership</SectionLabel>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-white">
                    {selectedPlanDetails ? `${selectedPlanDetails.name} Plan` : "Plan not loaded"}
                  </p>
                  <p className="text-xs capitalize text-slate-400">{billingCycle} billing</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">
                    {(selectedPlanDetails?.currency ?? "NPR")} {planPrice.toLocaleString()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Current Price</p>
                </div>
              </div>
              <div className="space-y-2">
                {(selectedPlanDetails?.features ?? []).slice(0, 4).map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-[12px] text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    <span>{feature}</span>
                  </div>
                ))}
                {!selectedPlanDetails && (
                  <p className="text-[12px] text-slate-400">Plan details are unavailable.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-white/8 bg-[#101010] p-5">
            <SectionLabel className="!mb-4">Billing Details</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Full Name" error={billingErrors.fullName} className="sm:col-span-2">
                <TextInput
                  type="text"
                  placeholder="Your full name"
                  value={billingData.fullName}
                  onChange={(event) => {
                    setBilling({ fullName: event.target.value });
                    clearBillingError("fullName");
                  }}
                />
              </Field>
              <Field label="Billing Email" error={billingErrors.email}>
                <TextInput
                  type="email"
                  placeholder="you@example.com"
                  value={billingData.email}
                  onChange={(event) => {
                    setBilling({ email: event.target.value });
                    clearBillingError("email");
                  }}
                />
              </Field>
              <Field label="Phone Number" error={billingErrors.phone}>
                <TextInput
                  type="tel"
                  placeholder="+977 98xxxxxxxx"
                  value={billingData.phone}
                  onChange={(event) => {
                    setBilling({ phone: event.target.value });
                    clearBillingError("phone");
                  }}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <TextInput
                  type="text"
                  placeholder="Street address"
                  value={billingData.addressLine1}
                  onChange={(event) => {
                    setBilling({ addressLine1: event.target.value });
                    clearBillingError("addressLine1");
                  }}
                />
              </Field>
              <Field label="City">
                <TextInput
                  type="text"
                  placeholder="Kathmandu"
                  value={billingData.city}
                  onChange={(event) => {
                    setBilling({ city: event.target.value });
                    clearBillingError("city");
                  }}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[1.35rem] border border-white/8 bg-[#101010] p-5">
            <SectionLabel className="!mb-4">Payment Method</SectionLabel>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedPaymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      if (!method.isAvailable) {
                        toast.info(`${method.name} checkout is not integrated yet. Choose eSewa to continue.`);
                        return;
                      }
                      setSelectedPaymentMethod(method.id);
                      setPaymentMethodError("");
                    }}
                    disabled={!method.isAvailable}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                      !method.isAvailable && "cursor-not-allowed opacity-60",
                      isSelected
                        ? "border-orange-600 bg-orange-600/8"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black",
                        method.colorClass,
                      )}
                    >
                      {method.badge}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="text-[15px] font-black leading-none text-white">{method.name}</p>
                        {!method.isAvailable && method.helperText && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate-300">
                            {method.helperText}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-400">{method.subtitle}</p>
                    </div>
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                        isSelected ? "border-orange-600 bg-orange-600/20" : "border-white/20",
                      )}
                    >
                      {isSelected ? <div className="h-2.5 w-2.5 rounded-full bg-orange-600" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <FieldError message={paymentMethodError} />
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              eSewa checkout is live here. Khalti remains unavailable until its backend flow is implemented.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#111] p-5">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-orange-600/10 blur-[40px]" />
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.1em] text-orange-600">Payment Status</p>
            <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-sm font-bold text-white">
                {auth.hasActiveSubscription ? "Membership Active" : "Membership Pending"}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                {auth.hasActiveSubscription
                  ? "Your subscription is active and you can continue to the dashboard."
                  : selectedPaymentMethodDetails
                    ? `Billing details are ready and ${selectedPaymentMethodDetails.name} is selected. Continue to checkout to complete payment.`
                    : "Choose a payment method now, then continue to checkout."}
              </p>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              After eSewa returns, FitPal will verify the payment result and update the subscription status automatically.
            </p>
          </div>
        </div>
      </div>

      <SetupActions
        nextLabel={
          isPublicPreview
            ? "Finish Preview"
            : auth.hasActiveSubscription
              ? "Go To Dashboard"
              : selectedPaymentMethod === "esewa"
                ? "Continue To eSewa"
                : "Select eSewa"
        }
        stepIndex={stepIndex}
        totalSteps={USER_STEPS.length}
        busy={busy}
        busyLabel={busyLabel}
        onNext={nextStep}
        onBack={prevStep}
      />
    </div>
  );

  const renderStep = () => {
    if (isLoadingProfile || isLoadingPlans) {
      return <div className="flex items-center justify-center py-20 text-sm font-medium text-slate-400">Loading profile...</div>;
    }

    switch (currentStep.id as StepId) {
      case "profile": return renderProfileStep();
      case "demographics": return renderDemographicsStep();
      case "goals": return renderGoalsStep();
      case "subscription": return renderSubscriptionStep();
      case "payment": return renderPaymentStep();
      default: return renderProfileStep();
    }
  };

  return <ProfileSetupShell steps={USER_STEPS} stepIndex={stepIndex} currentStep={currentStep} wide={isWideStep}>{renderStep()}</ProfileSetupShell>;
};

export default ProfileSetup;

