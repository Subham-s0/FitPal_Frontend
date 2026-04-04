import { Dumbbell, MapPin, Trophy, Users } from "lucide-react";
import { useCmsStore } from "@/features/marketing/cms-store";

const ICON_MAP: Record<string, React.ElementType> = {
  Dumbbell, Users, MapPin, Trophy,
};

const Stats = () => {
  const cms = useCmsStore();
  const activeStats = cms.stats.filter((s) => s.active);

  if (activeStats.length === 0) return null;

  return (
    <section className="relative py-16 border-y border-border/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {activeStats.map((stat, index) => {
            const Icon = ICON_MAP[stat.icon] ?? Dumbbell;
            return (
              <div
                key={stat.id}
                className="text-center group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-fire/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gradient-fire mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Stats;
