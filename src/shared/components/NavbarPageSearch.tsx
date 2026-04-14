import { useEffect, useRef, useState, type ElementType, type KeyboardEvent } from "react";
import { ArrowRight, Search } from "lucide-react";

import { cn } from "@/shared/lib/utils";

export interface NavbarPageSearchItem {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  icon?: ElementType;
  onSelect: () => void;
}

interface NavbarPageSearchProps {
  items: NavbarPageSearchItem[];
  placeholder: string;
  emptyLabel?: string;
  className?: string;
  inputClassName?: string;
}

const normalizeSearchValue = (value: string) => value.trim().toLowerCase();

const itemMatchesQuery = (item: NavbarPageSearchItem, query: string) => {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  const searchableParts = [
    item.label,
    item.description,
    ...(item.keywords ?? []),
  ];

  return searchableParts.some((part) => normalizeSearchValue(part ?? "").includes(normalizedQuery));
};

const NavbarPageSearch = ({
  items,
  placeholder,
  emptyLabel = "No pages found.",
  className,
  inputClassName,
}: NavbarPageSearchProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const filteredItems = items.filter((item) => itemMatchesQuery(item, query));

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }

    if (!normalizeSearchValue(query) || filteredItems.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    setHighlightedIndex((currentIndex) => {
      if (currentIndex < 0) {
        return 0;
      }
      return Math.min(currentIndex, filteredItems.length - 1);
    });
  }, [filteredItems.length, open, query]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const cancelScheduledClose = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      setHighlightedIndex(-1);
    }, 120);
  };

  const handleSelect = (item: NavbarPageSearchItem) => {
    item.onSelect();
    setQuery("");
    setOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!filteredItems.length) {
        return;
      }
      setHighlightedIndex((currentIndex) =>
        currentIndex < 0 ? 0 : Math.min(currentIndex + 1, filteredItems.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!filteredItems.length) {
        return;
      }
      setHighlightedIndex((currentIndex) =>
        currentIndex < 0 ? filteredItems.length - 1 : Math.max(currentIndex - 1, 0)
      );
      return;
    }

    if (event.key === "Enter") {
      if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
        event.preventDefault();
        handleSelect(filteredItems[highlightedIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onMouseDown={cancelScheduledClose}
    >
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors focus-within:text-orange-600" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => {
          cancelScheduledClose();
          setOpen(true);
        }}
        onBlur={scheduleClose}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full rounded-full border border-[#2a2a2a] bg-[#141414] py-2.5 pl-11 pr-4 text-sm text-white outline-none transition-colors focus:border-orange-600",
          inputClassName
        )}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[80] overflow-hidden rounded-3xl border border-[#2a2a2a] bg-[#101010] shadow-[0_28px_70px_rgba(0,0,0,0.58)] backdrop-blur-xl">
          <div className="border-b border-white/6 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Page Navigation
          </div>

          {filteredItems.length ? (
            <div className="max-h-[320px] overflow-y-auto p-2">
              {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === highlightedIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                      isActive ? "bg-orange-500/14 text-white" : "text-zinc-200 hover:bg-white/5"
                    )}
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
                      {Icon ? <Icon className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{item.label}</p>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">{emptyLabel}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default NavbarPageSearch;
