import type {
  PendingGymSettlementResponse,
  PayoutSettlementResponse,
} from "@/features/admin/admin-settlement.model";

export type SettlementBarDatum = {
  key: string;
  label: string;
  count: number;
  fill: string;
};

export type DueTimelineDatum = {
  key: string;
  pendingAmount: number;
  inPayoutAmount: number;
  dayDueAmount: number;
  cumulativeDueAmount: number;
};

export type DueBalanceTimelineDatum = {
  key: string;
  checkinAmount: number;
  paidAmount: number;
  dueAmount: number;
};

const WEEK_FILLS = ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa", "#fdba74", "#f97316"];
const MONTH_FILLS = ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412"];

function visitDayIso(row: PendingGymSettlementResponse): string | null {
  const vd = row.visitDate?.trim();
  if (!vd) return null;
  if (vd.length >= 10) return vd.slice(0, 10);
  if (vd.length === 7) return `${vd}-01`;
  return null;
}

function visitYearMonth(row: PendingGymSettlementResponse): string | null {
  const vd = row.visitDate?.trim();
  if (!vd || vd.length < 7) return null;
  return vd.slice(0, 7);
}

/** Parse YYYY-MM-DD as local calendar date (no UTC shift). */
export function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, delta: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + delta);
  return n;
}

function minYmd(a: string, b: string): string {
  return a <= b ? a : b;
}

function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

function instantToLocalYmd(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatYmdLocal(date);
}

/**
 * Builds a day-by-day due timeline from the oldest unresolved settlement date to today.
 * Unresolved statuses are PENDING and IN_PAYOUT, with netAmount as the due amount basis.
 */
export function buildDueTimelineFromOldestDue(
  items: PendingGymSettlementResponse[],
  todayYmd = formatYmdLocal(new Date())
): DueTimelineDatum[] {
  const pendingByDay = new Map<string, number>();
  const inPayoutByDay = new Map<string, number>();
  let oldestDay: string | null = null;

  for (const row of items) {
    if (row.payoutStatus !== "PENDING" && row.payoutStatus !== "IN_PAYOUT") continue;
    const day = visitDayIso(row);
    if (!day) continue;

    oldestDay = oldestDay == null ? day : minYmd(oldestDay, day);

    const amount = Math.max(Number(row.netAmount ?? 0), 0);
    if (row.payoutStatus === "PENDING") {
      pendingByDay.set(day, (pendingByDay.get(day) ?? 0) + amount);
    } else {
      inPayoutByDay.set(day, (inPayoutByDay.get(day) ?? 0) + amount);
    }
  }

  if (!oldestDay) return [];

  const start = parseYmdLocal(oldestDay);
  const today = parseYmdLocal(todayYmd);
  const end = today.getTime() >= start.getTime() ? today : start;

  const out: DueTimelineDatum[] = [];
  let cumulative = 0;
  for (let d = new Date(start); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    const key = formatYmdLocal(d);
    const pendingAmount = pendingByDay.get(key) ?? 0;
    const inPayoutAmount = inPayoutByDay.get(key) ?? 0;
    const dayDueAmount = pendingAmount + inPayoutAmount;
    cumulative += dayDueAmount;

    out.push({
      key,
      pendingAmount,
      inPayoutAmount,
      dayDueAmount,
      cumulativeDueAmount: cumulative,
    });
  }

  return out;
}

/**
 * Builds a due-balance timeline from the oldest pending check-in settlement to today.
 * - Bars should use `checkinAmount` (all check-in settlements in the window)
 * - Line should use `dueAmount` (running due, reduced by payouts on paid dates)
 */
