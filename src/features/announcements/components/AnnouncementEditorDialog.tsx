import { Loader2, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { CustomDatePicker } from "@/shared/ui/CustomDatePicker";
import { TimeInput } from "@/shared/ui/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type {
  AnnouncementAudienceScope,
  AnnouncementVisibilityScope,
} from "@/features/announcements/model";

const getDatePart = (dt: string) => (dt ? dt.split("T")[0] : "");
const getTimePart = (dt: string) => (dt && dt.includes("T") ? dt.split("T")[1] : "");
const combineDatetime = (date: string, time: string) => {
  if (!date) return "";
  return time ? `${date}T${time}` : date;
};

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (dt: string) => void;
}) {
  const datePart = getDatePart(value);
  const timePart = getTimePart(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getFullYear() + 10, 11, 31);

  return (
    <div className="space-y-2.5">
      <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-orange-400">
        {label}
      </span>
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date</p>
        <CustomDatePicker
          value={datePart}
          onChange={(d) => onChange(combineDatetime(d, timePart))}
          placeholder="Pick date"
          minDate={today}
          maxDate={maxDate}
          nestedInDialog
        />
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Time</p>
        <TimeInput
          className="w-full"
          value={timePart}
          style={{ colorScheme: "dark" }}
          onChange={(e) => onChange(combineDatetime(datePart, (e.target as HTMLInputElement).value))}
        />
      </div>
    </div>
  );
}

export interface AnnouncementTargetOption {
  accountId: number;
  displayName: string;
  secondaryLine: string;
  role: "USER" | "GYM" | "SUPERADMIN";
}

export interface AnnouncementEditorBaseValue {
  title: string;
  content: string;
  scheduledAt: string;
  expiresAt: string;
}

export interface AdminAnnouncementEditorValue extends AnnouncementEditorBaseValue {
  audienceScope: AnnouncementAudienceScope;
  visibilityScope: AnnouncementVisibilityScope;
  selectedTargets: AnnouncementTargetOption[];
}

export type GymAnnouncementEditorValue = AnnouncementEditorBaseValue;

