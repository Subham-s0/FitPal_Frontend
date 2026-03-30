import { MapPin, AlertTriangle, Loader2, LocateFixed } from "lucide-react";
import type { LocationPermissionState } from "./gyms.types";

interface LocationPermissionGateProps {
  state: LocationPermissionState;
  onRequest: () => void;
}

const LocationPermissionGate = ({ state, onRequest }: LocationPermissionGateProps) => {
  if (state === "granted") return null;

  return (
    <div className="fade-up flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-orange-600/20 bg-orange-600/5">
          {state === "denied" || state === "unsupported" ? (
            <AlertTriangle size={48} className="text-red-400" />
          ) : state === "loading" ? (
            <Loader2 size={48} className="animate-spin text-orange-500" />
          ) : (
            <MapPin size={48} className="text-orange-500" />
          )}
        </div>
        <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#111]">
          <LocateFixed size={18} className="text-orange-600" />
        </div>
      </div>

      {/* Title */}
      <h2 className="mb-3 text-2xl font-black uppercase tracking-tight md:text-3xl">
        {state === "denied"
          ? "Location Required"
          : state === "unsupported"
            ? "Location Unavailable"
            : (
              <>
                Enable <span className="text-gradient-fire">Location</span>
              </>
            )}
      </h2>

      {/* Description */}
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-400">
        {state === "denied"
          ? "Location access was denied. FitPal needs your location to show nearby gyms and enable check-ins. Please allow location access in your browser settings."
          : state === "unsupported"
            ? "Your browser does not support geolocation. Please use a modern browser to access gym recommendations."
            : "FitPal uses your location to find the best gyms near you, show distances, and power quick check-ins."}
      </p>

      {/* CTA */}
      {state !== "unsupported" && (
        <button
          type="button"
          onClick={onRequest}
          className="btn-fire flex items-center gap-2.5 rounded-2xl px-8 py-4 text-sm font-black uppercase tracking-wider text-white"
        >
          <LocateFixed size={18} />
          {state === "denied" ? "Try Again" : "Allow Location"}
        </button>
      )}

      {/* Hint for denied state */}
      {state === "denied" && (
        <p className="mt-4 max-w-xs text-[10px] font-bold uppercase tracking-widest text-slate-600">
          If the prompt doesn't appear, reset location permissions in your browser's site settings.
        </p>
      )}
    </div>
  );
};

export default LocationPermissionGate;
