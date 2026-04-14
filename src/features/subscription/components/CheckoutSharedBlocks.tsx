import { AlertTriangle, RefreshCw } from "lucide-react";
import type { PaymentFailureFeedback } from "@/features/payment/checkout";
import { sanitizePaymentPhoneInput } from "@/features/payment/checkout";
import { Field, SectionLabel, TextInput } from "@/shared/ui/form-kit";
import { cn } from "@/shared/lib/utils";

type CheckoutVariant = "setup" | "membership";

interface KhaltiBillingFieldsProps {
  values: {
    name: string;
    email: string;
    phone: string;
  };
  errors: Partial<Record<"name" | "email" | "phone", string>>;
  onFieldChange: (field: "name" | "email" | "phone", value: string) => void;
  variant?: CheckoutVariant;
}

export const KhaltiBillingFields = ({
  values,
  errors,
  onFieldChange,
  variant = "setup",
}: KhaltiBillingFieldsProps) => (
  <div
    className={cn(
      variant === "membership"
        ? "mt-5 rounded-[18px] border table-border user-surface-soft p-4"
        : "mt-4 rounded-2xl border border-white/8 bg-black/20 p-4",
    )}
  >
    <SectionLabel className="!mb-3">Khalti Billing Info</SectionLabel>
    <div className={cn("grid gap-3 sm:grid-cols-2", variant === "setup" && "grid-cols-1")}>
      <Field label="Full Name" error={errors.name} className="sm:col-span-2">
        <TextInput
          type="text"
          placeholder="Full name"
          value={values.name}
          onChange={(event) => onFieldChange("name", event.target.value)}
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <TextInput
          type="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(event) => onFieldChange("email", event.target.value)}
        />
      </Field>
      <Field label="Phone (98/97 + 8 digits)" error={errors.phone}>
        <TextInput
          type="tel"
          inputMode="numeric"
          pattern="(98|97)[0-9]{8}"
          maxLength={10}
          placeholder="98xxxxxxxx"
          value={values.phone}
          onChange={(event) => onFieldChange("phone", sanitizePaymentPhoneInput(event.target.value))}
        />
      </Field>
    </div>
  </div>
);

interface PaymentFailureAlertProps {
  paymentFeedback: PaymentFailureFeedback;
  retryLabel: string;
  onRetry: () => void;
  onSecondaryAction: () => void;
  secondaryActionLabel: string;
  helperText?: string;
  busy?: boolean;
  variant?: CheckoutVariant;
}

export const PaymentFailureAlert = ({
  paymentFeedback,
  retryLabel,
  onRetry,
  onSecondaryAction,
  secondaryActionLabel,
  helperText,
  busy = false,
  variant = "setup",
}: PaymentFailureAlertProps) => (
  <div
    className={cn(
      variant === "membership"
        ? "mt-4 rounded-[18px] border border-amber-500/20 bg-amber-500/[0.08] p-4"
        : "mt-4 rounded-[1.35rem] border border-amber-500/20 bg-[linear-gradient(135deg,rgba(120,63,23,0.16)_0%,rgba(15,15,15,0.82)_100%)] p-4",
    )}
  >
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center border border-amber-500/20 bg-amber-500/10 text-amber-200",
          variant === "membership" ? "rounded-[14px]" : "rounded-2xl",
        )}
      >
        <AlertTriangle size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            className={cn(
              "font-black uppercase text-amber-200",
              variant === "membership" ? "text-[11px] tracking-[0.14em]" : "text-[12px] tracking-[0.08em]",
            )}
          >
            {paymentFeedback.status === "cancelled" ? "Payment cancelled" : "Payment failed"}
          </p>
          <span
            className={cn(
              "rounded-full border border-amber-500/20 bg-black/20 font-black uppercase text-amber-100",
              variant === "membership"
                ? "px-2.5 py-1 text-[9px] tracking-[0.14em]"
                : "px-2.5 py-1 text-[10px] tracking-[0.08em] text-amber-200",
            )}
          >
            {paymentFeedback.gateway === "khalti" ? "Khalti" : "eSewa"}
          </span>
        </div>

        <p
          className={cn(
            "mt-2 leading-relaxed",
            variant === "membership" ? "text-sm text-amber-100" : "text-[12px] text-amber-100",
          )}
        >
          {paymentFeedback.message}
        </p>

        {helperText ? (
          <p
            className={cn(
              "mt-2 leading-relaxed",
              variant === "membership" ? "text-sm text-amber-100/80" : "text-[11px] text-amber-200/80",
            )}
          >
            {helperText}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 font-black uppercase text-amber-100 transition-colors hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-60",
              variant === "membership"
                ? "px-4 py-2 text-[10px] tracking-[0.14em]"
                : "px-4 py-2 text-[10px] tracking-[0.12em]",
            )}
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
            {retryLabel}
          </button>
          <button
            type="button"
            onClick={onSecondaryAction}
            className={cn(
              "inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] text-slate-200 transition-colors hover:bg-white/[0.07]",
              variant === "membership"
                ? "px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]"
                : "px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em]",
            )}
          >
            {secondaryActionLabel}
          </button>
        </div>
      </div>
    </div>
  </div>
);
