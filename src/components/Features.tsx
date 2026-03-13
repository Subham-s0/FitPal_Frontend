import { 
  QrCode, 
  Target, 
  BarChart3, 
  MapPin, 
  CreditCard, 
  Shield,
  Dumbbell,
  Calendar
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Check-In",
    description: "Instant gym access with a simple QR code scan. No cards, no hassle.",
  },
  {
    icon: Target,
    title: "Personalized Plans",
    description: "AI-powered workout plans tailored to your fitness goals and experience level.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Visual dashboards to monitor your fitness journey and achievements.",
  },
  {
    icon: MapPin,
    title: "Smart Discovery",
    description: "Find the perfect gym based on location, amenities, and user ratings.",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description: "Secure payment integration with Khalti for seamless subscriptions.",
  },
  {
    icon: Shield,
    title: "Secure Access",
    description: "Role-based authentication keeping your data safe and private.",
  },
  {
    icon: Dumbbell,
    title: "500+ Gyms",
    description: "Access to a vast network of premium fitness centers across the city.",
  },
  {
    icon: Calendar,
    title: "Flexible Plans",
    description: "Pause, resume, or upgrade your subscription anytime you want.",
  },
];

const Features = () => {
  return (
    <section id="features" className="relative py-24">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="container relative mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything You Need to <span className="text-gradient-fire">Succeed</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our platform combines cutting-edge technology with user-focused design to deliver the ultimate fitness experience.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-fire/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-gradient-fire transition-all duration-300">
                <feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-fire opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
