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
  id?: string;
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export function CustomSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled,
  invalid,
  className,
  ariaLabel,
  ariaDescribedBy,
}: CustomSelectProps) {
  return (
    <div className="w-full min-w-0">
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={invalid ? "true" : undefined}
          className={cn(
            "h-9 w-full rounded-xl text-xs transition-all",
            disabled 
              ? "border-transparent bg-black/20 px-3 font-medium text-slate-500 opacity-100" 
              : "border-white/10 bg-[#0c0c0c] px-3 font-bold text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]",
            !disabled && "hover:border-orange-600/50 hover:bg-[#111]",
            "focus:ring-0 focus:ring-offset-0 data-[state=open]:border-orange-600/50 data-[state=open]:bg-[#111] data-[state=open]:shadow-[0_0_0_3px_rgba(234,88,12,0.06)]",
            "data-[placeholder]:text-slate-500",
            invalid && "border-red-500/80",
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-[#181818] text-slate-100 shadow-xl backdrop-blur-none">
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
    </div>
  );
}
