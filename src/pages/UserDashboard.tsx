import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DefaultLayout from "@/components/DefaultLayout";
import ExercisesSection from "@/components/ExercisesSection";
import NewRoutine from "@/components/NewRoutine";
import RoutinesSection from "@/components/RoutinesSection";
import WorkoutsSection from "@/components/WorkoutsSection";
import {
  ArrowUpCircle,
  Check,
  Maximize2,
  Pause,
  Play,
  QrCode,
} from "lucide-react";
import L from "leaflet";

type UserDashboardSection = "home" | "gyms" | "routines" | "new-routine" | "exercises" | "workouts";

const USER_SECTIONS: UserDashboardSection[] = ["home", "gyms", "routines", "new-routine", "exercises", "workouts"];

const mapMarkers = [
  { pos: [27.7149, 85.311], color: "#ef4444", name: "Iron Paradise" },
  { pos: [27.71, 85.32], color: "#ea580c", name: "FitZone Elite" },
  { pos: [27.724, 85.321], color: "#facc15", name: "PowerHouse" },
];

const resolveSection = (value: string | undefined): UserDashboardSection =>
  USER_SECTIONS.includes(value as UserDashboardSection) ? (value as UserDashboardSection) : "home";

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const gymMapRef = useRef<HTMLDivElement | null>(null);
  const requestedSection = (location.state as { activeSection?: string } | null)?.activeSection;
  const [activeSection, setActiveSection] = useState<UserDashboardSection>(() => resolveSection(requestedSection));

  useEffect(() => {
    if (!requestedSection) return;
    setActiveSection(resolveSection(requestedSection));
  }, [requestedSection]);

  useEffect(() => {
    if (activeSection !== "gyms" || !gymMapRef.current) return;

    const map = L.map(gymMapRef.current, { zoomControl: false }).setView([27.7172, 85.324], 14);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);

    mapMarkers.forEach((marker) => {
      L.circleMarker(marker.pos as [number, number], {
        radius: 9,
        fillColor: marker.color,
        color: "#fff",
        weight: 2.5,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup(`<span style="color:black; font-weight:bold">${marker.name}</span>`);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(gymMapRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, [activeSection]);

  const renderHome = () => (
    <div className="max-w-[1800px]">
      <h1 className="mb-2 text-4xl font-black uppercase tracking-tighter leading-none">
        <span className="text-gradient-fire">Fit</span>Pal Dashboard
      </h1>
      <p className="mb-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
        All your widgets combined in one place.
      </p>

      <div className="grid grid-flow-row-dense grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        <div className="flex h-full justify-center">
          <div className="flex h-full w-full max-w-[400px] flex-col rounded-[2.5rem] border border-white/5 bg-[linear-gradient(165deg,#1e120a_0%,#000000_100%)] p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-3">
              <QrCode className="h-9 w-9 text-orange-600" />
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Quick Check-In</h2>
            </div>
            <p className="mb-6 ml-1 text-lg font-light text-gray-400 opacity-80">Scan to enter any gym</p>
            <div className="relative mb-6 flex aspect-video items-center justify-center overflow-hidden rounded-[2rem] border border-orange-600/10 bg-[rgba(45,26,15,0.6)] shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-orange-600 via-transparent to-transparent opacity-10" />
              <QrCode className="z-10 h-[100px] w-[100px] text-orange-600/90" />
            </div>
            <button className="mt-auto flex w-full items-center justify-center gap-3 rounded-2xl bg-button-gradient py-5 font-bold text-white shadow-lg shadow-orange-950/40 transition-all hover:brightness-110 active:scale-[0.98]">
              <Maximize2 className="h-6 w-6" />
              <span className="text-xl">Fullscreen QR</span>
            </button>
          </div>
        </div>

        <div className="flex h-full justify-center">
          <div className="flex h-full w-full max-w-md flex-col rounded-[2.5rem] border border-white/5 bg-[#111] p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-1 text-2xl font-black uppercase tracking-tighter text-white">Activity</h3>
                <p className="text-xs font-bold text-[#6b7280]">This Month</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#1a1a1a] px-3 py-2 text-center">
                <p className="text-lg font-black leading-none text-white">12</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Max Streak</p>
              </div>
            </div>
            <div className="mb-6 grid w-full grid-cols-7 gap-3">
              {[
                "done","done","done","miss","done","done","done",
                "done","miss","done","done","done","done","done",
                "done","done","done","done","done","done","today",
                "future","future","future","future","future","future",
                "future","future","future",
              ].map((status, index) => {
                const dayValue = index + 1;
                const className =
                  status === "done"
                    ? "border border-green-500/20 bg-green-500/20 text-green-500"
                    : status === "miss"
                      ? "border border-red-500/10 bg-red-500/10 text-red-500"
                      : status === "today"
                        ? "bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 text-black shadow-[0_0_15px_rgba(234,88,12,1)]"
                        : "border border-[#222] bg-[#1a1a1a] text-[#444]";

                return (
                  <div
                    key={`${status}-${dayValue}`}
                    className={`flex aspect-square items-center justify-center rounded-xl text-[10px] font-extrabold ${className}`}
                  >
                    {status === "done" ? <Check className="h-3 w-3" strokeWidth={4} /> : dayValue}
                  </div>
                );
              })}
            </div>
            <div className="mt-auto flex items-center justify-between rounded-2xl border border-orange-600/20 bg-orange-600/5 p-4">
              <div>
                <p className="text-[9px] font-black uppercase text-orange-600/60">Current Streak</p>
                <p className="text-xl font-black text-orange-600">3 Days</p>
              </div>
              <span className="text-2xl font-black leading-none text-white/20">#3</span>
            </div>
          </div>
        </div>

        <div className="flex h-full justify-center">
          <div className="flex h-full w-full max-w-sm flex-col items-center rounded-[2.5rem] border border-white/5 bg-[#111] p-8 shadow-2xl">
            <div className="mb-6 flex w-full items-center justify-between">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Plan Duration</h3>
              <span className="rounded-md bg-orange-600/10 px-2 py-1 text-[10px] font-bold text-orange-600">
                90-DAY PLAN
              </span>
            </div>
            <div className="relative mb-8 flex items-center justify-center">
              <svg className="h-36 w-36 -rotate-90 transform">
                <circle cx="72" cy="72" r="66" stroke="#1a1a1a" strokeWidth="12" fill="transparent" />
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  stroke="url(#userPlanGrad)"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray="414.6"
                  strokeDashoffset="345"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="userPlanGrad">
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#facc15" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <span className="block text-4xl font-black text-white">15</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Days Left</span>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-3">
              <button className="rounded-xl border border-white/5 bg-white/5 py-3 text-[10px] font-black uppercase text-white transition-all hover:-translate-y-0.5 hover:bg-white/10">
                <Pause className="mx-auto h-4 w-4" />
              </button>
              <button className="rounded-xl border border-white/5 bg-white/5 py-3 text-[10px] font-black uppercase text-white transition-all hover:-translate-y-0.5 hover:bg-white/10">
                View Plan
              </button>
              <button className="col-span-2 rounded-xl bg-button-gradient py-4 text-xs font-black uppercase text-white shadow-[0_0_20px_rgba(234,88,12,0.25)] transition-all hover:-translate-y-0.5">
                Upgrade Membership
              </button>
            </div>
            <div className="mt-auto w-full pt-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-tighter text-gray-600">
                You have consumed <span className="text-white">83%</span> of your current cycle
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-full justify-center lg:col-span-2 xl:col-span-2">
          <div className="group relative flex h-full w-full flex-col overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#111] p-6 shadow-2xl">
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-orange-600/10 blur-[80px]" />
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-orange-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Live Session</h3>
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">
                  Push <span className="text-gray-600">Day A</span>
                </h2>
                <p className="mt-2 text-[11px] font-bold tracking-wide text-gray-500">
                  Focus: Upper Chest and Triceps
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-[9px] font-black uppercase tracking-widest leading-none text-gray-500">
                  Est. Time
                </p>
                <p className="text-xl font-black text-white">
                  65<span className="ml-0.5 text-xs text-gray-500">m</span>
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { sets: "04", name: "Incline Barbell Press", reps: "10-12 Reps", weight: "85kg" },
                { sets: "03", name: "Cable Lateral Raise", reps: "15 Reps", weight: "12kg" },
                { sets: "04", name: "Skull Crushers", reps: "12 Reps", weight: "30kg" },
              ].map((exercise) => (
                <div
                  key={exercise.name}
                  className="group/ex flex cursor-pointer items-center rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-orange-600/30 hover:bg-white/[0.04]"
                >
                  <div className="mr-5 flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-white/5 bg-[#1a1a1a] transition-transform group-hover/ex:scale-105">
                    <span className="text-[8px] font-black uppercase text-gray-600">Sets</span>
                    <span className="text-xl font-black leading-none text-white">{exercise.sets}</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-[15px] font-black uppercase italic tracking-tight text-white transition-colors group-hover/ex:text-orange-600">
                      {exercise.name}
                    </h4>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-gray-500">{exercise.reps}</span>
                      <span className="text-[10px] font-bold uppercase text-orange-600/80">{exercise.weight}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto flex gap-4 pt-6">
              <button className="flex-grow rounded-2xl bg-gradient-to-r from-[#ea580c] to-[#facc15] py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98]">
                Start Session
              </button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white transition-all active:scale-[0.98] hover:bg-white/10">
                <Play className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-full justify-center">
          <div className="flex h-full w-full max-w-md flex-col rounded-[2.5rem] border border-white/5 bg-card p-10 shadow-2xl">
            <div className="mb-10">
              <h3 className="mb-6 text-2xl font-black uppercase tracking-tighter text-white">Member Statistics</h3>
              <div className="mb-8 flex items-end gap-4">
                <div className="text-8xl font-black italic leading-none tracking-tighter text-white">42</div>
                <div className="pb-2">
                  <p className="text-xs font-black uppercase text-orange-600">Total Visits</p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                    <ArrowUpCircle className="h-3 w-3" />
                    12.5% VS LAST MONTH
                  </div>
                </div>
              </div>
              <h4 className="flex items-center gap-3 text-xl font-black italic">
                <span className="h-6 w-1.5 rounded-full bg-orange-600" />
                Top Facilities
              </h4>
            </div>
            <div className="space-y-8">
              {[
                { id: "01", name: "PowerHouse Gym", loc: "Lazimpat, Kathmandu", count: 18, pct: "100%", active: true },
                { id: "02", name: "Olympia Fitness", loc: "Jhamsikhel, Lalitpur", count: 12, pct: "66%" },
                { id: "03", name: "Rage Fitness", loc: "New Baneshwor", count: 6, pct: "33%" },
                { id: "04", name: "Physique Workshop", loc: "Baluwatar, KTM", count: 4, pct: "22%" },
              ].map((gym) => (
                <div key={gym.id} className="group cursor-pointer">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-gray-600 transition-colors group-hover:text-orange-600">
                        {gym.id}
                      </span>
                      <div>
                        <p className="text-sm font-bold uppercase italic leading-tight text-white">{gym.name}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{gym.loc}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-black ${gym.active ? "italic text-orange-600" : "text-gray-400"}`}>
                      {gym.count}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#fb923c] to-[#facc15] transition-all duration-1000 ease-out"
                      style={{ width: gym.pct }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-auto w-full rounded-2xl border border-white/10 bg-white/5 py-4 pt-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 shadow-lg transition-all hover:border-orange-600 hover:bg-button-gradient hover:text-white">
              Download Check-in History
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGyms = () => (
    <div className="max-w-[1800px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[200px]">
          <h1 className="text-4xl font-black leading-none tracking-tighter text-white">
            FIND <span className="pr-2 text-gradient-fire">GYMS</span>
          </h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
            Elite Network Directory
          </p>
        </div>
      </div>

      <div className="flex flex-grow gap-8 overflow-hidden">
        <div className="flex w-[35%] flex-col gap-5 overflow-hidden">
          <div className="flex flex-grow flex-col gap-5 overflow-y-auto pr-2">
            {[
              { id: "2", name: "Iron Paradise", status: "92% FULL - PEAK HOURS", distance: "0.5 KM", area: "Thamel, Kathmandu", width: "92%" },
              { id: "1", name: "FitZone Elite", status: "45% OCCUPIED - OPTIMAL", distance: "1.2 KM", area: "Durbar Marg, Kathmandu", width: "45%", active: true },
              { id: "3", name: "PowerHouse", status: "12% OCCUPIED - EMPTY", distance: "2.8 KM", area: "Lazimpat, Kathmandu", width: "12%" },
            ].map((gym) => (
              <div
                key={gym.id}
                onClick={() => navigate(`/gym/${gym.id}`)}
                className="group relative cursor-pointer rounded-[1.5rem] border border-white/5 bg-[#111] p-4 transition-all hover:border-orange-600/30"
              >
                <div className="mb-2.5 flex items-start justify-between">
                  <div>
                    <h3 className={`text-sm font-extrabold tracking-tight ${gym.active ? "text-orange-600" : "text-white"}`}>
                      {gym.name}
                    </h3>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-gray-500">
                      {gym.area}
                    </p>
                  </div>
                </div>
                <div className="mb-1 flex items-end justify-between">
                  <span className={`text-[8px] font-black ${gym.active ? "text-orange-600" : "text-red-500"}`}>
                    {gym.status}
                  </span>
                  <span className="text-[8px] font-bold text-gray-600">{gym.distance}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ea580c] to-[#facc15]" style={{ width: gym.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative w-[65%] overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0a] shadow-inner">
          <div ref={gymMapRef} className="h-[600px] w-full" />
          <div className="absolute bottom-6 right-6 z-[10] flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-xl">
            <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-gray-400">Facility Status</p>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
              <span className="text-[10px] font-bold text-gray-300">Peak Occupancy</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-orange-600 shadow-[0_0_8px_#ea580c]" />
              <span className="text-[10px] font-bold text-gray-300">Available Space</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "gyms":
        return renderGyms();
      case "routines":
        return <RoutinesSection onNewRoutine={() => setActiveSection("new-routine")} />;
      case "new-routine":
        return <NewRoutine onBack={() => setActiveSection("routines")} />;
      case "exercises":
        return <ExercisesSection onBack={() => setActiveSection("home")} />;
      case "workouts":
        return <WorkoutsSection />;
      case "home":
      default:
        return renderHome();
    }
  };

  return (
    <DefaultLayout
      role="USER"
      activeSection={activeSection}
      onSectionChange={(section) => {
        if (section === "profile") {
          navigate("/profile");
          return;
        }

        setActiveSection(resolveSection(section));
      }}
      onPrimaryAction={() => setActiveSection("gyms")}
      onProfileClick={() => navigate("/profile")}
      contentClassName={activeSection === "exercises" ? "p-0" : "p-6"}
    >
      {renderContent()}
    </DefaultLayout>
  );
};

export default UserDashboard;
