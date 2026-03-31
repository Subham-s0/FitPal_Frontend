import { Button } from "@/shared/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentAuth = location.pathname.startsWith("/signup")
    ? "signup"
    : location.pathname.startsWith("/login")
    ? "login"
    : undefined;

  const navLinks = [
    { name: "Find Gyms", href: "#gyms" },
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "About", href: "#about" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <img src="/logo.svg" alt="FitPal Logo" className="h-10 w-10 md:h-12 md:w-12" />
            <span className="text-xl font-bold">
              <span className="text-gradient-fire">Fit</span>Pal
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-300 font-medium"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Auth Segmented Control */}
          <div className="hidden md:flex items-center gap-3">
            <ToggleGroup
              type="single"
              value={currentAuth}
              onValueChange={(val) => {
                if (val === "login") navigate("/login");
                if (val === "signup") navigate("/signup");
              }}
              className="rounded-full p-1 border border-[#2e2e2e] bg-transparent"
            >
              <ToggleGroupItem
                value="signup"
                className="rounded-full px-5 py-2 text-white hover:bg-muted/40 transition-colors data-[state=on]:font-bold data-[state=on]:text-white"
              >
                Sign up
              </ToggleGroupItem>
              <ToggleGroupItem
                value="login"
                className="rounded-full px-5 py-2 text-white transition-colors data-[state=on]:font-bold
                  data-[state=on]:bg-button-gradient
                  data-[state=on]:text-white"
              >
                Login
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors py-2 font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <ToggleGroup
                  type="single"
                  value={currentAuth}
                  onValueChange={(val) => {
                    if (val === "login") {
                      navigate("/login");
                      setIsOpen(false);
                    }
                    if (val === "signup") {
                      navigate("/signup");
                      setIsOpen(false);
                    }
                  }}
                  className="rounded-full p-1 border border-[#2e2e2e] bg-transparent"
                >
                  <ToggleGroupItem
                    value="signup"
                    className="rounded-full px-5 py-2 w-full text-white hover:bg-muted/40 transition-colors data-[state=on]:font-bold data-[state=on]:text-white"
                  >
                    Sign up
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="login"
                    className="rounded-full px-5 py-2 w-full text-white transition-colors data-[state=on]:font-bold
                      data-[state=on]:bg-button-gradient
                      data-[state=on]:text-white"
                  >
                    Login
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
