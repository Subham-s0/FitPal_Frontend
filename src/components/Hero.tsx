import { Button } from "@/components/ui/button";
import { MapPin, Search, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-dark" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,hsla(25,100%,50%,0.15)_0%,hsla(40,100%,50%,0.1)_40%,transparent_70%)] scale-150 md:scale-100" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(0_0%_20%_/_0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_20%_/_0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">One subscription, unlimited gyms</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight mb-6 animate-slide-up">
            Train Anywhere.
            <br />
            <span className="text-gradient-fire">Pay Once.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Access 500+ premium gyms across the city with a single membership. 
            Track workouts, get personalized plans, and check-in with QR codes.
          </p>

          {/* Search Bar (modified to match provided design) */}
          <div className="relative max-w-lg mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              <div className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="Enter your location"
                className="w-full py-5 pl-12 pr-36 text-foreground bg-[#121212] border border-[#2e2e2e] rounded-full focus:outline-none focus:ring-2 focus:ring-orange-600/40"
              />
              <Button
                size="lg"
                variant="fire"
                className="absolute right-2 top-2 bottom-2 px-8 rounded-full text-white font-bold"
              >
                Find
              </Button>
            </div>
          </div>

          {/* Single CTA */}
          <div className="flex items-center justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Button variant="fireOutline" size="lg" className="gap-2 rounded-full" onClick={() => navigate("/dashboard")}>
              Get Started
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
