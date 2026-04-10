import { cn } from "@/shared/lib/utils";
import type {
  AnnouncementPublishStatus,
  AnnouncementReviewStatus,
} from "@/features/announcements/model";

interface AnnouncementStatusBadgeProps {
  value: AnnouncementPublishStatus | AnnouncementReviewStatus;
  tone?: "publish" | "review";
}

const BADGE_STYLES: Record<string, string> = {
  DRAFT: "border-white/10 bg-white/[0.05] text-white/70",
  SCHEDULED: "border-sky-500/20 bg-sky-500/[0.08] text-sky-300",
  PUBLISHED: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300",
  CANCELLED: "border-zinc-500/20 bg-zinc-500/[0.08] text-zinc-300",
  EXPIRED: "border-zinc-500/20 bg-zinc-500/[0.08] text-zinc-400",
  NOT_REQUIRED: "border-orange-500/20 bg-orange-500/[0.08] text-orange-300",
  NOT_SUBMITTED: "border-white/10 bg-white/[0.05] text-white/70",
  PENDING: "border-amber-500/20 bg-amber-500/[0.08] text-amber-300",
  APPROVED: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300",
  REJECTED: "border-red-500/20 bg-red-500/[0.08] text-red-300",
};

const formatLabel = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AnnouncementStatusBadge({ value, tone = "publish" }: AnnouncementStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
        BADGE_STYLES[value],
        tone === "review" ? "min-w-[112px] justify-center" : ""
      )}
    >
      {formatLabel(value)}
    </span>
  );
}
