import type { PendingGymSettlementResponse } from "@/features/admin/admin-settlement.model";

export type SettlementBarDatum = {
  key: string;
  label: string;
  count: number;
  fill: string;
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
