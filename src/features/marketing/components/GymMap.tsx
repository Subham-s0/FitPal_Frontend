import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Navigation, X, Star } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];
const DEFAULT_ZOOM = 13;
const ACTIVE_GYM_ZOOM = 15;

type Coordinates = { lat: number; lng: number };

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    geometry: {
      coordinates: [number, number][];
    };
  }>;
}

const defaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

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
  { id: "1", name: "Iron Paradise", lat: 27.7289, lng: 85.3516, distance: "0.5 km", rating: 4.9, status: "Open", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop", address: "Thamel, Kathmandu" },
  { id: "2", name: "FitZone Elite", lat: 27.72, lng: 85.34, distance: "1.2 km", rating: 4.8, status: "Open", image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=100&h=100&fit=crop", address: "Durbar Marg, Kathmandu" },
  { id: "3", name: "PowerHouse", lat: 27.71, lng: 85.36, distance: "2.1 km", rating: 4.7, status: "Open", image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=100&h=100&fit=crop", address: "Lazimpat, Kathmandu" },
  { id: "4", name: "Flex Factory", lat: 27.715, lng: 85.345, distance: "2.8 km", rating: 4.6, status: "Open", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop", address: "New Road, Kathmandu" },
  { id: "5", name: "Aakashdhara", lat: 27.7289, lng: 85.3516, distance: "0.3 km", rating: 4.9, status: "Open", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop", address: "Aakashdhara, Kathmandu" },
];

const GymMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const selectedGymRef = useRef<Gym | null>(null);
  const userLocationRef = useRef<Coordinates | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);

  const clearRoutePolyline = useCallback(() => {
    if (!mapRef.current || !routePolylineRef.current) {
      return;
    }

    mapRef.current.removeLayer(routePolylineRef.current);
    routePolylineRef.current = null;
  }, []);

  const showRoute = useCallback(
    async (startLat: number, startLng: number, endLat: number, endLng: number) => {
      if (!mapRef.current) {
        return;
      }

      clearRoutePolyline();

      const drawFallbackRoute = () => {
        if (!mapRef.current) {
          return;
        }

        routePolylineRef.current = L.polyline(
          [
            [startLat, startLng],
            [endLat, endLng],
          ],
          { color: "#ff6b35", weight: 3, dashArray: "10, 10", opacity: 0.6 }
        ).addTo(mapRef.current);
      };

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
        );
        const data = (await response.json()) as OsrmRouteResponse;

        if (data.code !== "Ok" || !data.routes?.length) {
          drawFallbackRoute();
          return;
        }

        const coordinates = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
        const polyline = L.polyline(coordinates, { color: "#ff6b35", weight: 4, opacity: 0.8 }).addTo(mapRef.current);
        routePolylineRef.current = polyline;
        mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      } catch (error) {
        console.error("Routing error:", error);
        drawFallbackRoute();
      }
    },
    [clearRoutePolyline]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    gyms.forEach((gym) => {
      const marker = L.marker([gym.lat, gym.lng])
        .addTo(map)
        .bindPopup(`<b>${gym.name}</b><br>${gym.address}<br>Rating: ${gym.rating}`)
        .on("click", () => {
          selectedGymRef.current = gym;
          setSelectedGym(gym);

          const currentUserLocation = userLocationRef.current;
          if (currentUserLocation) {
            void showRoute(currentUserLocation.lat, currentUserLocation.lng, gym.lat, gym.lng);
            return;
          }

          map.setView([gym.lat, gym.lng], ACTIVE_GYM_ZOOM);
        });

      markersRef.current.push(marker);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = { lat: position.coords.latitude, lng: position.coords.longitude };
          userLocationRef.current = location;
          userMarkerRef.current = L.marker([location.lat, location.lng], { icon: userIcon }).addTo(map).bindPopup("Your Location");
          map.setView([location.lat, location.lng], 14);
        },
        (error) => {
          console.error("Error getting location:", error);
          userLocationRef.current = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
        },
        { enableHighAccuracy: true }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const location = { lat: position.coords.latitude, lng: position.coords.longitude };
          userLocationRef.current = location;

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([location.lat, location.lng]);
          }

          if (selectedGymRef.current) {
            void showRoute(location.lat, location.lng, selectedGymRef.current.lat, selectedGymRef.current.lng);
          }
        },
        (error) => console.error("Error watching location:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      clearRoutePolyline();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }

      map.remove();
      mapRef.current = null;
    };
  }, [clearRoutePolyline, showRoute]);

  const filteredGyms = gyms.filter((gym) => {
    if (!searchQuery.trim()) {
      return true;
    }

    const normalizedQuery = searchQuery.toLowerCase();
    return gym.name.toLowerCase().includes(normalizedQuery) || gym.address.toLowerCase().includes(normalizedQuery);
  });

  const handleGymClick = (gym: Gym) => {
    selectedGymRef.current = gym;
    setSelectedGym(gym);

    if (mapRef.current) {
      mapRef.current.setView([gym.lat, gym.lng], ACTIVE_GYM_ZOOM);
    }

    const currentUserLocation = userLocationRef.current;
    if (currentUserLocation) {
      void showRoute(currentUserLocation.lat, currentUserLocation.lng, gym.lat, gym.lng);
    }
  };

  const clearRoute = () => {
    clearRoutePolyline();
    selectedGymRef.current = null;
    setSelectedGym(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold md:text-3xl">
          Find <span className="text-gradient-fire">Gyms</span>
        </h1>
        <p className="text-muted-foreground">Search and navigate to nearby gyms</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="text" placeholder="Search gyms by name or location..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" />
            </div>
            {selectedGym && (
              <Button variant="ghost" size="icon" onClick={clearRoute}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Nearby Gyms
              </CardTitle>
              <CardDescription>{filteredGyms.length} gyms found</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] space-y-3 overflow-y-auto">
                {filteredGyms.map((gym) => (
                  <div
                    key={gym.id}
                    onClick={() => handleGymClick(gym)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${selectedGym?.id === gym.id ? "border-primary bg-primary/20" : "border-transparent bg-secondary/50 hover:bg-secondary"}`}
                  >
                    <img src={gym.image} alt={gym.name} className="h-12 w-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{gym.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span>{gym.rating}</span>
                        <span>*</span>
                        <span>{gym.distance}</span>
                        <span>*</span>
                        <span className="text-green-500">{gym.status}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{gym.address}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(event) => {
                        event.stopPropagation();
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

        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div ref={mapContainerRef} id="gym-map" className="h-[600px] w-full overflow-hidden rounded-lg" style={{ zIndex: 0 }} />
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
                  <Badge className="border-green-500/30 bg-green-500/20 text-green-500">{selectedGym.status}</Badge>
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
