import { UserPlus, Search, ScanLine, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Account",
    description: "Sign up in seconds and choose the subscription plan that fits your lifestyle.",
  },
  {
    icon: Search,
    step: "02",
    title: "Find Your Gym",
    description: "Use our smart search to discover nearby gyms based on your location and preferences.",
  },
  {
    icon: ScanLine,
    step: "03",
    title: "Scan & Train",
    description: "Simply scan the QR code at any partner gym and start your workout immediately.",
  },
];

const HowItWorks = () => {
  return (
    <section id="about" className="relative py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Start Training in <span className="text-gradient-fire">3 Easy Steps</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Getting access to hundreds of gyms has never been simpler. No contracts, no hassle.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.step} className="relative group">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-20 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}
              
              <div className="relative p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-500 group-hover:-translate-y-2">
                {/* Step Number */}
                <span className="absolute -top-4 -right-4 text-7xl font-black text-primary/10 group-hover:text-primary/20 transition-colors p-5">
                  {step.step}
                </span>
                
                {/* Icon */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-fire flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="h-8 w-8 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>

                {/* Arrow */}
                <div className="mt-6 flex items-center gap-2 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm">Learn more</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
