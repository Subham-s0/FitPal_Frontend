import { useState } from "react";
import {
  AlertCircle, ArrowUpRight, Cog, ChevronDown, ChevronRight,
  DollarSign, Edit2, FileText, Info, LayoutGrid, Loader2,
  Megaphone, RefreshCcw, Save, Shield, Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { getAdminApplicationRulesSummaryApi } from "@/features/admin/admin-plan.api";
import AdminCmsView from "@/features/admin/components/AdminCmsView";
import { cn } from "@/shared/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";

/* ─── Types ─────────────────────────────────────────────────────────── */
type AdminSettingsTab = "overview" | "app-rules" | "platform";

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
    { label: "App Rules", desc: "Currency, commission & gateway toggles", icon: Cog, accent: "border-orange-500/25 bg-orange-500/[0.07] text-orange-400", action: () => onOpenTab("app-rules") },
    { label: "Platform Config", desc: "Feature flags, limits & branding", icon: Shield, accent: "border-violet-500/25 bg-violet-500/[0.07] text-violet-400", action: () => onOpenTab("platform") },
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
        CMS data is currently seeded with mock data. Wire each section to your backend CMS API to persist changes.
      </div>
    </div>
  );
}

/* ─── App Rules ──────────────────────────────────────────────────────── */
function pct(v: number | undefined): string {
  return v !== undefined ? `${(v * 100).toFixed(2)}%` : "—";
}

