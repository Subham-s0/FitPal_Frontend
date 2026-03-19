import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
          "h-[46px] rounded-xl border-white/10 bg-[#0a0a0a] px-4 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-slate-500",
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
