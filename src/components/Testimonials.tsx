import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Arun Sharma",
    role: "Fitness Enthusiast",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    content: "FitPal changed my workout routine completely. I can now try different gyms based on my mood and location. The QR check-in is incredibly convenient!",
    rating: 5,
  },
  {
    name: "Priya Adhikari",
    role: "Yoga Instructor",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    content: "As someone who travels frequently, having access to multiple gyms with one subscription is a game-changer. The personalized workout plans are spot on!",
    rating: 5,
  },
  {
    name: "Bikash Thapa",
    role: "CrossFit Athlete",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    content: "The progress tracking dashboard helps me stay motivated. I love seeing my improvement over time. Best fitness investment I've ever made!",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Loved by <span className="text-gradient-fire">Thousands</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See what our members have to say about their FitPal experience.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="relative p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 right-6 h-10 w-10 text-primary/10 group-hover:text-primary/20 transition-colors" />

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-accent fill-accent" />
                ))}
              </div>

              {/* Content */}
              <p className="text-muted-foreground leading-relaxed mb-8">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                />
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