function AppRulesContent() {
  const rulesQ = useQuery({ queryKey: ["admin", "application-rules", "summary"], queryFn: getAdminApplicationRulesSummaryApi });
  const [editOpen, setEditOpen] = useState(false);
  const [currency, setCurrency] = useState("NPR");
  const d = rulesQ.data;

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
      label: "Door Controller",
      items: [
        { key: "doorPollIntervalSeconds",       label: "Poll Interval",        value: d?.doorPollIntervalSeconds       !== undefined ? `${d.doorPollIntervalSeconds}s`       : "1s",  icon: Shield, desc: "How often the server polls the door controller." },
        { key: "doorUnlockDurationSeconds",     label: "Unlock Duration",      value: d?.doorUnlockDurationSeconds     !== undefined ? `${d.doorUnlockDurationSeconds}s`     : "5s",  icon: Shield, desc: "Seconds the door stays unlocked after QR scan." },
        { key: "doorCommandExpirySeconds",      label: "Command Expiry",       value: d?.doorCommandExpirySeconds      !== undefined ? `${d.doorCommandExpirySeconds}s`      : "30s", icon: Cog,    desc: "Time before an unlock command expires." },
        { key: "doorAckTimeoutSeconds",         label: "ACK Timeout",          value: d?.doorAckTimeoutSeconds         !== undefined ? `${d.doorAckTimeoutSeconds}s`         : "10s", icon: Cog,    desc: "Time to wait for device acknowledgement." },
        { key: "doorDeviceOnlineWindowSeconds", label: "Device Online Window", value: d?.doorDeviceOnlineWindowSeconds  !== undefined ? `${d.doorDeviceOnlineWindowSeconds}s`  : "30s", icon: Shield, desc: "Window to consider a door device online." },
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
          Showing default-value placeholders — the backend endpoint may not yet return all fields.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.label}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((rule) => {
              const Icon = rule.icon;
              return (
                <div key={rule.key} className="rounded-[18px] border table-border table-bg p-4 transition hover:border-orange-500/20">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-orange-500/20 bg-orange-500/10">
                      <Icon className="h-3.5 w-3.5 text-orange-400" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600">rule</span>
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
        <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-black">Edit Application Rules</DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500">
              Changes affect billing, settlements, and hardware globally. Requires SUPERADMIN role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Platform Currency</label>
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} maxLength={3} placeholder="NPR" className="h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none" />
              <p className="mt-1 text-[10px] text-slate-600">ISO 4217 code (e.g. NPR, USD)</p>
            </div>
            <div className="rounded-[14px] border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-[12px] text-amber-300">
              <AlertCircle className="mr-2 inline h-3.5 w-3.5" />
              Full rule editing requires <code className="font-mono text-amber-200">PATCH /admin/application-rules</code> — this UI is wire-ready.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 text-white hover:bg-orange-400" onClick={() => { toast.success("Rules saved (mock)"); setEditOpen(false); }}>
              <Save className="mr-2 h-3.5 w-3.5" /> Save Rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Platform Config ────────────────────────────────────────────────── */
function PlatformConfigContent() {
  const groups = [
    {
      label: "Appearance & Identity",
      items: [
        { key: "app_name", label: "App Name", value: "FitPal", type: "text" },
        { key: "support_email", label: "Support Email", value: "support@fitpal.io", type: "email" },
        { key: "tagline", label: "Tagline", value: "Train anywhere. Track everything.", type: "text" },
      ],
    },
    {
      label: "Limits & Thresholds",
      items: [
        { key: "max_sessions", label: "Max Active Sessions (per user)", value: "1", type: "number" },
        { key: "session_timeout", label: "Session Timeout (minutes)", value: "240", type: "number" },
        { key: "qr_expiry", label: "QR Code Expiry (seconds)", value: "30", type: "number" },
      ],
    },
    {
      label: "Feature Flags",
      items: [
        { key: "maintenance_mode", label: "Maintenance Mode", value: "Disabled", type: "toggle" },
        { key: "new_registrations", label: "New Registrations", value: "Enabled", type: "toggle" },
        { key: "gym_onboarding", label: "Gym Onboarding", value: "Enabled", type: "toggle" },
      ],
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-slate-400">Global flags, thresholds, and branding options.</p>
        <button type="button" onClick={() => toast.info("Save (wire up)")} className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-orange-300 transition hover:bg-orange-500/20">
          <Save className="h-3 w-3" /> Save All
        </button>
      </div>
      <div className="rounded-[14px] border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-[12px] text-amber-300">
        <AlertCircle className="mr-2 inline h-3.5 w-3.5" />UI-ready — wire each key to your backend configuration endpoint to persist changes.
      </div>
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.label}</p>
            <div className="overflow-hidden rounded-[18px] border table-border table-bg">
              {group.items.map((cfg, idx) => (
                <div key={cfg.key} className={cn("flex flex-wrap items-center justify-between gap-4 px-5 py-4", idx < group.items.length - 1 && "border-b table-border-cell")}>
                  <div>
                    <p className="text-[13px] font-bold text-white">{cfg.label}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-600">{cfg.key}</p>
                  </div>
                  {cfg.type === "toggle" ? (
                    <button type="button" onClick={() => toast.info(`Toggle ${cfg.key}`)} className={cn("rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition", cfg.value === "Enabled" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15")}>
                      {cfg.value}
                    </button>
                  ) : (
                    <input defaultValue={cfg.value} type={cfg.type} className="h-8 w-48 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 text-right text-sm text-white focus:border-orange-500/50 focus:outline-none" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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
  { id: "app-rules", label: "Application Rules", description: "Currency, commission rate, min payout, and payment gateway toggles.", icon: Cog },
  { id: "platform", label: "Platform Config", description: "Feature flags, session limits, QR expiry, and branding values.", icon: Shield },
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
      case "platform": return <PlatformConfigContent />;
    }
  };

  /* Sidebar stat cards */
  const statCards = [
    { label: "Active Rules", value: "7", hint: "configured params" },
    { label: "CMS Sections", value: "5", hint: "content modules" },
    { label: "Feature Flags", value: "3", hint: "togglable" },
    { label: "Gateways", value: "2", hint: "eSewa · Khalti" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Administration</p>
        <h1 className="mt-1 text-[32px] font-black tracking-tight text-white">Admin <span style={fireStyle}>Settings</span></h1>
        <p className="mt-1 text-[13px] table-text-muted">Application rules, CMS content, platform flags, and global configuration.</p>
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
              <button type="button" onClick={() => setActiveTab("platform")} className="flex w-full items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-3 text-left text-[12px] font-bold text-white transition hover:border-orange-500/30 hover:bg-orange-500/[0.06]">
                Platform Config <ArrowUpRight className="h-3.5 w-3.5 text-orange-400" />
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
