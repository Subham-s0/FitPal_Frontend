import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";

import {
  aiRoutineQueryKeys,
  getAiRoutineBootstrapApi,
} from "@/features/routines/aiRoutineApi";
import type {
  AiCanonicalLift,
  AiLiftSnapshotResponse,
  AiRoutineBootstrapResponse,
  EquipmentPreference,
  GenerateRoutineSuggestionsRequest,
} from "@/features/routines/aiRoutineTypes";
import type { PrimaryFitnessFocus } from "@/features/profile/model";
import { getApiErrorMessage } from "@/shared/api/client";
import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

interface AiRoutineGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerateRequest: (request: GenerateRoutineSuggestionsRequest) => void;
}

interface LiftFormState {
  enabled: boolean;
  weight: string;
  reps: string;
}

interface AiRoutineFormState {
  daysPerWeek: string;
  equipmentPreferences: EquipmentPreference[];
  routineGoal: PrimaryFitnessFocus | "";
  strengthInputs: Record<AiCanonicalLift, LiftFormState>;
}

interface AiRoutineFormErrors {
  daysPerWeek?: string;
  equipmentPreferences?: string;
  lifts?: Partial<Record<AiCanonicalLift, string>>;
}

interface QuestionCardProps {
  number: number;
  title: string;
  description: string;
  mobileDescription?: string;
  children: React.ReactNode;
}

const PROFILE_DEFAULT_GOAL = "__PROFILE_DEFAULT__";

const GOAL_OPTIONS: Array<{ value: PrimaryFitnessFocus; label: string }> = [
  { value: "HYPERTROPHY", label: "Hypertrophy" },
  { value: "STRENGTH_POWER", label: "Strength & Power" },
  { value: "ENDURANCE_CARDIO", label: "Endurance & Cardio" },
  { value: "FLEXIBILITY_MOBILITY", label: "Flexibility & Mobility" },
  { value: "WEIGHT_LOSS", label: "Weight Loss" },
];

const EQUIPMENT_OPTIONS: Array<{ value: EquipmentPreference; label: string; description: string }> = [
  { value: "ALL", label: "All equipment", description: "Use every equipment type in your exercise library plus bodyweight." },
  { value: "NONE", label: "No equipment", description: "Only bodyweight or no-equipment movements." },
  { value: "DUMBBELL", label: "Dumbbell", description: "Allow dumbbell-based exercises." },
  { value: "MACHINE", label: "Machine", description: "Allow selectorized or plate-loaded machines." },
  { value: "BARBELL", label: "Barbell", description: "Allow barbell movements." },
];

const LIFT_ORDER: AiCanonicalLift[] = [
  "BENCH_PRESS",
  "SQUAT",
  "DEADLIFT",
  "SHOULDER_PRESS",
];

const LIFT_FIELD_MAP: Record<AiCanonicalLift, keyof GenerateRoutineSuggestionsRequest["strengthInputs"]> = {
  BENCH_PRESS: "benchPress",
  SQUAT: "squat",
  DEADLIFT: "deadlift",
  SHOULDER_PRESS: "shoulderPress",
};

function createEmptyLiftState(): LiftFormState {
  return {
    enabled: false,
    weight: "",
    reps: "",
  };
}

function createInitialForm(): AiRoutineFormState {
  return {
    daysPerWeek: "",
    equipmentPreferences: [],
    routineGoal: "",
    strengthInputs: {
      BENCH_PRESS: createEmptyLiftState(),
      SQUAT: createEmptyLiftState(),
      DEADLIFT: createEmptyLiftState(),
      SHOULDER_PRESS: createEmptyLiftState(),
    },
  };
}

function createFormFromBootstrap(_bootstrap: AiRoutineBootstrapResponse): AiRoutineFormState {
  return createInitialForm();
}

function formatGoal(value: PrimaryFitnessFocus | null | undefined): string {
  switch (value) {
    case "HYPERTROPHY":
      return "Hypertrophy";
    case "STRENGTH_POWER":
      return "Strength & Power";
    case "ENDURANCE_CARDIO":
      return "Endurance & Cardio";
    case "FLEXIBILITY_MOBILITY":
      return "Flexibility & Mobility";
    case "WEIGHT_LOSS":
      return "Weight Loss";
    default:
      return "Not set";
  }
}

