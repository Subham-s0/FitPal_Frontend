
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authStore } from "@/store/auth.store";
import { useAuthState } from "@/hooks/useAuth";
import {
  Field,
  Pill,
  ProfileSetupShell,
  SectionLabel,
  SetupActions,
  TextInput,
  type StepDefinition,
} from "./ProfileSetup.shared";

type StepId = "gymInfo" | "location" | "docs" | "done";

interface GymSetupState {
  gymName: string;
  gymType: string;
  memberCapacity: string;
  establishedYear: string;
  description: string;
  gymEmail: string;
  gymEmailVerified: boolean;
  branchName: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  phone: string;
  opensAt: string;
  closesAt: string;
  registrationFileName: string;
  licenseFileName: string;
}

type GymField = keyof GymSetupState;
type GymValidationErrors = Partial<Record<GymField, string>>;

const GYM_STEPS: StepDefinition[] = [
  { id: "gymInfo", label: "Gym Info", titlePrefix: "Tell Us About", titleAccent: "Your Gym", subtitle: "Basic details used when members discover your gym." },
  { id: "location", label: "Location", titlePrefix: "Add Your", titleAccent: "Location", subtitle: "Members rely on these details to find and contact your branch." },
  { id: "docs", label: "Documents", titlePrefix: "Upload Your", titleAccent: "Documents", subtitle: "Business documents help us review and verify your gym faster." },
  { id: "done", label: "Done", titlePrefix: "Application", titleAccent: "Submitted", subtitle: "Your gym profile has been submitted and your dashboard is ready." },
];

const GYM_TYPE_OPTIONS = ["Commercial", "CrossFit", "Yoga", "Martial Arts", "Pilates", "Functional"];
const INITIAL_GYM_STATE: GymSetupState = {
  gymName: "", gymType: "", memberCapacity: "", establishedYear: "", description: "", gymEmail: "", gymEmailVerified: false, branchName: "", streetAddress: "", city: "", postalCode: "", phone: "", opensAt: "06:00", closesAt: "22:00", registrationFileName: "", licenseFileName: "",
};

