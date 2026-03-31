import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import { CheckInScreen } from "@/features/check-in";
import { ExercisesScreen } from "@/features/exercises";
import { GymsScreen } from "@/features/gyms";
import RoutineFlow from "@/features/user-dashboard/components/RoutineFlow";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import WorkoutsSection from "@/features/user-dashboard/components/WorkoutsSection";
import {
  ArrowUpCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Map,
  MapPinned,
  Maximize2,
  Pause,
  Play,
  QrCode,
  Search,
  TrendingUp,
} from "lucide-react";

type UserDashboardSection = "home" | "gyms" | "routines" | "exercises" | "workouts" | "checkin" | "progress" | "profile";

const USER_SECTIONS: UserDashboardSection[] = ["home", "gyms", "routines", "exercises", "workouts", "checkin", "progress", "profile"];

// Body model images
const BODY_FRONT_IMAGE = "https://res.cloudinary.com/dahnl97zc/image/upload/v1774873783/male_front_base_kj9xwd.png";
const BODY_BACK_IMAGE = "https://res.cloudinary.com/dahnl97zc/image/upload/v1774873782/male_back_base_a10mxz.png";


const resolveSection = (value: string | undefined): UserDashboardSection =>
  USER_SECTIONS.includes(value as UserDashboardSection) ? (value as UserDashboardSection) : "home";

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedSection = (location.state as { activeSection?: string } | null)?.activeSection;
  const [activeSection, setActiveSection] = useState<UserDashboardSection>(() => resolveSection(requestedSection));
  const [activityMonth, setActivityMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (!requestedSection) return;
    setActiveSection(resolveSection(requestedSection));
  }, [requestedSection]);

  const homeActivity = ["done", "done", "done", "miss", "done", "done", "done", "done", "miss", "done", "done", "done", "done", "done", "done", "done", "done", "done", "done", "done", "today", "future", "future", "future", "future", "future", "future", "future", "future", "future"];

  const liveExercises = [
    { sets: "04", name: "Incline Barbell Press", reps: "10-12 Reps", weight: "85kg" },
    { sets: "03", name: "Cable Lateral Raise", reps: "15 Reps", weight: "12kg" },
    { sets: "04", name: "Skull Crushers", reps: "12 Reps", weight: "30kg" },
  ];

  const topFacilities = [
    { id: "01", name: "PowerHouse Gym", loc: "Lazimpat, Kathmandu", count: 18, pct: "100%", active: true },
    { id: "02", name: "Olympia Fitness", loc: "Jhamsikhel, Lalitpur", count: 12, pct: "66%", active: false },
    { id: "03", name: "Rage Fitness", loc: "New Baneshwor", count: 6, pct: "33%", active: false },
    { id: "04", name: "Physique Workshop", loc: "Baluwatar, KTM", count: 4, pct: "22%", active: false },
  ];

  const renderHome = () => (
    <UserSectionShell
      title={
        <>
          Member <span className="text-gradient-fire">Dashboard</span>
        </>
      }
      description="All your widgets combined in one place."
      width="wide"
      className="fade-up"
      bodyClassName="space-y-5"
    >
      {/* Top Row Grid - 3 columns on desktop, 1 on mobile */}
      <div className="top-sys mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Gym Access Card */}
        <div className="card flex flex-col rounded-[36px] border border-white/5 bg-[linear-gradient(165deg,#1e120a,#000)] p-6 lg:min-h-[372px] lg:p-5">
          <div className="mb-3 flex flex-wrap align-center items-center gap-3 lg:mb-2.5 lg:gap-2.5">
            <MapPinned className="h-7 w-7 shrink-0 text-orange-600 lg:h-6 lg:w-6" />
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">
              Gym <span className="text-gradient-fire">Access</span>
            </h2>
          </div>
          <p className="mb-8 text-base font-light text-white/50 lg:mb-5 lg:text-[15px]">
            Find nearby facilities & check-in
          </p>

          <div className="mt-1 flex flex-1 flex-col gap-6 lg:gap-6">
            <div
              className="relative flex min-h-[196px] flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-orange-600/10 bg-[rgba(45,26,15,0.6)] lg:min-h-[198px]"
              onClick={() => setActiveSection("checkin")}
              title="Click to Check In"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.18),transparent_65%)] opacity-45" />
              <div className="absolute inset-8 z-10 flex items-center justify-center gap-8 lg:inset-10 lg:gap-9">
                <Map className="h-20 w-20 text-orange-600/90 lg:h-[74px] lg:w-[74px]" />
                <div className="h-14 w-0.5 bg-orange-600/30 lg:h-12" />
                <QrCode className="h-20 w-20 text-orange-600/90 lg:h-[74px] lg:w-[74px]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:gap-2.5">
              <button
                type="button"
                onClick={() => setActiveSection("checkin")}
                className="btn-fire flex items-center justify-center gap-2.5 rounded-[14px] px-4 py-4 text-sm font-black text-white lg:py-3.5 lg:text-[13px]"
              >
                <Maximize2 className="h-[18px] w-[18px]" /> Check-In
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("gyms")}
                className="btn-ghost flex items-center justify-center gap-2.5 rounded-[14px] border border-white/15 px-4 py-4 text-sm font-black text-white lg:py-3.5 lg:text-[13px]"
              >
                <Search className="h-[18px] w-[18px]" /> Find Gyms
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Activity Card */}
        <div className="card relative flex flex-col overflow-hidden rounded-[40px] border border-white/[0.06] bg-[#111] p-7 lg:min-h-[372px] lg:px-5 lg:py-4">
          <div className="pointer-events-none absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.05)_0%,transparent_70%)]" />

          <div className="mb-6 lg:mb-3">
            <h3 className="mb-4 text-left text-2xl font-black uppercase tracking-[-0.03em] lg:mb-2 lg:text-[20px]">
              Monthly <span className="text-gradient-fire">Activity</span>
            </h3>
            <div className="flex w-full justify-center">
              <div className="inline-flex min-w-[160px] items-center justify-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 lg:min-w-[136px] lg:gap-2 lg:px-2.5 lg:py-1">
                <button
                  type="button"
                  onClick={() => {
                    const newDate = new Date(activityMonth);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setActivityMonth(newDate);
                  }}
                  className="flex border-none bg-transparent p-0 text-white/30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[11px] font-black uppercase tracking-[0.1em] text-white lg:text-[10px]">
                  {activityMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newDate = new Date(activityMonth);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setActivityMonth(newDate);
                  }}
                  className="flex border-none bg-transparent p-0 text-white/30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Activity Grid */}
          <div className="mb-6 grid grid-cols-7 gap-1.5 lg:mb-3 lg:gap-1">
            {homeActivity.map((status, i) => {
              const dayNum = i + 1;
              let classes = "flex h-[90%] w-[90%] cursor-pointer items-center justify-center rounded-[10px] text-[11px] font-black transition-all duration-200 lg:h-[82%] lg:w-[82%] lg:rounded-[8px] lg:text-[10px]";

              if (status === "done") {
                classes += " border border-green-500/25 bg-green-500/[0.08] text-green-500 shadow-[inset_0_0_10px_rgba(74,222,128,0.05)] hover:scale-[1.08] hover:-rotate-[4deg] hover:border-green-400/40";
              } else if (status === "miss") {
                classes += " border border-red-500/20 bg-red-500/[0.06] text-red-400 hover:scale-[1.08] hover:-rotate-[4deg] hover:border-red-300/35";
              } else if (status === "today") {
                classes += " border-2 border-orange-600 bg-gradient-to-br from-orange-600 to-yellow-400 text-black shadow-[0_0_15px_rgba(234,88,12,0.5)]";
              } else {
                classes += " border border-white/5 bg-white/[0.02] text-white/15 hover:scale-[1.08] hover:-rotate-[4deg] hover:border-white/20";
              }

              return (
                <div key={i} className="flex aspect-square items-center justify-center" title={status}>
                  <div className={classes}>
                    <div className="flex items-center gap-0.5">
                      <span>{dayNum}</span>
                      {status === "done" && <Check size={10} strokeWidth={4} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Streak HUD */}
          <div className="relative mt-2 flex items-center justify-between rounded-[20px] border border-orange-600/20 bg-white/[0.03] p-4 px-5 lg:mt-1.5 lg:p-2.5 lg:px-3.5">
            <div className="flex items-center gap-3.5 lg:gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-orange-600/20 bg-orange-600/[0.08] lg:h-10 lg:w-10">
                <TrendingUp className="h-6 w-6 text-orange-600 lg:h-5 lg:w-5" />
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/40">Current</p>
                <p className="text-[32px] font-black leading-none tracking-[-0.02em] text-white lg:text-[28px]">
                  <span className="text-gradient-fire">3</span> Days
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="mb-0.5 text-[10px] font-extrabold uppercase text-white/25">Max Streak</p>
              <span className="text-[28px] font-black italic text-white/20 lg:text-[24px]">12</span>
            </div>
          </div>
        </div>

        {/* Plan Duration Card */}
        <div className="card flex h-full flex-col rounded-[36px] border border-white/5 bg-[#111] p-6 lg:min-h-[372px] lg:p-5">
          <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-2 lg:mb-3">
            <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">
              Plan <span className="text-gradient-fire">Duration</span>
            </h3>
            <span className="rounded-md bg-orange-600/[0.12] px-2 py-1 text-[10px] font-bold text-orange-600">
              90-DAY
            </span>
          </div>

          <div className="flex flex-1 flex-col">
            {/* Progress Ring */}
            <div className="relative flex flex-1 items-center justify-center py-3 lg:py-4">
              <svg viewBox="0 0 144 144" className="h-[140px] w-[140px] max-w-full -rotate-90 lg:h-[134px] lg:w-[134px]">
                <circle cx="72" cy="72" r="66" stroke="#1a1a1a" strokeWidth="12" fill="transparent" />
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  stroke="url(#planGrad)"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray="414.6"
                  strokeDashoffset="345"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="planGrad">
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#facc15" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <span className="block text-[40px] font-black leading-none lg:text-[36px]">15</span>
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-500 lg:text-[8px]">
                  Days Left
                </span>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-4 pt-4 lg:gap-5 lg:pt-5">
              {/* Tier Info */}
              <div className="w-full rounded-2xl border border-white/[0.04] bg-white/[0.02] p-3.5 px-4 lg:p-3.5 lg:px-4">
                <div className="mb-1.5 flex justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">Current Tier</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-600">Pro Access</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">Ends At</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white">Apr 14, 2024</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid w-full grid-cols-2 gap-3 lg:gap-4">
                <button type="button" className="btn-ghost flex h-12 items-center justify-center gap-1.5 rounded-[14px] text-[11px] font-black lg:h-[52px]">
                  <Pause className="h-4 w-4" /> Pause
                </button>
                <button type="button" className="btn-ghost h-12 rounded-[14px] text-[11px] font-black lg:h-[52px]">
                  View Plan
                </button>
                <button
                  type="button"
                  className="btn-fire col-span-2 h-[52px] rounded-[14px] text-xs text-white lg:h-[54px]"
                >
                  Upgrade Membership
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row Grid - Live Session + Member Stats */}
      <div className="bottom-sys grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2fr]">
        {/* Member Stats (order-2 on desktop, order-1 on mobile) */}
        <div className="card flex h-full flex-col rounded-[36px] border border-white/5 bg-[#121212] p-6 order-2 lg:order-1">
          <div className="mb-4 text-left">
            <h3 className="mb-3.5 text-2xl font-black uppercase tracking-[-0.03em]">
              Member <span className="text-gradient-fire">Stats</span>
            </h3>
            <div className="mb-4 flex items-end justify-start gap-2.5">
              <div className="text-[clamp(56px,8vw,80px)] font-black italic leading-[0.9] tracking-[-0.04em]">42</div>
              <div className="pb-2">
                <p className="text-[11px] font-black uppercase text-orange-600">Total Visits</p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                  <ArrowUpCircle size={12} /> 12.5% VS LAST MONTH
                </div>
              </div>
            </div>
            <h4 className="flex items-center justify-start gap-2 text-lg font-black italic">
              <span className="inline-block h-[18px] w-1 rounded-full bg-orange-600" />
              Top Facilities
            </h4>
          </div>

          <div className="custom-scroll flex max-h-[240px] flex-1 flex-col gap-4 overflow-y-auto pr-2">
            {topFacilities.map((gym) => (
              <div key={gym.id}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black text-gray-500">{gym.id}</span>
                    <div>
                      <p className="text-[13px] font-extrabold uppercase italic leading-tight">{gym.name}</p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-gray-500">{gym.loc}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-black ${gym.active ? "text-orange-600" : "text-gray-400"}`}>
                    {gym.count}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-400"
                    style={{ width: gym.pct }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="btn-ghost mt-auto w-full rounded-[14px] py-3.5 text-[10px] tracking-[0.15em] text-gray-500">
            <Download size={13} /> Download History
          </button>
        </div>

        {/* Live Session Card (order-1 on desktop, order-2 on mobile) */}
        <div className="card relative flex h-full flex-col overflow-hidden rounded-[40px] border border-white/[0.06] bg-[#111] p-8 order-1 lg:order-2">
          <div className="pointer-events-none absolute -right-[50px] -top-[50px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.05)_0%,transparent_70%)]" />

          <div className="live-sys grid grid-cols-1 gap-10 xl:grid-cols-2">
            {/* Exercises Column */}
            <div className="ex-col flex flex-col justify-between order-2 xl:order-1">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="mb-2 flex items-center justify-start gap-2.5">
                    <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">
                      Live <span className="text-gradient-fire">Session</span>
                    </h3>
                  </div>
                  <h2 className="text-[clamp(24px,3vw,32px)] font-black uppercase italic leading-none tracking-[-0.04em]">
                    Push <span className="text-gray-500">Day A</span>
                  </h2>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-500">
                    Focus: Upper Chest and Triceps
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3 px-4 text-right">
                  <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-500">Est. Time</p>
                  <p className="text-[22px] font-black leading-none">
                    65<span className="ml-1 text-xs text-orange-600">m</span>
                  </p>
                </div>
              </div>

              <div className="custom-scroll flex max-h-[500px] flex-1 flex-col gap-3 overflow-y-auto pr-2">
                {liveExercises.map((ex) => (
                  <div
                    key={ex.name}
                    className="group/ex flex items-center rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-4 transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="mr-4 flex h-[60px] w-[60px] shrink-0 flex-col items-center justify-center rounded-[14px] border border-white/[0.08] bg-[#1a1a1a]">
                      <span className="text-[9px] font-black uppercase text-gray-500">Sets</span>
                      <span className="text-[26px] font-black leading-none">{ex.sets}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-black uppercase italic tracking-tight transition-colors group-hover/ex:text-orange-600">
                        {ex.name}
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase text-gray-500">{ex.reps}</span>
                        <span className="text-[10px] font-black text-orange-600">{ex.weight}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  className="btn-fire flex-1 rounded-2xl py-4 text-[11px] tracking-[0.1em] text-white"
                >
                  Start Session
                </button>
                <button
                  type="button"
                  className="btn-ghost rounded-2xl px-5"
                >
                  <Play size={20} />
                </button>
              </div>
            </div>

            {/* Body Images Column */}
            <div className="img-col flex flex-col order-1 xl:order-2">
              <h3 className="mb-5 text-[clamp(18px,2vw,22px)] font-black uppercase tracking-[-0.03em]">
                Routine <span className="text-gradient-fire">Summary</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Front view */}
                <div className="relative flex items-center justify-center rounded-3xl border border-white/5 bg-white/[0.025] p-4">
                  <img
                    src={BODY_FRONT_IMAGE}
                    alt="Body front view"
                    className="h-auto max-h-[400px] w-full object-contain opacity-85 drop-shadow-[0_0_40px_rgba(234,88,12,0.2)]"
                  />
                </div>
                {/* Back view */}
                <div className="relative flex items-center justify-center rounded-3xl border border-white/5 bg-white/[0.025] p-4">
                  <img
                    src={BODY_BACK_IMAGE}
                    alt="Body back view"
                    className="h-auto max-h-[400px] w-full object-contain opacity-85 drop-shadow-[0_0_40px_rgba(234,88,12,0.2)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserSectionShell>
  );


  const renderContent = () => {
    switch (activeSection) {
      case "gyms":
        return <GymsScreen onSwitchToCheckIn={() => setActiveSection("checkin")} />;
      case "routines":
        return <RoutineFlow />;
      case "exercises":
        return <ExercisesScreen />;
      case "workouts":
        return <WorkoutsSection />;
      case "checkin":
        return <CheckInScreen onBack={() => setActiveSection("home")} />;
      case "progress":
        return renderHome(); // Placeholder - can add progress section later
      case "profile":
        navigate("/profile");
        return null;
      case "home":
      default:
        return renderHome();
    }
  };

  return (
    <UserLayout
      activeSection={activeSection}
      contentMode={activeSection === "gyms" || activeSection === "exercises" ? "immersive" : "default"}
      onSectionChange={(section) => {
        if (section === "profile") {
          navigate("/profile");
          return;
        }
        setActiveSection(resolveSection(section));
      }}
    >
      {renderContent()}
    </UserLayout>
  );
};

export default UserDashboard;
