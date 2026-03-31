import { createPortal } from "react-dom";
import { useState, useRef, useEffect, type CSSProperties } from "react";
import { X, ChevronDown } from "lucide-react";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = containerRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);

      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));
  const availableOptions = options.filter((opt) => !value.includes(opt.value));

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const updateDropdownPosition = () => {
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    updateDropdownPosition();

    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen, selectedOptions.length, availableOptions.length]);

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2 text-xs font-medium text-slate-200 transition-all hover:border-orange-600/50 focus:border-orange-600/50 focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(234,88,12,0.08)] ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <div className="flex flex-1 flex-wrap gap-1.5 items-center min-h-[28px]">
          {selectedOptions.length === 0 ? (
            <span className="text-slate-500">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600/20 px-2 py-1 text-[10px] font-black uppercase text-orange-600"
              >
                {option.label}
                <button
                  type="button"
                  onClick={(e) => handleRemove(option.value, e)}
                  className="hover:text-orange-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={`ml-2 h-4 w-4 flex-shrink-0 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[320] rounded-xl border border-white/10 bg-[#111] py-2 shadow-xl"
              style={dropdownStyle}
            >
              {availableOptions.length === 0 ? (
                <div className="px-3 py-2 text-center text-xs text-gray-500">
                  No more options available
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {availableOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggle(option.value)}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-100 transition-colors hover:bg-orange-600/20 hover:text-white"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