const GymProfileSetup = () => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gymData, setGymData] = useState<GymSetupState>(INITIAL_GYM_STATE);
  const [gymErrors, setGymErrors] = useState<GymValidationErrors>({});

  const currentStep = GYM_STEPS[stepIndex] ?? GYM_STEPS[0];
  const displayName = auth.email?.split("@")[0] || "Gym Owner";
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111&color=fb923c`;
  const summaryItems = useMemo(
    () => [
      { label: "Business profile", description: "Gym name, type, and capacity.", done: Boolean(gymData.gymName && gymData.gymType && gymData.memberCapacity) },
      { label: "Branch details", description: "Address, phone, and operating hours.", done: Boolean(gymData.branchName && gymData.streetAddress && gymData.city && gymData.phone) },
      { label: "Verification", description: "Registration and permit documents.", done: Boolean(gymData.registrationFileName && gymData.licenseFileName) },
    ],
    [gymData],
  );

  const clearError = (field: GymField) => {
    setGymErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateStep = (step: "gymInfo" | "location" | "docs") => {
    const nextErrors: GymValidationErrors = {};
    const currentYear = new Date().getFullYear();

    if (step === "gymInfo") {
      if (!gymData.gymName.trim()) nextErrors.gymName = "Gym name is required";
      if (!gymData.gymType) nextErrors.gymType = "Select your gym type";
      if (!gymData.memberCapacity) nextErrors.memberCapacity = "Member capacity is required";
      else if (Number(gymData.memberCapacity) <= 0) nextErrors.memberCapacity = "Must be greater than 0";
      if (!gymData.establishedYear) nextErrors.establishedYear = "Established year is required";
      else if (Number(gymData.establishedYear) < 1950 || Number(gymData.establishedYear) > currentYear) nextErrors.establishedYear = `Between 1950 and ${currentYear}`;
      if (!gymData.description.trim()) nextErrors.description = "Add a short description of your gym";
    }

    if (step === "location") {
      if (!gymData.branchName.trim()) nextErrors.branchName = "Branch name is required";
      if (!gymData.streetAddress.trim()) nextErrors.streetAddress = "Street address is required";
      if (!gymData.city.trim()) nextErrors.city = "City is required";
      if (!gymData.phone.trim()) nextErrors.phone = "Phone number is required";
    }

    if (step === "docs") {
      if (!gymData.registrationFileName) nextErrors.registrationFileName = "Registration file is required";
      if (!gymData.licenseFileName) nextErrors.licenseFileName = "License file is required";
    }

    setGymErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const completeSetup = async () => {
    setIsSubmitting(true);
    authStore.updateOnboardingStatus({
      profileCompleted: true,
      hasSubscription: auth.hasSubscription,
      hasActiveSubscription: auth.hasActiveSubscription,
    });
    toast.success("Gym profile submitted for review");
    setStepIndex(3);
    setIsSubmitting(false);
  };

  const nextStep = async () => {
    if (isSubmitting) return;
    if (currentStep.id === "done") {
      navigate("/dashboard");
      return;
    }
    if (currentStep.id === "gymInfo") {
      if (!validateStep("gymInfo")) return;
      setStepIndex(1);
      return;
    }
    if (currentStep.id === "location") {
      if (!validateStep("location")) return;
      setStepIndex(2);
      return;
    }
    if (!validateStep("docs")) return;
    await completeSetup();
  };

  const prevStep = () => setStepIndex((prev) => Math.max(0, prev - 1));

  const renderGymInfoStep = () => (
    <div className="animate-[screenFadeIn_0.2s_ease-out]">
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-orange-600 p-0.5">
          <img src={fallbackAvatar} alt={displayName} className="h-full w-full rounded-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-white">{auth.email || displayName}</p>
          <span className="text-[11px] font-medium text-emerald-400">Registered as owner</span>
        </div>
        <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-black">Gym Owner</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-[1.35rem] border border-white/8 bg-[#101010] p-5">
          <SectionLabel>Gym Information</SectionLabel>
          <Field label="Gym Name" error={gymErrors.gymName} className="mb-4">
            <TextInput type="text" placeholder="FitZone Kathmandu" value={gymData.gymName} onChange={(event) => { setGymData((prev) => ({ ...prev, gymName: event.target.value })); clearError("gymName"); }} />
          </Field>
          <Field label="Gym Type" error={gymErrors.gymType} className="mb-4">
            <div className="mt-1 flex flex-wrap gap-2">
              {GYM_TYPE_OPTIONS.map((option) => (
                <Pill key={option} label={option} selected={gymData.gymType === option} onClick={() => { setGymData((prev) => ({ ...prev, gymType: prev.gymType === option ? "" : option })); clearError("gymType"); }} />
              ))}
            </div>
          </Field>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Member Capacity" error={gymErrors.memberCapacity}>
              <TextInput type="number" placeholder="150" value={gymData.memberCapacity} onChange={(event) => { setGymData((prev) => ({ ...prev, memberCapacity: event.target.value })); clearError("memberCapacity"); }} />
            </Field>
            <Field label="Year Established" error={gymErrors.establishedYear}>
              <TextInput type="number" placeholder="2018" value={gymData.establishedYear} onChange={(event) => { setGymData((prev) => ({ ...prev, establishedYear: event.target.value })); clearError("establishedYear"); }} />
            </Field>
          </div>
          <Field label="Description" error={gymErrors.description}>
            <textarea
              placeholder="Describe your gym facilities and specialties..."
              value={gymData.description}
              onChange={(event) => { setGymData((prev) => ({ ...prev, description: event.target.value })); clearError("description"); }}
              className="min-h-[96px] w-full resize-y rounded-2xl border border-white/8 bg-[#0a0a0a] px-4 py-3.5 text-sm font-medium text-slate-200 outline-none transition-all placeholder:text-slate-700 focus:border-orange-600/60"
            />
          </Field>
        </div>

        <div className="rounded-[1.35rem] border border-white/8 bg-[#101010] p-5">
          <SectionLabel>What We Need</SectionLabel>
          <div className="space-y-3">
            {summaryItems.map((item, index) => (
              <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${item.done ? "bg-orange-500 text-black" : "bg-white/5 text-slate-400"}`}>{item.done ? "OK" : index + 1}</div>
                <div>
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="text-[12px] leading-relaxed text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SetupActions nextLabel="Continue" stepIndex={stepIndex} totalSteps={GYM_STEPS.length} busy={isSubmitting} busyLabel="Submitting..." onNext={nextStep} onBack={prevStep} hideBack />
    </div>
  );

  const renderGymLocationStep = () => (
    <div className="animate-[screenFadeIn_0.2s_ease-out]">
      <SectionLabel>Branch Location</SectionLabel>
      <div className="flex flex-col gap-4">
        <Field label="Branch Name" error={gymErrors.branchName}><TextInput type="text" placeholder="Main Branch" value={gymData.branchName} onChange={(event) => { setGymData((prev) => ({ ...prev, branchName: event.target.value })); clearError("branchName"); }} /></Field>
        <Field label="Street Address" error={gymErrors.streetAddress}><TextInput type="text" placeholder="123 Durbar Marg" value={gymData.streetAddress} onChange={(event) => { setGymData((prev) => ({ ...prev, streetAddress: event.target.value })); clearError("streetAddress"); }} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" error={gymErrors.city}><TextInput type="text" placeholder="Kathmandu" value={gymData.city} onChange={(event) => { setGymData((prev) => ({ ...prev, city: event.target.value })); clearError("city"); }} /></Field>
          <Field label="Postal Code" error={gymErrors.postalCode}><TextInput type="text" placeholder="44600" value={gymData.postalCode} onChange={(event) => { setGymData((prev) => ({ ...prev, postalCode: event.target.value })); clearError("postalCode"); }} /></Field>
        </div>
        <Field label="Phone" error={gymErrors.phone}><TextInput type="tel" placeholder="+977 01-xxxxxxx" value={gymData.phone} onChange={(event) => { setGymData((prev) => ({ ...prev, phone: event.target.value })); clearError("phone"); }} /></Field>
      </div>

      <SectionLabel className="mt-6">Operating Hours</SectionLabel>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Opens At"><TextInput type="time" value={gymData.opensAt} onChange={(event) => setGymData((prev) => ({ ...prev, opensAt: event.target.value }))} /></Field>
        <Field label="Closes At"><TextInput type="time" value={gymData.closesAt} onChange={(event) => setGymData((prev) => ({ ...prev, closesAt: event.target.value }))} /></Field>
      </div>

      <SetupActions nextLabel="Continue" stepIndex={stepIndex} totalSteps={GYM_STEPS.length} busy={isSubmitting} busyLabel="Submitting..." onNext={nextStep} onBack={prevStep} />
    </div>
  );

  const renderGymDocsStep = () => (
    <div className="animate-[screenFadeIn_0.2s_ease-out]">
      <SectionLabel>Verification Documents</SectionLabel>
      <p className="mb-5 text-[13px] leading-relaxed text-slate-500">Files are encrypted and reviewed securely before verification.</p>
      <Field label="Business Registration Certificate" error={gymErrors.registrationFileName} className="mb-4">
        <button type="button" onClick={() => { setGymData((prev) => ({ ...prev, registrationFileName: "registration_cert.pdf" })); clearError("registrationFileName"); }} className="w-full rounded-2xl border border-dashed border-white/20 bg-[#0a0a0a] px-4 py-4 text-center text-sm font-semibold text-slate-400 transition-all hover:border-orange-600/50 hover:bg-orange-600/5 hover:text-white">
          {gymData.registrationFileName || "+ Click to upload"}
        </button>
      </Field>
      <Field label="Operating License / Permit" error={gymErrors.licenseFileName}>
        <button type="button" onClick={() => { setGymData((prev) => ({ ...prev, licenseFileName: "gym_license.pdf" })); clearError("licenseFileName"); }} className="w-full rounded-2xl border border-dashed border-white/20 bg-[#0a0a0a] px-4 py-4 text-center text-sm font-semibold text-slate-400 transition-all hover:border-orange-600/50 hover:bg-orange-600/5 hover:text-white">
          {gymData.licenseFileName || "+ Click to upload"}
        </button>
      </Field>
      <SetupActions nextLabel="Submit Application" stepIndex={stepIndex} totalSteps={GYM_STEPS.length} busy={isSubmitting} busyLabel="Submitting..." onNext={nextStep} onBack={prevStep} />
    </div>
  );

  const renderGymDoneStep = () => (
    <div className="animate-[screenFadeIn_0.2s_ease-out] py-6 text-center">
      <div className="mx-auto mb-5 flex h-[66px] w-[66px] items-center justify-center rounded-full border border-orange-600/35 bg-orange-600/10 shadow-[0_0_30px_rgba(234,88,12,0.14)]">
        <svg width="28" height="28" fill="none" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="13" stroke="#ea580c" strokeWidth="2" />
          <path d="M18 12v7l5 2.5" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="mb-2 text-2xl font-black uppercase tracking-tight">Pending Review</h3>
      <p className="mx-auto mb-7 max-w-[440px] text-sm leading-relaxed text-slate-400">Your gym submission is queued for verification. We&apos;ll notify you once review is complete.</p>
      <button type="button" onClick={() => navigate("/dashboard")} className="rounded-xl border border-white/15 bg-white/10 px-8 py-3.5 text-xs font-black uppercase tracking-[0.14em] text-white transition-all hover:bg-white/15">Go To Dashboard</button>
    </div>
  );

  const renderStep = () => {
    switch (currentStep.id as StepId) {
      case "gymInfo": return renderGymInfoStep();
      case "location": return renderGymLocationStep();
      case "docs": return renderGymDocsStep();
      case "done": return renderGymDoneStep();
      default: return renderGymInfoStep();
    }
  };

  return <ProfileSetupShell steps={GYM_STEPS} stepIndex={stepIndex} currentStep={currentStep}>{renderStep()}</ProfileSetupShell>;
};

export default GymProfileSetup;