function formatLiftName(value: AiCanonicalLift): string {
  switch (value) {
    case "BENCH_PRESS":
      return "Bench Press";
    case "SQUAT":
      return "Squat";
    case "DEADLIFT":
      return "Deadlift";
    case "SHOULDER_PRESS":
      return "Shoulder Press";
    default:
      return value;
  }
}

function formatMissingProfileField(field: string): string {
  switch (field) {
    case "weight":
      return "Weight";
    case "height":
      return "Height";
    case "gender":
      return "Gender";
    case "fitnessLevel":
      return "Fitness level";
    case "primaryFitnessFocus":
      return "Primary fitness focus";
    default:
      return field;
  }
}

function resolveProfileTabForMissingFields(
  missingFields: string[] | undefined
): "profile" | "goals" {
  const firstMissingField = missingFields?.[0];

  switch (firstMissingField) {
    case "gender":
      return "profile";
    case "weight":
    case "height":
    case "fitnessLevel":
    case "primaryFitnessFocus":
    default:
      return "goals";
  }
}

function getLiftSnapshot(
  bootstrap: AiRoutineBootstrapResponse | undefined,
  lift: AiCanonicalLift
): AiLiftSnapshotResponse | null {
  if (!bootstrap) {
    return null;
  }

  switch (lift) {
    case "BENCH_PRESS":
      return bootstrap.strengthSnapshot.benchPress;
    case "SQUAT":
      return bootstrap.strengthSnapshot.squat;
    case "DEADLIFT":
      return bootstrap.strengthSnapshot.deadlift;
    case "SHOULDER_PRESS":
      return bootstrap.strengthSnapshot.shoulderPress;
    default:
      return null;
  }
}

function formatSnapshotSummary(snapshot: AiLiftSnapshotResponse | null): string {
  if (!snapshot) {
    return "No usable history yet";
  }

  const sourceLabel = snapshot.source === "USER_INPUT" ? "Manual input" : "History";
  return `${snapshot.bestSetWeight} x ${snapshot.bestSetReps} (${sourceLabel})`;
}

function QuestionCard({
  number,
  title,
  description,
  mobileDescription,
  children,
}: QuestionCardProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] text-xs font-black text-slate-200">
          {number}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="text-xs font-black uppercase tracking-[0.1em] text-white sm:text-sm">{title}</h3>
          {mobileDescription ? (
            <>
              <p className="text-[11px] leading-snug text-slate-400 sm:hidden">{mobileDescription}</p>
              <p className="hidden text-[11px] leading-snug text-slate-400 sm:block sm:text-xs">{description}</p>
            </>
          ) : (
            <p className="text-[11px] leading-snug text-slate-400 sm:text-xs">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-3 sm:pl-12">{children}</div>
    </section>
  );
}

function validateDaysField(daysPerWeek: string): string | undefined {
  const dayCount = Number(daysPerWeek);
  if (!daysPerWeek.trim() || Number.isNaN(dayCount) || dayCount < 2 || dayCount > 7) {
    return "Enter a number from 2 to 7.";
  }
  return undefined;
}

function validateEquipmentField(prefs: EquipmentPreference[]): string | undefined {
  if (prefs.length === 0) {
    return "Choose at least one equipment option.";
  }
  return undefined;
}

function validateLiftField(lift: AiCanonicalLift, liftState: LiftFormState): string | undefined {
  if (!liftState.enabled) {
    return undefined;
  }

  const weight = Number(liftState.weight);
  const reps = Number(liftState.reps);
  if (
    !liftState.weight.trim() ||
    Number.isNaN(weight) ||
    weight <= 0 ||
    !liftState.reps.trim() ||
    Number.isNaN(reps) ||
    reps < 1 ||
    reps > 20
  ) {
    return "Provide a valid weight and reps to include this lift.";
  }
  return undefined;
}

