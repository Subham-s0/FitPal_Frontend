import { useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  maxDate?: Date;
  minDate?: Date;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

function parseIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function CustomDatePicker({
  value,
  onChange,
  placeholder = "DD / MM / YYYY",
  disabled,
  invalid,
  className,
  maxDate,
  minDate,
}: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const effectiveMax = maxDate ?? today;
  const selectedDate = useMemo(() => parseIso(value), [value]);

  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => selectedDate ?? today,
  );

  useEffect(() => {
    setDisplayMonth(selectedDate ?? today);
  }, [selectedDate, today]);

  const yearOptions = useMemo(() => {
    const maxYear = effectiveMax.getFullYear();
    return Array.from({ length: 100 }, (_, i) => String(maxYear - i));
  }, [effectiveMax]);

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleMonthChange = (monthIndex: string) =>
    setDisplayMonth((prev) => new Date(prev.getFullYear(), Number(monthIndex), 1));

  const handleYearChange = (year: string) =>
    setDisplayMonth((prev) => new Date(Number(year), prev.getMonth(), 1));

  const handleDaySelect = (date: Date | undefined) => {
    onChange(date ? toIso(date) : "");
    if (date) setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const isDisabled = (date: Date) =>
    date > effectiveMax || (!!minDate && date < minDate);

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      {/* â”€â”€ Trigger â”€â”€ */}
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid ? "true" : undefined}
          className={cn(
            "group h-9 w-full justify-between rounded-xl px-3",
            "border-white/8 bg-[#0a0a0a] text-slate-200",
            "hover:bg-[#0a0a0a] hover:border-orange-600/50 hover:text-slate-200",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            open && "border-orange-600/50 shadow-[0_0_0_3px_rgba(234,88,12,0.08)]",
            !selectedDate && "text-slate-500",
            invalid && "border-red-500/70",
            className,
          )}
        >
          <span className="text-xs font-medium">
            {selectedDate ? formatDisplay(selectedDate) : placeholder}
          </span>

          <span className="flex items-center gap-1">
            {selectedDate && (
              <span
                role="button"
                aria-label="Clear date"
                onClick={handleClear}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                x
              </span>
            )}
            <CalendarIcon
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                open ? "text-orange-500" : "text-slate-500 group-hover:text-slate-400",
              )}
            />
          </span>
        </Button>
      </PopoverTrigger>

      {/* â”€â”€ Calendar panel â”€â”€ */}
      <PopoverContent
        align="start"
        sideOffset={5}
        className={cn(
          "w-[min(260px,calc(100vw-32px))] min-w-[220px] p-2.5",
          "border border-white/8 bg-[#111] text-slate-100",
          "shadow-[0_16px_48px_rgba(0,0,0,0.7)] rounded-xl",
        )}
      >
        {/* Month / Year selects */}
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          <Select value={String(displayMonth.getMonth())} onValueChange={handleMonthChange}>
            <SelectTrigger
              className={cn(
                "h-7 rounded-lg border-white/10 bg-[#0a0a0a]",
                "text-[11px] font-semibold text-slate-200",
                "focus:ring-0 focus:ring-offset-0 hover:border-orange-600/40 data-[state=open]:border-orange-600/50 data-[state=open]:shadow-[0_0_0_2px_rgba(234,88,12,0.12)]",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/10 bg-[#111] text-slate-100">
              {MONTHS.map((label, i) => (
                <SelectItem
                  key={label}
                  value={String(i)}
                  className="py-1 text-[11px] focus:bg-white/5 focus:text-white"
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(displayMonth.getFullYear())} onValueChange={handleYearChange}>
            <SelectTrigger
              className={cn(
                "h-7 rounded-lg border-white/10 bg-[#0a0a0a]",
                "text-[11px] font-semibold text-slate-200",
                "focus:ring-0 focus:ring-offset-0 hover:border-orange-600/40 data-[state=open]:border-orange-600/50 data-[state=open]:shadow-[0_0_0_2px_rgba(234,88,12,0.12)]",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-52 rounded-xl border-white/10 bg-[#111] text-slate-100">
              {yearOptions.map((year) => (
                <SelectItem
                  key={year}
                  value={year}
                  className="py-1 text-[11px] focus:bg-white/5 focus:text-white"
                >
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calendar grid */}
        <Calendar
          mode="single"
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          selected={selectedDate}
          onSelect={handleDaySelect}
          disabled={isDisabled}
          initialFocus
          classNames={{
            months: "w-full",
            month: "w-full space-y-1",
            caption: "hidden",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell:
              "flex-1 text-[9px] font-bold uppercase text-slate-600 text-center py-0.5",
            row: "flex w-full mt-0.5",
            cell: "flex-1 text-center",
            day: cn(
              "mx-auto flex h-6 w-6 items-center justify-center rounded-md",
              "text-[11px] font-semibold text-slate-400 transition-all",
              "hover:bg-orange-600/15 hover:text-white",
            ),
            day_selected:
              "bg-orange-600 text-white shadow-[0_2px_8px_rgba(234,88,12,0.4)] hover:bg-orange-600 hover:text-white",
            day_today: "text-orange-500 font-black",
            day_outside: "text-slate-700",
            day_disabled:
              "text-slate-800 cursor-not-allowed hover:bg-transparent hover:text-slate-800",
            nav: "hidden",
          }}
        />

        {/* Footer */}
        <div className="mt-1.5 flex items-center justify-between border-t border-white/6 pt-2">
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] font-semibold text-slate-600 transition-colors hover:text-slate-300"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              setDisplayMonth(today);
              onChange(toIso(today));
              setOpen(false);
            }}
            className="text-[10px] font-semibold text-orange-500 transition-colors hover:text-orange-400"
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