export function buildDueBalanceTimelineFromOldestPending(
  settlements: PendingGymSettlementResponse[],
  payouts: PayoutSettlementResponse[],
  todayYmd = formatYmdLocal(new Date())
): DueBalanceTimelineDatum[] {
  let oldestPendingDay: string | null = null;
  for (const row of settlements) {
    if (row.payoutStatus !== "PENDING") continue;
    const day = visitDayIso(row);
    if (!day) continue;
    oldestPendingDay = oldestPendingDay == null ? day : minYmd(oldestPendingDay, day);
  }

  // Fallback keeps timeline available when there are only IN_PAYOUT unresolved rows.
  if (!oldestPendingDay) {
    for (const row of settlements) {
      if (row.payoutStatus !== "IN_PAYOUT") continue;
      const day = visitDayIso(row);
      if (!day) continue;
      oldestPendingDay = oldestPendingDay == null ? day : minYmd(oldestPendingDay, day);
    }
  }

  if (!oldestPendingDay) return [];

  const startYmd = oldestPendingDay;
  const endYmd = maxYmd(todayYmd, startYmd);
  const checkinByDay = new Map<string, number>();
  const paidByDay = new Map<string, number>();

  const paidDayByPayoutId = new Map<number, string>();
  for (const payout of payouts) {
    const payoutId = Number(payout.payoutSettlementId);
    if (!Number.isFinite(payoutId)) continue;
    const paidDay = instantToLocalYmd(payout.paidAt);
    if (!paidDay) continue;
    paidDayByPayoutId.set(payoutId, paidDay);
  }

  for (const settlement of settlements) {
    const visitDay = visitDayIso(settlement);
    if (!visitDay || visitDay < startYmd) continue;

    const net = Math.max(Number(settlement.netAmount ?? 0), 0);
    checkinByDay.set(visitDay, (checkinByDay.get(visitDay) ?? 0) + net);

    const payoutId = settlement.payoutSettlementId == null ? null : Number(settlement.payoutSettlementId);
    if (payoutId == null || !Number.isFinite(payoutId)) continue;

    const paidDay = paidDayByPayoutId.get(payoutId);
    if (!paidDay || paidDay < startYmd) continue;
    paidByDay.set(paidDay, (paidByDay.get(paidDay) ?? 0) + net);
  }

  const out: DueBalanceTimelineDatum[] = [];
  let runningDue = 0;
  for (let d = parseYmdLocal(startYmd); formatYmdLocal(d) <= endYmd; d = addDays(d, 1)) {
    const key = formatYmdLocal(d);
    const checkinAmount = checkinByDay.get(key) ?? 0;
    const paidAmount = paidByDay.get(key) ?? 0;
    runningDue = Math.max(0, runningDue + checkinAmount - paidAmount);

    out.push({
      key,
      checkinAmount,
      paidAmount,
      dueAmount: runningDue,
    });
  }

  return out;
}

/** End-inclusive 7-day window: [end-6, end]. */
export function buildWeekCheckInBars(
  items: PendingGymSettlementResponse[],
  weekEndYmd: string
): SettlementBarDatum[] {
  const end = parseYmdLocal(weekEndYmd);
  const byDay = new Map<string, number>();
  for (const row of items) {
    const day = visitDayIso(row);
    if (!day) continue;
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const out: SettlementBarDatum[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(end, -i);
    const iso = formatYmdLocal(d);
    const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    out.push({
      key: iso,
      label,
      count: byDay.get(iso) ?? 0,
      fill: WEEK_FILLS[(6 - i) % WEEK_FILLS.length],
    });
  }
  return out;
}

/** 12 calendar months ending at `endYearMonth` (YYYY-MM), oldest first. */
export function buildTwelveMonthCheckInBars(
  items: PendingGymSettlementResponse[],
  endYearMonth: string
): SettlementBarDatum[] {
  const [ey, em] = endYearMonth.split("-").map((x) => Number(x));
  const end = new Date(ey, (em ?? 1) - 1, 1);

  const byMonth = new Map<string, number>();
  for (const row of items) {
    const ym = visitYearMonth(row);
    if (!ym) continue;
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + 1);
  }

  const months: string[] = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(end.getFullYear(), end.getMonth() - k, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }

  return months.map((ym, i) => {
    const [y, mo] = ym.split("-").map((x) => Number(x));
    const d = new Date(y, (mo ?? 1) - 1, 1);
    const label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    return {
      key: ym,
      label,
      count: byMonth.get(ym) ?? 0,
      fill: MONTH_FILLS[i % MONTH_FILLS.length],
    };
  });
}

export function defaultWeekEndYmd(): string {
  return formatYmdLocal(new Date());
}

export function defaultMonthEndYm(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftWeekEndYmd(weekEndYmd: string, deltaWeeks: number): string {
  const end = parseYmdLocal(weekEndYmd);
  return formatYmdLocal(addDays(end, deltaWeeks * 7));
}

export function shiftYearMonth(endYearMonth: string, deltaMonths: number): string {
  const [y, m] = endYearMonth.split("-").map((x) => Number(x));
  const d = new Date(y, (m ?? 1) - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
