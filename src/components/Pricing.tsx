import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Basic",
    price: "999",
    period: "/month",
    description: "Perfect for beginners starting their fitness journey",
    features: [
      "Access to 50+ gyms",
      "Basic workout plans",
      "QR check-in",
      "Progress tracking",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: "1,999",
    period: "/month",
    description: "Most popular choice for serious fitness enthusiasts",
    features: [
      "Access to 300+ gyms",
      "AI-powered personalized plans",
      "QR check-in + priority access",
      "Advanced analytics dashboard",
      "Personal trainer sessions (2/month)",
      "24/7 priority support",
    ],
    popular: true,
  },
  {
    name: "Elite",
    price: "3,999",
    period: "/month",
    description: "Ultimate experience with premium benefits",
    features: [
      "Access to ALL 500+ gyms",
      "Unlimited AI workout plans",
      "VIP gym access & amenities",
      "Unlimited trainer sessions",
      "Nutrition coaching",
      "Dedicated account manager",
      "Free guest passes",
    ],
    popular: false,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="relative py-24 bg-secondary/20">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-[100px]" />

      <div className="container relative mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Pricing
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Choose Your <span className="text-gradient-fire">Perfect Plan</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Flexible subscription options designed to match your fitness goals and budget. Cancel or change anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 ${
                plan.popular
                  ? "bg-gradient-to-b from-primary/20 to-card border-2 border-primary"
                  : "bg-card border border-border/50 hover:border-primary/30"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-fire flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm font-semibold text-primary-foreground">Most Popular</span>
                </div>
              )}

              {/* Plan Info */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">NPR</span>
                  <span className="text-4xl font-black text-gradient-fire">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                variant={plan.popular ? "fire" : "fireOutline"}
                size="lg"
                className="w-full"
              >
                Get Started
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
