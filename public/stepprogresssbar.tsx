import { cn } from "@/lib/utils";
import { CheckIcon } from "./ui";
import type { StepDefinition } from "../ProfileSetup.types";

interface StepProgressBarProps {
  steps: StepDefinition[];
  stepIndex: number;
}

const StepProgressBar = ({ steps, stepIndex }: StepProgressBarProps) => (
  <div
    className="mt-5 flex w-full items-start overflow-x-auto pb-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    style={{ maxWidth: "760px" }}
  >
    {steps.map((step, index) => {
      const done = index < stepIndex;
      const active = index === stepIndex;

      return (
        <div
          key={step.id}
          className="relative flex min-w-[92px] flex-1 flex-col items-center px-1.5"
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-full font-bold transition-all duration-300",
              done
                ? "h-[34px] w-[34px] border-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 text-xs text-white"
                : active
                  ? "h-[42px] w-[42px] scale-105 bg-orange-600 text-[15px] text-black shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                  : "h-[34px] w-[34px] border border-white/15 bg-[#1a1a1a] text-xs text-slate-600",
            )}
          >
            {done ? <CheckIcon /> : index + 1}
          </div>
          <span
            className={cn(
              "absolute top-full mt-1.5 whitespace-nowrap text-center text-[9px] font-bold uppercase tracking-[0.05em]",
              active ? "text-orange-500" : "text-slate-600",
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "absolute left-[calc(50%+17px)] top-[17px] h-0.5 transition-colors duration-300",
                "min-w-[46px]",
                done ? "bg-gradient-to-r from-orange-500 to-orange-600" : "bg-white/8",
              )}
              style={{ width: "calc(100% - 34px)" }}
            />
          )}
        </div>
      );
    })}
  </div>
);

export default StepProgressBar;