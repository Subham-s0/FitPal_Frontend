import { useCallback } from "react";
import { Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/shared/api/client";
import { updateProfileInfoApi } from "@/features/profile/api";
import { CustomDatePicker } from "@/shared/ui/CustomDatePicker";
import { CustomSelect } from "@/shared/ui/CustomSelect";
import {
  Field,
  TextInput,
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
import type { Gender, UserProfileResponse } from "@/features/profile/model";
import {
  validatePastDate,
  validatePhone,
  validateUsername,
} from "@/features/profile/utils/profileValidation";
import { useEditableForm } from "@/shared/hooks/useEditableForm";

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

/**
 * ProfileInfoSection - Personal information form (username, name, phone, dob, gender)
 * NOTE: Height/weight were moved to ProfileGoalsSection to avoid duplication
 * and keep body metrics with fitness goals where they logically belong.
 */

interface ProfileInfoFormState {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  gender: string;
}

interface ProfileInfoSectionProps {
  profile: UserProfileResponse;
  onUpdate: () => void;
}

const createInfoForm = (profile: UserProfileResponse): ProfileInfoFormState => ({
  username: profile.userName ?? "",
  firstName: profile.firstName ?? "",
  lastName: profile.lastName ?? "",
  phone: profile.phoneNo ?? "",
  dob: profile.dob ?? "",
  gender: profile.gender ?? "",
});

const validateInfoForm = (form: ProfileInfoFormState): Partial<Record<keyof ProfileInfoFormState, string>> => {
  const errors: Partial<Record<keyof ProfileInfoFormState, string>> = {};
  const usernameError = validateUsername(form.username);
  const phoneError = validatePhone(form.phone);
  const dobError = validatePastDate(form.dob);

  if (usernameError) errors.username = usernameError;
  if (phoneError) errors.phone = phoneError;
  if (dobError) errors.dob = dobError;

  return errors;
};

export function ProfileInfoSection({ profile, onUpdate }: ProfileInfoSectionProps) {
  const createForm = useCallback(() => createInfoForm(profile), [profile]);
  
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
    validate: validateInfoForm,
  });

  const onSave = () =>
    handleSave(async () => {
      await updateProfileInfoApi({
        userName: form.username.trim(),
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        phoneNo: form.phone.trim() || null,
        dob: form.dob || null,
        gender: (form.gender || null) as Gender | null,
        height: profile.height ?? null,
        weight: profile.weight ?? null,
      });
      toast.success("Profile information updated successfully");
      onUpdate();
    }).catch((error) => {
      toast.error(getApiErrorMessage(error, "Failed to update profile information"));
    });

  return (
    <>
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#111] to-[#0a0a0a] p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="border-l-2 border-orange-500 pl-3 text-sm font-black uppercase tracking-widest text-white">
            Personal Information
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

        <div className="space-y-6 sm:space-y-8">
          <div>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Field
                label="Username"
                error={errors.username}
                labelFor="profile-username"
                errorId="profile-username-error"
              >
                <TextInput
                  id="profile-username"
                  aria-label="Username"
                  aria-describedby={errors.username ? "profile-username-error" : undefined}
                  value={form.username}
                  disabled={!isEditing}
                  onChange={(e) => updateField("username", e.target.value)}
                />
              </Field>
              <Field label="Email" labelFor="profile-email">
                <TextInput id="profile-email" aria-label="Email" value={profile.email} disabled />
              </Field>
              <Field label="First Name" labelFor="profile-first-name">
                <TextInput
                  id="profile-first-name"
                  aria-label="First name"
                  value={form.firstName}
                  disabled={!isEditing}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
              </Field>
              <Field label="Last Name" labelFor="profile-last-name">
                <TextInput
                  id="profile-last-name"
                  aria-label="Last name"
                  value={form.lastName}
                  disabled={!isEditing}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
              </Field>
              <Field
                label="Phone No"
                error={errors.phone}
                labelFor="profile-phone"
                errorId="profile-phone-error"
              >
                <TextInput
                  id="profile-phone"
                  aria-label="Phone number"
                  aria-describedby={errors.phone ? "profile-phone-error" : undefined}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  disabled={!isEditing}
                  onChange={(e) =>
                    updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                />
              </Field>
              <Field
                label="Date of Birth"
                error={errors.dob}
                labelFor="profile-dob"
                errorId="profile-dob-error"
              >
                <CustomDatePicker
                  id="profile-dob"
                  value={form.dob}
                  onChange={(value) => updateField("dob", value)}
                  disabled={!isEditing}
                  invalid={Boolean(errors.dob)}
                  ariaLabel="Date of birth"
                  ariaDescribedBy={errors.dob ? "profile-dob-error" : undefined}
                />
              </Field>
              <Field label="Gender" labelFor="profile-gender">
                <CustomSelect
                  id="profile-gender"
                  options={GENDER_OPTIONS}
                  value={form.gender}
                  onChange={(value) => updateField("gender", value)}
                  disabled={!isEditing}
                  placeholder="Select gender"
                  ariaLabel="Gender"
                />
              </Field>
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
              You have unsaved changes to your profile information. Discard them?
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
