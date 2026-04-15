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
    { name: "Find Gyms", href: "/gyms" },
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "About", href: "#about" },
  ];

  const handleNavLinkClick = (href: string) => {
    if (href.startsWith("/")) {
      navigate(href);
    } else {
      if (location.pathname === "/") {
        window.location.hash = href;
      } else {
        navigate(`/${href}`);
      }
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 overflow-x-clip border-b border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-3 sm:h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="group flex min-w-0 items-center gap-2">
            <img src="/logo.svg" alt="FitPal Logo" className="h-8 w-8 shrink-0 sm:h-10 sm:w-10 md:h-12 md:w-12" />
            <span className="truncate text-lg font-bold sm:text-xl">
              <span className="text-gradient-fire">Fit</span>Pal
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                type="button"
                onClick={() => handleNavLinkClick(link.href)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-300 font-medium"
              >
                {link.name}
              </button>
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
            className="shrink-0 p-2 text-foreground md:hidden"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="animate-fade-in border-t border-border py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  type="button"
                  onClick={() => handleNavLinkClick(link.href)}
                  className="text-muted-foreground hover:text-foreground transition-colors py-2 font-medium"
                >
                  {link.name}
                </button>
              ))}
              <div className="flex flex-col gap-2 border-t border-border pt-4">
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
                  className="grid w-full grid-cols-2 rounded-full border border-[#2e2e2e] bg-transparent p-1"
                >
                  <ToggleGroupItem
                    value="signup"
                    className="min-w-0 rounded-full px-3 py-2 text-white transition-colors hover:bg-muted/40 data-[state=on]:font-bold data-[state=on]:text-white"
                  >
                    Sign up
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="login"
                    className="min-w-0 rounded-full px-3 py-2 text-white transition-colors data-[state=on]:font-bold
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
