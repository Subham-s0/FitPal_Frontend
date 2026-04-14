import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const PageLoadingState = ({
  label = "Loading...",
  className,
}: {
  label?: string;
  className?: string;
}) => (
  <div className={cn("flex flex-1 items-center justify-center", className)}>
    <div className="inline-flex items-center gap-3 text-sm font-medium text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
      <span>{label}</span>
    </div>
  </div>
);

export const InlineLoadingState = ({
  label = "Loading...",
  className,
}: {
  label?: string;
  className?: string;
}) => (
  <div className={cn("inline-flex items-center gap-2 text-xs text-slate-400", className)}>
    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
    <span>{label}</span>
  </div>
);

export const PageErrorState = ({
  title,
  message,
  action,
  className,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-1 items-center justify-center px-6", className)}>
    <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
      <p className="text-sm font-bold text-red-200">{title}</p>
      <p className="mt-2 text-xs text-slate-400">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  </div>
);

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-14 text-center",
      className,
    )}
  >
    {icon ? <div className="mx-auto mb-4 flex justify-center text-orange-400">{icon}</div> : null}
    <p className="text-lg font-black text-white">{title}</p>
    <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export const TableStateRow = ({
  colSpan,
  label,
  loading = false,
}: {
  colSpan: number;
  label: string;
  loading?: boolean;
}) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-400">
      {loading ? (
        <div className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span>{label}</span>
        </div>
      ) : (
        label
      )}
    </td>
  </tr>
);
