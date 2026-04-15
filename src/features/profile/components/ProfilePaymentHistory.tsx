import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CreditCard,
  Eye,
  Loader2,
  RefreshCcw,
  Receipt,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { getMyPaymentHistoryApi, getMyPaymentHistorySummaryApi } from "@/features/payment/api";
import type {
  PaymentMethod,
  PaymentStatus,
  UserPaymentHistoryItemResponse,
} from "@/features/payment/model";
import {
  METHOD_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  getPaymentMethodLabel,
  getPaymentStatusBadgeClassName,
} from "@/features/payment/payment.constants";
import { PaymentAttemptDetailFields } from "@/features/payment/components/PaymentAttemptDetailFields";
import { profileQueryKeys } from "@/features/profile/queryKeys";
import { SectionLabel } from "@/features/profile/components/ProfileSetupShell";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { getApiErrorMessage } from "@/shared/api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";

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

const SortIcon = ({ direction }: { direction: "ASC" | "DESC" }) =>
  direction === "DESC" ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />;

function PaymentRowCards({
  items,
  onOpenDetail,
}: {
  items: UserPaymentHistoryItemResponse[];
  onOpenDetail: (payment: UserPaymentHistoryItemResponse) => void;
}) {
  return (
    <div className="space-y-2 md:hidden">
      {items.map((payment) => (
        <div
          key={payment.paymentAttemptId}
          className="rounded-[14px] border table-border user-surface-soft p-3 shadow-sm transition-all hover:brightness-[1.08]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-orange-500/25 bg-orange-500/10">
                <CreditCard className="h-3.5 w-3.5 text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-tight text-white">
                  {payment.planName || "Membership payment"}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {payment.invoiceNumber || `#${payment.paymentAttemptId}`} · {getPaymentMethodLabel(payment.paymentMethod)}
                </p>
              </div>
            </div>
            <Badge className={cn("shrink-0 text-[9px] px-2 py-0.5", getPaymentStatusBadgeClassName(payment.paymentStatus))}>
              {payment.paymentStatus}
            </Badge>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Amount</p>
              <p className="mt-0.5 font-black text-white">{formatMoney(payment.totalAmount, payment.currency)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Paid At</p>
              <p className="mt-0.5 text-slate-200">{formatDateTime(payment.paymentTime)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Plan</p>
              <p className="mt-0.5 text-slate-200">{payment.planType || "—"}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Billing</p>
              <p className="mt-0.5 text-slate-200">{payment.billingCycle || "—"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenDetail(payment)}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-white/8 bg-white/[0.03] py-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300"
          >
            <Eye className="h-3 w-3" />
            View details
          </button>
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
  const [detail, setDetail] = useState<UserPaymentHistoryItemResponse | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const historyQuery = useQuery({
    queryKey: profileQueryKeys.paymentHistory(
      statusFilter === "ALL" ? null : statusFilter,
      methodFilter === "ALL" ? null : methodFilter,
      sortDirection,
      page
    ),
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

  const summaryQuery = useQuery({
    queryKey: profileQueryKeys.paymentHistorySummary(
      statusFilter === "ALL" ? null : statusFilter,
      methodFilter === "ALL" ? null : methodFilter
    ),
    queryFn: () =>
      getMyPaymentHistorySummaryApi({
        statuses: statusFilter === "ALL" ? undefined : [statusFilter],
        paymentMethods: methodFilter === "ALL" ? undefined : [methodFilter],
      }),
  });

  const pageData = historyQuery.data ?? null;
  const items = useMemo(() => pageData?.items ?? [], [pageData]);

  const pageSummary = useMemo(() => {
    const completed = items.filter((item) => item.paymentStatus === "COMPLETED").length;
    const failed = items.filter((item) => item.paymentStatus === "FAILED").length;
    const totalPaid = items
      .filter((item) => item.paymentStatus === "COMPLETED")
      .reduce((sum, item) => sum + item.totalAmount, 0);

    return { completed, failed, totalPaid };
  }, [items]);

  const summary = summaryQuery.data
    ? {
        completed: summaryQuery.data.completedPayments,
        failed: summaryQuery.data.failedPayments,
        totalPaid: summaryQuery.data.totalPaidAmount,
      }
    : pageSummary;

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
    void Promise.all([historyQuery.refetch(), summaryQuery.refetch()]).then(([historyResult, summaryResult]) => {
      if (historyResult.error || summaryResult.error) {
        toast.error(
          getApiErrorMessage(historyResult.error ?? summaryResult.error, "Failed to refresh payment history")
        );
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

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-[12px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.04] p-2.5 transition duration-200 hover:brightness-110 sm:rounded-[14px] sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/[0.15] sm:h-8 sm:w-8 sm:rounded-xl">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 sm:h-4 sm:w-4" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-400 sm:text-[10px]">Done</p>
            </div>
            <p className="mt-1.5 text-xl font-black text-white sm:mt-2 sm:text-2xl">{summary.completed}</p>
          </div>
          <div className="rounded-[12px] border border-red-500/20 bg-gradient-to-br from-red-500/[0.12] to-red-500/[0.04] p-2.5 transition duration-200 hover:brightness-110 sm:rounded-[14px] sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/[0.15] sm:h-8 sm:w-8 sm:rounded-xl">
                <XCircle className="h-3 w-3 text-red-400 sm:h-4 sm:w-4" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-red-400 sm:text-[10px]">Failed</p>
            </div>
            <p className="mt-1.5 text-xl font-black text-white sm:mt-2 sm:text-2xl">{summary.failed}</p>
          </div>
          <div className="rounded-[12px] border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] to-orange-500/[0.04] p-2.5 transition duration-200 hover:brightness-110 sm:rounded-[14px] sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/[0.15] sm:h-8 sm:w-8 sm:rounded-xl">
                <Receipt className="h-3 w-3 text-orange-400 sm:h-4 sm:w-4" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-orange-400 sm:text-[10px]">Paid</p>
            </div>
            <p className="mt-1.5 text-base font-black text-white sm:mt-2 sm:text-xl">{formatMoney(summary.totalPaid)}</p>
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
          <PaymentRowCards items={items} onOpenDetail={setDetail} />

          <div className="hidden table-bg table-border border rounded-[18px] overflow-hidden md:block">
            <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="table-header-bg table-border border-b">
                  <th className="px-3.5 pl-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "22%" }}>Payment</th>
                  <th className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "22%" }}>Billing</th>
                  <th className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "13%" }}>Method</th>
                  <th className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "12%" }}>Paid At</th>
                  <th className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "10%" }}>Status</th>
                  <th className="px-3.5 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "11%" }}>Total</th>
                  <th className="px-3.5 pr-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted" style={{ width: "10%" }}> </th>
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
                    <td className="px-3.5 py-3.5 align-top">
                      <p className="text-[12px] font-bold text-white">{payment.billingName || "—"}</p>
                      <p className="mt-0.5 break-all text-[11px] font-medium text-slate-400">
                        {payment.billingEmail || "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] table-text-muted truncate">
                        {payment.billingPhoneNumber || "—"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">
                        {[payment.billingAddress, payment.billingCity].filter(Boolean).join(", ") || "—"}
                      </p>
                    </td>
                    <td className="px-3.5 py-3.5">
                      <p className="text-[12px] font-bold text-white">{getPaymentMethodLabel(payment.paymentMethod)}</p>
                      <p className="mt-0.5 text-[11px] table-text-muted truncate">
                        {payment.gatewayReference || payment.gatewayTransactionId || "Gateway pending"}
                      </p>
                    </td>
                    <td className="px-3.5 py-3.5 text-[12px] table-text">
                      {formatDateTime(payment.paymentTime)}
                    </td>
                    <td className="px-3.5 py-3.5">
                      <Badge className={getPaymentStatusBadgeClassName(payment.paymentStatus)}>
                        {payment.paymentStatus === "COMPLETED" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {payment.paymentStatus === "FAILED" && <XCircle className="mr-1 h-3 w-3" />}
                        {payment.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-3.5 text-right">
                      <p className="text-[13px] font-black text-white">
                        {formatMoney(payment.totalAmount, payment.currency)}
                      </p>
                      <p className="mt-0.5 text-[11px] table-text-muted mt-1 whitespace-nowrap">
                        Tax {formatMoney(payment.taxAmount, payment.currency)}
                      </p>
                    </td>
                    <td className="px-3.5 pr-6 py-3.5 text-right align-middle">
                      <button
                        type="button"
                        onClick={() => setDetail(payment)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-200 transition-colors hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
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

          <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0a0a0a] text-white sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-black">Payment details</DialogTitle>
                <DialogDescription className="text-[13px] text-slate-500">
                  Same layout as admin payment review: billing from checkout, amounts, and gateway references.
                </DialogDescription>
              </DialogHeader>
              {detail ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-4">
                    <p className="text-3xl font-black">{formatMoney(detail.totalAmount, detail.currency)}</p>
                    <Badge className={cn(getPaymentStatusBadgeClassName(detail.paymentStatus))}>{detail.paymentStatus}</Badge>
                    <p className="font-mono text-[11px] text-slate-500">
                      {detail.invoiceNumber ?? `Attempt #${detail.paymentAttemptId}`}
                    </p>
                  </div>
                  <PaymentAttemptDetailFields detail={detail} />
                </div>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-400 hover:bg-white/10 hover:text-white"
                  onClick={() => setDetail(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
