import { type ElementType, type FC, useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Loader2,
  MessageSquareReply,
  MoreVertical,
  Pencil,
  RefreshCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { PublicGymReviewResponse } from "@/features/gyms/model";
import {
  deleteGymReviewReplyApi,
  getGymReviewAnalyticsApi,
  getGymReviewsApi,
  upsertGymReviewReplyApi,
} from "@/features/gym-dashboard/gym-reviews.api";
import type {
  GymReviewAnalyticsResponse,
  GymReviewSortMode,
  GymReviewRatingDistributionResponse,
} from "@/features/gym-dashboard/gym-reviews.model";
import AnalyticsPieChart from "@/features/gym-dashboard/components/AnalyticsPieChart";
import { getApiErrorMessage } from "@/shared/api/client";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
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
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const card =
  "rounded-2xl border table-border bg-[#121212] p-5 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]";
const tableCard =
  "overflow-hidden rounded-[18px] border table-border bg-[#121212] shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]";

const SORT_OPTIONS: { value: GymReviewSortMode; label: string }[] = [
  { value: "NEWEST", label: "Newest first" },
  { value: "OLDEST", label: "Oldest first" },
  { value: "NAME_A_Z", label: "Member A-Z" },
  { value: "NAME_Z_A", label: "Member Z-A" },
];

const RATING_OPTIONS = [
  { value: "ALL", label: "All stars" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
] as const;

const PAGE_SIZE = 10;

const toolbarButtonBase =
  "inline-flex h-[38px] items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform";
const toolbarButtonIdle =
  "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.05)] hover:scale-[1.02] active:scale-[0.98]";
const toolbarButtonActive =
  "bg-orange-500/10 text-orange-300 shadow-[inset_0_0_12px_rgba(249,115,22,0.12)]";
const dropdownPanelClass =
  "w-56 rounded-2xl border table-border bg-[#121212] p-2 text-white shadow-[0_16px_48px_rgba(0,0,0,0.6)]";
const dropdownLabelClass =
  "px-2 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400";
const dropdownRadioItemClass =
  "rounded-xl py-2 pl-3 pr-3 text-[12px] font-semibold text-zinc-300 focus:bg-white/[0.05] focus:text-white data-[state=checked]:bg-orange-500/10 data-[state=checked]:text-orange-300 [&>span]:hidden";

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

const avatarFallback = (name?: string | null) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
};

const getRatingDistribution = (
  rows: GymReviewRatingDistributionResponse[] | undefined
) =>
  [5, 4, 3, 2, 1].map((rating) => {
    const row = rows?.find((item) => item.rating === rating);
    return {
      rating,
      count: row?.count ?? 0,
      percentage: row?.percentage ?? 0,
    };
  });

const ReviewReplyBlock = ({ review }: { review: PublicGymReviewResponse }) => {
  if (!review.gymReply) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-orange-500/25 bg-[linear-gradient(160deg,rgba(249,115,22,0.12),rgba(17,17,17,0.96))] p-3.5 shadow-[inset_0_0_18px_rgba(249,115,22,0.12)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-orange-300">Gym reply</p>
        <p className="text-[11px] text-orange-100/75">{formatDate(review.gymReplyAt)}</p>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-orange-50">{review.gymReply}</p>
    </div>
  );
};

const RatingPips = ({ rating }: { rating: number | null }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={cn(
          "h-3.5 w-3.5",
          (rating ?? 0) >= star ? "fill-current text-orange-400" : "text-zinc-700"
        )}
      />
    ))}
  </div>
);

