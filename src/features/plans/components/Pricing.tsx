import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { getPlansApi } from "@/features/plans/api";
import PlanBrowser, { type PlanBrowserBillingCycle } from "@/features/plans/components/PlanBrowser";
import { cn } from "@/shared/lib/utils";

interface PricingProps {
  onSelectPlan?: (planId: string, isYearly: boolean) => void;
  compact?: boolean;
  selectedPlanId?: string;
  billingCycle?: PlanBrowserBillingCycle;
  onBillingChange?: (isYearly: boolean) => void;
}

const Pricing = ({
  onSelectPlan,
  compact,
  selectedPlanId,
  billingCycle,
  onBillingChange,
}: PricingProps = {}) => {
  const [internalBillingCycle, setInternalBillingCycle] = useState<PlanBrowserBillingCycle>("monthly");
  const navigate = useNavigate();
  const location = useLocation();
  const { data: plans = [], isLoading, isError } = useQuery({
    queryKey: ["plans"],
    queryFn: getPlansApi,
  });

  const isHomePage = location.pathname === "/" || location.pathname === "/home";
  const resolvedBillingCycle = billingCycle ?? internalBillingCycle;

  const updateBilling = (nextCycle: PlanBrowserBillingCycle) => {
    if (!billingCycle) {
      setInternalBillingCycle(nextCycle);
    }
    onBillingChange?.(nextCycle === "yearly");
  };

  const renderFeedbackState = (message: string) => (
    <div className="rounded-[1.25rem] border border-white/10 bg-[#0f0f0f] px-6 py-10 text-center text-sm font-medium text-slate-400">
      {message}
    </div>
  );

  return (
    <section id="pricing" className={compact ? "" : "relative bg-secondary/20 py-24"}>
      {!compact ? (
        <>
          <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
        </>
      ) : null}

      <div className={cn("container relative mx-auto px-4", compact ? "max-w-none px-0" : "")}>
        {!compact ? (
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
        ) : null}

        {isLoading ? (
          renderFeedbackState("Loading plans...")
        ) : isError ? (
          renderFeedbackState("Unable to load plans right now.")
        ) : plans.length === 0 ? (
          renderFeedbackState("No plans are available right now.")
        ) : (
          <PlanBrowser
            plans={plans}
            compact={compact}
            billingCycle={resolvedBillingCycle}
            onBillingChange={updateBilling}
            desktopLayout="auto"
            selectedPlanKey={selectedPlanId ?? null}
            selectionKeyType="planType"
            onSelectPlan={(plan, cycle) => {
              const planId = plan.planType.toLowerCase();

              if (onSelectPlan) {
                onSelectPlan(planId, cycle === "yearly");
                return;
              }

              if (isHomePage) {
                navigate("/login", { state: { selectedPlan: planId, isYearly: cycle === "yearly" } });
                return;
              }

              navigate("/profile-setup", {
                state: { selectedPlan: planId, isYearly: cycle === "yearly" },
              });
            }}
            getFooterLabel={(plan, context) => {
              if (isHomePage) {
                return "Get Started";
              }

              return context.isSelected ? `${plan.name} Selected` : `Select ${plan.name}`;
            }}
          />
        )}
      </div>
    </section>
  );
};

export default Pricing;
