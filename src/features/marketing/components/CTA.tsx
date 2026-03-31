import { Button } from "@/shared/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-fire opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_70%)]" />
      
      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full border border-primary/20 animate-float" />
      <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full border border-accent/20 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-primary/5 animate-float" style={{ animationDelay: '1s' }} />

      <div className="container relative mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center mb-8 animate-glow-pulse">
            <img src="/logo.svg" alt="FitPal Logo" className="h-24 w-24 md:h-32 md:w-32" />
          </div>

          {/* Content */}
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-6">
            Ready to Transform Your <span className="text-gradient-fire">Fitness Journey?</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join 50,000+ members who are already enjoying unlimited access to the best gyms in the city. Start your free trial today!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="fire" size="xl" className="gap-3" onClick={() => navigate("/dashboard")}>
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="glass" size="xl">
              Contact Sales
            </Button>
          </div>

          {/* Trust Text */}
          <p className="text-sm text-muted-foreground mt-8">
            No credit card required • Cancel anytime • 7-day free trial
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
