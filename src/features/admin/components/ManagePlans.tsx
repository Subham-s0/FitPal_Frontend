import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  createPlanApi,
  deletePlanApi,
  getAdminApplicationRulesSummaryApi,
  getAdminPlansApi,
  updatePlanApi,
} from "@/features/admin/admin-plan.api";
import {
  ALL_ACCESS_TIERS,
  ALL_PLAN_TYPES,
  DEFAULT_MONTHLY_DURATION_DAYS,
  DEFAULT_YEARLY_DURATION_DAYS,
  type PlanUpsertPayload,
} from "@/features/admin/admin-plan.model";
import type { PlanResponse, PlanType, AccessTier } from "@/features/plans/model";
import { plansQueryKeys } from "@/features/plans/queryKeys";
import { getApiErrorMessage } from "@/shared/api/client";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { cn } from "@/shared/lib/utils";

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const formatMoney = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const formatPercent = (value: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

const planTypeLabel = (t: PlanType) =>
  ({ BASIC: "Basic", PRO: "Pro", ELITE: "Elite", PROMO: "Promo" } as const)[t];

const accessTierLabel = (t: AccessTier) =>
  ({ BASIC: "Basic access", PRO: "Pro access", ELITE: "Elite access" } as const)[t];

type FormState = {
  planType: PlanType;
  accessTierGranted: AccessTier;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyDiscountPercent: string;
  currency: string;
  monthlyDurationDays: string;
  yearlyDurationDays: string;
  mostPopular: boolean;
  active: boolean;
  featureRows: string[];
};

const emptyForm = (currency: string, planType: PlanType): FormState => ({
  planType,
  accessTierGranted: "BASIC",
  name: "",
  description: "",
  monthlyPrice: "",
  yearlyDiscountPercent: "0",
  currency,
  monthlyDurationDays: String(DEFAULT_MONTHLY_DURATION_DAYS),
  yearlyDurationDays: String(DEFAULT_YEARLY_DURATION_DAYS),
  mostPopular: false,
  active: true,
  featureRows: [""],
});

const planToForm = (plan: PlanResponse): FormState => ({
  planType: plan.planType,
  accessTierGranted: plan.accessTierGranted,
  name: plan.name,
  description: plan.description ?? "",
  monthlyPrice: String(plan.monthlyPrice),
  yearlyDiscountPercent: String(plan.yearlyDiscountPercent),
  currency: plan.currency,
  monthlyDurationDays: String(plan.monthlyDurationDays),
  yearlyDurationDays: String(plan.yearlyDurationDays),
  mostPopular: plan.mostPopular,
  active: plan.active,
  featureRows: plan.features.length ? [...plan.features] : [""],
});

const buildPayload = (form: FormState): PlanUpsertPayload | { error: string } => {
  const features = form.featureRows.map((f) => f.trim()).filter(Boolean);
  if (features.length === 0) return { error: "Add at least one feature." };

  const monthlyPrice = Number.parseFloat(form.monthlyPrice);
  if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0)
    return { error: "Monthly price must be a number greater than 0." };

  const yearlyDiscountPercent = Number.parseFloat(form.yearlyDiscountPercent);
  if (!Number.isFinite(yearlyDiscountPercent) || yearlyDiscountPercent < 0 || yearlyDiscountPercent > 100)
    return { error: "Yearly discount must be between 0 and 100." };

  const monthlyDurationDays = Number.parseInt(form.monthlyDurationDays, 10);
  const yearlyDurationDays = Number.parseInt(form.yearlyDurationDays, 10);
  if (!Number.isFinite(monthlyDurationDays) || monthlyDurationDays <= 0)
    return { error: "Monthly duration (days) must be a positive integer." };
  if (!Number.isFinite(yearlyDurationDays) || yearlyDurationDays <= 0)
    return { error: "Yearly duration (days) must be a positive integer." };

  const name = form.name.trim();
  if (!name) return { error: "Plan name is required." };

  return {
    planType: form.planType,
    accessTierGranted: form.accessTierGranted,
    name,
    description: form.description.trim(),
    monthlyPrice: Math.round(monthlyPrice * 100) / 100,
    currency: form.currency.trim().toUpperCase(),
    monthlyDurationDays,
    yearlyDurationDays,
    yearlyDiscountPercent: Math.round(yearlyDiscountPercent * 100) / 100,
    mostPopular: form.mostPopular,
    active: form.active,
    features,
  };
};

