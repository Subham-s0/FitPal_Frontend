import { useState, useEffect } from "react";
import {
  AlertCircle, ArrowUpRight, Cog, ChevronDown, ChevronRight,
  DollarSign, Edit2, FileText, Info, LayoutGrid, Loader2,
  Megaphone, RefreshCcw, Save, Shield, Zap, Lock, Unlock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApplicationRulesApi, updateApplicationRulesApi } from "@/features/admin/admin-settings.api";
import type { ApplicationRuleSummaryResponse, ApplicationRuleUpdateRequest, DoorAccessMode, CheckInAccessMode, DoorFailsafeMode } from "@/features/admin/admin-settings.model";
import AdminCmsView from "@/features/admin/components/AdminCmsView";
import { cn } from "@/shared/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

/* ─── Types ─────────────────────────────────────────────────────────── */
type AdminSettingsTab = "overview" | "app-rules";

/* ─── Helpers ────────────────────────────────────────────────────────── */
const fireStyle = {
  background: "var(--gradient-fire)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

/* ─── Overview quick‑links ───────────────────────────────────────────── */
function OverviewContent({ onOpenTab, onOpenCms }: {
  onOpenTab: (t: AdminSettingsTab) => void;
  onOpenCms: () => void;
}) {
  const links: { label: string; desc: string; icon: React.ElementType; accent: string; action: () => void }[] = [
    { label: "App Rules", desc: "Billing, timezone, and door access settings", icon: Cog, accent: "border-orange-500/25 bg-orange-500/[0.07] text-orange-400", action: () => onOpenTab("app-rules") },
    { label: "CMS Management", desc: "Guides, testimonials, FAQs, features", icon: FileText, accent: "border-blue-500/25 bg-blue-500/[0.07] text-blue-400", action: onOpenCms },
    { label: "Announcements", desc: "Publish platform-wide notices", icon: Megaphone, accent: "border-red-500/25 bg-red-500/[0.07] text-red-400", action: onOpenCms },
  ];
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Settings Modules</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                type="button"
                onClick={link.action}
                className="group rounded-[18px] border table-border table-bg p-5 text-left transition-all hover:border-orange-500/25 hover:bg-orange-500/[0.03] hover:-translate-y-0.5"
              >
                <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[10px] border", link.accent)}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-[13px] font-black uppercase tracking-[0.1em] text-white">{link.label}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{link.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-orange-400 opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[11px] text-slate-600">
        <Info className="mr-1.5 inline h-3.5 w-3.5 text-slate-500" />
        CMS edits are saved to the API; the public home page loads them from GET /public/cms/home (with offline fallback).
      </div>
    </div>
  );
}

/* ─── App Rules ──────────────────────────────────────────────────────── */
function pct(v: number | undefined): string {
  return v !== undefined ? `${(v * 100).toFixed(2)}%` : "—";
}

function AppRulesContent() {
  const queryClient = useQueryClient();
  const rulesQ = useQuery({ queryKey: ["admin", "application-rules", "summary"], queryFn: getApplicationRulesApi });
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<ApplicationRuleUpdateRequest>({});
  const d = rulesQ.data;

  useEffect(() => {
    if (d) {
      setFormData({
        currency: d.currency,
        taxRate: d.taxRate,
        serviceChargeRate: d.serviceChargeRate,
        appCommissionRate: d.appCommissionRate,
        timeZoneId: d.timeZoneId,
        doorPollIntervalSeconds: d.doorPollIntervalSeconds,
        doorUnlockDurationSeconds: d.doorUnlockDurationSeconds,
        doorCommandExpirySeconds: d.doorCommandExpirySeconds,
        doorAckTimeoutSeconds: d.doorAckTimeoutSeconds,
        doorDeviceOnlineWindowSeconds: d.doorDeviceOnlineWindowSeconds,
        doorAccessMode: d.doorAccessMode,
        doorAutoLockEnabled: d.doorAutoLockEnabled,
        doorManualOverrideAllowed: d.doorManualOverrideAllowed,
        doorFailsafeMode: d.doorFailsafeMode,
      });
    }
  }, [d]);

  const updateMutation = useMutation({
    mutationFn: updateApplicationRulesApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "application-rules"] });
      toast.success("Application rules updated successfully");
      setEditOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update rules");
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const groups: { label: string; items: { key: string; label: string; value: string; icon: React.ElementType; desc: string }[] }[] = [
    {
      label: "Billing & Rates",
      items: [
        { key: "currency",          label: "Platform Currency",  value: d?.currency         ?? "NPR",  icon: DollarSign, desc: "ISO 4217 code used for all plans and settlements." },
        { key: "taxRate",           label: "Tax Rate",           value: pct(d?.taxRate),               icon: Zap,        desc: "Government tax applied on all transactions." },
        { key: "serviceChargeRate", label: "Service Charge",     value: pct(d?.serviceChargeRate),     icon: FileText,   desc: "Platform service charge per transaction." },
        { key: "appCommissionRate", label: "App Commission",     value: pct(d?.appCommissionRate),     icon: Zap,        desc: "Platform's cut from each gym check-in settlement." },
        { key: "gymShareRate",      label: "Gym Share",          value: pct(d?.gymShareRate),          icon: DollarSign, desc: "Gym's share after commission (100% − commission)." },
      ],
    },
    {
      label: "System",
      items: [
        { key: "timeZoneId", label: "Timezone", value: d?.timeZoneId ?? "Asia/Kathmandu", icon: Info, desc: "IANA timezone for all scheduled events." },
      ],
    },
    {
      label: "Door Access Mode",
      items: [
        { key: "doorAccessMode",           label: "Door Mode",            value: d?.doorAccessMode ?? "AUTOMATIC",              icon: d?.doorAccessMode === "MANUAL" ? Unlock : Lock, desc: "AUTOMATIC: member check-in queues unlock. MANUAL: no auto unlock; staff handles entry." },
        { key: "checkInAccessMode",        label: "Check-in Mode",        value: d?.checkInAccessMode ?? "MANUAL",              icon: d?.checkInAccessMode === "DOOR_ACK_REQUIRED" ? Lock : Unlock, desc: "MANUAL: staff marks complete. DOOR_ACK_REQUIRED: requires door acknowledgement." },
        { key: "doorAutoLockEnabled",      label: "Auto Lock",            value: d?.doorAutoLockEnabled ? "Enabled" : "Disabled", icon: Lock, desc: "On: unlock pulse uses Unlock Duration. Off: pulse lasts until Command Expiry." },
        { key: "doorManualOverrideAllowed", label: "Manual Override",     value: d?.doorManualOverrideAllowed ? "Allowed" : "Blocked", icon: Unlock, desc: "Allow gym test unlock from the dashboard." },
        { key: "doorFailsafeMode",         label: "Failsafe Mode",        value: d?.doorFailsafeMode ?? "LOCKED",               icon: Shield, desc: "LOCKED: offline device blocks auto queue. UNLOCKED: stale device still accepts commands." },
      ],
    },
    {
      label: "Door Controller Timing",
      items: [
        { key: "doorPollIntervalSeconds",       label: "Poll Interval",        value: d?.doorPollIntervalSeconds       !== undefined ? `${d.doorPollIntervalSeconds}s`       : "1s",  icon: Shield, desc: "How often door hardware should poll for pending commands." },
        { key: "doorUnlockDurationSeconds",     label: "Unlock Duration",      value: d?.doorUnlockDurationSeconds     !== undefined ? `${d.doorUnlockDurationSeconds}s`     : "5s",  icon: Shield, desc: "Unlock pulse length when Auto Lock is enabled." },
        { key: "doorCommandExpirySeconds",      label: "Command Expiry",       value: d?.doorCommandExpirySeconds      !== undefined ? `${d.doorCommandExpirySeconds}s`      : "30s", icon: Cog,    desc: "Time before an unlock command expires." },
        { key: "doorAckTimeoutSeconds",         label: "ACK Timeout",          value: d?.doorAckTimeoutSeconds         !== undefined ? `${d.doorAckTimeoutSeconds}s`         : "10s", icon: Cog,    desc: "Time to wait for device acknowledgement." },
        { key: "doorDeviceOnlineWindowSeconds", label: "Device Online Window", value: d?.doorDeviceOnlineWindowSeconds !== undefined ? `${d.doorDeviceOnlineWindowSeconds}s` : "30s", icon: Shield, desc: "Window to consider a door device online." },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-slate-400">Singleton config — affects billing, payouts, and door hardware globally.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => rulesQ.refetch()} disabled={rulesQ.isFetching} className="inline-flex items-center gap-1.5 rounded-full border table-border table-bg px-3 py-1.5 text-[11px] font-bold text-slate-300 transition hover:text-white disabled:opacity-50">
            {rulesQ.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />} Refresh
          </button>
          <button type="button" onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-orange-300 transition hover:bg-orange-500/20">
            <Edit2 className="h-3 w-3" /> Edit Rules
          </button>
        </div>
      </div>

      {rulesQ.isError && (
        <div className="rounded-[14px] border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-[12px] text-amber-300">
          <AlertCircle className="mr-2 inline h-3.5 w-3.5" />
          Failed to load application rules. Please try again.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.label}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((rule) => {
              const Icon = rule.icon;
              const isEnabled = rule.value === "Enabled" || rule.value === "Allowed";
              const isDisabled = rule.value === "Disabled" || rule.value === "Blocked";
              return (
                <div key={rule.key} className="rounded-[18px] border table-border table-bg p-4 transition hover:border-orange-500/20">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-orange-500/20 bg-orange-500/10">
                      <Icon className="h-3.5 w-3.5 text-orange-400" />
                    </div>
                    <span className={cn(
                      "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      isEnabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                      isDisabled ? "border-red-500/30 bg-red-500/10 text-red-400" :
                      "border-white/10 bg-white/[0.04] text-slate-600"
                    )}>{isEnabled ? "on" : isDisabled ? "off" : "rule"}</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{rule.label}</p>
                  <p className="mt-1 text-[18px] font-black text-white">
                    {rulesQ.isLoading ? <Loader2 className="inline h-4 w-4 animate-spin text-orange-500" /> : rule.value}
                  </p>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">{rule.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Edit Application Rules</DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500">
              Changes affect billing, settlements, and hardware globally.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Billing Section */}
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Billing & Rates</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Currency (ISO 4217)</label>
                  <input value={formData.currency ?? ""} onChange={(e) => setFormData(p => ({ ...p, currency: e.target.value.toUpperCase().slice(0, 3) }))} maxLength={3} placeholder="NPR" className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Tax Rate (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={formData.taxRate !== undefined ? (formData.taxRate * 100).toFixed(2) : ""} onChange={(e) => setFormData(p => ({ ...p, taxRate: parseFloat(e.target.value) / 100 }))} placeholder="13.00" className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Service Charge (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={formData.serviceChargeRate !== undefined ? (formData.serviceChargeRate * 100).toFixed(2) : ""} onChange={(e) => setFormData(p => ({ ...p, serviceChargeRate: parseFloat(e.target.value) / 100 }))} placeholder="2.00" className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">App Commission (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={formData.appCommissionRate !== undefined ? (formData.appCommissionRate * 100).toFixed(2) : ""} onChange={(e) => setFormData(p => ({ ...p, appCommissionRate: parseFloat(e.target.value) / 100 }))} placeholder="10.00" className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Door Access Mode */}
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Door Access Mode</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Door Mode</label>
                  <Select
                    value={formData.doorAccessMode ?? "AUTOMATIC"}
                    onValueChange={(value) => setFormData((p) => ({ ...p, doorAccessMode: value as DoorAccessMode }))}
                  >
                    <SelectTrigger className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus:border-orange-500/50 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Select access mode" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#111] text-white">
                      <SelectItem value="AUTOMATIC" className="text-[12px] focus:bg-white/10 focus:text-white">
                        Automatic (queue unlock on member check-in)
                      </SelectItem>
                      <SelectItem value="MANUAL" className="text-[12px] focus:bg-white/10 focus:text-white">
                        Manual (no auto unlock from check-in)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Check-in Mode</label>
                  <Select
                    value={formData.checkInAccessMode ?? "MANUAL"}
                    onValueChange={(value) => setFormData((p) => ({ ...p, checkInAccessMode: value as CheckInAccessMode }))}
                  >
                    <SelectTrigger className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus:border-orange-500/50 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Select check-in mode" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#111] text-white">
                      <SelectItem value="MANUAL" className="text-[12px] focus:bg-white/10 focus:text-white">
                        Manual (staff marks complete)
                      </SelectItem>
                      <SelectItem value="DOOR_ACK_REQUIRED" className="text-[12px] focus:bg-white/10 focus:text-white">
                        Door ACK Required (door confirmation)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Failsafe Mode</label>
                  <Select
                    value={formData.doorFailsafeMode ?? "LOCKED"}
                    onValueChange={(value) => setFormData((p) => ({ ...p, doorFailsafeMode: value as DoorFailsafeMode }))}
                  >
                    <SelectTrigger className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus:border-orange-500/50 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Select failsafe mode" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#111] text-white">
                      <SelectItem value="LOCKED" className="text-[12px] focus:bg-white/10 focus:text-white">
                        Locked (Secure)
                      </SelectItem>
                      <SelectItem value="UNLOCKED" className="text-[12px] focus:bg-white/10 focus:text-white">
                        Unlocked (Emergency Egress)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                <button type="button" onClick={() => setFormData(p => ({ ...p, doorAutoLockEnabled: !p.doorAutoLockEnabled }))} className={cn("flex items-center gap-2 rounded-[10px] border px-4 py-2 text-[12px] font-bold transition", formData.doorAutoLockEnabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-500/30 bg-slate-500/10 text-slate-400")}>
                  {formData.doorAutoLockEnabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />} Auto Lock
                </button>
                <button type="button" onClick={() => setFormData(p => ({ ...p, doorManualOverrideAllowed: !p.doorManualOverrideAllowed }))} className={cn("flex items-center gap-2 rounded-[10px] border px-4 py-2 text-[12px] font-bold transition", formData.doorManualOverrideAllowed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-500/30 bg-slate-500/10 text-slate-400")}>
                  <Unlock className="h-4 w-4" /> Manual Override {formData.doorManualOverrideAllowed ? "Allowed" : "Blocked"}
                </button>
              </div>
            </div>

            {/* Door Timing */}
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Door Controller Timing (seconds)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Poll Interval</label>
                  <input type="number" min="1" value={formData.doorPollIntervalSeconds ?? ""} onChange={(e) => setFormData(p => ({ ...p, doorPollIntervalSeconds: parseInt(e.target.value) }))} className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Unlock Duration</label>
                  <input type="number" min="1" value={formData.doorUnlockDurationSeconds ?? ""} onChange={(e) => setFormData(p => ({ ...p, doorUnlockDurationSeconds: parseInt(e.target.value) }))} className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Command Expiry</label>
                  <input type="number" min="1" value={formData.doorCommandExpirySeconds ?? ""} onChange={(e) => setFormData(p => ({ ...p, doorCommandExpirySeconds: parseInt(e.target.value) }))} className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">ACK Timeout</label>
                  <input type="number" min="1" value={formData.doorAckTimeoutSeconds ?? ""} onChange={(e) => setFormData(p => ({ ...p, doorAckTimeoutSeconds: parseInt(e.target.value) }))} className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Online Window</label>
                  <input type="number" min="1" value={formData.doorDeviceOnlineWindowSeconds ?? ""} onChange={(e) => setFormData(p => ({ ...p, doorDeviceOnlineWindowSeconds: parseInt(e.target.value) }))} className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 text-white hover:bg-orange-400" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />} Save Rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Main Settings list items ───────────────────────────────────────── */
type SettingsItem = {
  id: AdminSettingsTab;
  label: string;
  description: string;
  icon: React.ElementType;
} | {
  id: "cms";
  label: string;
  description: string;
  icon: React.ElementType;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  { id: "overview", label: "Overview", description: "Quick-access to all settings modules.", icon: LayoutGrid },
  { id: "app-rules", label: "Application Rules", description: "Currency, commission, timezone, and door access timing.", icon: Cog },
  { id: "cms", label: "CMS Management", description: "How-to guides, testimonials, features, FAQs, and announcements.", icon: FileText },
];

/* ─── Admin Settings shell ───────────────────────────────────────────── */
export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<AdminSettingsTab | null>(null);
  const [showCms, setShowCms] = useState(false);

  if (showCms) return <AdminCmsView onBack={() => setShowCms(false)} />;

  const renderContent = (tab: AdminSettingsTab) => {
    switch (tab) {
      case "overview": return <OverviewContent onOpenTab={(t) => setActiveTab(t)} onOpenCms={() => setShowCms(true)} />;
      case "app-rules": return <AppRulesContent />;
    }
  };

  /* Sidebar stat cards */
  const statCards = [
    { label: "Rule Groups", value: "4", hint: "billing · system · doors" },
    { label: "CMS Sections", value: "5", hint: "content modules" },
    { label: "Door Settings", value: "9", hint: "access & timing" },
    { label: "Billing Rates", value: "4", hint: "currency & fees" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Administration</p>
        <h1 className="mt-1 text-[32px] font-black tracking-tight text-white">Admin <span style={fireStyle}>Settings</span></h1>
      </div>

      {/* Mobile top cards */}
      <div className="grid grid-cols-2 gap-3 xl:hidden sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-[18px] border table-border table-bg p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-400">{s.label}</p>
            <p className="mt-1.5 text-[22px] font-black text-white">{s.value}</p>
            <p className="mt-0.5 text-[10px] text-slate-600">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* Main layout: sidebar + accordion */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
        {/* ── Sidebar (desktop only) ── */}
        <aside className="hidden space-y-4 xl:block">
          {/* Identity card */}
          <div className="rounded-[22px] border table-border table-bg p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] border border-orange-500/25 bg-orange-500/10">
                <Cog className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Admin</p>
                <p className="text-[15px] font-black uppercase tracking-tight text-white">Settings</p>
                <p className="text-[11px] text-slate-500">Platform management</p>
              </div>
            </div>
          </div>

          {/* Sidebar stat cards */}
          <div className="rounded-[22px] border table-border table-bg p-5">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Quick Stats</p>
            <div className="space-y-2">
              {statCards.map((s) => (
                <div key={s.label} className="flex items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-2.5">
                  <span className="text-[12px] font-semibold text-slate-300">{s.label}</span>
                  <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-black text-orange-400">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-[22px] border table-border table-bg p-5">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Quick Actions</p>
            <div className="space-y-2">
              <button type="button" onClick={() => setShowCms(true)} className="flex w-full items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-3 text-left text-[12px] font-bold text-white transition hover:border-orange-500/30 hover:bg-orange-500/[0.06]">
                Open CMS <ArrowUpRight className="h-3.5 w-3.5 text-orange-400" />
              </button>
              <button type="button" onClick={() => setActiveTab("app-rules")} className="flex w-full items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-3 text-left text-[12px] font-bold text-white transition hover:border-orange-500/30 hover:bg-orange-500/[0.06]">
                App Rules <ArrowUpRight className="h-3.5 w-3.5 text-orange-400" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Accordion sections ── */}
        <section className="min-w-0 space-y-3">
          {SETTINGS_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCms = item.id === "cms";
            const isActive = !isCms && activeTab === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "overflow-hidden rounded-[22px] border shadow-sm transition-all",
                  isActive ? "border-orange-500/25 table-bg" : "table-border table-bg hover:border-white/15"
                )}
              >
                <button
                  type="button"
                  aria-expanded={isCms ? undefined : isActive}
                  onClick={() => {
                    if (isCms) { setShowCms(true); return; }
                    setActiveTab(activeTab === item.id ? null : (item.id as AdminSettingsTab));
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors",
                    !isActive && "hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className={cn(
                      "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] border transition-colors",
                      isActive ? "border-orange-500/30 bg-orange-500/15 text-orange-300" : "table-border table-bg-alt text-slate-400"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-[13px] font-black uppercase tracking-[0.12em]", isActive ? "text-white" : "text-slate-200")}>{item.label}</p>
                      <p className="mt-0.5 text-[11px] leading-5 table-text-muted">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {isCms ? (
                      <span className="hidden rounded-full border table-border table-bg-alt px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 sm:inline-flex">Open Page</span>
                    ) : isActive ? (
                      <span className="hidden rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-300 sm:inline-flex">Expanded</span>
                    ) : null}
                    {isCms ? (
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", isActive ? "rotate-180 text-orange-400" : "text-slate-500")} />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {!isCms && isActive && (
                  <div
                    id={`admin-settings-section-${item.id}`}
                    role="region"
                    className="border-t table-border-cell table-bg-alt px-5 py-6"
                  >
                    {renderContent(item.id as AdminSettingsTab)}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
