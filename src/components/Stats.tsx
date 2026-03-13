import { Dumbbell, Users, MapPin, Trophy } from "lucide-react";

const stats = [
  {
    icon: Dumbbell,
    value: "500+",
    label: "Partner Gyms",
  },
  {
    icon: Users,
    value: "50K+",
    label: "Active Members",
  },
  {
    icon: MapPin,
    value: "25+",
    label: "Cities Covered",
  },
  {
    icon: Trophy,
    value: "1M+",
    label: "Workouts Tracked",
  },
];

const Stats = () => {
  return (
    <section className="relative py-16 border-y border-border/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-fire/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-gradient-fire mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
