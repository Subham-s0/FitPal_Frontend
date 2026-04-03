import type {
  EsewaInitiatePaymentRequest,
  KhaltiInitiatePaymentRequest,
} from "@/features/payment/model";

export type PaymentGateway = "esewa" | "khalti";

export type PaymentFailureFeedback = {
  gateway: PaymentGateway;
  status: "failed" | "cancelled";
  message: string;
  paymentAttemptId: number;
};

export interface PaymentMethodDefinition {
  id: PaymentGateway;
  name: string;
  subtitle: string;
  badge: string;
  logoUrl?: string;
  colorClass: string;
  isAvailable: boolean;
  helperText?: string;
}

export interface PaymentBillingState {
  name: string;
  email: string;
  phone: string;
}

export type PaymentBillingErrors = Partial<Record<keyof PaymentBillingState, string>>;

type PaymentBillingSeed = {
  firstName?: string | null;
  lastName?: string | null;
  userName?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  fallbackEmail?: string | null;
};

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEPAL_MOBILE_REGEX = /^(98|97)\d{8}$/;

export function buildFrontendCallbackUrl(
  pathname: string,
  params: Record<string, string> = {}
): string {
  const url = new URL(pathname, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export function seedPaymentBilling({
  firstName,
  lastName,
  userName,
  email,
  phoneNo,
  fallbackEmail,
}: PaymentBillingSeed): PaymentBillingState {
  return {
    name:
      [firstName ?? "", lastName ?? ""].filter(Boolean).join(" ").trim()
      || userName?.trim()
      || "",
    email: email?.trim() || fallbackEmail?.trim() || "",
    phone: phoneNo?.trim() || "",
  };
}

export function sanitizePaymentPhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function validatePaymentBilling(billing: PaymentBillingState): PaymentBillingErrors {
  const errors: PaymentBillingErrors = {};
  const name = billing.name.trim();
  const email = billing.email.trim();
  const phone = billing.phone.trim();

  if (!name) {
    errors.name = "Name is required";
  }
  if (!email) {
    errors.email = "Email is required";
  } else if (!SIMPLE_EMAIL_REGEX.test(email)) {
    errors.email = "Enter a valid email";
  }
  if (!NEPAL_MOBILE_REGEX.test(phone)) {
    errors.phone = "Phone must start with 98 or 97 and be exactly 10 digits";
  }

  return errors;
}

export function buildEsewaBillingPayload(
  billing: PaymentBillingState
): Pick<EsewaInitiatePaymentRequest, "billingName" | "billingEmail" | "billingPhoneNumber"> {
  return {
    billingName: billing.name.trim() || undefined,
    billingEmail: billing.email.trim() || undefined,
    billingPhoneNumber: billing.phone.trim() || undefined,
  };
}

export function buildKhaltiBillingPayload(
  billing: PaymentBillingState
): Pick<KhaltiInitiatePaymentRequest, "billingName" | "billingEmail" | "billingPhoneNumber"> {
  return {
    billingName: billing.name.trim(),
    billingEmail: billing.email.trim(),
    billingPhoneNumber: billing.phone.trim(),
  };
}

export function submitEsewaPaymentForm(
  paymentUrl: string,
  formFields: Record<string, string>
): void {
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
}
