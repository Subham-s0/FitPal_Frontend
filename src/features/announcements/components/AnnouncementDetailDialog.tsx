import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import type { AnnouncementDetailResponse } from "@/features/announcements/model";
import { AnnouncementStatusBadge } from "@/features/announcements/components/AnnouncementStatusBadge";

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "Not set";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatAudience = (value: string) => value.replaceAll("_", " ").toLowerCase();

interface AnnouncementDetailDialogProps {
  open: boolean;
  announcement: AnnouncementDetailResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function AnnouncementDetailDialog({
  open,
  announcement,
  onOpenChange,
}: AnnouncementDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(820px,94vw)] border-white/10 bg-[#0f0f0f] text-white">
        {announcement ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{announcement.title}</DialogTitle>
              <DialogDescription className="text-white/55">
                {announcement.sourceType} • {formatAudience(announcement.audienceScope)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-400">Message</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">{announcement.content}</p>
              </div>

              <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-white/65">
                <div className="flex items-center gap-2">
                  <AnnouncementStatusBadge value={announcement.publishStatus} />
                  <AnnouncementStatusBadge value={announcement.reviewStatus} tone="review" />
                </div>
                <p><span className="text-white/35">Creator:</span> {announcement.creatorName ?? "Unknown"}</p>
                <p><span className="text-white/35">Scheduled:</span> {formatDate(announcement.scheduledAt)}</p>
                <p><span className="text-white/35">Published:</span> {formatDate(announcement.publishedAt)}</p>
                <p><span className="text-white/35">Expires:</span> {formatDate(announcement.expiresAt)}</p>
                <p><span className="text-white/35">Targets:</span> {announcement.targetAccounts.length || "All by audience"}</p>
                {announcement.rejectionReason ? (
                  <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.06] px-4 py-3 text-red-100/85">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-300">Rejection reason</p>
                    <p className="mt-2 leading-6">{announcement.rejectionReason}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
