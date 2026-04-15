import { useState, useEffect, useCallback } from "react";

type FormKey<T extends object> = Extract<keyof T, string>;

export interface UseEditableFormOptions<T extends object> {
  /** Function to create the initial form state from the source data */
  createForm: () => T;
  /** Optional callback when form is saved successfully */
  onSaveSuccess?: () => void;
  /** Form validation function, returns errors object */
  validate?: (form: T) => Partial<Record<FormKey<T>, string>>;
}

export interface UseEditableFormReturn<T extends object> {
  /** Current form state */
  form: T;
  /** Whether the form is in editing mode */
  isEditing: boolean;
  /** Whether the form has unsaved changes */
  isDirty: boolean;
  /** Whether the form is currently saving */
  isSaving: boolean;
  /** Whether the discard confirmation dialog is open */
  isDiscardDialogOpen: boolean;
  /** Current validation errors */
  errors: Partial<Record<FormKey<T>, string>>;
  /** Update a single form field */
  updateField: <K extends FormKey<T>>(field: K, value: T[K]) => void;
  /** Enter edit mode */
  handleEdit: () => void;
  /** Save the form (async, handles validation) */
  handleSave: (saveAction: () => Promise<void>) => Promise<void>;
  /** Cancel editing (shows discard dialog if dirty) */
  handleCancel: () => void;
  /** Confirm discarding changes */
  handleConfirmDiscard: () => void;
  /** Set discard dialog open state */
  setIsDiscardDialogOpen: (open: boolean) => void;
  /** Clear one or more field errors */
  clearErrors: (...fields: FormKey<T>[]) => void;
  /** Reset form to match source data */
  resetForm: () => void;
}

/**
 * A reusable hook for managing editable form state with validation,
 * dirty tracking, and discard confirmation.
 */
export function useEditableForm<T extends object>({
  createForm,
  onSaveSuccess,
  validate,
}: UseEditableFormOptions<T>): UseEditableFormReturn<T> {
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [form, setForm] = useState<T>(createForm);
  const [originalForm, setOriginalForm] = useState<T>(createForm);
  const [errors, setErrors] = useState<Partial<Record<FormKey<T>, string>>>({});

  // Sync form with source data when not editing
  useEffect(() => {
    if (!isEditing) {
      const newForm = createForm();
      setForm(newForm);
      setOriginalForm(newForm);
      setErrors({});
      setIsDirty(false);
    }
  }, [createForm, isEditing]);

  const updateField = useCallback(<K extends FormKey<T>>(field: K, value: T[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setIsDirty(true);
    setErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setOriginalForm((current) => ({ ...current }));
    setIsDirty(false);
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!validate) return true;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form, validate]);

  const handleSave = useCallback(
    async (saveAction: () => Promise<void>) => {
      if (!validateForm()) return;

      try {
        setIsSaving(true);
        await saveAction();
        setIsEditing(false);
        setIsDirty(false);
        onSaveSuccess?.();
      } finally {
        setIsSaving(false);
      }
    },
    [validateForm, onSaveSuccess]
  );

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }
    setForm(originalForm);
    setIsEditing(false);
    setErrors({});
  }, [isDirty, originalForm]);

  const handleConfirmDiscard = useCallback(() => {
    setForm(originalForm);
    setIsEditing(false);
    setIsDirty(false);
    setErrors({});
    setIsDiscardDialogOpen(false);
  }, [originalForm]);

  const clearErrors = useCallback((...fields: FormKey<T>[]) => {
    if (fields.length === 0) {
      setErrors({});
      return;
    }

    setErrors((currentErrors) => {
      let changed = false;
      const nextErrors = { ...currentErrors };

      for (const field of fields) {
        if (nextErrors[field]) {
          delete nextErrors[field];
          changed = true;
        }
      }

      return changed ? nextErrors : currentErrors;
    });
  }, []);

  const resetForm = useCallback(() => {
    const newForm = createForm();
    setForm(newForm);
    setOriginalForm(newForm);
    setErrors({});
    setIsDirty(false);
  }, [createForm]);

  return {
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
    clearErrors,
    resetForm,
  };
}
