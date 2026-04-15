import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Dumbbell,
  ScanLine,
  Search,
  UserPlus,
} from "lucide-react";
import type { CmsHowToStep } from "@/features/marketing/cms-store";

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus,
  Search,
  ScanLine,
  CreditCard,
  Dumbbell,
  BarChart3,
};

type HowItWorksProps = { howToSteps: CmsHowToStep[] };

const HowItWorks = ({ howToSteps }: HowItWorksProps) => {
  const steps = howToSteps.filter((s) => s.published);

  if (steps.length === 0) return null;

  return (
    <section id="about" className="relative overflow-hidden py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
            How It Works
          </span>
          <h2 className="mb-4 text-3xl font-bold md:text-5xl">
            Start Training in <span className="text-gradient-fire">{steps.length} Easy Steps</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            From signup to logging your last set—create, subscribe, find a gym, scan in, train, and record progress.
          </p>
        </div>

        {/* auto-fill grid: any number of steps, no broken connector lines */}
        <div
          className="mx-auto grid w-full max-w-7xl justify-center gap-6 sm:gap-8"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 300px))",
          }}
        >
          {steps.map((step, index) => {
            const Icon = ICON_MAP[step.icon] ?? UserPlus;
            return (
              <div key={step.id} className="group relative">
                <div className="relative h-full overflow-hidden rounded-3xl border border-border/50 bg-card p-8 text-center transition-all duration-500 hover:-translate-y-2 hover:border-primary/50">
                  <span className="absolute right-3 top-2 p-3 text-6xl font-black text-primary/10 transition-colors group-hover:text-primary/20">
                    {step.stepNumber}
                  </span>
                  <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-fire transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{step.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{step.description}</p>
                  <div className="mt-6 flex items-center justify-center gap-2 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-sm">Step {index + 1}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
