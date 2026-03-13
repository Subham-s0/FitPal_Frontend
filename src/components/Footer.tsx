import { Facebook, Instagram, Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  const socialLinks = [
    { icon: Facebook, href: "#" },
    { icon: Linkedin, href: "#" },
    { icon: Instagram, href: "#" },
    { icon: Twitter, href: "#" },
  ];

  return (
    <footer className="relative pt-10 pb-6 border-t border-border/30">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-10 mb-8 items-start">
          <div className="space-y-4">
            <a href="/" className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full border-2 border-primary/40 p-1 flex items-center justify-center">
                <img src="/logo.svg" alt="FitPal Logo" className="h-8 w-8" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-gradient-fire">Fit</span>Pal
              </span>
            </a>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your go-to for personalized workouts, meal plans, and expert fitness advice.
            </p>
          </div>

          <div className="text-center space-y-6">
            <h4 className="font-semibold">Follow Us On</h4>
            <div className="flex items-center justify-center gap-6">
              {socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  <social.icon className="h-6 w-6" />
                </a>
              ))}
            </div>
            <div className="flex items-center justify-center gap-8 text-sm">
              <a href="/" className="text-muted-foreground hover:text-foreground">Home</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a>
              <a href="#services" className="text-muted-foreground hover:text-foreground">Services</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground">About</a>
            </div>
          </div>

          <div className="md:text-right space-y-3">
            <h4 className="font-semibold">Contact</h4>
            <div className="text-sm text-muted-foreground">
              <div>Monday–Sunday</div>
              <div>8:00 AM – 8:00 PM</div>
              <div>Email</div>
              <div>fitpal@support.com</div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 FitPal. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with 🔥 for fitness enthusiasts everywhere
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
