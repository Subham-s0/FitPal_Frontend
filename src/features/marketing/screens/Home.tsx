import Navbar from "@/features/marketing/components/Navbar";
import Hero from "@/features/marketing/components/Hero";
import Stats from "@/features/marketing/components/Stats";
import HowItWorks from "@/features/marketing/components/HowItWorks";
import Features from "@/features/marketing/components/Features";
import Pricing from "@/features/plans/components/Pricing";
import Testimonials from "@/features/marketing/components/Testimonials";
import Footer from "@/features/marketing/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <Pricing />
      <Testimonials />
      <Footer />
    </main>
  );
};

export default Index;
