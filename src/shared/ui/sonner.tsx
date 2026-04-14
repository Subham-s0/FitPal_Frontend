import { useEffect, useState } from "react";
import { Toaster as Sonner, toast } from "sonner";

/** Switches position based on screen width — top-center on desktop, top-right on mobile. */
function useToastPosition(): "top-center" | "top-right" {
  const [position, setPosition] = useState<"top-center" | "top-right">(() =>
    typeof window !== "undefined" && window.innerWidth < 768
      ? "top-right"
      : "top-center"
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) =>
      setPosition(e.matches ? "top-right" : "top-center");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return position;
}

const Toaster = () => {
  const position = useToastPosition();
  const isMobile = position === "top-right";

  return (
    <Sonner
      position={position}
      style={{ zIndex: 9999 }}
      offset={isMobile ? { top: 96 } : { top: 100 }}
      richColors={false}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: [
            "group !rounded-2xl !border !border-white/[0.08] !bg-[#111111]",
            "!text-white !shadow-[0_16px_48px_rgba(0,0,0,0.6)]",
            "!backdrop-blur-sm !p-4 !gap-3 !text-sm !font-medium",
            isMobile ? "!w-fit !max-w-[280px] !ml-auto !mr-4" : ""
          ].join(" "),
          title: "!font-semibold !text-sm !text-white",
          description: "!text-xs !text-slate-400 !leading-relaxed",
          closeButton:
            "!border-white/10 !bg-white/[0.04] !text-slate-400 hover:!text-white hover:!bg-white/[0.08]",
          actionButton:
            "!rounded-xl !bg-[linear-gradient(135deg,#FF6A00,#FF9500)] !text-[10px] !font-black !uppercase !tracking-[0.08em] !text-white !border-none",
          cancelButton:
            "!rounded-xl !border !border-white/10 !bg-white/[0.04] !text-[10px] !font-black !uppercase !tracking-[0.08em] !text-slate-300",
          success:
            "!border-emerald-500/25 !bg-emerald-500/[0.07] [&_[data-icon]]:!text-emerald-400",
          error:
            "!border-red-500/25 !bg-red-500/[0.07] [&_[data-icon]]:!text-red-400",
          warning:
            "!border-amber-500/25 !bg-amber-500/[0.07] [&_[data-icon]]:!text-amber-400",
          info:
            "!border-blue-500/25 !bg-blue-500/[0.07] [&_[data-icon]]:!text-blue-400",
        },
      }}
    />
  );
};

export { Toaster, toast };
