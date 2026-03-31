import * as React from "react"
import { cn } from "@/shared/lib/utils"

export type TimeInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="time"
        ref={ref}
        // Force the browser's generic dark mode for the native popup
        style={{ colorScheme: "dark" }}
        className={cn(
          "w-full rounded-2xl border border-white/10 bg-[#0a0a0a] px-4 py-3",
          "text-sm font-medium text-white outline-none transition-all",
          "focus:border-orange-600/60 focus:ring-2 focus:ring-orange-600/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          
          // Style the little clock icon slightly
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:opacity-60",
          "[&::-webkit-calendar-picker-indicator]:hover:opacity-100",
          
          className
        )}
        {...props}
      />
    )
  }
)
TimeInput.displayName = "TimeInput"

export { TimeInput }
