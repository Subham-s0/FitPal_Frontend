import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface UserSectionShellProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: "default" | "wide" | "full";
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  titleClassName?: string;
}

const WIDTH_CLASS_NAMES = {
  default: "max-w-7xl",
  wide: "max-w-[1400px]",
  full: "max-w-none",
} as const;

const UserSectionShell = ({
  eyebrow,
  title,
  description,
  actions,
  children,
  width = "default",
  className,
  headerClassName,
  bodyClassName,
  titleClassName,
}: UserSectionShellProps) => {
  return (
    <section className={cn("mx-auto w-full", WIDTH_CLASS_NAMES[width], className)}>
      <header
        className={cn(
          "mb-6 flex flex-col gap-4 md:mb-8 lg:flex-row lg:items-end lg:justify-between",
          headerClassName
        )}
      >
        <div className="space-y-2">
          {eyebrow ? (
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-orange-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-600">
                {eyebrow}
              </span>
            </div>
          ) : null}
          <h1
            className={cn(
              "text-3xl font-black uppercase leading-none tracking-tight text-white md:text-4xl",
              titleClassName
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-[10px] font-black uppercase leading-[1.6] tracking-[0.18em] text-slate-500 md:text-[11px]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </header>

      <div className={cn("space-y-6", bodyClassName)}>{children}</div>
    </section>
  );
};

export default UserSectionShell;
