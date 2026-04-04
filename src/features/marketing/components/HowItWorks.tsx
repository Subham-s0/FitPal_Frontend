import { ArrowRight, ScanLine, Search, UserPlus } from "lucide-react";
import { useCmsStore } from "@/features/marketing/cms-store";

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus, Search, ScanLine,
};

const HowItWorks = () => {
  const cms = useCmsStore();
  const steps = cms.howToSteps.filter((s) => s.published);

  if (steps.length === 0) return null;

  return (
    <section id="about" className="relative py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Start Training in <span className="text-gradient-fire">{steps.length} Easy Steps</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Getting access to hundreds of gyms has never been simpler. No contracts, no hassle.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const Icon = ICON_MAP[step.icon] ?? UserPlus;
            return (
              <div key={step.id} className="relative group">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-20 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
                <div className="relative p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-500 group-hover:-translate-y-2">
                  <span className="absolute -top-4 -right-4 text-7xl font-black text-primary/10 group-hover:text-primary/20 transition-colors p-5">
                    {step.stepNumber}
                  </span>
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-fire flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  <div className="mt-6 flex items-center gap-2 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm">Learn more</span>
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
