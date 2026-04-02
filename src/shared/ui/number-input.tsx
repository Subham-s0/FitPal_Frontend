import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const toFiniteNumber = (val: string | number | undefined | null) => {
  if (val == null || val === "") return null
  const parsed = Number(val)
  return Number.isFinite(parsed) ? parsed : null
}

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showSpinners?: boolean
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, showSpinners = true, value, defaultValue, min, max, step = 1, disabled, readOnly, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    const [internalValue, setInternalValue] = React.useState(defaultValue == null ? "" : String(defaultValue))
    const renderedValue = value !== undefined ? String(value ?? "") : internalValue

    const handleStep = (direction: 1 | -1) => {
      if (!inputRef.current || disabled || readOnly) return
      
      const current = toFiniteNumber(inputRef.current.value) ?? 0
      const stepVal = toFiniteNumber(step) ?? 1
      let next = current + (direction * stepVal)

      const minVal = toFiniteNumber(min)
      const maxVal = toFiniteNumber(max)
      
      if (minVal !== null) next = Math.max(next, minVal)
      if (maxVal !== null) next = Math.min(next, maxVal)

      const stepDecimals = step.toString().split(".")[1]?.length ?? 0
      const nextString = stepDecimals > 0 ? next.toFixed(stepDecimals) : String(next)

      if (value === undefined) setInternalValue(nextString)

      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      nativeSetter?.call(inputRef.current, nextString)
      inputRef.current.dispatchEvent(new Event("input", { bubbles: true }))
    }

    const startStepping = (direction: 1 | -1) => {
      if (disabled || readOnly) return
      handleStep(direction) 
      timeoutRef.current = setTimeout(() => {
        timerRef.current = setInterval(() => handleStep(direction), 60)
      }, 400)
    }

    const stopStepping = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }

    React.useEffect(() => {
      return () => stopStepping()
    }, [])

    return (
      <div className="relative w-full">
        <input
          type="number"
          ref={inputRef}
          value={renderedValue}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => {
            if (value === undefined) setInternalValue(e.target.value)
            onChange?.(e)
          }}
          className={cn(
            "w-full rounded-2xl border px-4 py-2.5",
            "text-sm font-bold outline-none transition-all placeholder:text-slate-600",
            "focus:border-orange-600/60 focus:bg-[#111] focus:shadow-[0_0_0_3px_rgba(234,88,12,0.06)]",
            "disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-black/20 disabled:text-slate-500",
            disabled ? "" : "border-white/10 bg-[#0c0c0c] text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]",
            "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-moz-number-spin-box]:display-none",
            showSpinners && "pr-10",
            className
          )}
          {...props}
        />

        {showSpinners && (
          // Set to exactly gap-[0.7px]
          <div className="absolute inset-y-0 right-3 flex flex-col justify-center gap-[0.7px] py-1" onMouseUp={stopStepping} onMouseLeave={stopStepping}>
            <button
              type="button"
              onMouseDown={() => startStepping(1)}
              onTouchStart={(e) => { e.preventDefault(); startStepping(1); }}
              onTouchEnd={stopStepping}
              disabled={disabled || readOnly || (toFiniteNumber(max) !== null && toFiniteNumber(renderedValue) !== null && Number(renderedValue) >= Number(max))}
              className="flex h-[18px] w-5 items-center justify-center text-orange-500 transition-colors hover:text-orange-400 active:text-white disabled:pointer-events-none disabled:text-slate-700 focus-visible:outline-none"
            >
              <ChevronUp size={18} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onMouseDown={() => startStepping(-1)}
              onTouchStart={(e) => { e.preventDefault(); startStepping(-1); }}
              onTouchEnd={stopStepping}
              disabled={disabled || readOnly || (toFiniteNumber(min) !== null && toFiniteNumber(renderedValue) !== null && Number(renderedValue) <= Number(min))}
              className="flex h-[18px] w-5 items-center justify-center text-orange-500 transition-colors hover:text-orange-400 active:text-white disabled:pointer-events-none disabled:text-slate-700 focus-visible:outline-none"
            >
              <ChevronDown size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    )
  }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }