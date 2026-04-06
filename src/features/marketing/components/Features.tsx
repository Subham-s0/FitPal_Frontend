import {
  BarChart3, Calendar, CreditCard, Dumbbell,
  MapPin, QrCode, Shield, Target,
} from "lucide-react";
import type { CmsFeature } from "@/features/marketing/cms-store";

/** Maps icon name strings from the CMS store to Lucide components */
const ICON_MAP: Record<string, React.ElementType> = {
  QrCode, Target, BarChart3, MapPin, CreditCard, Shield, Dumbbell, Calendar,
};

type FeaturesProps = { features: CmsFeature[] };

const Features = ({ features }: FeaturesProps) => {
  const activeFeatures = features.filter((f) => f.active);

  if (activeFeatures.length === 0) return null;

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

        {/* Flex + wrap + justify-center so an uneven last row stays centered */}
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-6">
          {activeFeatures.map((feature, index) => {
            const Icon = ICON_MAP[feature.icon] ?? Dumbbell;
            return (
              <div
                key={feature.id}
                className="group relative w-full max-w-sm shrink-0 sm:max-w-none sm:w-72 rounded-2xl border border-border/50 bg-card p-6 transition-all duration-500 hover:-translate-y-1 hover:border-primary/50"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-fire/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-gradient-fire transition-all duration-300">
                  <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-fire opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
