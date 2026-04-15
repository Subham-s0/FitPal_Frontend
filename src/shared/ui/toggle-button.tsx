import { cn } from "@/shared/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────
   Toggle Button Component
   
   Provides smooth transition animations for all toggle/tab-style buttons
   ───────────────────────────────────────────────────────────────────────── */

export interface ToggleButtonProps {
  /** Whether this button is currently active */
  active: boolean;
  /** Click handler */
  onClick: () => void;
  /** Button label/content */
  children: React.ReactNode;
  /** Optional additional className */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Style variant */
  variant?: "default" | "pill" | "minimal";
}

export function ToggleButton({
  active,
  onClick,
  children,
  className,
  size = "md",
  variant = "default",
}: ToggleButtonProps) {
  const sizeClasses = {
    sm: "px-2.5 py-1 text-[11px]",
    md: "px-3.5 py-[7px] text-[12px]",
    lg: "px-4 py-2 text-[13px]",
  };

  const variantClasses = {
    default: active
      ? "border-orange-500/50 bg-orange-500 text-white"
      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
    pill: active
      ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
      : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
    minimal: active
      ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
      : "border-transparent bg-transparent text-zinc-500 hover:text-orange-400 hover:border-white/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Base styles
        "relative inline-flex items-center justify-center gap-1.5 rounded-full border font-bold",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "transform-gpu will-change-transform",
        // Hover scale effect (only for inactive buttons)
        !active && "hover:scale-[1.02] active:scale-[0.98]",
        // Size
        sizeClasses[size],
        // Variant
        variantClasses[variant],
        // Custom className
        className
      )}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Toggle Button Group
   
   Container for toggle buttons with smooth indicator animation
   ───────────────────────────────────────────────────────────────────────── */

export interface ToggleGroupProps<T extends string> {
  /** Current active value */
  value: T;
  /** Change handler */
  onValueChange: (value: T) => void;
  /** Options to display */
  options: readonly T[] | { value: T; label: string }[];
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Style variant */
  variant?: "default" | "pill" | "minimal";
  /** Optional label formatter */
  formatLabel?: (value: T) => string;
  /** Optional additional className for container */
  className?: string;
}

export function ToggleGroup<T extends string>({
  value,
  onValueChange,
  options,
  size = "md",
  variant = "default",
  formatLabel,
  className,
}: ToggleGroupProps<T>) {
  const sizeClasses = {
    sm: "px-2.5 py-1 text-[11px]",
    md: "px-3.5 py-1.5 text-[12px]",
    lg: "px-4 py-2 text-[13px]",
  };
  const variantClasses = {
    default: (active: boolean) =>
      active
        ? "bg-orange-500 text-white"
        : "text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
    pill: (active: boolean) =>
      active
        ? "bg-orange-500/10 text-orange-400"
        : "text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
    minimal: (active: boolean) =>
      active
        ? "text-orange-400"
        : "text-zinc-400 hover:text-white hover:bg-white/[0.03]",
  };
  const opts = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1",
        "transition-all duration-300",
        className
      )}
    >
      {opts.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onValueChange(opt.value)}
          className={cn(
            "relative rounded-full font-bold",
            "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "transform-gpu will-change-transform",
            sizeClasses[size],
            variantClasses[variant](value === opt.value)
          )}
        >
          {formatLabel ? formatLabel(opt.value) : opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Legacy Constants (for backward compatibility)
   ───────────────────────────────────────────────────────────────────────── */

export const TOGGLE_BASE =
  "flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[12px] font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform";

export const TOGGLE_IDLE =
  "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]";

export const TOGGLE_ACTIVE =
  "border-orange-500/50 bg-orange-500 text-white";

export const TOGGLE_BAR =
  "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1 transition-all duration-300";
