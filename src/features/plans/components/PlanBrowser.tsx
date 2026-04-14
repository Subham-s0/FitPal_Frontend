import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import type { PlanResponse } from "@/features/plans/model";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";

export type PlanBrowserBillingCycle = "monthly" | "yearly";

type DesktopLayout = "grid" | "scroll" | "auto";
type FooterMode = "action" | "status";
type SelectionKeyType = "planId" | "planType";

interface FooterLabelContext {
  isAvailable: boolean;
  isSelected: boolean;
  isSelectionLocked: boolean;
  isYearly: boolean;
}

interface PlanBrowserProps {
  plans: PlanResponse[];
  billingCycle: PlanBrowserBillingCycle;
  onBillingChange: (cycle: PlanBrowserBillingCycle) => void;
  compact?: boolean;
  /** Larger rounded corners on plan cards (marketing pages); mobile carousel unchanged structurally. */
  marketingRoundedCards?: boolean;
  desktopLayout?: DesktopLayout;
  footerMode?: FooterMode;
  selectedPlanKey?: string | number | null;
  selectionKeyType?: SelectionKeyType;
  selectedBadgeLabel?: string | null;
  selectionNotice?: string | null;
  isSelectionLocked?: boolean;
  onSelectPlan?: (plan: PlanResponse, cycle: PlanBrowserBillingCycle) => void;
  getFooterLabel?: (plan: PlanResponse, context: FooterLabelContext) => string;
}

const formatAmount = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });

const formatPercent = (value: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value);

const getPlanTypeKey = (plan: Pick<PlanResponse, "planType">) => plan.planType.toLowerCase();

const centerMostPopularPlan = (plans: PlanResponse[]) => {
  const popularIndex = plans.findIndex((plan) => plan.mostPopular);

  if (popularIndex === -1) {
    return plans;
  }

  const centeredIndex = Math.floor(plans.length / 2);

  if (popularIndex === centeredIndex) {
    return plans;
  }

  const nextPlans = [...plans];
  const [popularPlan] = nextPlans.splice(popularIndex, 1);
  nextPlans.splice(centeredIndex, 0, popularPlan);

  return nextPlans;
};

const getSelectionKey = (plan: PlanResponse, selectionKeyType: SelectionKeyType) =>
  selectionKeyType === "planId" ? plan.planId : getPlanTypeKey(plan);

