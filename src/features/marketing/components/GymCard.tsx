import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { MapPin, Star } from "lucide-react";

type GymCardProps = {
  name: string;
  location: string;
  image?: string;
  rating?: number;
};

const GymCard = ({ name, location, image, rating = 4.5 }: GymCardProps) => {
  return (
    <Card className="border-border/50 hover:border-primary/40 transition-colors cursor-pointer overflow-hidden">
      {image && (
        <img
          src={image}
          alt={name}
          className="w-full h-40 object-cover"
        />
      )}
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{name}</span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 text-yellow-400" />
            {rating.toFixed(1)}
          </span>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {location}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Access with QR check-in · Flexible plans
        </div>
      </CardContent>
    </Card>
  );
};

export default GymCard;