interface CommonAnnouncementEditorDialogProps<TValue extends AnnouncementEditorBaseValue> {
  open: boolean;
  editing: boolean;
  value: TValue;
  onOpenChange: (open: boolean) => void;
  onChange: (next: TValue) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

interface AdminAnnouncementEditorDialogProps
  extends CommonAnnouncementEditorDialogProps<AdminAnnouncementEditorValue> {
  mode: "admin";
  targetSearchValue: string;
  onTargetSearchChange: (value: string) => void;
  targetRoleFilter: "USER" | "GYM" | undefined;
  onTargetRoleFilterChange: (value: "USER" | "GYM" | undefined) => void;
  targetSearchLoading: boolean;
  availableTargets: AnnouncementTargetOption[];
}

interface GymAnnouncementEditorDialogProps
  extends CommonAnnouncementEditorDialogProps<GymAnnouncementEditorValue> {
  mode: "gym";
}

type AnnouncementEditorDialogProps =
  | AdminAnnouncementEditorDialogProps
  | GymAnnouncementEditorDialogProps;

const audienceOptions: { label: string; value: AnnouncementAudienceScope; description: string }[] = [
  { label: "All users", value: "ALL_USERS", description: "Send to every member account." },
  { label: "All gyms", value: "ALL_GYMS", description: "Send to every gym owner account." },
  { label: "Specific accounts", value: "SPECIFIC_ACCOUNTS", description: "Choose exact accounts manually." },
];

const visibilityOptions: { label: string; value: AnnouncementVisibilityScope }[] = [
  { label: "In app only", value: "IN_APP" },
  { label: "Future public", value: "PUBLIC" },
  { label: "Both", value: "BOTH" },
];

function isAdminEditor(
  props: AnnouncementEditorDialogProps
): props is AdminAnnouncementEditorDialogProps {
  return props.mode === "admin";
}

export function AnnouncementEditorDialog(props: AnnouncementEditorDialogProps) {
  const { mode, open, editing, value, onOpenChange, onChange, onSubmit, isSubmitting } = props;
  const adminProps = isAdminEditor(props) ? props : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(900px,94vw)] border-white/10 bg-[#0f0f0f] text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            {editing ? "Edit announcement" : "Create announcement"}
          </DialogTitle>
          <DialogDescription className="text-white/55">
            {mode === "admin"
              ? "Draft now, then publish immediately or schedule it for later."
              : "Create a gym announcement draft and submit it for admin review."}
          </DialogDescription>
        </DialogHeader>

        <div className={cn("grid gap-5", mode === "admin" ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "")}>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-orange-400">Title</span>
              <input
                value={value.title}
                onChange={(event) => onChange({ ...value, title: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
                placeholder="Title your announcement"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-orange-400">Message</span>
              <textarea
                value={value.content}
                onChange={(event) => onChange({ ...value, content: event.target.value })}
                rows={10}
                className="w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white outline-none"
                placeholder="Write the full announcement body"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <DateTimeField
                  label="Scheduled publish"
                  value={value.scheduledAt}
                  onChange={(dt) => onChange({ ...value, scheduledAt: dt })}
                />
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <DateTimeField
                  label="Expires at"
                  value={value.expiresAt}
                  onChange={(dt) => onChange({ ...value, expiresAt: dt })}
                />
              </div>
            </div>
          </div>

          {adminProps ? (
            <div className="space-y-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-400">Audience</p>
                <div className="mt-3 space-y-2">
                  {audienceOptions.map((option) => {
                    const active = adminProps.value.audienceScope === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => adminProps.onChange({ ...adminProps.value, audienceScope: option.value })}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition",
                          active
                            ? "border-orange-500/35 bg-orange-500/[0.10] text-white"
                            : "border-white/8 bg-white/[0.02] text-white/65 hover:border-white/16 hover:text-white"
                        )}
                      >
                        <p className="text-sm font-black">{option.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/50">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-400">Visibility</p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => adminProps.onChange({ ...adminProps.value, visibilityScope: option.value })}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left text-sm font-black transition",
                        adminProps.value.visibilityScope === option.value
                          ? "border-orange-500/35 bg-orange-500/[0.10] text-white"
                          : "border-white/8 bg-white/[0.02] text-white/60 hover:border-white/16 hover:text-white"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {adminProps.value.audienceScope === "SPECIFIC_ACCOUNTS" ? (
                <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <Search className="h-4 w-4 text-white/35" />
                    <input
                      value={adminProps.targetSearchValue}
                      onChange={(event) => adminProps.onTargetSearchChange(event.target.value)}
                      placeholder="Search accounts"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                    />
                  </div>

                  <Select
                    value={adminProps.targetRoleFilter ?? "ALL"}
                    onValueChange={(v) =>
                      adminProps.onTargetRoleFilterChange(
                        (v === "ALL" ? undefined : v) as "USER" | "GYM" | undefined
                      )
                    }
                  >
                    <SelectTrigger className="mt-3 h-[42px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white focus:ring-orange-500/30 focus:ring-offset-0 [&>svg]:text-zinc-400">
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-white/10 bg-[#111111] text-white shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                      <SelectItem value="ALL" className="rounded-xl text-[13px] text-zinc-300 focus:bg-white/[0.06] focus:text-white">All roles</SelectItem>
                      <SelectItem value="USER" className="rounded-xl text-[13px] text-zinc-300 focus:bg-white/[0.06] focus:text-white">Users only</SelectItem>
                      <SelectItem value="GYM" className="rounded-xl text-[13px] text-zinc-300 focus:bg-white/[0.06] focus:text-white">Gyms only</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {adminProps.value.selectedTargets.map((target) => (
                      <span
                        key={target.accountId}
                        className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-orange-100"
                      >
                        {target.displayName}
                        <button
                          type="button"
                          onClick={() =>
                            adminProps.onChange({
                              ...adminProps.value,
                              selectedTargets: adminProps.value.selectedTargets.filter(
                                (selected) => selected.accountId !== target.accountId
                              ),
                            })
                          }
                          className="text-orange-200/80 hover:text-white"
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    {adminProps.targetSearchLoading ? (
                      <div className="flex items-center gap-2 text-sm text-white/50">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading accounts
                      </div>
                    ) : adminProps.availableTargets.length ? (
                      adminProps.availableTargets.map((account) => (
                        <button
                          key={account.accountId}
                          type="button"
                          onClick={() =>
                            adminProps.onChange({
                              ...adminProps.value,
                              selectedTargets: [...adminProps.value.selectedTargets, account],
                            })
                          }
                          className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-white/16 hover:bg-white/[0.05]"
                        >
                          <div>
                            <p className="text-sm font-black text-white">{account.displayName}</p>
                            <p className="mt-1 text-xs text-white/45">{account.secondaryLine}</p>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-300">
                            {account.role}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-white/45">
                        Search results will appear here. Selected accounts receive the announcement only once.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/60 transition hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.12] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100 transition hover:border-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-45"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save draft
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
