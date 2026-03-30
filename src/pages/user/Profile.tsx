import { type ChangeEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Camera,
  Gem,
  Lock,
  Mail,
  PencilLine,
  Save,
  ShieldAlert,
  Target,
  User,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/api/client";
import {
  confirmMyEmailVerificationApi,
  deleteProfileImageApi,
  getMyProfileApi,
  patchMyProfileDetailsApi,
  requestMyEmailVerificationApi,
  uploadProfileImageApi,
} from "@/api/profile.api";
import { getMySubscriptionApi } from "@/api/subscription.api";
import UserLayout from "@/components/user/UserLayout";
import ProfileSecurityModal from "@/components/user/ProfileSecurityModal";
import {
  Field,
  Pill,
  SectionLabel,
  TextInput,
} from "@/components/user/ProfileSetupShell";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { NumberInput } from "@/components/ui/number-input";
import { useAuthState } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type {
  FitnessLevel,
  Gender,
  PrimaryFitnessFocus,
  UpdateUserProfileDetailsRequest,
  UserProfileResponse,
} from "@/models/profile.model";
import { authStore } from "@/store/auth.store";

type ProfileTab = "profile" | "membership" | "goals";
type SecurityModalMode = "change" | "forgot";

interface ProfileFormState {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  gender: string;
  height: string;
  weight: string;
  fitnessLevel: string;
  primaryFocus: string;
}

type ProfileField = keyof ProfileFormState | "verificationOtp";
type ProfileErrors = Partial<Record<ProfileField, string>>;

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const NEPAL_MOBILE_REGEX = /^(98|97)\d{8}$/;

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

const FITNESS_LEVEL_OPTIONS: Array<{ value: FitnessLevel; label: string }> = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

const FITNESS_FOCUS_OPTIONS: Array<{ value: PrimaryFitnessFocus; label: string }> = [
  { value: "HYPERTROPHY", label: "Hypertrophy" },
  { value: "STRENGTH_POWER", label: "Strength & Power" },
  { value: "ENDURANCE_CARDIO", label: "Endurance & Cardio" },
  { value: "FLEXIBILITY_MOBILITY", label: "Flexibility & Mobility" },
  { value: "WEIGHT_LOSS", label: "Weight Loss" },
];

const resolveTab = (search: string): ProfileTab => {
  const tab = new URLSearchParams(search).get("tab");
  if (tab === "membership" || tab === "goals") return tab;
  return "profile";
};

const createProfileForm = (profile: UserProfileResponse): ProfileFormState => ({
  username: profile.userName ?? "",
  firstName: profile.firstName ?? "",
  lastName: profile.lastName ?? "",
  phone: profile.phoneNo ?? "",
  dob: profile.dob ?? "",
  gender: profile.gender ?? "",
  height: profile.height != null ? String(profile.height) : "",
  weight: profile.weight != null ? String(profile.weight) : "",
  fitnessLevel: profile.fitnessLevel ?? "",
  primaryFocus: profile.primaryFitnessFocus ?? "",
});

const toDetailsPayload = (form: ProfileFormState): UpdateUserProfileDetailsRequest => ({
  userName: form.username.trim(),
  firstName: form.firstName.trim() || null,
  lastName: form.lastName.trim() || null,
  phoneNo: form.phone.trim() || null,
  dob: form.dob || null,
  gender: (form.gender || null) as Gender | null,
  height: form.height ? Number(form.height) : null,
  weight: form.weight ? Number(form.weight) : null,
  fitnessLevel: (form.fitnessLevel || null) as FitnessLevel | null,
  primaryFitnessFocus: (form.primaryFocus || null) as PrimaryFitnessFocus | null,
});

const formatMoney = (amount: number) =>
    new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

const buildInitials = (profile?: UserProfileResponse | null, email?: string | null) => {
  const candidate = [profile?.firstName, profile?.lastName]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ")
      .trim();

  const base = candidate || email?.split("@")[0] || "FitPal Member";
  return base
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
};

const syncAuthStatus = (
    profile: Pick<UserProfileResponse, "profileCompleted" | "hasSubscription" | "hasActiveSubscription" | "emailVerified">
) => {
  authStore.updateOnboardingStatus({
    profileCompleted: profile.profileCompleted,
    hasSubscription: profile.hasSubscription,
    hasActiveSubscription: profile.hasActiveSubscription,
    emailVerified: profile.emailVerified,
  });
};

const Profile = () => {
  const auth = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = resolveTab(location.search);
  const [securityModal, setSecurityModal] = useState<SecurityModalMode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [isConfirmingVerification, setIsConfirmingVerification] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [removeProfileImage, setRemoveProfileImage] = useState(false);

  const supportsLocalPassword = (auth.providers ?? []).some((provider) => provider.toUpperCase() === "LOCAL");

  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: getMyProfileApi,
  });

  const subscriptionQuery = useQuery({
    queryKey: ["user-profile-subscription"],
    queryFn: getMySubscriptionApi,
  });

  const profile = profileQuery.data ?? null;
  const subscription = subscriptionQuery.data?.subscription ?? null;

  useEffect(() => {
    if (!profile) return;
    syncAuthStatus(profile);
  }, [profile]);

  useEffect(() => {
    if (!profile || isEditing) return;
    setForm(createProfileForm(profile));
    setErrors({});
    setVerificationOtp("");
    setShowVerificationInput(false);
    setSelectedImageFile(null);
    setRemoveProfileImage(false);
    setSelectedImagePreview((currentPreview) => {
      if (currentPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
      return "";
    });
  }, [isEditing, profile]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const updateField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    setErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const setTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(location.search);
    if (tab === "profile") params.delete("tab");
    else params.set("tab", tab);
    navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : "",
        },
        { replace: true }
    );
  };

  const beginEditing = () => {
    if (!profile) return;
    setForm(createProfileForm(profile));
    setErrors({});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (profile) setForm(createProfileForm(profile));
    setErrors({});
    setIsEditing(false);
    setRemoveProfileImage(false);
    setSelectedImageFile(null);
    setSelectedImagePreview((currentPreview) => {
      if (currentPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
      return "";
    });
  };

  const validateForm = () => {
    if (!form) return false;

    const nextErrors: ProfileErrors = {};
    const username = form.username.trim();
    if (!username) nextErrors.username = "Username is required";
    else if (username.length < 3) nextErrors.username = "At least 3 characters";
    else if (username.length > 50) nextErrors.username = "At most 50 characters";
    else if (!/^[A-Za-z0-9_]+$/.test(username)) nextErrors.username = "Letters, numbers, and underscores only";

    if (form.phone && !NEPAL_MOBILE_REGEX.test(form.phone.trim())) {
      nextErrors.phone = "Must start with 98 or 97 and be exactly 10 digits";
    }

    if (form.dob) {
      const dob = new Date(`${form.dob}T00:00:00`);
      if (Number.isNaN(dob.getTime()) || dob >= new Date()) {
        nextErrors.dob = "Must be a past date";
      }
    }

    if (form.height) {
      const height = Number(form.height);
      if (Number.isNaN(height) || height < 80 || height > 280) {
        nextErrors.height = "Between 80 and 280 cm";
      }
    }

    if (form.weight) {
      const weight = Number(form.weight);
      if (Number.isNaN(weight) || weight < 20 || weight > 300) {
        nextErrors.weight = "Between 20 and 300 kg";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!PROFILE_IMAGE_ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Upload a PNG, JPEG, or WEBP image");
      return;
    }

    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setSelectedImagePreview((currentPreview) => {
      if (currentPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
      return nextPreview;
    });
    setSelectedImageFile(file);
    setRemoveProfileImage(false);
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setSelectedImagePreview((currentPreview) => {
      if (currentPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
      return "";
    });
    setRemoveProfileImage(true);
  };

  const handleSave = async () => {
    if (!profile || !form) return;
    if (!validateForm()) return;

    try {
      setIsSaving(true);

      const detailsResponse = await patchMyProfileDetailsApi(toDetailsPayload(form));
      syncAuthStatus(detailsResponse);

      let latestProfile = detailsResponse;
      if (removeProfileImage && profile.profileImageUrl) {
        latestProfile = await deleteProfileImageApi();
        syncAuthStatus(latestProfile);
      } else if (selectedImageFile) {
        latestProfile = await uploadProfileImageApi(selectedImageFile);
        syncAuthStatus(latestProfile);
      }

      await Promise.all([profileQuery.refetch(), subscriptionQuery.refetch()]);
      setForm(createProfileForm(latestProfile));
      setIsEditing(false);
      setSelectedImageFile(null);
      setRemoveProfileImage(false);
      setSelectedImagePreview((currentPreview) => {
        if (currentPreview.startsWith("blob:")) {
          URL.revokeObjectURL(currentPreview);
        }
        return "";
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update profile"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestVerification = async () => {
    try {
      setIsRequestingVerification(true);
      await requestMyEmailVerificationApi();
      setShowVerificationInput(true);
      toast.success("Verification code sent. Use 123456 for the current dummy flow.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to request verification code"));
    } finally {
      setIsRequestingVerification(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!verificationOtp.trim()) {
      setErrors((current) => ({ ...current, verificationOtp: "Enter the 6-digit OTP" }));
      return;
    }

    try {
      setIsConfirmingVerification(true);
      const response = await confirmMyEmailVerificationApi({ otp: verificationOtp.trim() });
      syncAuthStatus(response);
      setVerificationOtp("");
      setShowVerificationInput(false);
      setErrors((currentErrors) => {
        if (!currentErrors.verificationOtp) return currentErrors;
        const nextErrors = { ...currentErrors };
        delete nextErrors.verificationOtp;
        return nextErrors;
      });
      await profileQuery.refetch();
      toast.success("Email verified successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to verify email"));
    } finally {
      setIsConfirmingVerification(false);
    }
  };

  const displayImageUrl = removeProfileImage
      ? ""
      : selectedImagePreview || profile?.profileImageUrl || "";
  const initials = buildInitials(profile, auth.email);

  if (profileQuery.isLoading || !form) {
    return (
        <UserLayout activeSection="profile" onSectionChange={(s) => navigate("/dashboard", { state: { activeSection: s } })}>
          <div className="flex flex-1 items-center justify-center">
            <div className="text-sm font-semibold text-slate-400">Loading profile...</div>
          </div>
        </UserLayout>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
        <UserLayout activeSection="profile" onSectionChange={(s) => navigate("/dashboard", { state: { activeSection: s } })}>
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-md rounded-[1.5rem] border border-red-500/20 bg-red-500/5 p-6 text-center">
              <p className="text-sm font-bold text-red-200">Profile could not be loaded.</p>
              <p className="mt-2 text-xs text-slate-400">
                {getApiErrorMessage(profileQuery.error, "Try refreshing the page.")}
              </p>
            </div>
          </div>
        </UserLayout>
    );
  }

  return (
      <UserLayout activeSection="profile" onSectionChange={(s) => navigate("/dashboard", { state: { activeSection: s } })}>
        <div className="mx-auto max-w-7xl">
              <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="h-px w-12 bg-orange-600" />
                    <span className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-600">
                    FitPal Account
                  </span>
                  </div>
                  <h1 className="text-4xl font-black uppercase tracking-tight">
                    User <span className="text-orange-500">Profile</span>
                  </h1>
                  <p className="max-w-2xl text-sm text-slate-400">
                    Manage your account details, membership snapshot, training profile, and security settings.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {isEditing ? (
                      <>
                        <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-60"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-2xl bg-button-gradient px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:shadow-[0_0_30px_rgba(234,88,12,0.25)] disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" />
                          {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                      </>
                  ) : (
                      <button
                          type="button"
                          onClick={beginEditing}
                          className="inline-flex items-center gap-2 rounded-2xl bg-button-gradient px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:shadow-[0_0_30px_rgba(234,88,12,0.25)]"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit Profile
                      </button>
                  )}
                </div>
              </header>

              {/* Desktop tab nav */}
              <nav className="mb-8 hidden flex-wrap gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 backdrop-blur-2xl md:flex">
                {([
                  { id: "profile", label: "Profile", icon: User },
                  { id: "membership", label: "Membership", icon: Gem },
                  { id: "goals", label: "Goals", icon: Target },
                ] as const).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTab(tab.id)}
                        className={cn(
                            "flex min-w-[120px] flex-1 items-center justify-center gap-2 rounded-full px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === tab.id
                                ? "bg-orange-600 text-black shadow-[0_0_20px_rgba(234,88,12,0.35)]"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                      <tab.icon className="h-5 w-5" />
                      {tab.label}
                    </button>
                ))}
              </nav>

              {/* Mobile tab nav - inline below header */}
              <nav className="mb-6 flex gap-1 rounded-full border border-white/10 bg-[rgba(15,15,15,0.95)] p-1 shadow-lg backdrop-blur-xl md:hidden">
                {([
                  { id: "profile", label: "Profile", icon: User },
                  { id: "membership", label: "Plan", icon: Gem },
                  { id: "goals", label: "Goals", icon: Target },
                ] as const).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTab(tab.id)}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all",
                            activeTab === tab.id
                                ? "bg-orange-600 text-white"
                                : "text-slate-400"
                        )}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                ))}
              </nav>

              <div className="grid grid-cols-1 gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="hidden space-y-6 xl:block">
                  <div className="rounded-[2rem] border border-white/5 bg-[#111] p-8 shadow-2xl">
                    <div className="relative mx-auto mb-6 h-40 w-40">
                      <div className="absolute inset-0 rounded-[3rem] bg-orange-600/15" />
                      <div className="absolute inset-0 z-10 overflow-hidden rounded-[3rem] border border-white/10 bg-[#0a0a0a]">
                        {displayImageUrl ? (
                            <img src={displayImageUrl} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-5xl font-black italic text-orange-500">
                              {initials}
                            </div>
                        )}
                      </div>
                      {isEditing && (
                          <label className="absolute bottom-2 right-2 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/70 text-white transition-all hover:bg-orange-600">
                            <Camera className="h-4 w-4" />
                            <input
                                type="file"
                                accept={PROFILE_IMAGE_ACCEPTED_TYPES.join(",")}
                                className="hidden"
                                onChange={handleImageSelect}
                            />
                          </label>
                      )}
                    </div>

                    <div className="text-center">
                      <h2 className="text-2xl font-black uppercase italic">
                        {[profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.userName}
                      </h2>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">
                        {profile.email}
                      </p>
                      <p className="mt-3 text-xs text-slate-400">
                        {profile.hasActiveSubscription
                            ? "Active member with subscription access."
                            : profile.hasSubscription
                                ? "Membership selected. Activation is pending."
                                : "Profile saved. No subscription selected yet."}
                      </p>
                    </div>

                    {isEditing && (
                        <div className="mt-6 flex flex-wrap gap-3">
                          <label className="flex-1 cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 hover:text-white">
                            Change Photo
                            <input
                                type="file"
                                accept={PROFILE_IMAGE_ACCEPTED_TYPES.join(",")}
                                className="hidden"
                                onChange={handleImageSelect}
                            />
                          </label>
                          <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                          >
                            Remove
                          </button>
                        </div>
                    )}
                  </div>

                  <div className="rounded-[2rem] border border-white/5 bg-[#111] p-6">
                    <SectionLabel className="!mb-4">Quick Snapshot</SectionLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-4 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Weight</p>
                        <p className="mt-2 text-xl font-black text-white">
                          {form.weight ? `${form.weight} kg` : "Not set"}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-4 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Height</p>
                        <p className="mt-2 text-xl font-black text-white">
                          {form.height ? `${form.height} cm` : "Not set"}
                        </p>
                      </div>
                      <div className="col-span-2 rounded-3xl border border-white/5 bg-[#0a0a0a] p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Focus</p>
                        <p className="mt-2 text-sm font-bold text-white">
                          {FITNESS_FOCUS_OPTIONS.find((option) => option.value === form.primaryFocus)?.label || "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                <section className="rounded-[2rem] border border-white/5 bg-gradient-to-br from-[#111] to-[#0a0a0a] p-6 lg:p-8">
                  {activeTab === "profile" && (
                      <div className="space-y-10">
                        <div>
                          <SectionLabel>Personal Information</SectionLabel>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Username" error={errors.username}>
                              <TextInput
                                  value={form.username}
                                  disabled={!isEditing}
                                  onChange={(event) => updateField("username", event.target.value)}
                              />
                            </Field>
                            <Field label="Email">
                              <TextInput value={profile.email} disabled />
                            </Field>
                            <Field label="First Name">
                              <TextInput
                                  value={form.firstName}
                                  disabled={!isEditing}
                                  onChange={(event) => updateField("firstName", event.target.value)}
                              />
                            </Field>
                            <Field label="Last Name">
                              <TextInput
                                  value={form.lastName}
                                  disabled={!isEditing}
                                  onChange={(event) => updateField("lastName", event.target.value)}
                              />
                            </Field>
                            <Field label="Phone No" error={errors.phone}>
                              <TextInput
                                  type="tel"
                                  inputMode="numeric"
                                  pattern="(98|97)[0-9]{8}"
                                  maxLength={10}
                                  value={form.phone}
                                  disabled={!isEditing}
                                  onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 10))}
                              />
                            </Field>
                            <Field label="Date of Birth" error={errors.dob}>
                              <CustomDatePicker
                                  value={form.dob}
                                  onChange={(value) => updateField("dob", value)}
                                  disabled={!isEditing}
                                  invalid={Boolean(errors.dob)}
                              />
                            </Field>
                            <Field label="Gender">
                              <div className="space-y-2">
                                <CustomSelect
                                    options={GENDER_OPTIONS}
                                    value={form.gender}
                                    onChange={(value) => updateField("gender", value)}
                                    disabled={!isEditing}
                                />
                                {isEditing && form.gender && (
                                    <button
                                        type="button"
                                        onClick={() => updateField("gender", "")}
                                        className="text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
                                    >
                                      Clear gender
                                    </button>
                                )}
                              </div>
                            </Field>
                          </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-white/8 bg-[#101010] p-5">
                          <SectionLabel className="!mb-4">Email Verification</SectionLabel>
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {profile.emailVerified ? (
                                      <BadgeCheck className="h-5 w-5 text-emerald-400" />
                                  ) : (
                                      <ShieldAlert className="h-5 w-5 text-amber-400" />
                                  )}
                                  <p className="text-sm font-black text-white">{profile.email}</p>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                  {profile.emailVerified
                                      ? "Your email is verified."
                                      : "Verify your email to complete the current security state."}
                                </p>
                              </div>
                              {!profile.emailVerified && (
                                  <button
                                      type="button"
                                      onClick={handleRequestVerification}
                                      disabled={isRequestingVerification}
                                      className="rounded-full border border-orange-600/20 bg-orange-600/15 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-orange-300 transition-all hover:bg-orange-600 hover:text-black disabled:opacity-60"
                                  >
                                    {isRequestingVerification ? "Sending..." : "Request OTP"}
                                  </button>
                              )}
                            </div>

                            {!profile.emailVerified && (showVerificationInput || verificationOtp) && (
                                <div className="rounded-2xl border border-orange-600/20 bg-orange-600/5 p-4">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <Field label="Verification OTP" error={errors.verificationOtp} className="flex-1">
                                      <TextInput
                                          maxLength={6}
                                          inputMode="numeric"
                                          placeholder="123456"
                                          value={verificationOtp}
                                          onChange={(event) => {
                                            setVerificationOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                                            setErrors((currentErrors) => {
                                              if (!currentErrors.verificationOtp) return currentErrors;
                                              const nextErrors = { ...currentErrors };
                                              delete nextErrors.verificationOtp;
                                              return nextErrors;
                                            });
                                          }}
                                      />
                                    </Field>
                                    <button
                                        type="button"
                                        onClick={handleConfirmVerification}
                                        disabled={isConfirmingVerification}
                                        className="rounded-2xl bg-button-gradient px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:shadow-[0_0_24px_rgba(234,88,12,0.25)] disabled:opacity-60"
                                    >
                                      {isConfirmingVerification ? "Verifying..." : "Verify Email"}
                                    </button>
                                  </div>
                                  <p className="mt-3 text-[11px] text-orange-200">
                                    Dummy flow: use OTP `123456`.
                                  </p>
                                </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-white/8 bg-[#101010] p-5">
                          <SectionLabel className="!mb-4">Security</SectionLabel>
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-white">Password Management</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {supportsLocalPassword
                                    ? "Change your local password or trigger the forgot-password flow."
                                    : "This account uses a third-party provider and does not support local password changes."}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button
                                  type="button"
                                  onClick={() => setSecurityModal("change")}
                                  disabled={!supportsLocalPassword}
                                  className="rounded-xl bg-button-gradient px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:shadow-[0_0_20px_rgba(234,88,12,0.25)] disabled:opacity-40"
                              >
                                <Lock className="mr-2 inline h-4 w-4" />
                                Change Password
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setSecurityModal("forgot")}
                                  disabled={!supportsLocalPassword}
                                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40"
                              >
                                <Mail className="mr-2 inline h-4 w-4" />
                                Forgot Password
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                  )}

                  {activeTab === "membership" && (
                      <div className="space-y-8">
                        <SectionLabel>Membership</SectionLabel>
                        {subscription ? (
                            <>
                              <div className="rounded-[2rem] border border-orange-600/25 bg-[linear-gradient(135deg,rgba(234,88,12,0.18)_0%,rgba(15,15,15,0.95)_100%)] p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div>
                                    <p className="text-3xl font-black uppercase text-white">{subscription.planName}</p>
                                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                                      {subscription.planType} · {subscription.billingCycle}
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">
                              {subscription.subscriptionStatus}
                            </span>
                                </div>
                                <div className="mt-6 grid gap-4 md:grid-cols-4">
                                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Base</p>
                                    <p className="mt-2 text-lg font-black text-white">{formatMoney(subscription.baseAmount)}</p>
                                  </div>
                                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Billed</p>
                                    <p className="mt-2 text-lg font-black text-white">{formatMoney(subscription.billedAmount)}</p>
                                  </div>
                                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tax</p>
                                    <p className="mt-2 text-lg font-black text-white">{formatMoney(subscription.taxAmount)}</p>
                                  </div>
                                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total</p>
                                    <p className="mt-2 text-lg font-black text-white">{formatMoney(subscription.totalAmount)}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-[1.5rem] border border-white/6 bg-[#101010] p-5">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
                                  <p className="mt-2 text-sm font-bold text-white">
                                    {subscription.hasActiveSubscription ? "Active subscription" : "Pending activation"}
                                  </p>
                                </div>
                                <div className="rounded-[1.5rem] border border-white/6 bg-[#101010] p-5">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Auto Renew</p>
                                  <p className="mt-2 text-sm font-bold text-white">
                                    {subscription.autoRenew ? "Enabled" : "Disabled"}
                                  </p>
                                </div>
                                <div className="rounded-[1.5rem] border border-white/6 bg-[#101010] p-5">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discount</p>
                                  <p className="mt-2 text-sm font-bold text-white">
                                    {subscription.discountAmount > 0
                                        ? `${formatMoney(subscription.discountAmount)} (${subscription.discountPercent.toFixed(0)}%)`
                                        : "No discount"}
                                  </p>
                                </div>
                              </div>
                            </>
                        ) : (
                            <div className="rounded-[1.75rem] border border-white/8 bg-[#101010] p-6">
                              <p className="text-sm font-bold text-white">No subscription selected yet.</p>
                              <p className="mt-2 text-xs text-slate-400">
                                Choose a membership in the profile setup flow when you are ready to activate access.
                              </p>
                            </div>
                        )}
                      </div>
                  )}

                  {activeTab === "goals" && (
                      <div className="space-y-8">
                        <div>
                          <SectionLabel>Body Metrics</SectionLabel>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Weight (kg)" error={errors.weight}>
                              <NumberInput
                                  min={20}
                                  max={300}
                                  step={0.5}
                                  value={form.weight}
                                  disabled={!isEditing}
                                  onChange={(event) => updateField("weight", event.target.value)}
                              />
                            </Field>
                            <Field label="Height (cm)" error={errors.height}>
                              <NumberInput
                                  min={80}
                                  max={280}
                                  step={1}
                                  value={form.height}
                                  disabled={!isEditing}
                                  onChange={(event) => updateField("height", event.target.value)}
                              />
                            </Field>
                          </div>
                        </div>

                        <div>
                          <SectionLabel>Fitness Level</SectionLabel>
                          <div className="flex flex-wrap gap-2">
                            {FITNESS_LEVEL_OPTIONS.map((option) => (
                                <Pill
                                    key={option.value}
                                    label={option.label}
                                    selected={form.fitnessLevel === option.value}
                                    onClick={() => {
                                      if (!isEditing) return;
                                      updateField(
                                          "fitnessLevel",
                                          form.fitnessLevel === option.value ? "" : option.value
                                      );
                                    }}
                                />
                            ))}
                          </div>
                        </div>

                        <div>
                          <SectionLabel>Primary Focus</SectionLabel>
                          <div className="flex flex-wrap gap-2">
                            {FITNESS_FOCUS_OPTIONS.map((option) => (
                                <Pill
                                    key={option.value}
                                    label={option.label}
                                    selected={form.primaryFocus === option.value}
                                    onClick={() => {
                                      if (!isEditing) return;
                                      updateField(
                                          "primaryFocus",
                                          form.primaryFocus === option.value ? "" : option.value
                                      );
                                    }}
                                />
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-[1.5rem] border border-blue-500/20 bg-blue-500/5 p-5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">Current Level</p>
                            <p className="mt-2 text-lg font-black text-white">
                              {FITNESS_LEVEL_OPTIONS.find((option) => option.value === form.fitnessLevel)?.label || "Not set"}
                            </p>
                          </div>
                          <div className="rounded-[1.5rem] border border-green-500/20 bg-green-500/5 p-5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-green-300">Primary Focus</p>
                            <p className="mt-2 text-lg font-black text-white">
                              {FITNESS_FOCUS_OPTIONS.find((option) => option.value === form.primaryFocus)?.label || "Not set"}
                            </p>
                          </div>
                          <div className="rounded-[1.5rem] border border-orange-500/20 bg-orange-500/5 p-5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-orange-300">Readiness</p>
                            <p className="mt-2 text-lg font-black text-white">
                              {profile.hasActiveSubscription ? "Gym-ready" : "Profile-ready"}
                            </p>
                          </div>
                        </div>
                      </div>
                  )}
                </section>
              </div>
            </div>
        <ProfileSecurityModal
            open={securityModal !== null}
            mode={securityModal ?? "change"}
            email={profile.email}
            supportsLocalPassword={supportsLocalPassword}
            onClose={() => setSecurityModal(null)}
        />
      </UserLayout>
  );
};

export default Profile;