export default function AiRoutineGenerationDialog({
  open,
  onOpenChange,
  onGenerateRequest,
}: AiRoutineGenerationDialogProps) {
  const navigate = useNavigate();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<AiRoutineFormState>(createInitialForm);
  const [errors, setErrors] = useState<AiRoutineFormErrors>({});
  const [wizardStep, setWizardStep] = useState(0);
  const [mobileDialogStyle, setMobileDialogStyle] = useState<CSSProperties | undefined>();
  /** Profile/history summary before numbered questions (not counted as a step). */
  const [preambleSeen, setPreambleSeen] = useState(false);

  const bootstrapQuery = useQuery({
    queryKey: aiRoutineQueryKeys.bootstrap(),
    queryFn: getAiRoutineBootstrapApi,
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (open) {
      setWizardStep(0);
      setPreambleSeen(true);
      return;
    }

    setForm(createInitialForm());
    setErrors({});
    setWizardStep(0);
    setPreambleSeen(true);
  }, [open]);

  useEffect(() => {
    if (!open || !bootstrapQuery.data) {
      return;
    }

    setForm(createFormFromBootstrap(bootstrapQuery.data));
    setErrors({});
    setWizardStep(0);
    setPreambleSeen(true);
  }, [bootstrapQuery.data, open]);

  const bootstrap = bootstrapQuery.data;
  const missingManualLifts = useMemo(
    () => LIFT_ORDER.filter((lift) => bootstrap?.liftsMissingSnapshot.includes(lift)),
    [bootstrap]
  );

  const historyLifts = useMemo(
    () =>
      LIFT_ORDER.filter((lift) => {
        if (!bootstrap) {
          return false;
        }
        return !bootstrap.liftsMissingSnapshot.includes(lift) && getLiftSnapshot(bootstrap, lift);
      }),
    [bootstrap]
  );

  /** Last step index: 0=days, 1=equipment, 2=goal, 3..2+n=lifts, 3+n=submit (n = missing lifts). */
  const submitStepIndex = 3 + missingManualLifts.length;
  const totalQuestionSteps = submitStepIndex + 1;

  const updateLiftField = (lift: AiCanonicalLift, patch: Partial<LiftFormState>) => {
    setForm((prev) => ({
      ...prev,
      strengthInputs: {
        ...prev.strengthInputs,
        [lift]: {
          ...prev.strengthInputs[lift],
          ...patch,
        },
      },
    }));

    setErrors((prev) => ({
      ...prev,
      lifts: prev.lifts ? { ...prev.lifts, [lift]: undefined } : prev.lifts,
    }));
  };

  const handleToggleEquipment = (equipment: EquipmentPreference, checked: boolean) => {
    setForm((prev) => {
      const next = new Set(prev.equipmentPreferences);
      if (checked) {
        next.add(equipment);
      } else {
        next.delete(equipment);
      }

      return {
        ...prev,
        equipmentPreferences: EQUIPMENT_OPTIONS.map((option) => option.value).filter((value) =>
          next.has(value)
        ),
      };
    });

    setErrors((prev) => ({ ...prev, equipmentPreferences: undefined }));
  };

  const validateForm = (): AiRoutineFormErrors => {
    const nextErrors: AiRoutineFormErrors = {};
    const daysErr = validateDaysField(form.daysPerWeek);
    if (daysErr) {
      nextErrors.daysPerWeek = daysErr;
    }

    const eqErr = validateEquipmentField(form.equipmentPreferences);
    if (eqErr) {
      nextErrors.equipmentPreferences = eqErr;
    }

    for (const lift of missingManualLifts) {
      const liftErr = validateLiftField(lift, form.strengthInputs[lift]);
      if (liftErr) {
        nextErrors.lifts = { ...(nextErrors.lifts ?? {}), [lift]: liftErr };
      }
    }

    return nextErrors;
  };

  const buildRequest = (): GenerateRoutineSuggestionsRequest => {
    const strengthInputs = {
      benchPress: null,
      squat: null,
      deadlift: null,
      shoulderPress: null,
    } satisfies GenerateRoutineSuggestionsRequest["strengthInputs"];

    for (const lift of LIFT_ORDER) {
      const liftState = form.strengthInputs[lift];
      if (!liftState.enabled) {
        continue;
      }

      strengthInputs[LIFT_FIELD_MAP[lift]] = {
        weight: Number(liftState.weight),
        reps: Number(liftState.reps),
        unit: "KG",
      };
    }

    return {
      daysPerWeek: Number(form.daysPerWeek),
      equipmentPreferences: form.equipmentPreferences,
      routineGoal: form.routineGoal || null,
      strengthInputs,
    };
  };

  const handleSubmit = () => {
    const nextErrors = validateForm();
    const hasErrors =
      Boolean(nextErrors.daysPerWeek) ||
      Boolean(nextErrors.equipmentPreferences) ||
      Boolean(nextErrors.lifts && Object.values(nextErrors.lifts).some(Boolean));

    if (hasErrors) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const request = buildRequest();
    onGenerateRequest(request);
    onOpenChange(false);
  };

  const tryAdvanceWizard = () => {
    if (wizardStep === 0) {
      const msg = validateDaysField(form.daysPerWeek);
      if (msg) {
        setErrors((prev) => ({ ...prev, daysPerWeek: msg }));
        return;
      }
      setErrors((prev) => ({ ...prev, daysPerWeek: undefined }));
    }
    if (wizardStep === 1) {
      const msg = validateEquipmentField(form.equipmentPreferences);
      if (msg) {
        setErrors((prev) => ({ ...prev, equipmentPreferences: msg }));
        return;
      }
      setErrors((prev) => ({ ...prev, equipmentPreferences: undefined }));
    }
    if (wizardStep >= 3 && wizardStep < submitStepIndex) {
      const liftIndex = wizardStep - 3;
      const lift = missingManualLifts[liftIndex];
      if (lift) {
        const msg = validateLiftField(lift, form.strengthInputs[lift]);
        if (msg) {
          setErrors((prev) => ({
            ...prev,
            lifts: { ...(prev.lifts ?? {}), [lift]: msg },
          }));
          return;
        }
        setErrors((prev) => ({
          ...prev,
          lifts: prev.lifts ? { ...prev.lifts, [lift]: undefined } : prev.lifts,
        }));
      }
    }

    setWizardStep((s) => Math.min(s + 1, submitStepIndex));
  };

  const handleOpenProfile = () => {
    onOpenChange(false);
    const targetTab = resolveProfileTabForMissingFields(bootstrap?.missingProfileFields);
    navigate(`/profile?tab=${targetTab}`);
  };

  const profileGoalLabel = formatGoal(bootstrap?.profileSummary.primaryFitnessFocus);

  const showWizardNav =
    bootstrap &&
    bootstrap.canGenerate &&
    !bootstrapQuery.isLoading &&
    !bootstrapQuery.isError;

  useEffect(() => {
    if (!open) {
      setMobileDialogStyle(undefined);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const updateMobilePosition = () => {
      if (window.innerWidth >= 640) {
        setMobileDialogStyle(undefined);
        return;
      }

      const dialogEl = dialogContentRef.current;
      if (!dialogEl) {
        return;
      }

      const viewportHeight = window.innerHeight;
      const topPadding = 16;
      const bottomGap = 12;
      const bottomNav = document.querySelector(".bottom-nav");
      const dockTop =
        bottomNav instanceof HTMLElement
          ? bottomNav.getBoundingClientRect().top
          : viewportHeight - 16;

      const availableHeight = Math.max(320, Math.floor(dockTop - topPadding - bottomGap));
      const dialogHeight = Math.min(dialogEl.scrollHeight, availableHeight);
      const centeredTop = Math.round(topPadding + (availableHeight - dialogHeight) / 2);
      const maxTop = Math.max(topPadding, Math.round(dockTop - dialogHeight - bottomGap));
      const top = Math.min(centeredTop, maxTop);

      setMobileDialogStyle({
        top: `${top}px`,
        bottom: "auto",
        transform: "translateX(-50%)",
        maxHeight: `${availableHeight}px`,
      });
    };

    const scheduleUpdate = () => {
      window.requestAnimationFrame(updateMobilePosition);
    };

    scheduleUpdate();
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleUpdate) : null;
    const dialogEl = dialogContentRef.current;
    if (dialogEl && resizeObserver) {
      resizeObserver.observe(dialogEl);
    }

    const bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav instanceof HTMLElement && resizeObserver) {
      resizeObserver.observe(bottomNav);
    }

    return () => {
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [
    open,
    wizardStep,
    preambleSeen,
    bootstrapQuery.isLoading,
    bootstrapQuery.isError,
    bootstrap?.canGenerate,
    missingManualLifts.length,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        style={mobileDialogStyle}
        className={cn(
          "left-1/2 top-[50%] flex max-h-[calc(100dvh-1rem)] -translate-x-1/2 translate-y-[-50%] flex-col overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-[#090909] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.7)] sm:max-h-[min(90vh,40rem)] sm:rounded-[1.4rem]",
          "min-w-0 w-[min(calc(100vw-1rem),36rem)] max-w-[min(calc(100vw-1rem),36rem)]",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-white/[0.06] px-4 pb-3 pt-3 text-left sm:px-5 sm:pb-4 sm:pt-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-[linear-gradient(135deg,rgba(255,106,0,0.18),rgba(255,149,0,0.08))] sm:h-11 sm:w-11">
              <Sparkles className="h-4 w-4 text-orange-300 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <DialogTitle className="text-base font-black uppercase tracking-[0.08em] text-white sm:text-lg">
                Generate <span className="text-gradient-fire">Routine</span>
              </DialogTitle>
              <DialogDescription className="text-[10px] leading-relaxed text-slate-400 sm:text-sm">
                Answer a few questions to generate your routine.
              </DialogDescription>
            </div>
          </div>
          {showWizardNav && preambleSeen && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <span>
                  Question {wizardStep + 1} of {totalQuestionSteps}
                </span>
                <span className="tabular-nums text-slate-400">
                  {Math.round(((wizardStep + 1) / totalQuestionSteps) * 100)}%
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-[width] duration-200 ease-out"
                  style={{
                    width: `${((wizardStep + 1) / totalQuestionSteps) * 100}%`,
                    background: "var(--gradient-fire)",
                  }}
                />
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5 sm:py-4">
          {bootstrapQuery.isLoading ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.05]">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </div>
              <div className="space-y-0.5 px-2">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-white">
                  Checking your AI profile data
                </p>
                <p className="text-[11px] text-slate-400">
                  Loading readiness, missing fields, and strength history.
                </p>
              </div>
            </div>
          ) : bootstrapQuery.isError ? (
            <div className="flex h-full flex-col justify-center space-y-4 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-300" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-white">
                    AI routine setup failed
                  </p>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {getApiErrorMessage(
                      bootstrapQuery.error,
                      "The AI bootstrap request could not be loaded."
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void bootstrapQuery.refetch()}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white"
                >
                  <Loader2 className={cn("h-3.5 w-3.5", bootstrapQuery.isRefetching && "animate-spin")} />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex min-w-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          ) : bootstrap && !bootstrap.canGenerate ? (
            <div className="flex h-full flex-col justify-center">
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-white">
                      Profile incomplete for AI generation
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Complete the missing profile fields first. The backend will not open the AI
                      question form until these are saved.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {bootstrap.missingProfileFields.map((field) => (
                        <span
                          key={field}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/25 bg-black/20 px-2 py-1 text-[10px] text-amber-100"
                        >
                          <span className="font-black uppercase tracking-[0.06em] text-amber-400/90">
                            Missing
                          </span>
                          <span className="font-semibold text-white">
                            {formatMissingProfileField(field)}
                          </span>
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      Use the Profile tab for gender and the Goals tab for weight, height, fitness
                      level, and primary fitness focus.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenProfile}
                    className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white"
                  >
                    Complete profile
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex min-w-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : bootstrap ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-hidden">
                {!preambleSeen && (
                  <div className="flex h-full max-h-full flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5">
                    <p className="text-[11px] text-slate-400">
                      Here is what we already know from your profile and workout history.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <div className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 sm:min-w-[7.5rem] sm:flex-none">
                        <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
                          Profile goal
                        </p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-white">
                          {profileGoalLabel}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 sm:min-w-[7.5rem] sm:flex-none">
                        <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
                          History lifts
                        </p>
                        <p className="mt-0.5 text-xs font-semibold leading-snug text-white">
                          {historyLifts.length > 0
                            ? historyLifts.map(formatLiftName).join(", ")
                            : "None yet"}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 sm:min-w-[7.5rem] sm:flex-none">
                        <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
                          Manual lifts
                        </p>
                        <p className="mt-0.5 text-xs font-semibold leading-snug text-white">
                          {missingManualLifts.length > 0
                            ? missingManualLifts.map(formatLiftName).join(", ")
                            : "All covered"}
                        </p>
                      </div>
                    </div>
                    {historyLifts.length > 0 && (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-white">
                          History in use
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {historyLifts.map((lift) => (
                            <div
                              key={lift}
                              className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2"
                            >
                              <p className="text-xs font-semibold text-white">{formatLiftName(lift)}</p>
                              <p className="text-[10px] text-slate-400">
                                {formatSnapshotSummary(getLiftSnapshot(bootstrap, lift))}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {preambleSeen && wizardStep === 0 && (
                  <div className="h-full max-h-full overflow-y-auto overscroll-contain pr-0.5">
                    <QuestionCard
                      number={1}
                      title="Days per week"
                      description="How many days should the split cover? Use 2 to 7."
                    >
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="ai-days-per-week"
                          className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400"
                        >
                          Training days
                        </Label>
                        <Input
                          id="ai-days-per-week"
                          type="number"
                          min={2}
                          max={7}
                          value={form.daysPerWeek}
                          onChange={(event) => {
                            setForm((prev) => ({ ...prev, daysPerWeek: event.target.value }));
                            setErrors((prev) => ({
                              ...prev,
                              daysPerWeek: undefined,
                            }));
                          }}
                          className="h-10 rounded-xl border-white/10 bg-white/[0.03] !text-[13px] font-semibold text-white"
                          placeholder="2"
                        />
                        {errors.daysPerWeek && (
                          <p className="text-[11px] font-semibold text-red-300">{errors.daysPerWeek}</p>
                        )}
                      </div>
                    </QuestionCard>
                  </div>
                )}

                {preambleSeen && wizardStep === 1 && (
                  <div className="h-full max-h-full overflow-y-auto overscroll-contain pr-0.5">
                    <QuestionCard
                      number={2}
                      title="Equipment"
                      mobileDescription='Pick what you can use. "All equipment" includes every supported type in your library.'
                      description="Pick what you can use. “All equipment” uses every equipment type available in your exercise library."
                    >
                      <div className="space-y-2">
                        {EQUIPMENT_OPTIONS.map((option) => {
                          const checked = form.equipmentPreferences.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className={cn(
                                "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 transition-colors",
                                checked
                                  ? "border-orange-500/35 bg-orange-500/10"
                                  : "border-white/[0.08] bg-black/20 hover:border-white/15"
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  handleToggleEquipment(option.value, value === true)
                                }
                                className="mt-0.5 border-white/20 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white"
                              />
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-xs font-semibold text-white">{option.label}</p>
                                <p className="text-[10px] leading-snug text-slate-400">
                                  {option.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                        {errors.equipmentPreferences && (
                          <p className="text-[11px] font-semibold text-red-300">
                            {errors.equipmentPreferences}
                          </p>
                        )}
                      </div>
                    </QuestionCard>
                  </div>
                )}

                {preambleSeen && wizardStep === 2 && (
                  <div className="h-full max-h-full overflow-y-auto overscroll-contain pr-0.5">
                    <QuestionCard
                      number={3}
                      title="Routine goal"
                      description="Optional. Keep the profile default if you do not want an override."
                    >
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                          Goal override
                        </Label>
                        <Select
                          value={form.routineGoal || PROFILE_DEFAULT_GOAL}
                          onValueChange={(value) => {
                            setForm((prev) => ({
                              ...prev,
                              routineGoal:
                                value === PROFILE_DEFAULT_GOAL ? "" : (value as PrimaryFitnessFocus),
                            }));
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-left text-[13px] font-semibold text-white focus:ring-orange-500/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-white/10 bg-[#111] text-white">
                            <SelectItem value={PROFILE_DEFAULT_GOAL}>
                              Use profile goal ({profileGoalLabel})
                            </SelectItem>
                            {GOAL_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </QuestionCard>
                  </div>
                )}

                {preambleSeen &&
                  wizardStep >= 3 &&
                  wizardStep < submitStepIndex &&
                  missingManualLifts[wizardStep - 3] && (
                    <div className="h-full max-h-full overflow-y-auto overscroll-contain pr-0.5">
                      {(() => {
                        const lift = missingManualLifts[wizardStep - 3];
                        const liftState = form.strengthInputs[lift];
                        return (
                          <QuestionCard
                            number={wizardStep + 1}
                            title={formatLiftName(lift)}
                            description={`Optional. Enable only if you know a current ${formatLiftName(
                              lift
                            )} working weight and reps.`}
                          >
                            <div className="space-y-3">
                              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2">
                                <Checkbox
                                  checked={liftState.enabled}
                                  onCheckedChange={(value) =>
                                    updateLiftField(lift, { enabled: value === true })
                                  }
                                  className="mt-0.5 border-white/20 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white"
                                />
                                <div className="min-w-0 space-y-0.5">
                                  <p className="text-xs font-semibold text-white">
                                    I know my {formatLiftName(lift)} working set
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Weight and reps are required together when enabled.
                                  </p>
                                </div>
                              </label>

                              {liftState.enabled && (
                                <div className="flex flex-nowrap items-end gap-2">
                                  <div className="w-[7.5rem] space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                                      Weight (kg)
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.5"
                                      value={liftState.weight}
                                      onChange={(event) =>
                                        updateLiftField(lift, { weight: event.target.value })
                                      }
                                      className="h-10 rounded-xl border-white/10 bg-white/[0.03] px-3 text-center !text-[13px] font-semibold tabular-nums text-white"
                                      placeholder="80"
                                    />
                                  </div>
                                  <div className="w-[5.5rem] space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                                      Reps
                                    </Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={20}
                                      value={liftState.reps}
                                      onChange={(event) =>
                                        updateLiftField(lift, { reps: event.target.value })
                                      }
                                      className="h-10 rounded-xl border-white/10 bg-white/[0.03] px-3 text-center !text-[13px] font-semibold tabular-nums text-white"
                                      placeholder="5"
                                    />
                                  </div>
                                </div>
                              )}

                              {errors.lifts?.[lift] && (
                                <p className="text-[11px] font-semibold text-red-300">
                                  {errors.lifts[lift]}
                                </p>
                              )}
                            </div>
                          </QuestionCard>
                        );
                      })()}
                    </div>
                  )}

                {preambleSeen && wizardStep === submitStepIndex && (
                  <div className="flex h-full max-h-full flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5">
                    {missingManualLifts.length === 0 ? (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs font-black uppercase tracking-[0.1em] text-white">
                              Main lifts covered
                            </p>
                            <p className="text-[11px] leading-relaxed text-slate-300">
                              No extra strength questions needed. You can prepare the AI request now.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Review your answers, then prepare the AI request. You can go back to change
                        any step.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {showWizardNav && (
                <div className="relative z-20 mt-3 shrink-0 space-y-2 border-t border-white/[0.06] bg-[#090909] pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3">
                  {!preambleSeen ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300 sm:w-auto sm:min-w-[7rem]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreambleSeen(true)}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white sm:w-auto sm:min-w-[11rem]"
                      >
                        Continue to questions
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (wizardStep === 0) {
                            setPreambleSeen(false);
                            return;
                          }
                          setWizardStep((s) => Math.max(0, s - 1));
                        }}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300 sm:w-auto"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Back
                      </button>

                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenChange(false)}
                          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300 sm:w-auto sm:flex-none"
                        >
                          Cancel
                        </button>

                        {wizardStep < submitStepIndex ? (
                          <button
                            type="button"
                            onClick={tryAdvanceWizard}
                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white sm:w-auto sm:flex-none"
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSubmit}
                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white sm:w-auto sm:flex-none"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Generate with AI
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
