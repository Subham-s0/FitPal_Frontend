import { useState } from "react";
import {
  ArrowLeft, BookOpen, ChevronDown, Edit2, GripVertical,
  Megaphone, MessageSquare, MoreVertical, Plus, Save,
  Star, Trash2, Zap, X, Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import {
  cmsStore, useCmsStore,
  type CmsFeature, type CmsTestimonial,
  type CmsHowToStep, type CmsFaq, type CmsAnnouncement, type CmsStat,
} from "@/features/marketing/cms-store";

/* ── Types ─────────────────────────────────────────────────────────── */
type CmsTab = "features" | "testimonials" | "how-to" | "stats" | "faqs" | "announcements";

/* ── Utilities ─────────────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function StatusBadge({ label, v }: { label: string; v: "green" | "amber" | "red" | "blue" | "violet" | "slate" }) {
  const cls = {
    green:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    amber:  "bg-amber-500/10  text-amber-400  border-amber-500/25",
    red:    "bg-red-500/10    text-red-400    border-red-500/25",
    blue:   "bg-blue-500/10   text-blue-400   border-blue-500/25",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/25",
    slate:  "bg-slate-500/10  text-slate-400  border-slate-500/25",
  }[v];
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider", cls)}>
      {label}
    </span>
  );
}

function Dots({ onEdit, onDelete, extra }: {
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: { label: string; icon: React.ReactNode; fn: () => void }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/30 transition hover:bg-white/10 hover:text-white">
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 border-white/10 bg-[#0f0f0f] text-white">
        {onEdit && <DropdownMenuItem className="cursor-pointer focus:bg-white/10" onClick={onEdit}><Edit2 className="mr-2 h-3.5 w-3.5" />Edit</DropdownMenuItem>}
        {extra?.map((x) => (
          <DropdownMenuItem key={x.label} className="cursor-pointer focus:bg-white/10" onClick={x.fn}>{x.icon}{x.label}</DropdownMenuItem>
        ))}
        {onDelete && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="cursor-pointer text-red-400 focus:bg-red-500/15 focus:text-red-300" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[18px] border table-border table-bg">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">{children}</table>
      </div>
    </div>
  );
}
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={cn("border-b table-border px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] table-text-muted first:pl-5", right && "text-right")}>{children}</th>;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none";
const textareaCls = "w-full resize-none rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none";

function SaveBtn({ onClick }: { onClick: () => void }) {
  return (
    <Button className="bg-orange-500 text-white hover:bg-orange-400" onClick={onClick}>
      <Save className="mr-2 h-3.5 w-3.5" />Save
    </Button>
  );
}
function CancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]" onClick={onClick}>
      Cancel
    </Button>
  );
}

function SectionHead({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] border border-orange-500/25 bg-orange-500/[0.08]">{icon}</div>
        <div>
          <p className="text-[14px] font-black uppercase tracking-[0.1em] text-white">{title}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-orange-300 transition hover:bg-orange-500/20">
      <Plus className="h-3.5 w-3.5" />{label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* FEATURES TAB                                                         */
/* ─────────────────────────────────────────────────────────────────── */
const AVAILABLE_ICONS = ["QrCode","Target","BarChart3","MapPin","CreditCard","Shield","Dumbbell","Calendar","Zap","Star","Trophy","Users","BookOpen","Lock","ScanLine","UserPlus","Search"];

function emptyFeature(): CmsFeature {
  return { id: uid(), icon: "Dumbbell", title: "", description: "", highlight: false, active: true, order: 99 };
}

function FeaturesTab() {
  const cms = useCmsStore();
  const [editing, setEditing] = useState<CmsFeature | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => { setEditing(emptyFeature()); setIsNew(true); };
  const openEdit = (f: CmsFeature) => { setEditing({ ...f }); setIsNew(false); };
  const save = () => {
    if (!editing || !editing.title.trim()) { toast.error("Title is required"); return; }
    cmsStore.setFeature(editing);
    toast.success(isNew ? "Feature added" : "Feature updated");
    setEditing(null);
  };
  const del = (id: string) => { cmsStore.removeFeature(id); toast.success("Feature removed"); };

  return (
    <div className="space-y-4">
      <SectionHead icon={<Zap className="h-5 w-5 text-violet-400" />} title="Features" description="Shown on the home page features grid. Toggle active to hide/show." action={<AddBtn label="Add Feature" onClick={openNew} />} />
      <TableWrap>
        <thead>
          <tr>
            <Th>Feature</Th><Th>Description</Th><Th>Highlight</Th><Th>Visible</Th><Th right>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {cms.features.map((f) => (
            <tr key={f.id} className="table-border-row border-b last:border-0 transition hover:bg-white/[0.025]">
              <td className="px-4 py-3.5 pl-5">
                <div className="flex items-center gap-2.5">
                  <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-white/20" />
                  <span className="text-[12px] font-mono text-slate-500 mr-1">{f.icon}</span>
                  <span className="text-[13px] font-bold text-white">{f.title}</span>
                </div>
              </td>
              <td className="max-w-[220px] truncate px-4 py-3.5 text-[12px] text-slate-400">{f.description}</td>
              <td className="px-4 py-3.5">
                <button type="button" onClick={() => cmsStore.setFeature({ ...f, highlight: !f.highlight })}>
                  <StatusBadge label={f.highlight ? "Yes" : "No"} v={f.highlight ? "amber" : "slate"} />
                </button>
              </td>
              <td className="px-4 py-3.5">
                <button type="button" onClick={() => cmsStore.setFeature({ ...f, active: !f.active })}>
                  <StatusBadge label={f.active ? "Active" : "Hidden"} v={f.active ? "green" : "slate"} />
                </button>
              </td>
              <td className="px-4 py-3.5 pr-5 text-right">
                <Dots onEdit={() => openEdit(f)} onDelete={() => del(f.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-black">{isNew ? "Add Feature" : "Edit Feature"}</DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">This will be reflected on the home page immediately.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <FieldRow label="Title"><input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. QR Check-In" /></FieldRow>
              <FieldRow label="Description"><textarea className={textareaCls} rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Short benefit description…" /></FieldRow>
              <FieldRow label="Icon Name">
                <select className={inputCls} value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })}>
                  {AVAILABLE_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </FieldRow>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Order"><input type="number" className={inputCls} value={editing.order} onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value) || 99 })} /></FieldRow>
                <div className="flex flex-col gap-3 pt-5">
                  <label className="flex items-center gap-2 text-[12px] text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={editing.highlight} onChange={(e) => setEditing({ ...editing, highlight: e.target.checked })} className="accent-orange-500" />
                    Highlight badge
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-orange-500" />
                    Visible on home page
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2"><CancelBtn onClick={() => setEditing(null)} /><SaveBtn onClick={save} /></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* TESTIMONIALS TAB                                                     */
/* ─────────────────────────────────────────────────────────────────── */
function emptyTestimonial(): CmsTestimonial {
  return { id: uid(), name: "", role: "", avatar: "", content: "", rating: 5, approved: false, order: 99 };
}

function TestimonialsTab() {
  const cms = useCmsStore();
  const [editing, setEditing] = useState<CmsTestimonial | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => { setEditing(emptyTestimonial()); setIsNew(true); };
  const openEdit = (t: CmsTestimonial) => { setEditing({ ...t }); setIsNew(false); };
  const save = () => {
    if (!editing || !editing.name.trim()) { toast.error("Name is required"); return; }
    cmsStore.setTestimonial(editing);
    toast.success(isNew ? "Testimonial added" : "Updated");
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <SectionHead icon={<Star className="h-5 w-5 text-amber-400" />} title="Testimonials" description="Approved testimonials show on the home page." action={<AddBtn label="Add Testimonial" onClick={openNew} />} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cms.testimonials.map((t) => (
          <div key={t.id} className={cn("relative rounded-[18px] border p-5 transition", t.approved ? "border-amber-500/20 bg-amber-500/[0.04]" : "table-border table-bg opacity-60")}>
            <div className="absolute right-3 top-3">
              <Dots
                onEdit={() => openEdit(t)}
                onDelete={() => { cmsStore.removeTestimonial(t.id); toast.success("Removed"); }}
                extra={[{
                  label: t.approved ? "Unapprove" : "Approve",
                  icon: <Star className="mr-2 h-3.5 w-3.5" />,
                  fn: () => cmsStore.setTestimonial({ ...t, approved: !t.approved }),
                }]}
              />
            </div>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 text-[13px] font-black text-amber-400">
                {t.name ? t.name[0] : "?"}
              </div>
              <div>
                <p className="text-[13px] font-black text-white">{t.name || <span className="italic text-slate-500">No name</span>}</p>
                <p className="text-[10px] text-slate-500">{t.role}</p>
              </div>
            </div>
            <div className="mb-2 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("h-3 w-3", i < t.rating ? "fill-amber-400 text-amber-400" : "text-white/10")} />
              ))}
            </div>
            <p className="line-clamp-3 text-[12px] leading-relaxed text-slate-400">"{t.content}"</p>
            <div className="mt-3">
              <StatusBadge label={t.approved ? "Approved · Home" : "Pending"} v={t.approved ? "green" : "amber"} />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-black">{isNew ? "Add Testimonial" : "Edit Testimonial"}</DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">Approved testimonials show on the home page automatically.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Name"><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Arun Sharma" /></FieldRow>
                <FieldRow label="Role"><input className={inputCls} value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="Fitness Enthusiast" /></FieldRow>
              </div>
              <FieldRow label="Avatar URL (optional)"><input className={inputCls} value={editing.avatar} onChange={(e) => setEditing({ ...editing, avatar: e.target.value })} placeholder="https://…" /></FieldRow>
              <FieldRow label="Testimonial">
                <textarea className={textareaCls} rows={3} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="What did they say…" />
              </FieldRow>
              <div className="flex items-center gap-4">
                <FieldRow label="Rating">
                  <div className="flex gap-1 pt-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} type="button" onClick={() => setEditing({ ...editing, rating: n })}>
                        <Star className={cn("h-5 w-5 transition-colors", n <= editing.rating ? "fill-amber-400 text-amber-400" : "text-white/20 hover:text-amber-400/50")} />
                      </button>
                    ))}
                  </div>
                </FieldRow>
                <label className="flex items-center gap-2 pt-4 text-[12px] text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={editing.approved} onChange={(e) => setEditing({ ...editing, approved: e.target.checked })} className="accent-orange-500" />
                  Approve (show on home)
                </label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2"><CancelBtn onClick={() => setEditing(null)} /><SaveBtn onClick={save} /></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* HOW-TO TAB                                                           */
/* ─────────────────────────────────────────────────────────────────── */
const STEP_ICONS = ["UserPlus","Search","ScanLine","QrCode","Dumbbell","MapPin","CreditCard","BookOpen","Zap"];

function emptyStep(): CmsHowToStep {
  return { id: uid(), stepNumber: "0" + (Math.floor(Math.random() * 9) + 4), icon: "UserPlus", title: "", description: "", published: true, order: 99 };
}

function HowToTab() {
  const cms = useCmsStore();
  const [editing, setEditing] = useState<CmsHowToStep | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => { setEditing(emptyStep()); setIsNew(true); };
  const save = () => {
    if (!editing || !editing.title.trim()) { toast.error("Title is required"); return; }
    cmsStore.setHowToStep(editing);
    toast.success(isNew ? "Step added" : "Updated");
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <SectionHead icon={<BookOpen className="h-5 w-5 text-blue-400" />} title="How It Works Steps" description="Steps shown in the 'How It Works' section on the home page." action={<AddBtn label="Add Step" onClick={openNew} />} />
      <TableWrap>
        <thead><tr><Th>#</Th><Th>Title</Th><Th>Description</Th><Th>Visible</Th><Th right>Actions</Th></tr></thead>
        <tbody>
          {cms.howToSteps.map((s) => (
            <tr key={s.id} className="table-border-row border-b last:border-0 transition hover:bg-white/[0.025]">
              <td className="px-4 py-3.5 pl-5">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-white/20" />
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-2 py-0.5 text-[10px] font-black text-blue-300">{s.stepNumber}</span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-[13px] font-bold text-white">{s.title}</td>
              <td className="max-w-[220px] truncate px-4 py-3.5 text-[12px] text-slate-400">{s.description}</td>
              <td className="px-4 py-3.5">
                <button type="button" onClick={() => cmsStore.setHowToStep({ ...s, published: !s.published })}>
                  <StatusBadge label={s.published ? "Published" : "Draft"} v={s.published ? "green" : "amber"} />
                </button>
              </td>
              <td className="px-4 py-3.5 pr-5 text-right">
                <Dots onEdit={() => { setEditing({ ...s }); setIsNew(false); }} onDelete={() => { cmsStore.removeHowToStep(s.id); toast.success("Removed"); }} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-[480px]">
          <DialogHeader><DialogTitle className="font-black">{isNew ? "Add Step" : "Edit Step"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Step Number"><input className={inputCls} value={editing.stepNumber} onChange={(e) => setEditing({ ...editing, stepNumber: e.target.value })} placeholder="01" /></FieldRow>
                <FieldRow label="Icon">
                  <select className={inputCls} value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })}>
                    {STEP_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </FieldRow>
              </div>
              <FieldRow label="Title"><input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Create Account" /></FieldRow>
              <FieldRow label="Description"><textarea className={textareaCls} rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></FieldRow>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Order"><input type="number" className={inputCls} value={editing.order} onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value) || 99 })} /></FieldRow>
                <label className="flex items-center gap-2 pt-6 text-[12px] text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="accent-orange-500" />Published
                </label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2"><CancelBtn onClick={() => setEditing(null)} /><SaveBtn onClick={save} /></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* STATS TAB                                                            */
/* ─────────────────────────────────────────────────────────────────── */
const STAT_ICONS = ["Dumbbell","Users","MapPin","Trophy","Star","Zap","BarChart3","Calendar"];

function emptyStat(): CmsStat {
  return { id: uid(), icon: "Trophy", value: "0+", label: "", active: true, order: 99 };
}

function StatsTab() {
  const cms = useCmsStore();
  const [editing, setEditing] = useState<CmsStat | null>(null);
  const [isNew, setIsNew] = useState(false);

  const save = () => {
    if (!editing || !editing.label.trim()) { toast.error("Label is required"); return; }
    cmsStore.setStat(editing);
    toast.success(isNew ? "Stat added" : "Updated");
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <SectionHead icon={<Dumbbell className="h-5 w-5 text-orange-400" />} title="Stats Bar" description="Numbers shown in the stats bar on the home page." action={<AddBtn label="Add Stat" onClick={() => { setEditing(emptyStat()); setIsNew(true); }} />} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cms.stats.map((s) => (
          <div key={s.id} className={cn("relative rounded-[18px] border p-4 text-center transition", s.active ? "table-border table-bg" : "border-white/[0.04] opacity-50")}>
            <div className="absolute right-2 top-2">
              <Dots
                onEdit={() => { setEditing({ ...s }); setIsNew(false); }}
                onDelete={() => { cmsStore.removeStat(s.id); toast.success("Removed"); }}
                extra={[{ label: s.active ? "Hide" : "Show", icon: <Zap className="mr-2 h-3.5 w-3.5" />, fn: () => cmsStore.setStat({ ...s, active: !s.active }) }]}
              />
            </div>
            <p className="text-[28px] font-black text-gradient-fire">{s.value}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-400">{s.label}</p>
            <p className="mt-2 font-mono text-[9px] text-slate-600">{s.icon}</p>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="font-black">{isNew ? "Add Stat" : "Edit Stat"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <FieldRow label="Value (e.g. 500+)"><input className={inputCls} value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} placeholder="500+" /></FieldRow>
              <FieldRow label="Label"><input className={inputCls} value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Partner Gyms" /></FieldRow>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Icon">
                  <select className={inputCls} value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })}>
                    {STAT_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Order"><input type="number" className={inputCls} value={editing.order} onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value) || 99 })} /></FieldRow>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-slate-300 cursor-pointer">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-orange-500" />
                Visible on home page
              </label>
            </div>
          )}
          <DialogFooter className="gap-2"><CancelBtn onClick={() => setEditing(null)} /><SaveBtn onClick={save} /></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* FAQS TAB                                                             */
/* ─────────────────────────────────────────────────────────────────── */
function emptyFaq(): CmsFaq {
  return { id: uid(), question: "", answer: "", category: "General", published: true, order: 99 };
}

function FaqsTab() {
  const cms = useCmsStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<CmsFaq | null>(null);
  const [isNew, setIsNew] = useState(false);

  const save = () => {
    if (!editing || !editing.question.trim()) { toast.error("Question is required"); return; }
    cmsStore.setFaq(editing);
    toast.success(isNew ? "FAQ added" : "Updated");
    setEditing(null);
  };
  const cats = [...new Set(cms.faqs.map((f) => f.category))];

  return (
    <div className="space-y-4">
      <SectionHead icon={<MessageSquare className="h-5 w-5 text-emerald-400" />} title="FAQs" description="Frequently asked questions. Published ones shown on the home page Help section." action={<AddBtn label="Add FAQ" onClick={() => { setEditing(emptyFaq()); setIsNew(true); }} />} />
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => <span key={c} className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">{c} ({cms.faqs.filter((f) => f.category === c).length})</span>)}
      </div>
      <div className="space-y-2">
        {cms.faqs.map((item) => {
          const isOpen = expanded === item.id;
          return (
            <div key={item.id} className={cn("overflow-hidden rounded-[16px] border transition-all", isOpen ? "border-orange-500/20 table-bg" : "table-border table-bg")}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : item.id)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">{item.category}</span>
                  <span className="truncate text-[13px] font-bold text-white">{item.question}</span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button type="button" onClick={(e) => { e.stopPropagation(); cmsStore.setFaq({ ...item, published: !item.published }); }}>
                    <StatusBadge label={item.published ? "Published" : "Draft"} v={item.published ? "green" : "amber"} />
                  </button>
                  <Dots onEdit={() => { setEditing({ ...item }); setIsNew(false); }} onDelete={() => { cmsStore.removeFaq(item.id); toast.success("Removed"); }} />
                  <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-slate-500 transition-transform", isOpen && "rotate-180 text-orange-400")} />
                </div>
              </button>
              {isOpen && <div className="border-t table-border-cell bg-white/[0.01] px-5 py-4 text-[13px] leading-relaxed text-slate-400">{item.answer}</div>}
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="font-black">{isNew ? "Add FAQ" : "Edit FAQ"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <FieldRow label="Question"><input className={inputCls} value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} placeholder="How do I…" /></FieldRow>
              <FieldRow label="Answer"><textarea className={textareaCls} rows={4} value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} /></FieldRow>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Category"><input className={inputCls} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Billing" /></FieldRow>
                <FieldRow label="Order"><input type="number" className={inputCls} value={editing.order} onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value) || 99 })} /></FieldRow>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-slate-300 cursor-pointer">
                <input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="accent-orange-500" />
                Published (show on help page)
              </label>
            </div>
          )}
          <DialogFooter className="gap-2"><CancelBtn onClick={() => setEditing(null)} /><SaveBtn onClick={save} /></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* ANNOUNCEMENTS TAB                                                    */
/* ─────────────────────────────────────────────────────────────────── */
function emptyAnnouncement(): CmsAnnouncement {
  return { id: uid(), title: "", audience: "All users", status: "draft", scheduledAt: null };
}

function AnnouncementsTab() {
  const cms = useCmsStore();
  const [editing, setEditing] = useState<CmsAnnouncement | null>(null);
  const [isNew, setIsNew] = useState(false);

  const save = () => {
    if (!editing || !editing.title.trim()) { toast.error("Title is required"); return; }
    cmsStore.setAnnouncement(editing);
    toast.success(isNew ? "Announcement added" : "Updated");
    setEditing(null);
  };
  const statusV = (s: CmsAnnouncement["status"]) => s === "published" ? "green" : s === "scheduled" ? "blue" : "amber";

  return (
    <div className="space-y-4">
      <SectionHead icon={<Megaphone className="h-5 w-5 text-red-400" />} title="Announcements" description="Platform-wide notices and maintenance alerts." action={<AddBtn label="New" onClick={() => { setEditing(emptyAnnouncement()); setIsNew(true); }} />} />
      <div className="space-y-3">
        {cms.announcements.map((item) => (
          <div key={item.id} className="flex items-start gap-4 rounded-[18px] border table-border table-bg px-5 py-4 transition hover:border-white/15">
            <div className={cn("mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border", item.status === "published" ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400" : item.status === "scheduled" ? "border-blue-500/25 bg-blue-500/[0.08] text-blue-400" : "border-amber-500/25 bg-amber-500/[0.08] text-amber-400")}>
              <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[14px] font-bold text-white">{item.title}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge label={item.status} v={statusV(item.status)} />
                  <Dots
                    onEdit={() => { setEditing({ ...item }); setIsNew(false); }}
                    onDelete={() => { cmsStore.removeAnnouncement(item.id); toast.success("Removed"); }}
                    extra={item.status !== "published" ? [{ label: "Publish", icon: <Zap className="mr-2 h-3.5 w-3.5" />, fn: () => cmsStore.setAnnouncement({ ...item, status: "published" }) }] : []}
                  />
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-500">
                <span>Audience: <span className="text-slate-300">{item.audience}</span></span>
                {item.scheduledAt && <span>Scheduled: <span className="text-blue-400">{new Date(item.scheduledAt).toLocaleDateString()}</span></span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-[460px]">
          <DialogHeader><DialogTitle className="font-black">{isNew ? "New Announcement" : "Edit Announcement"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <FieldRow label="Title"><input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Scheduled maintenance…" /></FieldRow>
              <FieldRow label="Audience"><input className={inputCls} value={editing.audience} onChange={(e) => setEditing({ ...editing, audience: e.target.value })} placeholder="All users" /></FieldRow>
              <FieldRow label="Status">
                <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as CmsAnnouncement["status"] })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </FieldRow>
              {editing.status === "scheduled" && (
                <FieldRow label="Scheduled At"><input type="datetime-local" className={inputCls} value={editing.scheduledAt ?? ""} onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value || null })} /></FieldRow>
              )}
            </div>
          )}
          <DialogFooter className="gap-2"><CancelBtn onClick={() => setEditing(null)} /><SaveBtn onClick={save} /></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* MAIN CMS VIEW                                                        */
/* ─────────────────────────────────────────────────────────────────── */
const CMS_TABS: { id: CmsTab; label: string; icon: React.ElementType }[] = [
  { id: "features",      label: "Features",       icon: Zap },
  { id: "testimonials",  label: "Testimonials",   icon: Star },
  { id: "how-to",        label: "How It Works",   icon: BookOpen },
  { id: "stats",         label: "Stats Bar",      icon: Dumbbell },
  { id: "faqs",          label: "FAQs",           icon: MessageSquare },
  { id: "announcements", label: "Announcements",  icon: Megaphone },
];

export default function AdminCmsView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<CmsTab>("features");

  const renderTab = () => {
    switch (tab) {
      case "features":      return <FeaturesTab />;
      case "testimonials":  return <TestimonialsTab />;
      case "how-to":        return <HowToTab />;
      case "stats":         return <StatsTab />;
      case "faqs":          return <FaqsTab />;
      case "announcements": return <AnnouncementsTab />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border table-border table-bg px-4 py-2 text-[11px] font-bold text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Settings
        </button>
        <span className="text-[11px] text-slate-600">/</span>
        <span className="text-[11px] font-bold text-orange-400">CMS Management</span>
      </div>

      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Admin CMS</p>
        <h1 className="mt-1 text-[28px] font-black tracking-tight text-white">
          Content <span className="text-gradient-fire">Management</span>
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Changes go <span className="font-bold text-emerald-400">live immediately</span> on the home page — no refresh needed.
        </p>
      </div>

      {/* Sub-tab nav */}
      <div className="flex flex-wrap gap-2 border-b table-border pb-4">
        {CMS_TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all",
                isActive
                  ? "border-orange-500/40 bg-orange-500/15 text-orange-300"
                  : "table-border table-bg text-slate-400 hover:border-orange-500/20 hover:text-orange-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => { cmsStore.reset(); toast.success("Reset to defaults"); }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2 text-[11px] font-bold text-red-400 transition hover:bg-red-500/10"
        >
          <X className="h-3.5 w-3.5" /> Reset All
        </button>
      </div>

      {/* Tab content */}
      <div className="rounded-[22px] border table-border table-bg p-6">
        {renderTab()}
      </div>
    </div>
  );
}
