"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useDayPicker, useNavigation } from "react-day-picker";
import { setMonth, setYear, getYear, getMonth } from "date-fns";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// ─────────────────────────────────────────────────────────────────────────────
// Custom Caption
// ─────────────────────────────────────────────────────────────────────────────
function CustomCaption({
  displayMonth,
  selectedDate,
  onSelectDate,
}: {
  displayMonth: Date;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
}) {
  const { goToMonth } = useNavigation();
  const { fromYear, toYear } = useDayPicker();

  const currentYear = getYear(displayMonth);
  const currentMonth = getMonth(displayMonth); // 0-indexed

  const startYear = fromYear ?? currentYear - 80;
  const endYear = toYear ?? currentYear + 20;

  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  const MONTHS = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];

  /** Handle Month Change: Navigate view AND update form value */
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = Number(e.target.value);
    const newDisplayDate = setMonth(displayMonth, newMonth);
    goToMonth(newDisplayDate); // Update calendar view

    // Auto-update the selected value in the form
    if (onSelectDate) {
      // If a date is already selected, keep the day but change the month
      // Otherwise, use today's day in the newly selected month
      const baseDate = selectedDate || new Date();
      onSelectDate(setMonth(baseDate, newMonth));
    }
  };

  /** Handle Year Change: Navigate view AND update form value */
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = Number(e.target.value);
    const newDisplayDate = setYear(displayMonth, newYear);
    goToMonth(newDisplayDate); // Update calendar view

    // Auto-update the selected value in the form
    if (onSelectDate) {
      const baseDate = selectedDate || new Date();
      onSelectDate(setYear(baseDate, newYear));
    }
  };

  return (
    <div className="flex items-center justify-center gap-1 py-0.5">
      {/* Month selector */}
      <select
        value={currentMonth}
        onChange={handleMonthChange}
        className={cn(
          "h-7 cursor-pointer appearance-none rounded-md border border-white/10 bg-[#0a0a0a] px-2",
          "text-[11px] font-semibold text-slate-200 outline-none transition-colors",
          "hover:border-orange-600/50 hover:text-white",
          "focus:border-orange-600/60 focus:text-white focus:shadow-[0_0_0_2px_rgba(234,88,12,0.12)]",
        )}
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i} className="bg-[#111] text-slate-100">
            {m}
          </option>
        ))}
      </select>

      {/* Year selector */}
      <select
        value={currentYear}
        onChange={handleYearChange}
        className={cn(
          "h-7 cursor-pointer appearance-none rounded-md border border-white/10 bg-[#0a0a0a] px-2",
          "text-[11px] font-semibold text-slate-200 outline-none transition-colors",
          "hover:border-orange-600/50 hover:text-white",
          "focus:border-orange-600/60 focus:text-white focus:shadow-[0_0_0_2px_rgba(234,88,12,0.12)]",
        )}
      >
        {years.map((y) => (
          <option key={y} value={y} className="bg-[#111] text-slate-100">
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Component
// ─────────────────────────────────────────────────────────────────────────────
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2.5", className)}
      fromYear={1900}
      toYear={new Date().getFullYear() + 20}
      classNames={{
        months: "flex flex-col gap-3",
        month: "space-y-2",
        caption: "relative flex items-center justify-center pt-0.5",
        caption_label: "text-xs font-semibold text-slate-200",
        nav: "flex items-center gap-1",
        nav_button:
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-[#0a0a0a] p-0 text-slate-400 transition-colors hover:border-orange-600/50 hover:bg-orange-600/10 hover:text-orange-400",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 rounded-md text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-600",
        row: "mt-1 flex w-full",
        cell: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day:
          "h-8 w-8 rounded-md p-0 text-[12px] font-semibold text-slate-300 transition-colors hover:bg-orange-600/15 hover:text-white aria-selected:opacity-100",
        day_range_end: "day-range-end",
        day_selected:
          "bg-orange-600 text-white shadow-[0_2px_8px_rgba(234,88,12,0.4)] hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white",
        day_today: "border border-orange-600/40 text-orange-400",
        day_outside:
          "day-outside text-slate-700 opacity-70 aria-selected:bg-white/5 aria-selected:text-slate-600",
        day_disabled: "text-slate-800 opacity-80",
        day_range_middle:
          "aria-selected:bg-orange-600/15 aria-selected:text-slate-100",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        
        // Fix: Use CaptionLabel instead of Caption to prevent double rendering
        // Pass the `selected` and `onSelect` from the parent props into the custom caption
        CaptionLabel: ({ displayMonth }) => (
          <CustomCaption 
            displayMonth={displayMonth} 
            selectedDate={props.selected as Date}
            onSelectDate={props.onSelect as any}
          />
        ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
