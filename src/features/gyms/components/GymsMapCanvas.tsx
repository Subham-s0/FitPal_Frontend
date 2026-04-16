import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GymRecommendationItem } from "@/features/gyms/types";
import { formatGymDistance, getGymDisplayName } from "@/features/gyms/utils";

interface GymsMapCanvasProps {
  userCoords: { lat: number; lng: number } | null;
  filteredGyms: GymRecommendationItem[];
  selectedGym: GymRecommendationItem | null;
  onSelectGym: (gym: GymRecommendationItem) => void;
  showOccupancy?: boolean;
}

function createUserIcon(): L.DivIcon {
  return L.divIcon({
    className: "gym-user-marker-icon",
    html: `
      <div class="gym-user-marker">
        <span class="gym-user-pulse"></span>
        <span class="gym-user-core"></span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    tooltipAnchor: [0, -20],
  });
}

function createGymIcon(selected: boolean, open: boolean): L.DivIcon {
  const size = selected ? 24 : 18;
  const ringSize = selected ? 38 : 30;
  const fill = selected ? "#f97316" : open ? "#22c55e" : "#94a3b8";
  const ring = selected
    ? "rgba(249,115,22,0.24)"
    : open
      ? "rgba(34,197,94,0.18)"
      : "rgba(148,163,184,0.16)";
  const border = selected ? "rgba(255,247,237,0.95)" : "rgba(255,255,255,0.9)";

  return L.divIcon({
    className: "gym-location-marker-icon",
    html: `
      <div class="gym-location-marker">
        <span class="gym-location-ring" style="width:${ringSize}px;height:${ringSize}px;background:${ring}"></span>
        <span class="gym-location-dot" style="width:${size}px;height:${size}px;background:${fill};border-color:${border}"></span>
      </div>
    `,
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
    popupAnchor: [0, -18],
    tooltipAnchor: [0, -20],
  });
}

function tooltipContent(gym: GymRecommendationItem, showOccupancy: boolean): string {
  const distance = formatGymDistance(gym.distanceMeters);
  const status = gym.currentlyOpen ? "Open" : "Closed";
  const occupancy = showOccupancy && gym.occupancyPercent != null ? ` | ${gym.occupancyPercent}% full` : "";

  return [
    `<div style="font-weight:800;text-transform:uppercase;font-size:12px;margin-bottom:3px">${getGymDisplayName(gym)}</div>`,
    `<div style="font-size:10px;color:rgba(255,255,255,0.65)">${distance} | ${status}${occupancy}</div>`,
  ].join("");
}

const GymsMapCanvas = ({
  userCoords,
  filteredGyms,
  selectedGym,
  onSelectGym,
  showOccupancy = true,
}: GymsMapCanvasProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeRequestIdRef = useRef(0);
  const hasAutoFitRef = useRef(false);

  const removeRoutePolyline = useCallback(() => {
    if (!mapInstanceRef.current || !routePolylineRef.current) return;
    mapInstanceRef.current.removeLayer(routePolylineRef.current);
    routePolylineRef.current = null;
  }, []);

  const clearRoutePolyline = useCallback(() => {
    routeRequestIdRef.current += 1;
    removeRoutePolyline();
  }, [removeRoutePolyline]);

  const fitToVisiblePoints = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (selectedGym) return;
    if (filteredGyms.length === 0 && !userCoords) return;

    const bounds = L.latLngBounds([]);

    if (userCoords) {
      bounds.extend([userCoords.lat, userCoords.lng]);
    }

    filteredGyms.forEach((gym) => {
      if (gym.latitude == null || gym.longitude == null) {
        return;
      }
      bounds.extend([gym.latitude, gym.longitude]);
    });

    if (!bounds.isValid()) return;

    map.fitBounds(bounds, {
      padding: [44, 44],
      maxZoom: userCoords ? 14 : 13,
      animate: hasAutoFitRef.current,
    });
    hasAutoFitRef.current = true;
  }, [filteredGyms, selectedGym, userCoords]);

  const showRoute = useCallback(
    async (startLat: number, startLng: number, endLat: number, endLng: number) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const requestId = routeRequestIdRef.current + 1;
      routeRequestIdRef.current = requestId;
      removeRoutePolyline();

      const drawFallbackRoute = () => {
        if (!mapInstanceRef.current || routeRequestIdRef.current !== requestId) return;

        routePolylineRef.current = L.polyline(
          [
            [startLat, startLng],
            [endLat, endLng],
          ],
          { color: "#ea580c", weight: 3, dashArray: "10, 10", opacity: 0.6 }
        ).addTo(mapInstanceRef.current);
      };

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
        );
        const data = await response.json();

        if (!mapInstanceRef.current || routeRequestIdRef.current !== requestId) {
          return;
        }

        if (data.code !== "Ok" || !data.routes?.length) {
          drawFallbackRoute();
          return;
        }

        const coordinates = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
        const polyline = L.polyline(coordinates, {
          color: "#ea580c",
          weight: 4,
          opacity: 0.85,
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current = polyline;
        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      } catch (error) {
        if (routeRequestIdRef.current !== requestId) {
          return;
        }
        console.error("Routing error:", error);
        drawFallbackRoute();
      }
    },
    [removeRoutePolyline]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([27.7172, 85.324], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!userCoords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
        icon: createUserIcon(),
        zIndexOffset: 1500,
      })
        .addTo(map)
        .bindTooltip("Current location", {
          className: "gym-tooltip",
          direction: "top",
          offset: [0, -22],
          opacity: 1,
        });
    } else {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    }
  }, [userCoords]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const currentIds = new Set(filteredGyms.map((gym) => gym.gymId));

    existing.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    });

    filteredGyms.forEach((gym) => {
      const isSelected = selectedGym?.gymId === gym.gymId;
      const icon = createGymIcon(isSelected, gym.currentlyOpen);
      const existingMarker = existing.get(gym.gymId);

      if (existingMarker) {
        existingMarker.setIcon(icon);
        if (gym.latitude != null && gym.longitude != null) {
          existingMarker.setLatLng([gym.latitude, gym.longitude]);
        }
        existingMarker.setZIndexOffset(isSelected ? 1200 : 800);
        existingMarker.setTooltipContent(tooltipContent(gym, showOccupancy));
        return;
      }

      if (gym.latitude == null || gym.longitude == null) {
        return;
      }

      const marker = L.marker([gym.latitude, gym.longitude], {
        icon,
        zIndexOffset: isSelected ? 1200 : 800,
      })
        .addTo(map)
        .bindTooltip(tooltipContent(gym, showOccupancy), {
          className: "gym-tooltip",
          direction: "top",
          offset: [0, -20],
          opacity: 1,
        })
        .on("click", () => onSelectGym(gym));

      existing.set(gym.gymId, marker);
    });
  }, [filteredGyms, onSelectGym, selectedGym, showOccupancy]);

  useEffect(() => {
    fitToVisiblePoints();
  }, [fitToVisiblePoints]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!selectedGym) {
      clearRoutePolyline();
      fitToVisiblePoints();
      return;
    }

    if (selectedGym.latitude == null || selectedGym.longitude == null) {
      clearRoutePolyline();
      return;
    }

    if (userCoords) {
      void showRoute(userCoords.lat, userCoords.lng, selectedGym.latitude, selectedGym.longitude);
      return;
    }

    clearRoutePolyline();
    map.flyTo([selectedGym.latitude, selectedGym.longitude], 15, { duration: 0.8 });
  }, [clearRoutePolyline, fitToVisiblePoints, selectedGym, showRoute, userCoords]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      clearRoutePolyline();
    };
  }, [clearRoutePolyline]);

  return (
    <div className="relative z-0 h-full w-full">
      <style>{`
        .gym-location-marker-icon,
        .gym-user-marker-icon {
          background: transparent !important;
          border: none !important;
        }

        .gym-location-marker,
        .gym-user-marker {
          position: relative;
          display: flex;
          height: 100%;
          width: 100%;
          align-items: center;
          justify-content: center;
        }

        .gym-location-ring {
          position: absolute;
          border-radius: 9999px;
          transform: translateZ(0);
        }

        .gym-location-dot {
          position: relative;
          border-radius: 9999px;
          border: 2px solid rgba(255,255,255,0.92);
          box-shadow: 0 10px 24px rgba(0,0,0,0.32);
        }

        .gym-user-pulse {
          position: absolute;
          height: 40px;
          width: 40px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.12) 58%, rgba(59,130,246,0) 100%);
          animation: gymUserPulse 2.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          will-change: transform, opacity;
        }

        .gym-user-core {
          position: absolute;
          height: 12px;
          width: 12px;
          border-radius: 9999px;
          background: linear-gradient(180deg, #60a5fa 0%, #2563eb 100%);
          border: 2px solid rgba(255,255,255,0.98);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.16), 0 6px 18px rgba(37,99,235,0.28);
        }

        .gym-tooltip {
          background: rgba(12,12,12,0.95) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 12px !important;
          padding: 10px 14px !important;
          color: white !important;
          font-family: 'Outfit', sans-serif !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
          font-size: 11px !important;
        }

        .gym-tooltip::before,
        .leaflet-tooltip-top::before {
          border-top-color: rgba(12,12,12,0.95) !important;
        }

        @keyframes gymUserPulse {
          0%,
          18% {
            transform: scale(0.55);
            opacity: 0;
          }
          40% {
            opacity: 0.6;
          }
          100% {
            transform: scale(1.75);
            opacity: 0;
          }
        }
      `}</style>
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
};

export default GymsMapCanvas;
