import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { resolveAvatarUrl } from "@/shared/lib/avatar";

export const DashboardBrandLink = ({
  href,
  badgeLabel,
  showBadge = false,
  logoClassName,
  className,
}: {
  href: string;
  badgeLabel?: string;
  showBadge?: boolean;
  logoClassName?: string;
  className?: string;
}) => (
  <a
    href={href}
    className={cn("group flex shrink-0 items-center gap-2 no-underline transition-opacity hover:opacity-90", className)}
  >
    <img
      src="/logo.svg"
      alt="FitPal Logo"
      className={cn("h-10 w-10 shrink-0 md:h-12 md:w-12", logoClassName)}
    />
    <div className="flex items-center gap-2">
      <span className="text-xl font-bold text-white md:text-2xl">
        <span className="text-gradient-fire">Fit</span>Pal
      </span>
      {showBadge && badgeLabel ? (
        <span className="hidden rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/80 sm:inline-flex">
          {badgeLabel}
        </span>
      ) : null}
    </div>
  </a>
);

export const DashboardIdentityButton = ({
  displayName,
  metaLabel,
  primaryImageUrl,
  email,
  role,
  fallbackBackground,
  onClick,
  showText = true,
  avatarClassName,
  className,
}: {
  displayName: string;
  metaLabel?: string;
  primaryImageUrl?: string | null;
  email?: string | null;
  role?: string | null;
  fallbackBackground?: string;
  onClick: () => void;
  showText?: boolean;
  avatarClassName?: string;
  className?: string;
}) => {
  const [photoBroken, setPhotoBroken] = useState(false);

  useEffect(() => {
    setPhotoBroken(false);
  }, [primaryImageUrl]);

  const avatarUrl = resolveAvatarUrl({
    primaryUrl: !photoBroken ? primaryImageUrl : null,
    displayName,
    email,
    role,
    background: fallbackBackground,
  });

  return (
    <button
      type="button"
      className={cn("flex items-center gap-3 transition-opacity hover:opacity-80", className)}
      onClick={onClick}
    >
      {showText ? (
        <div className="hidden text-right leading-none text-white sm:block">
          <p className="text-sm font-black tracking-tight">{displayName}</p>
          {metaLabel ? (
            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-orange-600">
              {metaLabel}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className={cn("h-12 w-12 shrink-0 rounded-full border-2 border-orange-600 p-0.5", avatarClassName)}>
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-full w-full rounded-full object-cover"
          onError={() => {
            if (primaryImageUrl) {
              setPhotoBroken(true);
            }
          }}
        />
      </div>
    </button>
  );
};

export const DashboardSidebarNavButton = ({
  icon: Icon,
  label,
  active,
  expanded,
  danger = false,
  onClick,
}: {
  icon: ElementType;
  label: string;
  active?: boolean;
  expanded: boolean;
  danger?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group/link flex w-full items-center p-3 transition-all",
      expanded ? "justify-start rounded-2xl" : "justify-center rounded-full",
      danger ? "hover:bg-red-500/25" : "hover:bg-orange-600",
      active && !danger ? "bg-orange-600" : "",
    )}
  >
    <Icon
      className={cn(
        "h-6 w-6 min-w-[24px] transition-colors",
        danger
          ? "text-red-400 group-hover/link:text-white"
          : active
            ? "text-white"
            : "text-[var(--text-sidebar)]",
      )}
    />
    <span
      className={cn(
        "ml-4 whitespace-nowrap text-[13px] font-bold leading-none transition-all",
        expanded ? "block opacity-100" : "hidden opacity-0",
        danger
          ? "text-[var(--text-sidebar)] group-hover/link:text-white"
          : active
            ? "text-white"
            : "text-[var(--text-sidebar)]",
      )}
    >
      {label}
    </span>
  </button>
);

export const DashboardGridBackdrop = ({
  children,
  className,
  contentClassName,
  showGrid = true,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showGrid?: boolean;
}) => (
  <main
    className={cn("relative min-w-0 overflow-y-auto overflow-x-hidden", className)}
    style={{
      background:
        "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(234,88,12,0.05) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 50% 15%, rgba(234,88,12,0.04) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 85%, rgba(234,88,12,0.04) 0%, transparent 60%), #050505",
    }}
  >
    {showGrid ? (
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(234,88,12,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(234,88,12,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    ) : null}
    <div className={cn("relative z-10", contentClassName)}>{children}</div>
  </main>
);
