import { MapPin, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const gyms = [
  {
    name: "Iron Paradise",
    location: "Downtown",
    rating: 4.9,
    reviews: 234,
    tags: ["24/7", "CrossFit", "Pool"],
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop",
  },
  {
    name: "FitZone Elite",
    location: "Midtown",
    rating: 4.8,
    reviews: 189,
    tags: ["Yoga", "Sauna", "Personal Training"],
    image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=300&fit=crop",
  },
  {
    name: "PowerHouse Gym",
    location: "East Side",
    rating: 4.7,
    reviews: 156,
    tags: ["Powerlifting", "Boxing", "Supplements"],
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop",
  },
  {
    name: "Flex Factory",
    location: "West End",
    rating: 4.9,
    reviews: 312,
    tags: ["HIIT", "Spinning", "Nutrition"],
    image: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=400&h=300&fit=crop",
  },
];

const FeaturedGyms = () => {
  return (
    <section id="gyms" className="relative py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Featured Gyms
            </span>
            <h2 className="text-3xl md:text-5xl font-bold">
              Top-Rated <span className="text-gradient-fire">Partner Gyms</span>
            </h2>
          </div>
          <Button variant="fireOutline" className="gap-2 self-start md:self-auto">
            View All Gyms
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Gym Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {gyms.map((gym, index) => (
            <div
              key={gym.name}
              className="group relative rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={gym.image}
                  alt={gym.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                
                {/* Rating Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-sm">
                  <Star className="h-4 w-4 text-accent fill-accent" />
                  <span className="text-sm font-semibold">{gym.rating}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                  {gym.name}
                </h3>
                
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>{gym.location}</span>
                  <span className="text-border">•</span>
                  <span>{gym.reviews} reviews</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {gym.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs rounded-md bg-secondary text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedGyms;
