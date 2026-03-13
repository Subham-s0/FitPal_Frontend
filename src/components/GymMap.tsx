import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

// Fix for default markers in Leaflet with Vite
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// User icon
const userIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149060.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

interface Gym {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: string;
  rating: number;
  status: string;
  image: string;
  address: string;
}

const gyms: Gym[] = [
  {
    id: "1",
    name: "Iron Paradise",
    lat: 27.7289,
    lng: 85.3516,
    distance: "0.5 km",
    rating: 4.9,
    status: "Open",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop",
    address: "Thamel, Kathmandu",
  },
  {
    id: "2",
    name: "FitZone Elite",
    lat: 27.7200,
    lng: 85.3400,
    distance: "1.2 km",
    rating: 4.8,
    status: "Open",
    image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=100&h=100&fit=crop",
    address: "Durbar Marg, Kathmandu",
  },
  {
    id: "3",
    name: "PowerHouse",
    lat: 27.7100,
    lng: 85.3600,
    distance: "2.1 km",
    rating: 4.7,
    status: "Open",
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=100&h=100&fit=crop",
    address: "Lazimpat, Kathmandu",
  },
  {
    id: "4",
    name: "Flex Factory",
    lat: 27.7150,
    lng: 85.3450,
    distance: "2.8 km",
    rating: 4.6,
    status: "Open",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop",
    address: "New Road, Kathmandu",
  },
  {
    id: "5",
    name: "Aakashdhara",
    lat: 27.7289,
    lng: 85.3516,
    distance: "0.3 km",
    rating: 4.9,
    status: "Open",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop",
    address: "Aakashdhara, Kathmandu",
  },
];

const GymMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routingControlRef = useRef<any>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filteredGyms, setFilteredGyms] = useState<Gym[]>(gyms);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map centered on Kathmandu
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([27.7172, 85.324], 13);

    // Add dark tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    // Add gym markers
    gyms.forEach((gym) => {
      const marker = L.marker([gym.lat, gym.lng])
        .addTo(map)
        .bindPopup(`<b>${gym.name}</b><br>${gym.address}<br>⭐ ${gym.rating}`)
        .on("click", () => {
          setSelectedGym(gym);
          if (userLocation) {
            showRoute(userLocation.lat, userLocation.lng, gym.lat, gym.lng);
          } else {
            // If no user location, just center on gym
            if (mapRef.current) {
              mapRef.current.setView([gym.lat, gym.lng], 15);
            }
          }
        });

      markersRef.current.push(marker);
    });

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });

          // Add user marker
          const userMarker = L.marker([lat, lng], { icon: userIcon })
            .addTo(map)
            .bindPopup("Your Location");
          userMarkerRef.current = userMarker;

          // Center map on user
          map.setView([lat, lng], 14);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Kathmandu if geolocation fails
          setUserLocation({ lat: 27.7172, lng: 85.324 });
        },
        { enableHighAccuracy: true }
      );

      // Watch position for updates
      navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lng]);
          }

          // Update route if one is active
          if (selectedGym) {
            showRoute(lat, lng, selectedGym.lat, selectedGym.lng);
          }
        },
        (error) => console.error("Error watching location:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Filter gyms based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredGyms(gyms);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredGyms(
        gyms.filter(
          (gym) =>
            gym.name.toLowerCase().includes(query) ||
            gym.address.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery]);

  const showRoute = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    if (!mapRef.current) return;

    // Remove existing route
    if (routePolylineRef.current) {
      mapRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (routingControlRef.current) {
      try {
        mapRef.current.removeControl(routingControlRef.current);
      } catch (e) {
        // Ignore if already removed
      }
      routingControlRef.current = null;
    }

    // Try to get route from OSRM
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);

        const polyline = L.polyline(coordinates as [number, number][], {
          color: "#ff6b35",
          weight: 4,
          opacity: 0.8,
        }).addTo(mapRef.current);

        routePolylineRef.current = polyline;

        // Fit map to show entire route
        const bounds = polyline.getBounds();
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      } else {
        // Fallback: straight line
        const polyline = L.polyline(
          [
            [startLat, startLng],
            [endLat, endLng],
          ],
          { color: "#ff6b35", weight: 3, dashArray: "10, 10", opacity: 0.6 }
        ).addTo(mapRef.current);

        routePolylineRef.current = polyline;
      }
    } catch (error) {
      console.error("Routing error:", error);
      // Fallback: straight line
      const polyline = L.polyline(
        [
          [startLat, startLng],
          [endLat, endLng],
        ],
        { color: "#ff6b35", weight: 3, dashArray: "10, 10", opacity: 0.6 }
      ).addTo(mapRef.current);

      routePolylineRef.current = polyline;
    }
  };

  const handleGymClick = (gym: Gym) => {
    setSelectedGym(gym);
    if (mapRef.current) {
      mapRef.current.setView([gym.lat, gym.lng], 15);
    }
    if (userLocation) {
      showRoute(userLocation.lat, userLocation.lng, gym.lat, gym.lng);
    }
  };

  const clearRoute = () => {
    if (routePolylineRef.current && mapRef.current) {
      mapRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (routingControlRef.current && mapRef.current) {
      try {
        mapRef.current.removeControl(routingControlRef.current);
      } catch (e) {
        // Ignore
      }
      routingControlRef.current = null;
    }
    setSelectedGym(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Find <span className="text-gradient-fire">Gyms</span>
        </h1>
        <p className="text-muted-foreground">Search and navigate to nearby gyms</p>
      </div>

      {/* Search Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search gyms by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedGym && (
              <Button variant="ghost" size="icon" onClick={clearRoute}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Nearby Gyms List */}
        <div className="lg:col-span-1 space-y-3">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Nearby Gyms
              </CardTitle>
              <CardDescription>{filteredGyms.length} gyms found</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredGyms.map((gym) => (
                  <div
                    key={gym.id}
                    onClick={() => handleGymClick(gym)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedGym?.id === gym.id
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-secondary/50 hover:bg-secondary border-2 border-transparent"
                    }`}
                  >
                    <img
                      src={gym.image}
                      alt={gym.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{gym.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span>{gym.rating}</span>
                        <span>•</span>
                        <span>{gym.distance}</span>
                        <span>•</span>
                        <span className="text-green-500">{gym.status}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {gym.address}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGymClick(gym);
                      }}
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div
                ref={mapContainerRef}
                id="gym-map"
                className="w-full h-[600px] rounded-lg overflow-hidden"
                style={{ zIndex: 0 }}
              />
            </CardContent>
          </Card>

          {selectedGym && (
            <Card className="mt-4 border-primary/30 bg-gradient-to-br from-primary/20 via-card to-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedGym.name}</span>
                  <Button variant="ghost" size="icon" onClick={clearRoute}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>{selectedGym.address}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">{selectedGym.rating}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{selectedGym.distance}</span>
                  </div>
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                    {selectedGym.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GymMap;