export default function PlanBrowser({
  plans,
  billingCycle,
  onBillingChange,
  compact = false,
  marketingRoundedCards = false,
  desktopLayout = "auto",
  footerMode = "action",
  selectedPlanKey = null,
  selectionKeyType = "planType",
  selectedBadgeLabel = null,
  selectionNotice = null,
  isSelectionLocked = false,
  onSelectPlan,
  getFooterLabel,
}: PlanBrowserProps) {
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const featuredPlanRef = useRef<HTMLDivElement | null>(null);
  const [mobilePlanIndex, setMobilePlanIndex] = useState(0);
  const isYearly = billingCycle === "yearly";
  const orderedPlans = useMemo(() => centerMostPopularPlan(plans), [plans]);
  const shouldUseDesktopScroll =
    desktopLayout === "scroll" || (desktopLayout === "auto" && orderedPlans.length > 3);
  const highestYearlyDiscountPercent = orderedPlans.reduce(
    (highest, plan) => Math.max(highest, plan.yearlyDiscountPercent),
    0
  );
  const boundedMobileIndex = Math.min(
    Math.max(mobilePlanIndex, 0),
    Math.max(orderedPlans.length - 1, 0)
  );
  const mobilePlan = orderedPlans[boundedMobileIndex] ?? null;

  useEffect(() => {
    if (!orderedPlans.length) {
      setMobilePlanIndex(0);
      return;
    }

    const selectedIndex =
      selectedPlanKey == null
        ? -1
        : orderedPlans.findIndex(
            (plan) => getSelectionKey(plan, selectionKeyType) === selectedPlanKey
          );
    const popularIndex = orderedPlans.findIndex((plan) => plan.mostPopular);
    setMobilePlanIndex(selectedIndex >= 0 ? selectedIndex : popularIndex >= 0 ? popularIndex : 0);
  }, [orderedPlans, selectedPlanKey, selectionKeyType]);

  useEffect(() => {
    if (isMobile || !shouldUseDesktopScroll) {
      return;
    }

    const container = scrollContainerRef.current;
    const target = featuredPlanRef.current;

    if (!container || !target) {
      return;
    }

    let frameId = 0;

    const centerFeaturedPlan = (behavior: ScrollBehavior) => {
      const nextLeft = target.offsetLeft - (container.clientWidth - target.clientWidth) / 2;
      const maxLeft = container.scrollWidth - container.clientWidth;

      container.scrollTo({
        left: Math.max(0, Math.min(nextLeft, maxLeft)),
        behavior,
      });
    };

    const handleResize = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        centerFeaturedPlan("auto");
      });
    };

    frameId = window.requestAnimationFrame(() => {
      centerFeaturedPlan("auto");
    });

    window.addEventListener("resize", handleResize);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobile, shouldUseDesktopScroll, orderedPlans]);

  const renderPlanCard = (plan: PlanResponse, index: number) => {
    const planKey = getPlanTypeKey(plan);
    const price = isYearly ? plan.yearlyBilledAmount : plan.monthlyPrice;
    const durationDays = isYearly ? plan.yearlyDurationDays : plan.monthlyDurationDays;
    const isSelected =
      selectedPlanKey != null &&
      getSelectionKey(plan, selectionKeyType) === selectedPlanKey;
    const isAvailable = plan.active;
    const shouldClampFeatures = shouldUseDesktopScroll || plan.features.length > (compact ? 5 : 6);
    const cardInteractive = footerMode === "action" && Boolean(onSelectPlan) && !isSelectionLocked;
    const footerLabel = getFooterLabel
      ? getFooterLabel(plan, {
          isAvailable,
          isSelected,
          isSelectionLocked,
          isYearly,
        })
      : isSelectionLocked
        ? "Locked"
        : isSelected
          ? `${plan.name} Selected`
          : `Select ${plan.name}`;

    const handleSelect = () => {
      if (!cardInteractive || !onSelectPlan) return;
      onSelectPlan(plan, billingCycle);
    };

    return (
      <div
        key={plan.planId}
        ref={plan.mostPopular ? featuredPlanRef : undefined}
        onClick={handleSelect}
        className={cn(
          "relative flex h-full flex-col text-left transition-all duration-500",
          compact
            ? "rounded-[1.15rem] p-6"
            : marketingRoundedCards
              ? "rounded-3xl p-8"
              : "rounded-[1.25rem] p-8",
          shouldUseDesktopScroll
            ? compact
              ? "w-[82vw] max-w-[20rem] shrink-0 snap-center"
              : "w-[85vw] max-w-[22rem] shrink-0 snap-center"
            : "",
          cardInteractive && "cursor-pointer hover:-translate-y-1",
          isSelected
            ? "border-2 border-orange-500 bg-[#16110d]"
            : plan.mostPopular
              ? "border-2 border-orange-500 bg-[#0f0f0f]"
              : "border border-white/10 bg-[#0f0f0f] hover:border-orange-500/40",
          isSelected && !plan.mostPopular && "shadow-[0_10px_40px_-10px_rgba(234,88,12,0.18)]",
          plan.mostPopular && "plan-popular-inner-glow"
        )}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {plan.mostPopular ? (
          <div className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-3.5 py-1">
            <Sparkles className="h-3 w-3 shrink-0 text-white" />
            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white">
              Most Popular
            </span>
          </div>
        ) : null}

        <div className={cn(compact ? "mb-5" : "mb-6", plan.mostPopular ? "pt-4" : "pt-2")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-2 text-[13px] font-black uppercase tracking-[0.1em] text-slate-400">
                {plan.name}
              </p>
            </div>
            {isSelected && selectedBadgeLabel ? (
              <span className="shrink-0 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-orange-200">
                {selectedBadgeLabel}
              </span>
            ) : null}
          </div>

          <div className="mb-1 flex flex-wrap items-baseline gap-1">
            <span className="text-3xl font-black tracking-tight text-white">
              <span className="mr-1 text-xl">{plan.currency}</span>
              {formatAmount(price)}
            </span>
            <span className="text-sm font-bold text-slate-500">{isYearly ? "/yr" : "/mo"}</span>
            {isYearly && plan.yearlyBaseAmount > plan.yearlyBilledAmount ? (
              <div className="ml-2 mt-1 flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-600 line-through decoration-slate-600">
                  {plan.currency} {formatAmount(plan.yearlyBaseAmount)}
                </span>
                {plan.yearlyDiscountPercent > 0 ? (
                  <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[11px] font-black text-green-400">
                    -{formatPercent(plan.yearlyDiscountPercent)}%
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="text-xs font-medium text-slate-500">
            {isYearly ? "billed yearly" : "billed monthly"} | {durationDays} days
          </p>
          <p className="mt-2 text-xs text-slate-400">{plan.description}</p>
        </div>

        <div className="my-5 h-[1px] w-full bg-white/5" />

        <ul
          className={cn(
            "mb-6 space-y-3 pr-1",
            shouldUseDesktopScroll ? "flex-1" : "",
            shouldClampFeatures
              ? compact
                ? "max-h-[220px] overflow-y-auto"
                : "max-h-[260px] overflow-y-auto"
              : ""
          )}
        >
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <Check className="h-4 w-4 text-orange-500" strokeWidth={3} />
              </div>
              <span className="text-[13px] font-medium text-slate-300">{feature}</span>
            </li>
          ))}
        </ul>

        {footerMode === "action" ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleSelect();
            }}
            disabled={!cardInteractive}
            className={cn(
              "mt-auto w-full rounded-xl px-4 py-3 text-[13px] font-black uppercase tracking-widest transition-all",
              !cardInteractive
                ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-slate-500"
                : isSelected
                  ? "bg-orange-600 text-white shadow-[0_4px_16px_rgba(234,88,12,0.3)] hover:bg-[#dc4e05]"
                  : plan.mostPopular
                    ? "bg-orange-600 text-white hover:bg-[#dc4e05]"
                  : "border border-orange-600/30 bg-orange-600/10 text-orange-500 hover:bg-orange-600/20"
            )}
          >
            {footerLabel}
          </button>
        ) : (
          <div
            className={cn(
              "mt-auto w-full rounded-xl px-4 py-3 text-center text-[13px] font-black uppercase tracking-widest",
              !isAvailable
                ? "border border-white/10 bg-white/[0.03] text-slate-500"
                : isSelected
                  ? "bg-orange-600 text-white shadow-[0_4px_16px_rgba(234,88,12,0.3)]"
                  : "border border-orange-600/30 bg-orange-600/10 text-orange-200"
            )}
          >
            {footerLabel}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-0 rounded-full border border-white/10 bg-[#1a1a1a] p-1">
          <button
            type="button"
            onClick={() => onBillingChange("monthly")}
            className={cn(
              "rounded-full px-6 py-2 text-[13px] font-bold tracking-wide transition-all",
              !isYearly
                ? "bg-orange-600 text-white shadow-[0_2px_12px_rgba(234,88,12,0.3)]"
                : "text-slate-400 hover:text-white"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => onBillingChange("yearly")}
            className={cn(
              "rounded-full px-6 py-2 text-[13px] font-bold tracking-wide transition-all",
              isYearly
                ? "bg-orange-600 text-white shadow-[0_2px_12px_rgba(234,88,12,0.3)]"
                : "text-slate-400 hover:text-white"
            )}
          >
            Yearly
          </button>
          {isYearly && highestYearlyDiscountPercent > 0 ? (
            <span className="ml-2 mr-1 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[10px] font-black text-green-400">
              Save {formatPercent(highestYearlyDiscountPercent)}%
            </span>
          ) : null}
        </div>

        {selectionNotice ? (
          <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
            {selectionNotice}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {isMobile && orderedPlans.length > 1 ? (
          <div className="space-y-4">
            <div className="relative px-7">
              <button
                type="button"
                onClick={() => setMobilePlanIndex(Math.max(0, boundedMobileIndex - 1))}
                disabled={boundedMobileIndex === 0}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-[#0f0f0f]/90 p-1.5 text-slate-500 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur transition-all duration-200 hover:text-orange-400 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.7)] disabled:pointer-events-none disabled:opacity-20"
                aria-label="Previous plan"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>

              <div>
                {mobilePlan ? renderPlanCard(mobilePlan, boundedMobileIndex) : null}
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobilePlanIndex(Math.min(orderedPlans.length - 1, boundedMobileIndex + 1))
                }
                disabled={boundedMobileIndex >= orderedPlans.length - 1}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-[#0f0f0f]/90 p-1.5 text-slate-500 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur transition-all duration-200 hover:text-orange-400 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.7)] disabled:pointer-events-none disabled:opacity-20"
                aria-label="Next plan"
              >
                <ChevronRight size={22} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                {orderedPlans.map((plan, index) => (
                  <button
                    key={plan.planId}
                    type="button"
                    onClick={() => setMobilePlanIndex(index)}
                    className={cn(
                      "rounded-full transition-all duration-200",
                      index === boundedMobileIndex
                        ? "h-2 w-6 bg-orange-500"
                        : "h-2 w-2 bg-white/20 hover:bg-white/40"
                    )}
                    aria-label={`Go to ${plan.name}`}
                  />
                ))}
              </div>
              <p className="text-[11px] font-bold text-slate-500">
                {mobilePlan?.name ?? ""} · {boundedMobileIndex + 1} / {orderedPlans.length}
              </p>
            </div>
          </div>
        ) : shouldUseDesktopScroll ? (
          <div className={compact ? "" : "mx-auto max-w-7xl"}>
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto pb-4"
              style={{
                scrollPaddingInline: compact
                  ? "max(1rem, calc(50% - 10rem))"
                  : "max(1rem, calc(50% - 11rem))",
              }}
            >
              <div className={cn("flex min-w-max gap-4", compact ? "sm:gap-4" : "sm:gap-6")}>
                {orderedPlans.map((plan, index) => renderPlanCard(plan, index))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto grid",
              compact ? "max-w-none gap-4 lg:grid-cols-3" : "max-w-5xl gap-6 md:grid-cols-3"
            )}
          >
            {orderedPlans.map((plan, index) => renderPlanCard(plan, index))}
          </div>
        )}
      </div>
    </div>
  );
}
