import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

export type AdminGymOption = {
  gymId: number;
  gymName: string | null;
};

type AdminGymComboboxProps = {
  gyms: AdminGymOption[];
  value: string;
  onValueChange: (value: string) => void;
  allLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Wider popover for long gym names */
  contentClassName?: string;
};

export function AdminGymCombobox({
  gyms,
  value,
  onValueChange,
  allLabel = "All gyms",
  placeholder = "Search gyms…",
  disabled,
  className,
  contentClassName,
}: AdminGymComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (value === "ALL" || !value) return allLabel;
    const id = Number(value);
    const g = gyms.find((x) => x.gymId === id);
    return g?.gymName?.trim() || `Gym #${value}`;
  }, [value, gyms, allLabel]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between border-white/10 bg-white/[0.03] px-3 font-normal text-white hover:bg-white/[0.06] hover:text-white",
            className,
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "z-[100] w-[var(--radix-popover-trigger-width)] border-white/10 bg-[#141414] p-0 text-white shadow-xl",
          "min-w-[280px] max-w-[min(100vw-2rem,420px)]",
          contentClassName,
        )}
        align="center"
        sideOffset={6}
      >
        <Command className="bg-transparent text-white [&_[cmdk-input-wrapper]_svg]:text-zinc-500">
          <CommandInput
            placeholder={placeholder}
            className="h-10 border-0 border-b border-white/10 bg-transparent text-sm text-white placeholder:text-zinc-600"
          />
          <CommandList className="max-h-[280px]">
            <CommandEmpty className="py-6 text-center text-sm text-zinc-500">No gym found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`__all__ ${allLabel}`}
                onSelect={() => {
                  onValueChange("ALL");
                  setOpen(false);
                }}
                className="cursor-pointer aria-selected:bg-orange-500/15 aria-selected:text-orange-100"
              >
                <Check className={cn("mr-2 h-4 w-4", value === "ALL" ? "opacity-100" : "opacity-0")} />
                {allLabel}
              </CommandItem>
              {gyms.map((gym) => {
                const idStr = String(gym.gymId);
                const label = gym.gymName?.trim() || `Gym #${gym.gymId}`;
                return (
                  <CommandItem
                    key={gym.gymId}
                    value={`${idStr} ${label}`}
                    onSelect={() => {
                      onValueChange(idStr);
                      setOpen(false);
                    }}
                    className="cursor-pointer aria-selected:bg-orange-500/15 aria-selected:text-orange-100"
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === idStr ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{label}</span>
                    <span className="ml-auto shrink-0 pl-2 font-mono text-[10px] text-zinc-500">#{gym.gymId}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
