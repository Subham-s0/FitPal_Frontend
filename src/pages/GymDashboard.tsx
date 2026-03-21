import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DefaultLayout from "@/components/DefaultLayout";
import {
  Activity,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  TrendingUp,
  Users,
} from "lucide-react";

type GymDashboardSection = "home" | "members" | "classes" | "analytics" | "profile";

const GYM_SECTIONS: GymDashboardSection[] = ["home", "members", "classes", "analytics", "profile"];

const gymHighlights = [
  { label: "Today's Check-Ins", value: "128", note: "+14% vs yesterday" },
  { label: "Current Occupancy", value: "64%", note: "96 / 150 capacity" },
  { label: "Monthly Revenue", value: "NPR 4.8L", note: "+8.2% vs last month" },
];

const gymMembers = [
  { name: "Aarav Shrestha", plan: "Elite", status: "Checked In" },
  { name: "Sana Karki", plan: "Pro", status: "Class Booked" },
  { name: "Rohan Gurung", plan: "Basic", status: "Renewal Due" },
  { name: "Nisha Lama", plan: "Elite", status: "Checked In" },
];

const classSchedule = [
  { time: "06:00 AM", title: "Mobility Reset", coach: "Coach Mira" },
  { time: "09:30 AM", title: "Strength Circuit", coach: "Coach Arjun" },
  { time: "05:30 PM", title: "CrossFit Engine", coach: "Coach Roshan" },
  { time: "07:00 PM", title: "Yoga Recovery", coach: "Coach Sita" },
];

const shellCard = "rounded-[2rem] border border-white/5 bg-[#111] p-6 shadow-2xl";

const resolveSection = (value: string | undefined): GymDashboardSection =>
  GYM_SECTIONS.includes(value as GymDashboardSection) ? (value as GymDashboardSection) : "home";

const GymDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedSection = (location.state as { activeSection?: string } | null)?.activeSection;
  const [activeSection, setActiveSection] = useState<GymDashboardSection>(() => resolveSection(requestedSection));

  useEffect(() => {
    if (!requestedSection) return;
    setActiveSection(resolveSection(requestedSection));
  }, [requestedSection]);

  const renderHome = () => (
    <div className="max-w-[1600px]">
      <h1 className="mb-2 text-4xl font-black uppercase leading-none tracking-tighter text-white">
        Gym <span className="text-gradient-fire">Dashboard</span>
      </h1>
      <p className="mb-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
        Same layout shell with gym-owner content.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {gymHighlights.map((item) => (
          <div key={item.label} className={shellCard}>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-gray-500">{item.label}</p>
            <p className="mt-4 text-4xl font-black tracking-tight text-white">{item.value}</p>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-600">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className={shellCard}>
          <div className="mb-6 flex items-center gap-3">
            <Activity className="h-7 w-7 text-orange-600" />
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Today&apos;s Operations</h2>
          </div>
          <div className="space-y-4">
            {[
              { icon: Users, title: "Front Desk", note: "2 staff on active shift" },
              { icon: Clock3, title: "Peak Window", note: "05 PM - 08 PM projected at 82%" },
              { icon: TrendingUp, title: "Retention Pulse", note: "Elite renewals are up 11% this week" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                <div>
                  <p className="text-sm font-black uppercase tracking-tight text-white">{item.title}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={shellCard}>
          <div className="mb-6 flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-orange-600" />
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Action Queue</h2>
          </div>
          <div className="space-y-4">
            {[
              "Verify 3 new member payments",
              "Review 2 trainer leave requests",
              "Inspect cable stack on Floor B",
              "Respond to 7 pending support notes",
            ].map((task) => (
              <div key={task} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-sm font-bold text-slate-200">{task}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMembers = () => (
    <div className="max-w-[1500px]">
      <h1 className="mb-2 text-4xl font-black uppercase leading-none tracking-tighter text-white">
        Member <span className="text-gradient-fire">Overview</span>
      </h1>
      <p className="mb-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
        Gym-owner member management.
      </p>
      <div className={`${shellCard} overflow-hidden p-0`}>
        <div className="grid grid-cols-[1.2fr_0.7fr_1fr] border-b border-white/5 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
          <span>Member</span>
          <span>Plan</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-white/5">
          {gymMembers.map((member) => (
            <div key={member.name} className="grid grid-cols-[1.2fr_0.7fr_1fr] px-6 py-5">
              <span className="text-sm font-black uppercase tracking-tight text-white">{member.name}</span>
              <span className="text-sm font-bold text-slate-300">{member.plan}</span>
              <span className="text-sm font-bold text-orange-600">{member.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderClasses = () => (
    <div className="max-w-[1500px]">
      <h1 className="mb-2 text-4xl font-black uppercase leading-none tracking-tighter text-white">
        Class <span className="text-gradient-fire">Schedule</span>
      </h1>
      <p className="mb-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
        Gym-owner class management.
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {classSchedule.map((session) => (
          <div key={`${session.time}-${session.title}`} className={shellCard}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">{session.time}</p>
                <h2 className="mt-3 text-2xl font-black uppercase tracking-tighter text-white">{session.title}</h2>
              </div>
              <CalendarClock className="h-7 w-7 text-orange-600" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">{session.coach}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="max-w-[1500px]">
      <h1 className="mb-2 text-4xl font-black uppercase leading-none tracking-tighter text-white">
        Gym <span className="text-gradient-fire">Analytics</span>
      </h1>
      <p className="mb-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
        Gym-owner performance data.
      </p>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className={shellCard}>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Weekly Utilization</h2>
          <div className="mt-6 space-y-4">
            {[
              { label: "Week 1", width: "72%" },
              { label: "Week 2", width: "68%" },
              { label: "Week 3", width: "81%" },
              { label: "Week 4", width: "77%" },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">{item.label}</span>
                  <span className="text-sm font-black text-white">{item.width}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ea580c] to-[#facc15]" style={{ width: item.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={shellCard}>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Branch Notes</h2>
          <div className="mt-6 space-y-4">
            {[
              "Peak usage is concentrated between 5 PM and 8 PM.",
              "CrossFit Engine is the highest-booked class this week.",
              "Need more treadmill availability in the early morning slot.",
            ].map((note) => (
              <div key={note} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-sm font-bold text-slate-200">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-[1500px]">
      <h1 className="mb-2 text-4xl font-black uppercase leading-none tracking-tighter text-white">
        My <span className="text-gradient-fire">Gym</span>
      </h1>
      <p className="mb-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
        Gym-owner profile details in the shared shell.
      </p>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className={shellCard}>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-orange-600/30 bg-orange-600/10">
              <Building2 className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">FitZone Elite</h2>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
                Commercial Gym - Kathmandu
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { label: "Primary Email", value: "owner@fitpal.com" },
              { label: "Phone", value: "+977 9800000000" },
              { label: "Hours", value: "06:00 AM - 10:00 PM" },
              { label: "Capacity", value: "150 members" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">{item.label}</p>
                <p className="mt-3 text-sm font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={shellCard}>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Verification</h2>
          <div className="mt-6 space-y-4">
            {[
              "Registration certificate uploaded",
              "Operating license uploaded",
              "Review status pending with FitPal team",
            ].map((item) => (
              <div key={item} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                <p className="text-sm font-bold text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "members":
        return renderMembers();
      case "classes":
        return renderClasses();
      case "analytics":
        return renderAnalytics();
      case "profile":
        return renderProfile();
      case "home":
      default:
        return renderHome();
    }
  };

  return (
    <DefaultLayout
      role="GYM"
      activeSection={activeSection}
      onSectionChange={(section) => setActiveSection(resolveSection(section))}
      onPrimaryAction={() => setActiveSection("profile")}
      onProfileClick={() => setActiveSection("profile")}
    >
      {renderContent()}
    </DefaultLayout>
  );
};

export default GymDashboard;
