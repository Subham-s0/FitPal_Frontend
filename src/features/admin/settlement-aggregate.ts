import {
  getAdminPendingSettlementsApi,
  getAdminPayoutBatchesApi,
} from "@/features/admin/admin-settlement.api";
import type {
  GymSettlementPayoutStatus,
  PendingGymSettlementResponse,
  PendingGymSettlementSearchParams,
  PayoutSettlementResponse,
  PayoutSettlementSearchParams,
} from "@/features/admin/admin-settlement.model";

/** Matches backend max page size for pending settlements search. */
export const SETTLEMENT_AGGREGATE_PAGE_SIZE = 100;

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

  // Cards/charts must reflect the full filtered dataset, not just paged table rows.
  for (let p = 1; p < totalPages; p++) {
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
    capped: false,
  };
}

/**
 * Loads unresolved rows used by the due timeline (pending + in payout).
 * This intentionally ignores check-in payout status filters from table/chart controls.
 */
export async function fetchAdminDueTimelineSettlements(
  base: Omit<PendingGymSettlementSearchParams, "page" | "size" | "payoutStatus">
): Promise<PendingGymSettlementResponse[]> {
  const [pending, inPayout] = await Promise.all([
    fetchSettlementsForAggregate({
      ...base,
      payoutStatus: "PENDING",
      sortBy: "visitDate",
      sortDirection: "ASC",
    }),
    fetchSettlementsForAggregate({
      ...base,
      payoutStatus: "IN_PAYOUT",
      sortBy: "visitDate",
      sortDirection: "ASC",
    }),
  ]);

  return [...pending.items, ...inPayout.items];
}

export async function fetchAdminPayoutBatchesForAggregate(
  base: Omit<PayoutSettlementSearchParams, "page" | "size">
): Promise<PayoutSettlementResponse[]> {
  const first = await getAdminPayoutBatchesApi({
    ...base,
    page: 0,
    size: SETTLEMENT_AGGREGATE_PAGE_SIZE,
  });
  const items = [...first.items];

  for (let p = 1; p < first.totalPages; p++) {
    const next = await getAdminPayoutBatchesApi({
      ...base,
      page: p,
      size: SETTLEMENT_AGGREGATE_PAGE_SIZE,
    });
    items.push(...next.items);
  }

  return items;
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
