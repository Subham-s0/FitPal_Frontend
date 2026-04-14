import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export const CheckIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 13 13" aria-hidden="true">
    <path
      d="M2 6.5l3.5 3.5 5.5-6"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-0.5 text-[11px] text-red-500">{message}</p> : null;

export const SectionLabel = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => (
  <div
    className={cn(
      "mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600",
      className,
    )}
  >
    <span>{children}</span>
    <span className="h-px flex-1 bg-orange-600/20" />
  </div>
);

export const Field = ({
  label,
  error,
  className,
  labelFor,
  errorId,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  labelFor?: string;
  errorId?: string;
  children: ReactNode;
}) => (
  <div className={cn("flex flex-col gap-1", className)}>
    <label
      htmlFor={labelFor}
      className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
    >
      {label}
    </label>
    {children}
    <div id={error ? errorId : undefined}>
      <FieldError message={error} />
    </div>
  </div>
);

export const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      "w-full rounded-2xl border px-4 py-2.5",
      "text-sm font-bold outline-none transition-all",
      "placeholder:text-slate-700",
      "focus:border-orange-600/60 focus:bg-[#111] focus:shadow-[0_0_0_3px_rgba(234,88,12,0.06)]",
      "disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-black/20 disabled:text-slate-500",
      props.disabled
        ? ""
        : "border-white/10 bg-[#0c0c0c] text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]",
      props.className,
    )}
  />
);

export const Pill = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-full border px-4 py-2 text-xs font-semibold transition-all",
      selected
        ? "border-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 font-bold text-black shadow-[0_4px_14px_rgba(234,88,12,0.25)]"
        : "border-white/10 bg-[#0a0a0a] text-slate-400 hover:border-orange-600/40 hover:text-white",
    )}
  >
    {label}
  </button>
);
