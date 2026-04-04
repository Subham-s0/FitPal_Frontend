import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import type { PaymentMethod, PaymentStatus } from "@/features/payment/model";
import { getPaymentMethodLabel } from "@/features/payment/payment.constants";

export type PaymentAttemptDetailLike = {
  paymentAttemptId: number;
  planName: string | null;
  planType: string | null;
  billingCycle: string | null;
  invoiceNumber: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTime: string;
  startsAt: string | null;
  endsAt: string | null;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  vatAmount: number;
  totalAmount: number;
  billingName: string | null;
  billingEmail: string | null;
  billingPhoneNumber: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  gatewayReference: string | null;
  gatewayTransactionId: string | null;
  gatewayResponseCode: string | null;
  gatewayResponseMessage: string | null;
};

const formatMoney = (amount: number, currency?: string | null) => {
  const c = currency?.trim() || "NPR";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${c} ${amount.toFixed(2)}`;
  }
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
};

const fieldClass = "text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]";
const valueClass = "mt-0.5 text-[13px] font-semibold text-slate-200";
const mutedValue = "mt-0.5 text-[12px] text-slate-400";

export type PaymentAttemptAccountMeta = {
  userName: string | null;
  email: string;
  accountId: number;
};

type Props = {
  detail: PaymentAttemptDetailLike;
  /** Admin: member identity (username first, email below — no link styling). */
  account?: PaymentAttemptAccountMeta | null;
  className?: string;
};

export function PaymentAttemptDetailFields({ detail, account, className }: Props) {
  const planLine = [detail.planType, detail.billingCycle].filter(Boolean).join(" · ") || "—";
  const billingAddressLine = [detail.billingAddress, detail.billingCity].filter(Boolean).join(", ") || null;

  return (
    <div className={cn("space-y-4", className)}>
      {account ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <Label className={fieldClass}>Member</Label>
          <p className={cn(valueClass, "text-white")}>{account.userName?.trim() || "—"}</p>
          <p className={cn(mutedValue, "mt-1 break-all")}>{account.email}</p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">Account #{account.accountId}</p>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <Label className={fieldClass}>Billing (checkout)</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Name</p>
            <p className={valueClass}>{detail.billingName?.trim() || "—"}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Email</p>
            <p className={cn(valueClass, "break-all")}>{detail.billingEmail?.trim() || "—"}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Phone</p>
            <p className={valueClass}>{detail.billingPhoneNumber?.trim() || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Address</p>
            <p className={valueClass}>{billingAddressLine || "—"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <div>
          <Label className={fieldClass}>Paid at</Label>
          <p className={valueClass}>{formatDateTime(detail.paymentTime)}</p>
        </div>
        <div>
          <Label className={fieldClass}>Method</Label>
          <p className={valueClass}>{getPaymentMethodLabel(detail.paymentMethod)}</p>
        </div>
        <div className="col-span-2">
          <Label className={fieldClass}>Plan</Label>
          <p className={valueClass}>{detail.planName ?? "—"}</p>
          <p className={mutedValue}>{planLine}</p>
        </div>
        <div>
          <Label className={fieldClass}>Coverage start</Label>
          <p className={valueClass}>{formatDateTime(detail.startsAt)}</p>
        </div>
        <div>
          <Label className={fieldClass}>Coverage end</Label>
          <p className={valueClass}>{formatDateTime(detail.endsAt)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <Label className={fieldClass}>Amounts</Label>
        <dl className="mt-2 space-y-1.5 text-[12px]">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="font-semibold text-white">{formatMoney(detail.subtotalAmount, detail.currency)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Discount</dt>
            <dd className="font-semibold text-white">{formatMoney(detail.discountAmount, detail.currency)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Tax</dt>
            <dd className="font-semibold text-white">{formatMoney(detail.taxAmount, detail.currency)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Service charge</dt>
            <dd className="font-semibold text-white">{formatMoney(detail.serviceChargeAmount, detail.currency)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">VAT</dt>
            <dd className="font-semibold text-white">{formatMoney(detail.vatAmount, detail.currency)}</dd>
          </div>
          <div className="flex justify-between gap-2 border-t border-white/10 pt-2">
            <dt className="font-bold text-white">Total</dt>
            <dd className="font-black text-orange-400">{formatMoney(detail.totalAmount, detail.currency)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-3 text-[13px]">
        <div>
          <Label className={fieldClass}>Gateway reference</Label>
          <p className="break-all font-mono text-[11px] text-slate-400">{detail.gatewayReference ?? "—"}</p>
        </div>
        <div>
          <Label className={fieldClass}>Gateway transaction id</Label>
          <p className="break-all font-mono text-[11px] text-slate-400">{detail.gatewayTransactionId ?? "—"}</p>
        </div>
        {detail.gatewayResponseCode ? (
          <div>
            <Label className={fieldClass}>Gateway code</Label>
            <p className="font-mono text-[12px] text-slate-300">{detail.gatewayResponseCode}</p>
          </div>
        ) : null}
        {detail.gatewayResponseMessage ? (
          <div>
            <Label className={fieldClass}>Gateway message</Label>
            <p className="text-[12px] text-slate-300">{detail.gatewayResponseMessage}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
