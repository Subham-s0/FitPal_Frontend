import { useState } from "react";
import { ArrowUpRight, Check, Gem } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { SectionLabel } from "@/features/profile/components/ProfileSetupShell";
import type { PlanResponse } from "@/features/plans/model";
import ViewPlansDialog from "@/features/subscription/components/ViewPlansDialog";
import type { UserSubscriptionResponse } from "@/features/subscription/model";

interface ProfileMembershipTabProps {
  subscription: UserSubscriptionResponse | null;
  activePlan: PlanResponse | undefined;
  plans: PlanResponse[];
  isPlansLoading: boolean;
  isPlansError: boolean;
}

const formatMoney = (amount: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const toPlanFrequency = (billingCycle: UserSubscriptionResponse["billingCycle"] | undefined) =>
  billingCycle === "YEARLY" ? "yearly" : "monthly";

export function ProfileMembershipTab({
  subscription,
  activePlan,
  plans,
  isPlansLoading,
  isPlansError,
}: ProfileMembershipTabProps) {
  const navigate = useNavigate();
  const planFeatures = activePlan?.features || [];
  const [isViewPlansOpen, setIsViewPlansOpen] = useState(false);
  const [viewBillingCycle, setViewBillingCycle] = useState<"monthly" | "yearly">(
    toPlanFrequency(subscription?.billingCycle)
  );

  const openMembershipPage = () => navigate("/membership");
  const openMembershipPlans = () => {
    setViewBillingCycle(toPlanFrequency(subscription?.billingCycle));
    setIsViewPlansOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-5 sm:space-y-6">
      <div className="rounded-3xl border table-border user-surface shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] p-5 sm:p-7">
        <SectionLabel>Membership</SectionLabel>
        {subscription ? (
          <>
            <MembershipCard
              subscription={subscription}
              onViewDetails={openMembershipPage}
              onViewPlans={openMembershipPlans}
            />
            <MembershipStats subscription={subscription} />
            {planFeatures.length > 0 && <MembershipFeatures features={planFeatures} />}
          </>
        ) : (
          <NoSubscriptionCard onViewPlans={openMembershipPlans} />
        )}
      </div>

      <ViewPlansDialog
        open={isViewPlansOpen}
        onOpenChange={setIsViewPlansOpen}
        plans={plans}
        highlightedPlanId={activePlan?.planId ?? null}
        defaultBillingCycle={viewBillingCycle}
        isLoading={isPlansLoading}
        isError={isPlansError}
        highlightLabel="Current Plan"
        description="Browse available membership plans on this page and keep your current plan in focus."
      />
    </div>
  );
}

interface MembershipCardProps {
  subscription: UserSubscriptionResponse;
  onViewDetails: () => void;
  onViewPlans: () => void;
}

function MembershipCard({ subscription, onViewDetails, onViewPlans }: MembershipCardProps) {
  return (
    <div className="rounded-[18px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-5 sm:p-7 shadow-sm transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-black uppercase text-white sm:text-2xl">
            {subscription.planName}
          </h3>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-400 sm:text-xs">
            {subscription.planType} · {subscription.billingCycle}
          </p>
        </div>
        <span className="self-start rounded-full border table-border user-surface-soft px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white sm:text-[10px]">
          {subscription.subscriptionStatus}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
        {[
          { label: "Base", value: formatMoney(subscription.baseAmount) },
          { label: "Billed", value: formatMoney(subscription.billedAmount) },
          { label: "Tax", value: formatMoney(subscription.taxAmount) },
          { label: "Total", value: formatMoney(subscription.totalAmount) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[14px] border table-border user-surface-soft p-3.5 text-center transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04] shadow-sm"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.14em] table-text-muted">
              {item.label}
            </p>
            <p className="mt-1 text-base font-black text-white sm:text-lg">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 sm:mt-5" role="group" aria-label="Membership actions">
        <button
          type="button"
          onClick={onViewDetails}
          aria-label="View membership details"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 hover:shadow-orange-500/35"
        >
          Membership Details
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onViewPlans}
          aria-label="View all available plans"
          className="rounded-full border table-border user-surface-soft px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          View Plans
        </button>
      </div>
    </div>
  );
}

interface MembershipStatsProps {
  subscription: UserSubscriptionResponse;
}

function MembershipStats({ subscription }: MembershipStatsProps) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-[18px] border table-border user-surface-soft px-5 py-4 shadow-sm transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04]">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Status</p>
        <p className="mt-1 text-[15px] font-black text-white">
          {subscription.hasActiveSubscription ? "Active" : "Pending"}
        </p>
      </div>
      <div className="rounded-[18px] border table-border user-surface-soft px-5 py-4 shadow-sm transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04]">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Auto Renew</p>
        <p className="mt-1 text-[15px] font-black text-white">
          {subscription.autoRenew ? "Enabled" : "Disabled"}
        </p>
      </div>
      <div className="rounded-[18px] border table-border user-surface-soft px-5 py-4 shadow-sm transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04]">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Discount</p>
        <p className="mt-1 text-[15px] font-black text-white">
          {subscription.discountAmount > 0
            ? `${formatMoney(subscription.discountAmount)} (${subscription.discountPercent.toFixed(0)}%)`
            : "None"}
        </p>
      </div>
    </div>
  );
}

interface MembershipFeaturesProps {
  features: string[];
}

function MembershipFeatures({ features }: MembershipFeaturesProps) {
  return (
    <div className="mt-5 border-t table-border-cell pt-5 sm:mt-7 sm:pt-7">
      <p className="mb-4 text-[11px] font-black uppercase tracking-[0.14em] text-orange-500">
        Features Included
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <li
            key={i}
            className="flex items-center gap-3.5 rounded-[14px] border table-border user-surface p-3.5 transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04]"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
              <Check className="h-3.5 w-3.5 text-orange-400 stroke-[3px]" />
            </div>
            <p className="text-[12px] font-bold text-slate-200">{feature}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface NoSubscriptionCardProps {
  onViewPlans: () => void;
}

function NoSubscriptionCard({ onViewPlans }: NoSubscriptionCardProps) {
  return (
    <div className="flex flex-col items-center rounded-[18px] border table-border user-surface-soft p-10 text-center shadow-sm transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04]">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
        <Gem className="h-8 w-8 text-orange-500" />
      </div>
      <p className="text-lg font-black uppercase text-white">No Subscription</p>
      <p className="mt-2 text-sm table-text-muted">
        Browse available membership plans and compare what fits best.
      </p>

      <button
        type="button"
        onClick={onViewPlans}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 hover:shadow-orange-500/35"
      >
        View Plans
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  );
}
