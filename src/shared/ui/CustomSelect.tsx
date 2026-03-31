import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";

interface CustomSelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled,
  invalid,
  className,
}: CustomSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        aria-invalid={invalid ? "true" : undefined}
        className={cn(
          "h-9 rounded-xl border-white/10 bg-[#0a0a0a] px-3 text-xs font-medium text-slate-200",
          "hover:border-orange-600/50 hover:bg-[#0a0a0a]",
          "focus:ring-0 focus:ring-offset-0 data-[state=open]:border-orange-600/50 data-[state=open]:shadow-[0_0_0_3px_rgba(234,88,12,0.08)]",
          "data-[placeholder]:text-slate-500",
          invalid && "border-red-500/80",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border-white/10 bg-[#111] text-slate-100">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="focus:bg-orange-600/20 focus:text-white">
            <span className="flex items-center gap-2">
              {option.icon ? <span className="text-xs opacity-70">{option.icon}</span> : null}
              <span>{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
