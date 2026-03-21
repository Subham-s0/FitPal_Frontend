import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { getPlansApi } from "@/api/plan.api";
import { cn } from "@/lib/utils";
import type { PlanResponse } from "@/models/plan.model";

interface PricingProps {
  onSelectPlan?: (planId: string, isYearly: boolean) => void;
  compact?: boolean;
  selectedPlanId?: string;
  billingCycle?: "monthly" | "yearly";
  onBillingChange?: (isYearly: boolean) => void;
}

const formatAmount = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });

const getPlanId = (plan: Pick<PlanResponse, "planType">) => plan.planType.toLowerCase();

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

const Pricing = ({
  onSelectPlan,
  compact,
  selectedPlanId,
  billingCycle,
  onBillingChange,
}: PricingProps = {}) => {
  const [internalIsYearly, setInternalIsYearly] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const popularPlanRef = useRef<HTMLDivElement | null>(null);
  const { data: plans = [], isLoading, isError } = useQuery({
    queryKey: ["plans"],
    queryFn: getPlansApi,
  });

  const orderedPlans = useMemo(() => centerMostPopularPlan(plans), [plans]);
  const shouldUseScrollablePlans = orderedPlans.length > 3;
  const isHomePage = location.pathname === "/" || location.pathname === "/home";
  const isYearly = billingCycle ? billingCycle === "yearly" : internalIsYearly;
  const highestYearlyDiscountPercent = orderedPlans.reduce(
    (highest, plan) => Math.max(highest, plan.yearlyDiscountPercent),
    0
  );

  useEffect(() => {
    if (!shouldUseScrollablePlans) {
      return;
    }

    const container = scrollContainerRef.current;
    const target = popularPlanRef.current;

    if (!container || !target) {
      return;
    }

    let frameId = 0;

    const recenterPopularPlan = (behavior: ScrollBehavior) => {
      const nextLeft =
        target.offsetLeft - (container.clientWidth - target.clientWidth) / 2;
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
        recenterPopularPlan("auto");
      });
    };

    frameId = window.requestAnimationFrame(() => {
      recenterPopularPlan("auto");
    });

    window.addEventListener("resize", handleResize);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [shouldUseScrollablePlans, orderedPlans]);

  const updateBilling = (nextIsYearly: boolean) => {
    if (!billingCycle) {
      setInternalIsYearly(nextIsYearly);
    }
    onBillingChange?.(nextIsYearly);
  };

  const renderFeedbackState = (message: string) => (
    <div className="rounded-[1.25rem] border border-white/10 bg-[#0f0f0f] px-6 py-10 text-center text-sm font-medium text-slate-400">
      {message}
    </div>
  );

  const planCards = orderedPlans.map((plan, index) => {
    const planId = getPlanId(plan);
    const price = isYearly ? plan.yearlyBilledAmount : plan.monthlyPrice;
    const durationDays = isYearly ? plan.yearlyDurationDays : plan.monthlyDurationDays;
    const isSelected = selectedPlanId === planId;
    const shouldClampFeatures =
      shouldUseScrollablePlans || plan.features.length > (compact ? 5 : 6);

    return (
      <div
        key={plan.planId}
        ref={plan.mostPopular ? popularPlanRef : undefined}
        className={cn(
          "relative flex h-full flex-col text-left transition-all duration-500 hover:-translate-y-1",
          compact ? "rounded-[1.15rem] p-6" : "rounded-[1.25rem] p-8",
          shouldUseScrollablePlans
            ? compact
              ? "w-[82vw] max-w-[20rem] shrink-0 snap-center"
              : "w-[85vw] max-w-[22rem] shrink-0 snap-center"
            : "",
          isSelected
            ? "border-2 border-orange-500 bg-[#16110d] shadow-[0_10px_40px_-10px_rgba(234,88,12,0.18)]"
            : plan.mostPopular
              ? "border-2 border-orange-500 bg-[#0f0f0f] shadow-[0_10px_40px_-10px_rgba(234,88,12,0.2)]"
              : "border border-white/10 bg-[#0f0f0f] hover:border-orange-500/40"
        )}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {plan.mostPopular && (
          <div className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-2 rounded-b-xl bg-orange-600 px-4 py-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-white">
              Most Popular
            </span>
          </div>
        )}

        <div className={compact ? "mb-5 pt-2" : "mb-6 pt-2"}>
          <h3 className="mb-2 text-[13px] font-black uppercase tracking-[0.1em] text-slate-400">
            {plan.name}
          </h3>
          <div className="mb-1 flex flex-wrap items-baseline gap-1">
            <span className="text-3xl font-black tracking-tight text-white">
              <span className="mr-1 text-xl">{plan.currency}</span>
              {formatAmount(price)}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {isYearly ? "/yr" : "/mo"}
            </span>
            {isYearly && plan.yearlyBaseAmount > plan.yearlyBilledAmount && (
              <div className="ml-2 mt-1 flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-600 line-through decoration-slate-600">
                  {plan.currency} {formatAmount(plan.yearlyBaseAmount)}
                </span>
                {plan.yearlyDiscountPercent > 0 && (
                  <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[11px] font-black text-green-400">
                    -{formatAmount(plan.yearlyDiscountPercent)}%
                  </span>
                )}
              </div>
            )}
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
            shouldUseScrollablePlans ? "flex-1" : "",
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

        <button
          onClick={() => {
            if (onSelectPlan) {
              onSelectPlan(planId, isYearly);
            } else if (isHomePage) {
              navigate("/login", { state: { selectedPlan: planId, isYearly } });
            } else {
              navigate("/profile-setup", { state: { selectedPlan: planId, isYearly } });
            }
          }}
          className={cn(
            "mt-auto w-full rounded-xl px-4 py-3 text-[13px] font-black uppercase tracking-widest transition-all",
            isSelected || plan.mostPopular
              ? "bg-orange-600 text-white shadow-[0_4px_16px_rgba(234,88,12,0.3)] hover:bg-[#dc4e05]"
              : "border border-orange-600/30 bg-orange-600/10 text-orange-500 hover:bg-orange-600/20"
          )}
        >
          {isHomePage ? "Get Started" : isSelected ? `${plan.name} Selected` : `Select ${plan.name}`}
        </button>
      </div>
    );
  });

  const renderPlans = () => {
    if (isLoading) {
      return renderFeedbackState("Loading plans...");
    }

    if (isError) {
      return renderFeedbackState("Unable to load plans right now.");
    }

    if (orderedPlans.length === 0) {
      return renderFeedbackState("No plans are available right now.");
    }

    if (shouldUseScrollablePlans) {
      return (
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
            <div
              className={cn(
                "flex min-w-max gap-4",
                compact ? "sm:gap-4" : "sm:gap-6"
              )}
            >
              {planCards}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "mx-auto grid",
          compact ? "max-w-none gap-4 lg:grid-cols-3" : "max-w-5xl gap-6 md:grid-cols-3"
        )}
      >
        {planCards}
      </div>
    );
  };

  return (
    <section id="pricing" className={compact ? "" : "relative bg-secondary/20 py-24"}>
      {!compact && (
        <>
          <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
        </>
      )}

      <div
        className={cn(
          "container relative mx-auto px-4",
          compact ? "max-w-none px-0" : ""
        )}
      >
        {!compact && (
          <div className="mb-10 text-center">
            <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              Pricing
            </span>
            <h2 className="mb-4 text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
              Choose Your <span className="text-gradient-fire">Plan</span>
            </h2>
            <p className="mx-auto max-w-xl text-sm font-medium text-slate-400">
              One subscription. Access to every partner gym in Nepal. Cancel anytime.
            </p>
          </div>
        )}

        <div
          className={cn(
            "relative z-10 mx-auto flex max-w-max items-center gap-0 rounded-full border border-white/10 bg-[#1a1a1a] p-1",
            compact ? "mb-8" : "mb-12"
          )}
        >
          <button
            className={cn(
              "rounded-full px-6 py-2 text-[13px] font-bold tracking-wide transition-all",
              !isYearly
                ? "bg-orange-600 text-white shadow-[0_2px_12px_rgba(234,88,12,0.3)]"
                : "text-slate-400 hover:text-white"
            )}
            onClick={() => updateBilling(false)}
          >
            Monthly
          </button>
          <button
            className={cn(
              "rounded-full px-6 py-2 text-[13px] font-bold tracking-wide transition-all",
              isYearly
                ? "bg-orange-600 text-white shadow-[0_2px_12px_rgba(234,88,12,0.3)]"
                : "text-slate-400 hover:text-white"
            )}
            onClick={() => updateBilling(true)}
          >
            Yearly
          </button>
          {isYearly && highestYearlyDiscountPercent > 0 && (
            <span className="ml-2 mr-1 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[10px] font-black text-green-400">
              Save {formatAmount(highestYearlyDiscountPercent)}%
            </span>
          )}
        </div>

        {renderPlans()}
      </div>
    </section>
  );
};

export default Pricing;