const ReviewMetricCard = ({
  label,
  value,
  sub,
  icon: Icon,
  borderClass,
  bgClass,
  iconClass,
  valueClass = "text-white",
  subClass = "text-zinc-500",
}: {
  label: string;
  value: string;
  sub: string;
  icon: ElementType;
  borderClass: string;
  bgClass: string;
  iconClass: string;
  valueClass?: string;
  subClass?: string;
}) => (
  <div
    className={cn(
      "flex h-full min-h-[102px] flex-col rounded-2xl border p-3.5 transition-all hover:border-white/20",
      borderClass,
      bgClass
    )}
  >
    <div className="flex min-w-0 items-center gap-2">
      <Icon className={cn("h-4 w-4 flex-shrink-0", iconClass)} />
      <p className="truncate text-[11px] font-black uppercase tracking-wider table-text-muted">{label}</p>
    </div>
    <div className="mt-2.5 flex min-h-[28px] items-center">
      <p className={cn("text-2xl font-black leading-none", valueClass)}>{value}</p>
    </div>
    <p className={cn("mt-1.5 text-[11px] font-medium", subClass)}>{sub}</p>
  </div>
);

const GymReviewsPage: FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState<(typeof RATING_OPTIONS)[number]["value"]>("ALL");
  const [sort, setSort] = useState<GymReviewSortMode>("NEWEST");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<PublicGymReviewResponse | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PublicGymReviewResponse | null>(null);
  const deferredQuery = useDeferredValue(query.trim());
  const currentSortLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Sort",
    [sort]
  );
  const currentRatingLabel = useMemo(
    () => RATING_OPTIONS.find((option) => option.value === rating)?.label ?? "Filter",
    [rating]
  );
  const hasToolbarFilters = query.trim().length > 0 || rating !== "ALL" || sort !== "NEWEST";

  const analyticsQ = useQuery({
    queryKey: ["gym-reviews", "analytics"],
    queryFn: getGymReviewAnalyticsApi,
  });

  const reviewsQ = useQuery({
    queryKey: ["gym-reviews", "list", page, deferredQuery, rating, sort],
    queryFn: () =>
      getGymReviewsApi({
        page,
        size: PAGE_SIZE,
        query: deferredQuery || undefined,
        rating: rating === "ALL" ? undefined : Number(rating),
        sort,
      }),
    placeholderData: (previous) => previous,
  });

  const invalidateReviews = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["gym-reviews", "analytics"] }),
      queryClient.invalidateQueries({ queryKey: ["gym-reviews", "list"] }),
    ]);
  };

  const upsertReplyMutation = useMutation({
    mutationFn: ({ reviewId, replyText }: { reviewId: number; replyText: string }) =>
      upsertGymReviewReplyApi(reviewId, { replyText }),
    onSuccess: async () => {
      toast.success(replyTarget?.gymReply ? "Reply updated" : "Reply posted");
      setReplyDialogOpen(false);
      setReplyTarget(null);
      setReplyDraft("");
      await invalidateReviews();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to save reply"));
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (reviewId: number) => deleteGymReviewReplyApi(reviewId),
    onSuccess: async () => {
      toast.success("Reply deleted");
      setDeleteTarget(null);
      await invalidateReviews();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to delete reply"));
    },
  });

  const analytics: GymReviewAnalyticsResponse | undefined = analyticsQ.data;
  const reviews = reviewsQ.data?.items ?? [];
  const distribution = useMemo(
    () => getRatingDistribution(analytics?.ratingDistribution),
    [analytics?.ratingDistribution]
  );

  const totalReviews = analytics?.totalReviews ?? 0;
  const averageRating = analytics?.averageRating;
  const positiveCount = analytics?.positiveCount ?? 0;
  const positivePercentage = analytics?.positivePercentage ?? 0;
  const needsAttentionCount = analytics?.needsAttentionCount ?? 0;
  const needsAttentionPercentage = analytics?.needsAttentionPercentage ?? 0;
  const unrepliedCount = analytics?.unrepliedCount ?? 0;
  const repliedRatePercentage = analytics?.repliedRatePercentage ?? 0;
  const repliedCount = Math.max(0, totalReviews - unrepliedCount);
  const neutralCount = Math.max(0, totalReviews - positiveCount - needsAttentionCount);
  const neutralPercentage =
    totalReviews > 0 ? Math.max(0, Math.round((neutralCount * 1000) / totalReviews) / 10) : 0;
  const replyPieData = useMemo(
    () => [
      {
        label: "Replied",
        value: repliedCount,
        color: "#22c55e",
        meta: `${repliedRatePercentage.toFixed(1)}% covered`,
      },
      {
        label: "Awaiting reply",
        value: unrepliedCount,
        color: "#f59e0b",
        meta:
          totalReviews > 0
            ? `${(100 - repliedRatePercentage).toFixed(1)}% pending`
            : "No review backlog",
      },
    ],
    [repliedCount, repliedRatePercentage, totalReviews, unrepliedCount]
  );
  const sentimentPieData = useMemo(
    () => [
      {
        label: "Positive",
        value: positiveCount,
        color: "#22c55e",
        meta: `${positivePercentage.toFixed(1)}% rated 4-5`,
      },
      {
        label: "Neutral",
        value: neutralCount,
        color: "#f59e0b",
        meta: `${neutralPercentage.toFixed(1)}% rated 2-3`,
      },
      {
        label: "Needs attention",
        value: needsAttentionCount,
        color: "#ef4444",
        meta: `${needsAttentionPercentage.toFixed(1)}% rated 1`,
      },
    ],
    [
      needsAttentionCount,
      needsAttentionPercentage,
      neutralCount,
      neutralPercentage,
      positiveCount,
      positivePercentage,
    ]
  );

  const openReplyDialog = (review: PublicGymReviewResponse) => {
    setReplyTarget(review);
    setReplyDraft(review.gymReply ?? "");
    setReplyDialogOpen(true);
  };

  const refreshAll = () => {
    void analyticsQ.refetch();
    void reviewsQ.refetch();
  };

  const clearToolbarFilters = () => {
    setPage(0);
    setQuery("");
    setRating("ALL");
    setSort("NEWEST");
  };

  const handleReplySubmit = async () => {
    if (!replyTarget) {
      return;
    }

    const normalizedReply = replyDraft.trim();
    if (!normalizedReply) {
      toast.error("Reply cannot be blank");
      return;
    }

    await upsertReplyMutation.mutateAsync({
      reviewId: replyTarget.reviewId,
      replyText: normalizedReply,
    });
  };

  return (
    <div className="max-w-[1600px] animate-fade-in space-y-5 font-['Outfit',system-ui,sans-serif]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Reviews &amp; <span style={fireStyle}>Feedback</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          className={cn(toolbarButtonBase, toolbarButtonIdle)}
        >
          <RefreshCcw className={cn("h-4 w-4", (analyticsQ.isFetching || reviewsQ.isFetching) && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <ReviewMetricCard
          label="Average Rating"
          value={averageRating == null ? "-" : averageRating.toFixed(1)}
          sub={totalReviews > 0 ? `${totalReviews} total reviews` : "No reviews yet"}
          icon={Star}
          borderClass="border-orange-500/25"
          bgClass="bg-orange-500/[0.06]"
          iconClass="text-orange-400"
          valueClass="text-orange-400"
          subClass="text-orange-400"
        />
        <ReviewMetricCard
          label="Positive Reviews"
          value={String(positiveCount)}
          sub={`${positivePercentage.toFixed(1)}% rated 4-5`}
          icon={Sparkles}
          borderClass="border-emerald-500/25"
          bgClass="bg-emerald-500/[0.06]"
          iconClass="text-emerald-400"
          subClass="text-emerald-400"
        />
        <ReviewMetricCard
          label="Needs Attention"
          value={String(needsAttentionCount)}
          sub={`${needsAttentionPercentage.toFixed(1)}% rated 1 star`}
          icon={ShieldAlert}
          borderClass="border-red-500/25"
          bgClass="bg-red-500/[0.06]"
          iconClass="text-red-400"
          subClass="text-red-400"
        />
        <ReviewMetricCard
          label="Reply Rate"
          value={`${repliedRatePercentage.toFixed(1)}%`}
          sub={`${repliedCount} replied reviews`}
          icon={MessageSquareReply}
          borderClass="border-emerald-500/25"
          bgClass="bg-emerald-500/[0.06]"
          iconClass="text-emerald-400"
          subClass={repliedRatePercentage < 50 && totalReviews > 0 ? "text-amber-400" : "text-emerald-400"}
        />
        <ReviewMetricCard
          label="Awaiting Reply"
          value={String(unrepliedCount)}
          sub={unrepliedCount > 0 ? "Reviews still need a response" : "Inbox cleared"}
          icon={MessageSquareReply}
          borderClass="border-amber-500/25"
          bgClass="bg-amber-500/[0.06]"
          iconClass="text-amber-400"
          subClass={unrepliedCount > 0 ? "text-amber-400" : "text-zinc-500"}
        />
        <ReviewMetricCard
          label="Total Reviews"
          value={String(totalReviews)}
          sub={totalReviews > 0 ? "All member ratings collected" : "No reviews yet"}
          icon={UserRound}
          borderClass="border-violet-500/25"
          bgClass="bg-violet-500/[0.06]"
          iconClass="text-violet-300"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className={card}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-zinc-400">Distribution</p>
              <h2 className="mt-1 text-[22px] font-black text-white">Star breakdown</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] font-bold table-text-muted">
              Based on {totalReviews} reviews
            </div>
          </div>
          <div className="space-y-3">
            {distribution.map((row) => (
              <div key={row.rating} className="flex items-center gap-3">
                <div className="flex w-14 items-center gap-1 text-[12px] font-bold text-zinc-200">
                  <span>{row.rating}</span>
                  <Star className="h-3.5 w-3.5 fill-current text-orange-400" />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${row.percentage}%`,
                      background:
                        row.rating >= 4 ? "#22c55e" : row.rating === 3 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                <div className="w-14 text-right text-[12px] font-bold text-white">{row.count}</div>
                <div className="w-16 text-right text-[12px] text-zinc-400">{row.percentage.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-zinc-400">Response Health</p>
              <h2 className="mt-1 text-[22px] font-black text-white">Reply coverage</h2>
            </div>
            <MessageSquareReply className="h-5 w-5 text-emerald-400" />
          </div>
          <AnalyticsPieChart
            className="pt-1"
            data={replyPieData}
            centerLabel={`${repliedRatePercentage.toFixed(0)}%`}
            centerSubLabel="reply rate"
            emptyLabel="No replies"
          />
        </section>

        <section className={card}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-zinc-400">Sentiment Mix</p>
              <h2 className="mt-1 text-[22px] font-black text-white">Review posture</h2>
            </div>
            <ShieldAlert className="h-5 w-5 text-red-400" />
          </div>
          <AnalyticsPieChart
            className="pt-1"
            data={sentimentPieData}
            centerLabel={averageRating == null ? "-" : averageRating.toFixed(1)}
            centerSubLabel="avg rating"
            emptyLabel="No sentiment"
          />
        </section>
      </div>

      <section className={tableCard}>
        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.14em] text-zinc-400">All Reviews</p>
            <h2 className="mt-1 text-[22px] font-black text-white">Searchable feedback feed</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(event) => {
                  setPage(0);
                  setQuery(event.target.value);
                }}
                placeholder="Search member or comment..."
                className="h-[40px] rounded-full border border-white/10 bg-white/[0.03] pl-9 text-[13px] text-white placeholder:table-text-muted focus-visible:ring-orange-500/30"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(toolbarButtonBase, sort !== "NEWEST" ? toolbarButtonActive : toolbarButtonIdle)}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sort === "NEWEST" ? "Sort" : currentSortLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className={dropdownPanelClass}>
                <DropdownMenuLabel className={dropdownLabelClass}>Sort reviews</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) => {
                    setPage(0);
                    setSort(value as GymReviewSortMode);
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className={dropdownRadioItemClass}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(toolbarButtonBase, rating !== "ALL" ? toolbarButtonActive : toolbarButtonIdle)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {rating === "ALL" ? "Filter" : currentRatingLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className={dropdownPanelClass}>
                <DropdownMenuLabel className={dropdownLabelClass}>Filter by rating</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={rating}
                  onValueChange={(value) => {
                    setPage(0);
                    setRating(value as (typeof RATING_OPTIONS)[number]["value"]);
                  }}
                >
                  {RATING_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className={dropdownRadioItemClass}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {rating !== "ALL" ? (
                  <>
                    <DropdownMenuSeparator className="my-2 bg-white/10" />
                    <DropdownMenuItem
                      onSelect={() => {
                        setPage(0);
                        setRating("ALL");
                      }}
                      className="rounded-xl py-2 pl-3 pr-3 text-[12px] font-semibold text-zinc-300 focus:bg-white/[0.05] focus:text-white"
                    >
                      Clear rating filter
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              disabled={!hasToolbarFilters}
              onClick={clearToolbarFilters}
              className={cn(
                toolbarButtonBase,
                "hover:border-orange-500/30 hover:text-orange-400",
                hasToolbarFilters ? toolbarButtonActive : toolbarButtonIdle + " opacity-50"
              )}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] px-5 py-3 text-[12px] table-text-muted">
          <p>
            Showing {reviews.length} of {reviewsQ.data?.totalItems ?? 0} reviews
          </p>
          {reviewsQ.isFetching && !reviewsQ.isLoading ? (
            <div className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating
            </div>
          ) : null}
        </div>

        <div className="px-5 pb-5">
          {reviewsQ.isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border table-border-row bg-white/[0.02]">
              <div className="inline-flex items-center gap-2 text-sm table-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading reviews...
              </div>
            </div>
          ) : reviewsQ.isError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-[12px] text-red-200">
              {getApiErrorMessage(reviewsQ.error, "Failed to load reviews")}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border table-border-row bg-white/[0.02] p-6 text-center">
              <p className="text-sm font-bold text-white">No reviews found.</p>
              <p className="mt-1 text-[12px] table-text-muted">
                Try a different member name, comment keyword, rating, or sort order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.reviewId}
                  className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 transition-all hover:border-white/[0.12] hover:bg-[#161616]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar className="h-10 w-10 rounded-full border border-white/10">
                        <AvatarImage src={review.reviewerAvatarUrl ?? undefined} alt={review.reviewerName ?? "Member"} className="object-cover" />
                        <AvatarFallback className="rounded-full bg-white/[0.06] text-[11px] font-black text-zinc-300">
                          {avatarFallback(review.reviewerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[17px] font-black text-white">
                            {review.reviewerName ?? "FitPal Member"}
                          </p>
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-bold table-text-muted">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                          <RatingPips rating={review.rating} />
                          <span className="text-[12px] table-text-muted">
                            {review.rating == null ? "No rating" : `${review.rating}/5`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {review.gymReply ? (
                        <span className="rounded-full border border-orange-500/20 bg-orange-500/[0.09] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-orange-300">
                          Replied
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">
                          Awaiting reply
                        </span>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="Review actions"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 border table-border bg-[#121212] text-white">
                          <DropdownMenuItem
                            onClick={() => openReplyDialog(review)}
                            className="cursor-pointer gap-2 text-zinc-300 focus:bg-white/[0.06] focus:text-white"
                          >
                            {review.gymReply ? <Pencil className="h-4 w-4" /> : <MessageSquareReply className="h-4 w-4" />}
                            {review.gymReply ? "Edit reply" : "Reply"}
                          </DropdownMenuItem>
                          {review.gymReply ? (
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(review)}
                              className="cursor-pointer gap-2 text-red-300 focus:bg-red-500/10 focus:text-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete reply
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">
                    <p className="text-[13px] leading-relaxed text-zinc-300">
                      {review.comments ?? "No comment provided."}
                    </p>
                  </div>

                  <ReviewReplyBlock review={review} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.08] px-5 py-4">
          <p className="text-[12px] table-text-muted">
            Page {(reviewsQ.data?.page ?? 0) + 1} of {Math.max(reviewsQ.data?.totalPages ?? 1, 1)}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={cn(toolbarButtonBase, toolbarButtonIdle, "h-auto px-3.5 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-40")}
              disabled={!(reviewsQ.data?.hasPrevious ?? false)}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Prev
            </button>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold text-white">
              {(reviewsQ.data?.page ?? 0) + 1}
            </span>
            <button
              type="button"
              className={cn(toolbarButtonBase, toolbarButtonIdle, "h-auto px-3.5 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-40")}
              disabled={!(reviewsQ.data?.hasNext ?? false)}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <Dialog
        open={replyDialogOpen}
        onOpenChange={(open) => {
          if (upsertReplyMutation.isPending) {
            return;
          }
          setReplyDialogOpen(open);
          if (!open) {
            setReplyTarget(null);
            setReplyDraft("");
          }
        }}
      >
        <DialogContent className="max-w-2xl border table-border bg-[#121212] text-white">
          <DialogHeader>
            <DialogTitle>{replyTarget?.gymReply ? "Edit gym reply" : "Reply to review"}</DialogTitle>
            <DialogDescription className="table-text-muted">
              Keep the reply concise, professional, and specific to the member&apos;s feedback.
            </DialogDescription>
          </DialogHeader>

          {replyTarget ? (
            <div className="space-y-4">
              <div className="rounded-2xl border table-border-row bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-black text-white">{replyTarget.reviewerName ?? "FitPal Member"}</p>
                    <p className="mt-1 text-[12px] table-text-muted">{formatDate(replyTarget.createdAt)}</p>
                  </div>
                  <RatingPips rating={replyTarget.rating} />
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-zinc-300">
                  {replyTarget.comments ?? "No comment provided."}
                </p>
                {replyTarget.gymReply ? (
                  <div className="mt-3 rounded-xl border border-orange-500/25 bg-[linear-gradient(160deg,rgba(249,115,22,0.12),rgba(17,17,17,0.96))] p-3.5 shadow-[inset_0_0_18px_rgba(249,115,22,0.12)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-300">Current reply</p>
                    <p className="mt-1.5 text-[13px] text-orange-50">{replyTarget.gymReply}</p>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-[12px] font-black uppercase tracking-[0.12em] text-zinc-400">
                    Your reply
                  </label>
                  <span className="text-[12px] table-text-muted">{replyDraft.length}/2000</span>
                </div>
                <Textarea
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  maxLength={2000}
                  rows={6}
                  placeholder="Thank the member, acknowledge the feedback, and explain any action you are taking."
                  className="border-white/10 bg-white/[0.03] text-[13px] text-white placeholder:table-text-muted focus-visible:ring-orange-500/30"
                />
                {upsertReplyMutation.isError ? (
                  <p className="mt-2 text-[11px] text-red-300">
                    {getApiErrorMessage(upsertReplyMutation.error, "Failed to save reply")}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setReplyDialogOpen(false);
                setReplyTarget(null);
                setReplyDraft("");
              }}
              className={cn(toolbarButtonBase, toolbarButtonIdle, "h-auto px-4 py-2 text-[12px]")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleReplySubmit()}
              disabled={upsertReplyMutation.isPending || !replyDraft.trim()}
              className={cn(
                toolbarButtonBase,
                toolbarButtonActive,
                "h-auto justify-center gap-2 px-4 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {upsertReplyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareReply className="h-4 w-4" />}
              {replyTarget?.gymReply ? "Save reply" : "Post reply"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border table-border bg-[#121212] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete gym reply</AlertDialogTitle>
            <AlertDialogDescription className="table-text-muted">
              This removes the reply from the review card. The member review itself will stay visible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteReplyMutation.isPending || !deleteTarget}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) {
                  return;
                }
                void deleteReplyMutation.mutateAsync(deleteTarget.reviewId);
              }}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              {deleteReplyMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete reply"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GymReviewsPage;