/* ─── Styled form field wrapper ─────────────────────────────────────── */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

/* ─── Styled input ───────────────────────────────────────────────────── */
const fieldCls = "h-9 rounded-[0.65rem] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus-visible:border-orange-500/50 focus-visible:ring-0";

const ManagePlans = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm("NPR", "BASIC"));
  const [deleteTarget, setDeleteTarget] = useState<PlanResponse | null>(null);

  const plansQuery = useQuery({
    queryKey: plansQueryKeys.adminList(),
    queryFn: getAdminPlansApi,
  });

  const rulesQuery = useQuery({
    queryKey: ["admin", "application-rules", "summary"],
    queryFn: getAdminApplicationRulesSummaryApi,
  });

  const currency = rulesQuery.data?.currency?.trim() || "NPR";

  const usedPlanTypes = useMemo(
    () => new Set(plansQuery.data?.map((p) => p.planType) ?? []),
    [plansQuery.data]
  );

  const availablePlanTypesForCreate = useMemo(
    () => ALL_PLAN_TYPES.filter((t) => !usedPlanTypes.has(t)),
    [usedPlanTypes]
  );

  const openCreate = useCallback(() => {
    const firstType = availablePlanTypesForCreate[0] ?? "BASIC";
    setFormMode("create");
    setEditingPlanId(null);
    setForm(emptyForm(currency, firstType));
    setFormOpen(true);
  }, [availablePlanTypesForCreate, currency]);

  const openEdit = useCallback((plan: PlanResponse) => {
    setFormMode("edit");
    setEditingPlanId(plan.planId);
    setForm(planToForm(plan));
    setFormOpen(true);
  }, []);

  useEffect(() => {
    if (!formOpen) return;
    setForm((prev) => ({ ...prev, currency }));
  }, [currency, formOpen]);

  const invalidatePlans = () => {
    queryClient.invalidateQueries({ queryKey: plansQueryKeys.all });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: PlanUpsertPayload) => {
      if (formMode === "create") return createPlanApi(payload);
      if (editingPlanId == null) throw new Error("Missing plan id");
      return updatePlanApi(editingPlanId, payload);
    },
    onSuccess: () => {
      toast.success(formMode === "create" ? "Plan created" : "Plan updated");
      invalidatePlans();
      setFormOpen(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not save plan"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: number) => deletePlanApi(planId),
    onSuccess: () => {
      toast.success("Plan deleted");
      invalidatePlans();
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not delete plan"));
    },
  });

  const handleSaveForm = () => {
    const built = buildPayload(form);
    if ("error" in built) {
      toast.error(built.error);
      return;
    }
    saveMutation.mutate(built);
  };

  const addFeatureRow = () =>
    setForm((prev) => ({ ...prev, featureRows: [...prev.featureRows, ""] }));

  const removeFeatureRow = (index: number) =>
    setForm((prev) => ({ ...prev, featureRows: prev.featureRows.filter((_, i) => i !== index) }));

  const updateFeatureRow = (index: number, value: string) =>
    setForm((prev) => ({ ...prev, featureRows: prev.featureRows.map((row, i) => (i === index ? value : row)) }));

  const isBusy = plansQuery.isLoading || rulesQuery.isLoading;
  const hasError = plansQuery.isError || rulesQuery.isError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Manage <span style={fireStyle}>Plans</span>
          </h1>
        </div>
        <button
          type="button"
          disabled={availablePlanTypesForCreate.length === 0 || isBusy || plansQuery.isError}
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-[0.9rem] bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-5 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_6px_20px_-4px_rgba(249,115,22,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-4px_rgba(249,115,22,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Plan
        </button>
      </div>

      {availablePlanTypesForCreate.length === 0 && !isBusy ? (
        <div className="rounded-[1rem] border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
          All plan types (Basic, Pro, Elite, Promo) already exist. Delete a plan to add another type, or edit an existing one.
        </div>
      ) : null}

      {hasError ? (
        <div className="rounded-[1rem] border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300">
          Could not load plans or application rules. Check your admin session and try again.
        </div>
      ) : null}

      {/* Plan Cards */}
      {isBusy ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          Loading…
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(plansQuery.data ?? []).map((plan) => (
            <div
              key={plan.planId}
              className={cn(
                "group relative flex flex-col rounded-[1.75rem] border transition-all duration-300 hover:-translate-y-1",
                plan.mostPopular
                  ? "border-orange-500/50 bg-[linear-gradient(160deg,rgba(249,115,22,0.14),rgba(17,17,17,0.98))] shadow-[0_8px_40px_-10px_rgba(249,115,22,0.3)]"
                  : "border-white/[0.08] bg-[#111] hover:border-orange-500/20 hover:shadow-[0_8px_32px_-8px_rgba(249,115,22,0.12)]",
                !plan.active && "opacity-70 ring-1 ring-dashed ring-white/15"
              )}
            >
              {/* Top accent strip for popular */}
              {plan.mostPopular && (
                <div className="absolute inset-x-0 top-0 h-px rounded-t-[1.75rem] bg-gradient-to-r from-transparent via-orange-500/80 to-transparent" />
              )}

              {/* Popular badge */}
              {plan.mostPopular ? (
                <div className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-3.5 py-1 shadow-[0_4px_14px_-2px_rgba(234,88,12,0.5)]">
                  <Sparkles className="h-3 w-3 text-white" />
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white">Most Popular</span>
                </div>
              ) : null}

              {/* Three-dot menu */}
              <div className="absolute right-3 top-3 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-slate-500 hover:bg-white/10 hover:text-white"
                      aria-label={`Actions for ${plan.name}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-white/10 bg-[#0f0f0f] text-white">
                    <DropdownMenuItem className="focus:bg-white/10 focus:text-white" onClick={() => openEdit(plan)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      className="text-red-400 focus:bg-red-500/15 focus:text-red-300"
                      onClick={() => setDeleteTarget(plan)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Card body */}
              <div className="flex flex-1 flex-col p-6 pt-7">
                {/* Badges */}
                <div className="mb-3 flex flex-wrap items-center gap-1.5 pr-6">
                  <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    {planTypeLabel(plan.planType)}
                  </span>
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-orange-300">
                    {accessTierLabel(plan.accessTierGranted)}
                  </span>
                  {!plan.active ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
                      Inactive
                    </span>
                  ) : null}
                </div>

                {/* Name & description */}
                <h3 className="mb-1 text-xl font-black uppercase tracking-tight text-white">{plan.name}</h3>
                <p className="mb-4 text-xs leading-relaxed text-slate-500">{plan.description || "—"}</p>

                {/* Price */}
                <div className="mb-1 flex flex-wrap items-end gap-1">
                  <span className="text-xs font-bold text-slate-500">{plan.currency}</span>
                  <span className="text-4xl font-black leading-none text-gradient-fire">
                    {formatMoney(plan.monthlyPrice)}
                  </span>
                  <span className="mb-0.5 text-sm text-slate-500">/mo</span>
                </div>
                <p className="mb-5 text-[11px] text-slate-600">
                  Yearly: {plan.currency} {formatMoney(plan.yearlyBilledAmount)} ({formatPercent(plan.yearlyDiscountPercent)}% off)
                </p>

                {/* Divider */}
                <div className="mb-4 h-px bg-white/[0.06]" />

                {/* Features */}
                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((feature, idx) => (
                    <li key={`${plan.planId}-f-${idx}`} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-500/15">
                        <CheckCircle2 className="h-3 w-3 text-orange-400" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Edit button */}
                <button
                  type="button"
                  onClick={() => openEdit(plan)}
                  className={cn(
                    "mt-auto w-full rounded-[0.9rem] px-4 py-2.5 text-xs font-black uppercase tracking-[0.1em] transition-all duration-200",
                    plan.mostPopular
                      ? "bg-[linear-gradient(135deg,#FF6A00,#FF9500)] text-white shadow-[0_6px_20px_-4px_rgba(249,115,22,0.4)] hover:-translate-y-0.5"
                      : "border border-orange-500/20 bg-orange-500/[0.07] text-orange-300 hover:bg-orange-500/15"
                  )}
                >
                  <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
                  Edit Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ───────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="flex flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0f0f0f] p-0 text-white sm:max-w-[520px] max-h-[calc(100dvh-3rem)] sm:max-h-[min(90vh,780px)]">
          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-white/[0.06] bg-[linear-gradient(135deg,rgba(249,115,22,0.09),transparent_50%)] px-5 py-4">
            <DialogTitle className="text-base font-black uppercase tracking-wide text-white">
              {formMode === "create" ? "Create Plan" : "Edit Plan"}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">
              {formMode === "create"
                ? "Each plan type can only exist once. Currency is set from application rules."
                : "Update pricing, access tier, and features. Plan type cannot be changed."}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scroll">
            <div className="grid gap-4 px-5 py-4">

              {/* Row 1: Plan Type + Access Tier */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Plan Type">
                  {formMode === "create" ? (
                    <Select
                      value={form.planType}
                      onValueChange={(v) => setForm((p) => ({ ...p, planType: v as PlanType }))}
                    >
                      <SelectTrigger className={fieldCls}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[#111] text-white">
                        {availablePlanTypesForCreate.map((t) => (
                          <SelectItem key={t} value={t} className="focus:bg-white/10 focus:text-white">
                            {planTypeLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input readOnly value={planTypeLabel(form.planType)} className={fieldCls + " opacity-60"} />
                  )}
                </FormField>

                <FormField label="Access Tier">
                  <Select
                    value={form.accessTierGranted}
                    onValueChange={(v) => setForm((p) => ({ ...p, accessTierGranted: v as AccessTier }))}
                  >
                    <SelectTrigger className={fieldCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#111] text-white">
                      {ALL_ACCESS_TIERS.map((t) => (
                        <SelectItem key={t} value={t} className="focus:bg-white/10 focus:text-white">
                          {accessTierLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              {/* Name */}
              <FormField label="Plan Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={fieldCls}
                  placeholder="e.g. Pro Monthly"
                />
              </FormField>

              {/* Description */}
              <FormField label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="min-h-[64px] rounded-[0.65rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus-visible:border-orange-500/50 focus-visible:ring-0 resize-none"
                  placeholder="Brief description of this plan"
                />
              </FormField>

              {/* Row: Monthly Price + Yearly Discount */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label={`Monthly Price (${form.currency})`}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.monthlyPrice}
                    onChange={(e) => setForm((p) => ({ ...p, monthlyPrice: e.target.value }))}
                    className={fieldCls + " font-mono"}
                    placeholder="0.00"
                  />
                </FormField>
                <FormField label="Yearly Discount (%)">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.yearlyDiscountPercent}
                    onChange={(e) => setForm((p) => ({ ...p, yearlyDiscountPercent: e.target.value }))}
                    className={fieldCls + " font-mono"}
                    placeholder="0"
                  />
                </FormField>
              </div>

              {/* Row: Monthly Term + Yearly Term */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Monthly Term (days)">
                  <Input
                    type="number"
                    min={1}
                    value={form.monthlyDurationDays}
                    onChange={(e) => setForm((p) => ({ ...p, monthlyDurationDays: e.target.value }))}
                    className={fieldCls + " font-mono"}
                  />
                </FormField>
                <FormField label="Yearly Term (days)">
                  <Input
                    type="number"
                    min={1}
                    value={form.yearlyDurationDays}
                    onChange={(e) => setForm((p) => ({ ...p, yearlyDurationDays: e.target.value }))}
                    className={fieldCls + " font-mono"}
                  />
                </FormField>
              </div>

              {/* Most Popular + Active toggles */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, mostPopular: !p.mostPopular }))}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[0.75rem] border px-3.5 py-2.5 text-left transition-all",
                    form.mostPopular
                      ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                      : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20 hover:text-slate-300"
                  )}
                >
                  <Sparkles className={cn("h-3.5 w-3.5 shrink-0", form.mostPopular ? "text-orange-400" : "text-slate-600")} />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em]">Most Popular</p>
                    <p className="text-[9px] text-current opacity-60">{form.mostPopular ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div className={cn("ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all", form.mostPopular ? "bg-orange-500" : "bg-white/10")}>
                    {form.mostPopular ? <Check className="h-2.5 w-2.5 text-white" /> : null}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, active: !p.active }))}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[0.75rem] border px-3.5 py-2.5 text-left transition-all",
                    form.active
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20 hover:text-slate-300"
                  )}
                >
                  <Zap className={cn("h-3.5 w-3.5 shrink-0", form.active ? "text-emerald-400" : "text-slate-600")} />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em]">Active</p>
                    <p className="text-[9px] text-current opacity-60">{form.active ? "Visible publicly" : "Hidden"}</p>
                  </div>
                  <div className={cn("ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all", form.active ? "bg-emerald-500" : "bg-white/10")}>
                    {form.active ? <Check className="h-2.5 w-2.5 text-white" /> : null}
                  </div>
                </button>
              </div>

              {/* Features */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Features</Label>
                  <button
                    type="button"
                    onClick={addFeatureRow}
                    className="text-[11px] font-bold text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    + Add Line
                  </button>
                </div>
                <div className="space-y-2">
                  {form.featureRows.map((row, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={row}
                        placeholder="Feature description"
                        onChange={(e) => updateFeatureRow(index, e.target.value)}
                        className={fieldCls + " flex-1 text-sm"}
                      />
                      <button
                        type="button"
                        onClick={() => removeFeatureRow(index)}
                        disabled={form.featureRows.length <= 1}
                        aria-label="Remove feature line"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.65rem] border border-white/10 bg-white/[0.03] text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="shrink-0 gap-2.5 border-t border-white/[0.06] bg-[#0f0f0f] px-5 py-3 sm:justify-between sm:space-x-0">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="inline-flex items-center justify-center rounded-[0.8rem] border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={handleSaveForm}
              className="inline-flex items-center justify-center gap-2 rounded-[0.8rem] bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-5 py-2 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_4px_16px_-4px_rgba(249,115,22,0.4)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {formMode === "create" ? "Create Plan" : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────── */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-[1.3rem] border border-white/10 bg-[#0f0f0f] text-white">
          <AlertDialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[12px] border border-red-500/25 bg-red-500/10">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <AlertDialogTitle className="text-base font-black uppercase tracking-wide">Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] text-slate-500">
              {deleteTarget
                ? `"${deleteTarget.name}" will be removed permanently. You can only delete plans that have no subscriptions.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5 sm:space-x-0">
            <AlertDialogCancel className="rounded-[0.8rem] border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[0.8rem] bg-red-600 px-4 text-sm font-black tracking-wide text-white hover:bg-red-500"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.planId)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManagePlans;
