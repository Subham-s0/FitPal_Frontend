import type { InputHTMLAttributes, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "@/components/DashboardNavbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { cn } from "@/lib/utils";

export interface StepDefinition {
  id: string;
  label: string;
  titlePrefix: string;
  titleAccent: string;
  subtitle: string;
}

export const CheckIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 13 13" aria-hidden="true">
    <path
      d="M2 6.5l3.5 3.5 5.5-6"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-0.5 text-[11px] text-red-500">{message}</p> : null;

export const SectionLabel = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => (
  <div
    className={cn(
      "mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600",
      className,
    )}
  >
    <span>{children}</span>
    <span className="h-px flex-1 bg-orange-600/20" />
  </div>
);

export const Field = ({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={cn("flex flex-col gap-1", className)}>
    <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
      {label}
    </label>
    {children}
    <FieldError message={error} />
  </div>
);

export const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      "w-full rounded-2xl border border-white/8 bg-[#0a0a0a] px-4 py-2.5",
      "text-sm font-medium text-white outline-none transition-all",
      "placeholder:text-slate-700",
      "focus:border-orange-600/60 focus:shadow-[0_0_0_3px_rgba(234,88,12,0.06)]",
      "disabled:cursor-not-allowed disabled:text-slate-600",
      props.className,
    )}
  />
);

export const Pill = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-full border px-4 py-2 text-xs font-semibold transition-all",
      selected
        ? "border-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 font-bold text-black shadow-[0_4px_14px_rgba(234,88,12,0.25)]"
        : "border-white/10 bg-[#0a0a0a] text-slate-400 hover:border-orange-600/40 hover:text-white",
    )}
  >
    {label}
  </button>
);

interface SetupActionsProps {
  nextLabel: string;
  stepIndex: number;
  totalSteps: number;
  busy: boolean;
  onNext: () => void;
  onBack: () => void;
  hideBack?: boolean;
  hideNext?: boolean;
  busyLabel?: string;
}

export const SetupActions = ({
  nextLabel,
  stepIndex,
  totalSteps,
  busy,
  onNext,
  onBack,
  hideBack = false,
  hideNext = false,
  busyLabel = "Saving...",
}: SetupActionsProps) => (
  <div className="mt-5 flex items-center justify-between border-t border-white/6 pt-4 max-sm:flex-col-reverse max-sm:gap-3">
    {hideBack ? (
      <span />
    ) : (
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-white disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span>Back</span>
      </button>
    )}
    <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-600">
        Step {stepIndex + 1} of {totalSteps}
      </span>
      {!hideNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={busy}
          className={cn(
            "rounded-full border-none px-6 py-3 text-[13px] font-black uppercase tracking-[0.05em] text-white",
            "bg-orange-600 shadow-[0_4px_20px_rgba(234,88,12,0.3)]",
            "transition-all hover:-translate-y-px hover:bg-orange-500 hover:shadow-[0_6px_24px_rgba(234,88,12,0.4)]",
            "disabled:pointer-events-none disabled:opacity-50",
            "max-sm:flex-1",
          )}
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              {busyLabel}
            </span>
          ) : (
            nextLabel
          )}
        </button>
      )}
    </div>
  </div>
);

interface ProfileSetupShellProps {
  steps: StepDefinition[];
  stepIndex: number;
  currentStep: StepDefinition;
  wide?: boolean;
  children: ReactNode;
}

