import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCcw,
  Receipt,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { getMyPaymentHistoryApi } from "@/features/payment/api";
import type {
  PaymentMethod,
  PaymentStatus,
  UserPaymentHistoryItemResponse,
} from "@/features/payment/model";
import { SectionLabel } from "@/features/profile/components/ProfileSetupShell";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { getApiErrorMessage } from "@/shared/api/client";

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "PENDING", label: "Pending" },
] as const;

const METHOD_FILTER_OPTIONS = [
  { value: "ALL", label: "All methods" },
  { value: "ESEWA", label: "eSewa" },
  { value: "KHALTI", label: "Khalti" },
] as const;

const SORT_OPTIONS = [
  { value: "DESC", label: "Newest first" },
  { value: "ASC", label: "Oldest first" },
] as const;

const PAGE_SIZE = 12;

const formatMoney = (amount: number, currency?: string | null) => {
  const safeCurrency = currency?.trim() || "NPR";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${safeCurrency} ${amount.toFixed(2)}`;
  }
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getStatusBadgeClassName = (status: PaymentStatus) => {
  switch (status) {
    case "COMPLETED":
      return "border-0 bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/20";
    case "FAILED":
      return "border-0 bg-red-500/12 text-red-400 hover:bg-red-500/20";
    case "CANCELLED":
      return "border-0 bg-amber-500/12 text-amber-400 hover:bg-amber-500/20";
    case "PENDING":
      return "border-0 bg-sky-500/12 text-sky-400 hover:bg-sky-500/20";
    default:
      return "border-0 bg-white/10 text-slate-300";
  }
};

const getMethodLabel = (method: PaymentMethod) => (method === "ESEWA" ? "eSewa" : "Khalti");
const SortIcon = ({ direction }: { direction: "ASC" | "DESC" }) =>
  direction === "DESC" ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />;

function PaymentRowCards({ items }: { items: UserPaymentHistoryItemResponse[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {items.map((payment) => (
        <div
          key={payment.paymentAttemptId}
          className="rounded-2xl border table-border table-bg p-4 transition-colors hover:table-bg-hover"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-orange-500/25 bg-orange-500/10">
                <CreditCard className="h-4 w-4 text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase tracking-tight text-white">
                  {payment.planName || "Membership payment"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {payment.invoiceNumber || `Payment #${payment.paymentAttemptId}`}
                </p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-orange-400">
                  {[payment.planType, payment.billingCycle].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <Badge className={cn("shrink-0", getStatusBadgeClassName(payment.paymentStatus))}>
              {payment.paymentStatus}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Amount</p>
              <p className="mt-1 font-black text-white">
                {formatMoney(payment.totalAmount, payment.currency)}
              </p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Method</p>
              <p className="mt-1 font-bold text-slate-200">{getMethodLabel(payment.paymentMethod)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Paid At</p>
              <p className="mt-1 text-slate-200">{formatDateTime(payment.paymentTime)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Billing</p>
              <p className="mt-1 text-slate-200">{payment.billingName || "—"}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border table-border table-bg-alt p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Billing Number</p>
            <p className="mt-1 text-xs text-slate-300">
              {payment.billingPhoneNumber || "Not provided"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePaymentHistory() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [methodFilter, setMethodFilter] = useState<"ALL" | PaymentMethod>("ALL");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const historyQuery = useQuery({
    queryKey: ["user-payment-history", statusFilter, methodFilter, sortDirection, page],
    queryFn: () =>
      getMyPaymentHistoryApi({
        statuses: statusFilter === "ALL" ? undefined : [statusFilter],
        paymentMethods: methodFilter === "ALL" ? undefined : [methodFilter],
        sortBy: "paymentTime",
        sortDirection,
        page,
        size: PAGE_SIZE,
      }),
  });

  const pageData = historyQuery.data ?? null;
  const items = useMemo(() => pageData?.items ?? [], [pageData]);

  const summary = useMemo(() => {
    const completed = items.filter((item) => item.paymentStatus === "COMPLETED").length;
    const failed = items.filter((item) => item.paymentStatus === "FAILED").length;
    const totalPaid = items
      .filter((item) => item.paymentStatus === "COMPLETED")
      .reduce((sum, item) => sum + item.totalAmount, 0);

    return { completed, failed, totalPaid };
  }, [items]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "ALL") count += 1;
    if (methodFilter !== "ALL") count += 1;
    if (sortDirection !== "DESC") count += 1;
    return count;
  }, [methodFilter, sortDirection, statusFilter]);

  const resetPageAndSet =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(0);
    };

  useEffect(() => {
    if (!filterOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  const clearFilters = () => {
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setSortDirection("DESC");
    setPage(0);
    setFilterOpen(false);
  };

  const handleRefresh = () => {
    void historyQuery.refetch().then((result) => {
      if (result.error) {
        toast.error(getApiErrorMessage(result.error, "Failed to refresh payment history"));
      }
    });
  };

  if (historyQuery.isError) {
    return (
      <div className="rounded-2xl border table-border table-bg p-6 text-center">
        <p className="text-sm font-bold text-red-200">Payment history could not be loaded.</p>
        <p className="mt-2 text-xs text-slate-400">
          {getApiErrorMessage(historyQuery.error, "Try refreshing the page.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in sm:space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border table-border table-bg p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionLabel className="!mb-2">Payment History</SectionLabel>
            <p className="text-xs text-slate-400">
              Review membership payments, billing details, and wallet transaction status.
            </p>
          </div>
          <div className="flex w-full justify-end sm:w-auto">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
              <Receipt className="h-3.5 w-3.5 text-orange-400" />
              {pageData?.totalItems ?? 0} payments
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[14px] border border-emerald-500/15 bg-emerald-500/[0.07] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-400">Completed</p>
            <p className="mt-1 text-xl font-black text-white">{summary.completed}</p>
            <p className="mt-0.5 text-[10px] text-emerald-500/60">on this page</p>
          </div>
          <div className="rounded-[14px] border border-red-500/15 bg-red-500/[0.07] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-red-400">Failed</p>
            <p className="mt-1 text-xl font-black text-white">{summary.failed}</p>
            <p className="mt-0.5 text-[10px] text-red-500/60">on this page</p>
          </div>
          <div className="rounded-[14px] border border-orange-500/15 bg-orange-500/[0.07] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-orange-400">Total Paid</p>
            <p className="mt-1 text-xl font-black text-white">{formatMoney(summary.totalPaid)}</p>
            <p className="mt-0.5 text-[10px] text-orange-500/60">on this page</p>
          </div>
        </div>

        {/* Compact inline toolbar */}
        <div className="flex items-center gap-2 border-t table-border-cell pt-3 flex-wrap">
          <button
            type="button"
            onClick={() => resetPageAndSet(setSortDirection)(sortDirection === "DESC" ? "ASC" : "DESC")}
            className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border text-[11px] font-bold transition-all ${
              sortDirection !== "DESC"
                ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                : "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400"
            }`}
          >
            <SortIcon direction={sortDirection} />
            {SORT_OPTIONS.find((o) => o.value === sortDirection)?.label}
          </button>

          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((open) => !open)}
              className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border text-[11px] font-bold transition-all ${
                filterOpen || activeFilterCount > 0
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                  : "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {activeFilterCount > 0 ? (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            {filterOpen ? (
              <div className="absolute top-[calc(100%+8px)] left-0 table-bg table-border border rounded-2xl p-1.5 min-w-[240px] z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                <div className="px-2.5 py-2 border-b table-border-cell mb-1">
                  <div className="text-[9px] font-black uppercase tracking-widest table-text-muted">
                    Payment filters
                  </div>
                </div>

                <div className="px-2.5 pb-1 pt-2 text-[8px] font-black uppercase tracking-widest table-text-muted">
                  Status
                </div>

                {STATUS_FILTER_OPTIONS.map((option) => {
                  const isActive = statusFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        resetPageAndSet(setStatusFilter)(option.value as "ALL" | PaymentStatus);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
                        isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-[12px] font-semibold table-text">{option.label}</span>
                      {isActive ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300">✓</span>
                      ) : null}
                    </button>
                  );
                })}

                <div className="mx-2.5 my-1 h-px table-border-row bg-current opacity-60" />

                <div className="px-2.5 pb-1 pt-1 text-[8px] font-black uppercase tracking-widest table-text-muted">
                  Method
                </div>

                {METHOD_FILTER_OPTIONS.map((option) => {
                  const isActive = methodFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        resetPageAndSet(setMethodFilter)(option.value as "ALL" | PaymentMethod);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
                        isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-[12px] font-semibold table-text">{option.label}</span>
                      {isActive ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300">✓</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border border-orange-500/30 bg-orange-500/[0.06] text-[11px] font-bold text-orange-400 transition-all hover:bg-orange-500/10"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={historyQuery.isFetching}
            className="ml-auto flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border table-border table-bg table-text hover:text-white hover:border-white/20 text-[11px] font-bold transition-all disabled:opacity-50"
          >
            {historyQuery.isFetching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="w-3.5 h-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {historyQuery.isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border table-border table-bg py-16">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border table-border table-bg px-6 py-14 text-center">
          <Search className="w-8 h-8 table-text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm font-bold text-white">No payments found</p>
          <p className="mt-2 text-xs text-slate-400">
            Try a different status or payment method filter.
          </p>
        </div>
      ) : (
        <>
          <PaymentRowCards items={items} />

          <div className="hidden table-bg table-border border rounded-[18px] overflow-hidden md:block">
            <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="table-header-bg table-border border-b">
                  <th className="px-3.5 pl-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "26%" }}>Payment</th>
                  <th className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "20%" }}>Billing</th>
                  <th className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "17%" }}>Method</th>
                  <th className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "15%" }}>Paid At</th>
                  <th className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "11%" }}>Status</th>
                  <th className="px-3.5 pr-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "11%" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((payment) => (
                  <tr key={payment.paymentAttemptId} className="border-b table-border-row last:border-0 hover:bg-white/[0.025] transition-colors">
                    <td className="px-3.5 pl-6 py-3.5">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-orange-500/25 bg-orange-500/10">
                          <CreditCard className="h-4 w-4 text-orange-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-white">
                            {payment.planName || "Membership payment"}
                          </p>
                          <p className="mt-0.5 text-[11px] table-text-muted">
                            {payment.invoiceNumber || `Payment #${payment.paymentAttemptId}`}
                          </p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-orange-400">
                            {[payment.planType, payment.billingCycle].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3.5">
                      <p className="text-[12px] font-bold text-white">{payment.billingName || "—"}</p>
                      <p className="mt-0.5 text-[11px] table-text-muted truncate">
                        {payment.billingPhoneNumber || "No number"}
                      </p>
                    </td>
                    <td className="px-3.5 py-3.5">
                      <p className="text-[12px] font-bold text-white">{getMethodLabel(payment.paymentMethod)}</p>
                      <p className="mt-0.5 text-[11px] table-text-muted truncate">
                        {payment.gatewayReference || payment.gatewayTransactionId || "Gateway pending"}
                      </p>
                    </td>
                    <td className="px-3.5 py-3.5 text-[12px] table-text">
                      {formatDateTime(payment.paymentTime)}
                    </td>
                    <td className="px-3.5 py-3.5">
                      <Badge className={getStatusBadgeClassName(payment.paymentStatus)}>
                        {payment.paymentStatus === "COMPLETED" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {payment.paymentStatus === "FAILED" && <XCircle className="mr-1 h-3 w-3" />}
                        {payment.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-3.5 pr-6 py-3.5 text-right">
                      <p className="text-[13px] font-black text-white">
                        {formatMoney(payment.totalAmount, payment.currency)}
                      </p>
                      <p className="mt-0.5 text-[11px] table-text-muted mt-1 whitespace-nowrap">
                        Tax {formatMoney(payment.taxAmount, payment.currency)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t table-border-cell pt-4 mt-2">
            <p className="text-[11px] table-text-muted">
              Showing page {(pageData?.page ?? 0) + 1} of {Math.max(pageData?.totalPages ?? 1, 1)} {" · "} {pageData?.totalItems ?? 0} total payments
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pageData?.hasPrevious}
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                className="px-4 py-1.5 rounded-full border table-border table-bg text-[11px] font-bold table-text hover:text-white hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-4 py-1.5 rounded-full border table-border table-bg-alt text-[11px] font-semibold text-white">
                Page {(pageData?.page ?? 0) + 1} of {Math.max(pageData?.totalPages ?? 1, 1)}
              </span>

              <button
                type="button"
                disabled={!pageData?.hasNext}
                onClick={() => setPage((current) => current + 1)}
                className="px-4 py-1.5 rounded-full border table-border table-bg text-[11px] font-bold table-text hover:text-white hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
