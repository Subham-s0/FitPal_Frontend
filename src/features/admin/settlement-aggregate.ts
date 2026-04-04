import { getAdminPendingSettlementsApi } from "@/features/admin/admin-settlement.api";
import type {
  GymSettlementPayoutStatus,
  PendingGymSettlementResponse,
  PendingGymSettlementSearchParams,
} from "@/features/admin/admin-settlement.model";

/** Matches backend max page size for pending settlements search. */
export const SETTLEMENT_AGGREGATE_PAGE_SIZE = 100;
/** Cap pages fetched for charts/metrics to avoid excessive load. */
export const SETTLEMENT_AGGREGATE_MAX_PAGES = 25;

export type SettlementAggregateResult = {
  items: PendingGymSettlementResponse[];
  totalItems: number;
  capped: boolean;
};

/**
 * Loads all matching rows (up to cap) for metrics/charts. Table pagination uses separate paged requests.
 */
export async function fetchSettlementsForAggregate(
  base: Omit<PendingGymSettlementSearchParams, "page" | "size">
): Promise<SettlementAggregateResult> {
  const first = await getAdminPendingSettlementsApi({
    ...base,
    page: 0,
    size: SETTLEMENT_AGGREGATE_PAGE_SIZE,
  });
  const items = [...first.items];
  const totalPages = first.totalPages;
  const maxPages = Math.min(totalPages, SETTLEMENT_AGGREGATE_MAX_PAGES);

  for (let p = 1; p < maxPages; p++) {
    const next = await getAdminPendingSettlementsApi({
      ...base,
      page: p,
      size: SETTLEMENT_AGGREGATE_PAGE_SIZE,
    });
    items.push(...next.items);
  }

  return {
    items,
    totalItems: first.totalItems,
    capped: totalPages > maxPages,
  };
}

export type SettlementMetrics = {
  totalRowsInSample: number;
  totalItemsReported: number;
  capped: boolean;
  pendingCount: number;
  inPayoutCount: number;
  paidCount: number;
  grossSum: number;
  netSum: number;
  currency: string;
  statusSlices: { name: string; value: number; fill: string }[];
};

export function buildSettlementMetrics(
  items: PendingGymSettlementResponse[],
  totalItems: number,
  capped: boolean
): SettlementMetrics {
  let grossSum = 0;
  let netSum = 0;
  let pendingCount = 0;
  let inPayoutCount = 0;
  let paidCount = 0;
  let currency = "NPR";

  for (const row of items) {
    grossSum += row.grossAmount ?? 0;
    netSum += row.netAmount ?? 0;
    if (row.currency) currency = row.currency;
    const st: GymSettlementPayoutStatus = row.payoutStatus;
    if (st === "PENDING") pendingCount++;
    else if (st === "IN_PAYOUT") inPayoutCount++;
    else if (st === "PAID") paidCount++;
  }

  const statusSlices = [
    { name: "Pending", value: pendingCount, fill: "#94a3b8" },
    { name: "In payout", value: inPayoutCount, fill: "#ea580c" },
    { name: "Paid", value: paidCount, fill: "#10b981" },
  ];

  return {
    totalRowsInSample: items.length,
    totalItemsReported: totalItems,
    capped,
    pendingCount,
    inPayoutCount,
    paidCount,
    grossSum,
    netSum,
    currency,
    statusSlices,
  };
}