export const ProfileSetupShell = ({
  steps,
  stepIndex,
  currentStep,
  wide = false,
  children,
}: ProfileSetupShellProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#050505] font-sans text-white">
      <DashboardNavbar />

      <div className="flex flex-1 overflow-hidden border-t border-white/5 bg-[hsl(var(--background))]">
        <DashboardSidebar
          active="profile"
          onChange={(section) => {
            if (section === "profile") return;
            navigate("/dashboard", { state: { activeSection: section } });
          }}
        />

        <main
          className={cn(
            "relative flex flex-1 flex-col items-center gap-4",
            "overflow-y-auto px-6 pb-20 pt-10",
            "before:pointer-events-none before:fixed before:inset-0 before:z-0",
            "before:bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)]",
            "before:bg-[size:56px_56px]",
          )}
          style={{
            background:
              "radial-gradient(ellipse 60% 30% at 50% 0%, rgba(234,88,12,0.07) 0%, transparent 60%), #050505",
          }}
        >
          <div
            className="relative z-10 mb-2 flex w-full flex-col items-center text-center transition-[max-width] duration-300"
            style={{ maxWidth: wide ? "960px" : "580px" }}
          >
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-600">
              <span className="h-px w-8 bg-orange-600" />
              FitPal Profile Setup
            </div>

            <h1 className="mb-1.5 text-[26px] font-black uppercase leading-[1.1] tracking-[-0.5px]">
              {currentStep.titlePrefix}{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg,#facc15 0%,#ff9900 40%,#ff6a00 100%)",
                }}
              >
                {currentStep.titleAccent}
              </span>
            </h1>
            <p className="text-[13px] leading-[1.55] text-slate-400">{currentStep.subtitle}</p>

            <div
              className="mt-5 w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ maxWidth: "760px" }}
            >
              <div className="flex w-max min-w-full items-start px-1 pt-3 pb-7">
                {steps.map((step, index) => {
                  const done = index < stepIndex;
                  const active = index === stepIndex;
                  const connectorOffset = active ? "calc(50% + 21px)" : "calc(50% + 17px)";
                  const connectorTop = active ? "21px" : "17px";
                  const connectorWidth = active ? "calc(100% - 42px)" : "calc(100% - 34px)";

                  return (
                    <div
                      key={step.id}
                      className="relative flex min-w-[92px] flex-1 flex-col items-center overflow-visible px-1.5"
                    >
                      <div
                        className={cn(
                          "relative z-10 flex items-center justify-center rounded-full font-bold transition-all duration-300",
                          done
                            ? "h-[34px] w-[34px] border-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 text-xs text-white"
                            : active
                              ? "h-[42px] w-[42px] bg-orange-600 text-[15px] text-black shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                              : "h-[34px] w-[34px] border border-white/15 bg-[#1a1a1a] text-xs text-slate-600",
                        )}
                      >
                        {done ? <CheckIcon /> : index + 1}
                      </div>
                      <span
                        className={cn(
                          "absolute top-full z-10 mt-1.5 whitespace-nowrap text-center text-[9px] font-bold uppercase tracking-[0.05em]",
                          active ? "text-orange-500" : "text-slate-600",
                        )}
                      >
                        {step.label}
                      </span>
                      {index < steps.length - 1 && (
                        <div
                          className={cn(
                            "absolute z-0 h-0.5 min-w-[46px] transition-colors duration-300",
                            done ? "bg-gradient-to-r from-orange-500 to-orange-600" : "bg-white/8",
                          )}
                          style={{
                            left: connectorOffset,
                            top: connectorTop,
                            width: connectorWidth,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "relative z-10 w-full rounded-[1.75rem] border border-white/6 bg-[rgba(17,17,17,0.97)]",
              "p-[34px_30px_24px] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)]",
              "transition-[max-width] duration-300",
              "max-sm:rounded-[1.2rem] max-sm:p-[22px_16px_18px]",
            )}
            style={{ maxWidth: wide ? "980px" : "580px" }}
          >
            {children}
          </div>

          <p className="relative z-10 mt-1 text-center text-[11px] text-slate-600">
            By continuing you agree to our{" "}
            <button type="button" className="text-orange-600 transition-colors hover:text-white">
              Terms
            </button>{" "}
            and{" "}
            <button type="button" className="text-orange-600 transition-colors hover:text-white">
              Privacy Policy
            </button>
          </p>
        </main>
      </div>

      <style>{`
        @keyframes screenFadeIn {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
