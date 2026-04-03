import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { PlanResponse } from "@/features/plans/model";
import PlanBrowser, { type PlanBrowserBillingCycle } from "@/features/plans/components/PlanBrowser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

interface ViewPlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PlanResponse[];
  highlightedPlanId?: number | null;
  defaultBillingCycle?: PlanBrowserBillingCycle;
  title?: string;
  description?: string;
  highlightLabel?: string;
  isLoading?: boolean;
  isError?: boolean;
}

export default function ViewPlansDialog({
  open,
  onOpenChange,
  plans,
  highlightedPlanId = null,
  defaultBillingCycle = "monthly",
  title = "View Plans",
  description = "Browse available membership plans and compare monthly or yearly pricing.",
  highlightLabel = "Current Plan",
  isLoading = false,
  isError = false,
}: ViewPlansDialogProps) {
  const [billingCycle, setBillingCycle] = useState<PlanBrowserBillingCycle>(defaultBillingCycle);

  useEffect(() => {
    if (!open) return;
    setBillingCycle(defaultBillingCycle);
  }, [defaultBillingCycle, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[calc(100vw-1rem)] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[1.4rem] border table-border table-bg p-0 text-white sm:w-[min(72rem,calc(100vw-2.5rem))] sm:max-w-[72rem] sm:max-h-[min(92vh,54rem)]">
        <div className="shrink-0 border-b border-white/[0.06] bg-[linear-gradient(135deg,rgba(249,115,22,0.12),var(--table-bg)_40%,var(--table-bg))] px-4 py-2.5 sm:px-5 sm:py-3">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-white sm:text-lg">{title}</DialogTitle>
            <DialogDescription className="text-[10px] leading-relaxed text-slate-400 sm:text-[11px]">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-2.5 sm:p-3.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
            </div>
          ) : isError ? (
            <div className="rounded-[18px] border border-red-500/20 bg-red-500/5 p-6 text-center">
              <p className="text-sm font-bold text-red-200">Plans could not be loaded.</p>
              <p className="mt-2 text-xs text-slate-400">Try again in a moment.</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-[18px] border border-white/10 bg-black/20 p-6 text-center">
              <p className="text-sm font-bold text-white">No plans available right now.</p>
              <p className="mt-2 text-xs text-slate-400">Check back again in a little while.</p>
            </div>
          ) : (
            <PlanBrowser
              plans={plans}
              billingCycle={billingCycle}
              onBillingChange={setBillingCycle}
              compact
              desktopLayout="grid"
              footerMode="status"
              selectedPlanKey={highlightedPlanId}
              selectionKeyType="planId"
              selectedBadgeLabel={highlightLabel}
              getFooterLabel={(_, context) => {
                if (!context.isAvailable) {
                  return "Unavailable";
                }

                return context.isSelected ? "Selected" : "Available";
              }}
            />
          )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-white/[0.06] table-bg px-4 py-2 sm:px-5 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center rounded-[0.8rem] border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
