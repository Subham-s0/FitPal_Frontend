import { useCallback } from "react";
import { Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/shared/api/client";
import { updateProfileGoalsApi, updateProfileInfoApi } from "@/features/profile/api";
import { NumberInput } from "@/shared/ui/number-input";
import {
  Field,
  Pill,
  SectionLabel,
} from "@/features/profile/components/ProfileSetupShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import type {
  FitnessLevel,
  PrimaryFitnessFocus,
  UserProfileResponse,
} from "@/features/profile/model";
import {
  validateHeight,
  validateWeight,
} from "@/features/profile/utils/profileValidation";
import { useEditableForm } from "@/shared/hooks/useEditableForm";

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

/**
 * ProfileGoalsSection - Fitness goals and body metrics form
 * Includes: height, weight, fitness level, primary focus
 * NOTE: Height/weight are here (not in ProfileInfoSection) to keep body metrics
 * with fitness goals where they logically belong.
 */

interface ProfileGoalsFormState {
  height: string;
  weight: string;
  fitnessLevel: string;
  primaryFocus: string;
}

interface ProfileGoalsSectionProps {
  profile: UserProfileResponse;
  onUpdate: () => void;
}

const createGoalsForm = (profile: UserProfileResponse): ProfileGoalsFormState => ({
  height: profile.height != null ? String(profile.height) : "",
  weight: profile.weight != null ? String(profile.weight) : "",
  fitnessLevel: profile.fitnessLevel ?? "",
  primaryFocus: profile.primaryFitnessFocus ?? "",
});

const validateGoalsForm = (form: ProfileGoalsFormState): Partial<Record<keyof ProfileGoalsFormState, string>> => {
  const errors: Partial<Record<keyof ProfileGoalsFormState, string>> = {};
  const heightError = validateHeight(form.height);
  const weightError = validateWeight(form.weight);

  if (heightError) errors.height = heightError;
  if (weightError) errors.weight = weightError;

  return errors;
};

export function ProfileGoalsSection({ profile, onUpdate }: ProfileGoalsSectionProps) {
  const createForm = useCallback(() => createGoalsForm(profile), [profile]);

  const {
    form,
    isEditing,
    isDirty,
    isSaving,
    isDiscardDialogOpen,
    errors,
    updateField,
    handleEdit,
    handleSave,
    handleCancel,
    handleConfirmDiscard,
    setIsDiscardDialogOpen,
  } = useEditableForm({
    createForm,
    validate: validateGoalsForm,
  });

  const onSave = () => {
    if (!profile.userName?.trim()) {
      toast.error("Set a username before updating body metrics");
      return;
    }

    handleSave(async () => {
      await Promise.all([
        updateProfileInfoApi({
          userName: profile.userName,
          firstName: profile.firstName ?? null,
          lastName: profile.lastName ?? null,
          phoneNo: profile.phoneNo ?? null,
          dob: profile.dob ?? null,
          gender: profile.gender ?? null,
          height: form.height ? Number(form.height) : null,
          weight: form.weight ? Number(form.weight) : null,
        }),
        updateProfileGoalsApi({
          fitnessLevel: (form.fitnessLevel || null) as FitnessLevel | null,
          primaryFitnessFocus: (form.primaryFocus || null) as PrimaryFitnessFocus | null,
        }),
      ]);
      toast.success("Fitness goals updated successfully");
      onUpdate();
    }).catch((error) => {
      toast.error(getApiErrorMessage(error, "Failed to update fitness goals"));
    });
  };

  return (
    <>
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#111] to-[#0a0a0a] p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="border-l-2 border-orange-500 pl-3 text-sm font-black uppercase tracking-widest text-white">
            Fitness Goals & Metrics
          </h3>
          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:shadow-orange-500/40 sm:px-4 sm:py-2.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
        </div>

        <div className="space-y-5 sm:space-y-6">
          <div>
            <SectionLabel>Body Metrics</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Field
                label="Weight (kg)"
                error={errors.weight}
                labelFor="profile-weight"
                errorId="profile-weight-error"
              >
                <NumberInput
                  id="profile-weight"
                  aria-label="Weight in kilograms"
                  aria-describedby={errors.weight ? "profile-weight-error" : undefined}
                  min={20}
                  max={300}
                  step={0.5}
                  value={form.weight}
                  disabled={!isEditing}
                  onChange={(e) => updateField("weight", e.target.value)}
                />
              </Field>
              <Field
                label="Height (cm)"
                error={errors.height}
                labelFor="profile-height"
                errorId="profile-height-error"
              >
                <NumberInput
                  id="profile-height"
                  aria-label="Height in centimeters"
                  aria-describedby={errors.height ? "profile-height-error" : undefined}
                  min={80}
                  max={280}
                  step={1}
                  value={form.height}
                  disabled={!isEditing}
                  onChange={(e) => updateField("height", e.target.value)}
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

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 transition-all hover:border-blue-500/30">
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Level</p>
              <p className="mt-1 text-base font-black text-white sm:text-lg">
                {FITNESS_LEVEL_OPTIONS.find((o) => o.value === form.fitnessLevel)?.label ||
                  "Not set"}
              </p>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 transition-all hover:border-green-500/30">
              <p className="text-[9px] font-bold uppercase tracking-widest text-green-400">Focus</p>
              <p className="mt-1 text-base font-black text-white sm:text-lg">
                {FITNESS_FOCUS_OPTIONS.find((o) => o.value === form.primaryFocus)?.label ||
                  "Not set"}
              </p>
            </div>
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 transition-all hover:border-orange-500/30">
              <p className="text-[9px] font-bold uppercase tracking-widest text-orange-400">
                Status
              </p>
              <p className="mt-1 text-base font-black text-white sm:text-lg">
                {profile.hasActiveSubscription ? "Gym-ready" : "Profile-ready"}
              </p>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex justify-end gap-3 border-t border-white/5 pt-5">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || !isDirty}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:shadow-orange-500/40 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent className="rounded-[20px] border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
          <AlertDialogHeader>
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)]">
              <X className="h-5 w-5 text-orange-300" strokeWidth={1.8} />
            </div>
            <AlertDialogTitle className="text-[17px] font-black tracking-tight">
              Discard changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-relaxed text-[hsl(0,0%,55%)]">
              You have unsaved changes to your fitness goals. Discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="mt-0 flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] py-2.5 text-[11px] font-black uppercase tracking-wider text-[hsl(0,0%,55%)] hover:border-white/20 hover:text-white">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-orange-600 py-2.5 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-orange-500"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
