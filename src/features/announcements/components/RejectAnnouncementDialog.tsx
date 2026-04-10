import { Loader2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import type { AnnouncementSummaryResponse } from "@/features/announcements/model";

interface RejectAnnouncementDialogProps {
  open: boolean;
  target: AnnouncementSummaryResponse | null;
  reason: string;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export function RejectAnnouncementDialog({
  open,
  target,
  reason,
  isSubmitting,
  onReasonChange,
  onOpenChange,
  onSubmit,
}: RejectAnnouncementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(560px,92vw)] border-white/10 bg-[#0f0f0f] text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Reject gym announcement</DialogTitle>
          <DialogDescription className="text-white/55">
            Explain the reason clearly so the gym can edit and resubmit without guesswork.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-400">Target</p>
            <p className="mt-2 text-lg font-black text-white">{target?.title}</p>
          </div>

          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={6}
            className="w-full rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white outline-none"
            placeholder="State what needs to be changed before approval"
          />
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/60 transition hover:border-white/20 hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!reason.trim() || isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/20 bg-red-500/[0.10] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-100 transition hover:border-red-500 hover:bg-red-500 hover:text-white disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Reject announcement
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
