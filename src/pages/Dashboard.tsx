import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardNavbar from "@/components/DashboardNavbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import RoutinesSection from "@/components/RoutinesSection";
import ExercisesSection from "@/components/ExercisesSection";
import WorkoutsSection from "@/components/WorkoutsSection";
import NewRoutine from "@/components/NewRoutine";
import GymMap from "@/components/GymMap"; 
import {
  QrCode,
  Maximize2,
  Check,
  X,
  Play,
  Pause,
  ArrowUpCircle,
  TrendingUp,
  Activity
} from "lucide-react";
import L from "leaflet";

// Mock user data
const userData = {
  name: "Arun Sharma",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100",
  plan: "Pro",
  memberSince: "Jan 2024",
  tier: "Elite Member"
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(location.state?.activeSection || "home");
  const gymMapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (location.state?.activeSection) {
      setActiveSection(location.state.activeSection);
    }
  }, [location.state]);

  useEffect(() => {
    if (activeSection !== "gyms") return;
    if (!gymMapRef.current) return;
    const map = L.map(gymMapRef.current, { zoomControl: false }).setView([27.7172, 85.3240], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    const markers = [
      { pos: [27.7149, 85.3110], color: "#ef4444", name: "Iron Paradise" },
      { pos: [27.7100, 85.3200], color: "#ea580c", name: "FitZone Elite" },
      { pos: [27.7240, 85.3210], color: "#facc15", name: "PowerHouse" }
    ];
    markers.forEach(m => {
      L.circleMarker(m.pos as [number, number], {
        radius: 9, fillColor: m.color, color: "#fff", weight: 2.5, fillOpacity: 1
      }).addTo(map).bindPopup(`<span style="color:black; font-weight:bold">${m.name}</span>`);
    });

    // Add ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(gymMapRef.current);

    return () => { 
      resizeObserver.disconnect();
      map.remove(); 
    };
  }, [activeSection]);

  const renderContent = () => {
    switch (activeSection) {
      case "home":
      default:
        return (
          <div className="max-w-[1800px]">
            <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter leading-none">
              <span className="text-gradient-fire">Fit</span>Pal Dashboard
            </h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mb-8">All your widgets combined in one place.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 grid-flow-row-dense">

              {/* 1. QR Scanner */}
              <div className="flex justify-center h-full">
                <div className="w-full max-w-[400px] rounded-[2.5rem] p-6 shadow-2xl border border-white/5 h-full flex flex-col bg-[linear-gradient(165deg,#1e120a_0%,#000000_100%)]">
                  <div className="flex items-center gap-3 mb-1">
                    <QrCode className="text-orange-600 w-9 h-9" />
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Quick Check-In</h2>
                  </div>
                  <p className="text-gray-400 text-lg mb-6 ml-1 opacity-80 font-light">Scan to enter any gym</p>
                  <div className="rounded-[2rem] aspect-video flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden bg-[rgba(45,26,15,0.6)] border border-orange-600/10">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-orange-600 via-transparent to-transparent"></div>
                    <QrCode className="text-orange-600/90 w-[100px] h-[100px] z-10" />
                  </div>
                  <button className="w-full mt-auto bg-button-gradient hover:brightness-110 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-orange-950/40">
                    <Maximize2 className="w-6 h-6" />
                    <span className="text-xl">Fullscreen QR</span>
                  </button>
                </div>
              </div>

              {/* 2. Activity Calendar (Attendance) */}
              <div className="flex justify-center h-full">
                <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-6 flex flex-col w-full max-w-md h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-1">Activity</h3>
                      <p className="text-[#6b7280] text-xs font-bold">This Month</p>
                    </div>
                    <div className="bg-[#1a1a1a] px-3 py-2 rounded-xl text-center border border-white/5">
                      <p className="text-lg font-black text-white leading-none">12</p>
                      <p className="text-[8px] text-gray-500 uppercase font-bold">Max Streak</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-3 mb-6 w-full">
                    {/* Hardcoded mock data to match HTML visual */}
                    {[
                      { status: 'check' }, { status: 'check' }, { status: 'check' }, { status: 'miss' },
                      { status: 'check' }, { status: 'check' }, { status: 'check' }, { status: 'check' },
                      { status: 'miss' }, { status: 'check' }, { status: 'check' }, { status: 'check' },
                      { status: 'check' }, { status: 'check' }, { status: 'check' }, { status: 'check' },
                      { status: 'check' }, { status: 'check' }, { status: 'check' }, { status: 'check' },
                      { status: 'today', val: 21 },
                      { status: 'future', val: 22 }, { status: 'future', val: 23 }, { status: 'future', val: 24 },
                      { status: 'future', val: 25 }, { status: 'future', val: 26 }, { status: 'future', val: 27 },
                      { status: 'future', val: 28 }, { status: 'future', val: 29 }, { status: 'future', val: 30 }
                    ].map((day, i) => {
                      let className = "aspect-square rounded-xl flex items-center justify-center text-[10px] font-extrabold transition-all duration-300 ";
                      let content = null;

                      if (day.status === 'check') {
                        className += "bg-green-500/20 text-green-500 border border-green-500/20";
                        content = <Check className="w-3 h-3" strokeWidth={4} />;
                      } else if (day.status === 'miss') {
                        className += "bg-red-500/10 text-red-500 border border-red-500/10";
                        content = <X className="w-3 h-3" strokeWidth={4} />;
                      } else if (day.status === 'today') {
                        className += "bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 text-black shadow-[0_0_15px_rgba(234,88,12,1)]";
                        content = day.val;
                      } else {
                        className += "bg-[#1a1a1a] text-[#444] border border-[#222]";
                        content = day.val;
                      }

                      return <div key={i} className={className}>{content}</div>;
                    })}
                  </div>
                  <div className="mt-auto flex items-center justify-between p-4 bg-orange-600/5 rounded-2xl border border-orange-600/20">
                    <div>
                      <p className="text-[9px] text-orange-600/60 font-black uppercase">Current Streak</p>
                      <p className="text-xl font-black text-orange-600">3 Days 🔥</p>
                    </div>
                    <div className="text-right leading-none">
                      <span className="text-2xl font-black text-white opacity-20">#3</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Subscription Plan */}
              <div className="flex justify-center h-full">
                <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center shadow-2xl w-full max-w-sm h-full">
                  <div className="w-full flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Plan Duration</h3>
                    <span className="text-[10px] bg-orange-600/10 text-orange-600 font-bold px-2 py-1 rounded-md">90-DAY PLAN</span>
                  </div>
                  <div className="relative flex items-center justify-center mb-8">
                    <svg className="w-36 h-36 transform -rotate-90">
                      <circle cx="72" cy="72" r="66" stroke="#1a1a1a" strokeWidth="12" fill="transparent" />
                      <circle cx="72" cy="72" r="66" stroke="url(#subsGrad)" strokeWidth="12" fill="transparent"
                        strokeDasharray="414.6" strokeDashoffset="345" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="subsGrad">
                          <stop offset="0%" stopColor="#ea580c" />
                          <stop offset="100%" stopColor="#facc15" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute text-center">
                      <span className="block text-4xl font-black text-white">15</span>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Days Left</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button className="py-3 bg-white/5 rounded-xl text-[10px] font-black text-white uppercase border border-white/5 hover:bg-white/10 hover:-translate-y-0.5 transition-all">
                      Pause Plan
                    </button>
                    <button className="py-3 bg-white/5 rounded-xl text-[10px] font-black text-white uppercase border border-white/5 hover:bg-white/10 hover:-translate-y-0.5 transition-all">
                      View Plan
                    </button>
                    <button className="col-span-2 py-4 bg-button-gradient text-white font-black text-xs uppercase rounded-xl shadow-[0_0_20px_rgba(234,88,12,0.25)] hover:-translate-y-0.5 transition-all">
                      Upgrade Membership
                    </button>
                  </div>
                  <div className="mt-auto w-full text-center pt-4">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                      You have consumed <span className="text-white">83%</span> of your current cycle
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Live Session (Spans 2 cols on XL, 2 on LG) */}
              <div className="flex justify-center xl:col-span-2 lg:col-span-2 h-full">
                <div className="w-full h-full bg-[#111] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group flex flex-col">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-600/10 blur-[80px] rounded-full pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
                        <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em]">Live Session</h3>
                      </div>
                      <h2 className="text-4xl font-black tracking-tighter italic uppercase text-white leading-none">
                        Push <span className="text-gray-600">Day A</span>
                      </h2>
                      <p className="text-[11px] text-gray-500 font-bold mt-2 tracking-wide">Focus: Upper Chest & Triceps</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Est. Time</p>
                      <p className="text-xl font-black text-white">65<span className="text-xs text-gray-500 ml-0.5">m</span></p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { sets: "04", name: "Incline Barbell Press", reps: "10-12 Reps", weight: "85kg" },
                      { sets: "03", name: "Cable Lateral Raise", reps: "15 Reps", weight: "12kg" },
                      { sets: "04", name: "Skull Crushers", reps: "12 Reps", weight: "30kg" }
                    ].map((exercise, i) => (
                      <div key={i} className="flex items-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-orange-600/30 hover:bg-white/[0.04] transition-all group/ex cursor-pointer">
                        <div className="w-14 h-14 bg-[#1a1a1a] rounded-xl flex flex-col items-center justify-center mr-5 transition-transform group-hover/ex:scale-105 border border-white/5">
                          <span className="text-[8px] font-black text-gray-600 uppercase">Sets</span>
                          <span className="text-xl font-black text-white leading-none">{exercise.sets}</span>
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-black text-white text-[15px] leading-tight uppercase italic tracking-tight group-hover/ex:text-orange-600 transition-colors">{exercise.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{exercise.reps}</span>
                            <span className="text-[10px] font-bold text-orange-600/80 uppercase">• {exercise.weight}</span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover/ex:opacity-100 transition-all transform translate-x-2 group-hover/ex:translate-x-0">
                          <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd"></path></svg>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-4 pt-6">
                    <button className="flex-grow py-4 bg-gradient-to-r from-[#ea580c] to-[#facc15] text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all">
                      Start Session
                    </button>
                    <button className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all active:scale-[0.98]">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Member Statistics (Top Facilities) */}
              <div className="flex justify-center h-full">
                <div className="bg-card border border-white/5 rounded-[2.5rem] p-10 shadow-2xl w-full max-w-md h-full flex flex-col">
                  <div className="mb-10">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-6">Member Statistics</h3>
                    <div className="flex items-end gap-4 mb-8">
                      <div className="text-8xl font-black text-white tracking-tighter leading-none italic">42</div>
                      <div className="pb-2">
                        <p className="text-xs text-orange-600 font-black uppercase">Total Visits</p>
                        <div className="flex items-center gap-1 text-green-500 font-bold text-[10px]">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"></path>
                          </svg>
                          12.5% VS LAST MONTH
                        </div>
                      </div>
                    </div>
                    <h4 className="font-black text-xl flex items-center gap-3 italic">
                      <span className="w-1.5 h-6 bg-orange-600 rounded-full"></span>
                      Top Facilities
                    </h4>
                  </div>
                  <div className="space-y-8">
                    {[
                      { id: "01", name: "PowerHouse Gym", loc: "Lazimpat, Kathmandu", count: 18, pct: "100%", active: true },
                      { id: "02", name: "Olympia Fitness", loc: "Jhamsikhel, Lalitpur", count: 12, pct: "66%" },
                      { id: "03", name: "Rage Fitness", loc: "New Baneshwor", count: 6, pct: "33%" },
                      { id: "04", name: "Physique Workshop", loc: "Baluwatar, KTM", count: 4, pct: "22%" },
                      { id: "05", name: "Ultimate Health", loc: "Patan, Lalitpur", count: 2, pct: "11%" }
                    ].map((gym, i) => (
                      <div key={i} className="group cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-gray-600 group-hover:text-orange-600 transition-colors">{gym.id}</span>
                            <div>
                              <p className="text-sm font-bold text-white leading-tight uppercase italic">{gym.name}</p>
                              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{gym.loc}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-black ${gym.active ? "text-orange-600 drop-shadow-[0_0_12px_rgba(234,88,12,0.4)] italic" : "text-gray-400"}`}>{gym.count}</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-gradient-to-r from-[#fb923c] to-[#facc15] rounded-full transition-all duration-1000 ease-out" style={{ width: gym.pct }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-auto py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:bg-button-gradient hover:text-white hover:border-orange-600 transition-all shadow-lg pt-6">
                    Download Check-in History
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      case "checkin":
        return <div className="text-3xl font-bold">Check In Section</div>;
      case "gyms":
        return (
          <div className="max-w-[1800px]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="min-w-[200px]">
                <h1 className="text-4xl font-black tracking-tighter leading-none text-white">
                  FIND <span className="text-gradient-fire pr-2">GYMS</span>
                </h1>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Elite Network Directory</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 md:justify-end">
                <div className="w-full md:w-[380px] bg-[#111] border border-white/5 rounded-2xl flex items-center px-5 transition-all">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  <input type="text" placeholder="Search by name, location or equipment..." className="bg-transparent border-none outline-none px-4 py-3 text-sm w-full text-white placeholder:text-gray-600" />
                </div>
                <button className="bg-[#111] border border-white/5 p-3.5 rounded-2xl hover:border-orange-600/50 hover:text-orange-600 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                </button>
                <button className="ai-glow bg-[#15110e] hover:bg-[#1a1512] text-orange-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-3 transition-all border border-orange-600/20">
                  <div className="w-2 h-2 rounded-full bg-orange-600 animate-ping"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Analyze & Recommend</span>
                </button>
              </div>
            </div>
            <div className="flex gap-8 flex-grow overflow-hidden">
              <div className="w-[35%] flex flex-col gap-5 overflow-hidden">
                <div className="flex-grow flex flex-col gap-5 overflow-y-auto pr-2">
                  <div 
                    onClick={() => navigate('/gym/2')}
                    className="cursor-pointer bg-[#111] border border-white/5 p-4 rounded-[1.5rem] hover:border-orange-600/30 transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex gap-3.5">
                        <div className="w-12 h-12 rounded-[0.9rem] bg-gray-800 overflow-hidden ring-1 ring-white/10">
                          <img src="https://images.unsplash.com/photo-1570829460005-c840387bb1ca?w=200" className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm tracking-tight">Iron Paradise</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-orange-600 text-xs">★★★★★</span>
                            <span className="text-[10px] text-gray-500 font-bold">4.9 (1.2k)</span>
                          </div>
                          <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-1">Thamel, Kathmandu</p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-700 group-hover:text-orange-600 transform -rotate-45 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </div>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-red-500 text-[8px] font-black">92% FULL • PEAK HOURS</span>
                      <span className="text-gray-600 text-[8px] font-bold">0.5 KM</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-2"><div className="h-full bg-gradient-to-r from-[#ff4d4d] to-[#b30000] rounded-full" style={{ width: "92%" }}></div></div>
                  </div>
                  <div 
                    onClick={() => navigate('/gym/1')}
                    className="cursor-pointer bg-[#111] border border-white/5 p-4 rounded-[1.5rem] hover:border-orange-600/30 transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex gap-3.5">
                        <div className="w-12 h-12 rounded-[0.9rem] bg-gray-800 overflow-hidden ring-1 ring-white/10">
                          <img src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=200" className="object-cover w-full h-full" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-orange-600 tracking-tight">FitZone Elite</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-orange-600 text-xs">★★★★☆</span>
                            <span className="text-[10px] text-gray-400 font-bold">4.2 (856)</span>
                          </div>
                          <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-1">Durbar Marg, Kathmandu</p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-orange-600 transform -rotate-45 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </div>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-orange-600 text-[8px] font-black">45% OCCUPIED • OPTIMAL</span>
                      <span className="text-gray-600 text-[8px] font-bold">1.2 KM</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-2"><div className="h-full bg-gradient-to-r from-[#ea580c] to-[#ea580c] rounded-full" style={{ width: "45%" }}></div></div>
                  </div>
                  <div className="bg-[#111] border border-white/5 p-4 rounded-[1.5rem] hover:border-orange-600/30 transition-all group relative">
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex gap-3.5">
                        <div className="w-12 h-12 rounded-[0.9rem] bg-gray-800 overflow-hidden ring-1 ring-white/10">
                          <img src="https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=200" className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm tracking-tight">PowerHouse</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-orange-600 text-xs">★★★★★</span>
                            <span className="text-[10px] text-gray-500 font-bold">4.8 (2.1k)</span>
                          </div>
                          <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-1">Lazimpat, Kathmandu</p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-700 group-hover:text-orange-600 transform -rotate-45 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </div>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-yellow-500 text-[8px] font-black">12% OCCUPIED • EMPTY</span>
                      <span className="text-gray-600 text-[8px] font-bold">2.8 KM</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-2"><div className="h-full bg-gradient-to-r from-[#facc15] to-[#ca8a04] rounded-full" style={{ width: "12%" }}></div></div>
                  </div>
                </div>
              </div>
              <div className="w-[65%] rounded-[2.5rem] overflow-hidden border border-white/5 relative bg-[#0a0a0a] shadow-inner">
                <div ref={gymMapRef} className="w-full h-[600px]" />
                <div className="absolute bottom-6 right-6 z-[10] bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex flex-col gap-2 shadow-2xl">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Facility Status</p>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
                    <span className="text-[10px] font-bold text-gray-300">Peak Occupancy</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-600 shadow-[0_0_8px_#ea580c]"></div>
                    <span className="text-[10px] font-bold text-gray-300">Available Space</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "routines":
        return <RoutinesSection onNewRoutine={() => setActiveSection("new-routine")} />;
      case "new-routine":
        return <NewRoutine onBack={() => setActiveSection("routines")} />;
      case "exercises":
        return <ExercisesSection onBack={() => setActiveSection("home")} />;
      case "workouts":
        return <WorkoutsSection />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden font-sans">
      <DashboardNavbar />
      
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar active={activeSection} onChange={setActiveSection} />
        
        <main className={`flex-grow overflow-y-auto transition-all duration-500 ${activeSection === 'exercises' ? 'p-0' : 'p-6'}`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;