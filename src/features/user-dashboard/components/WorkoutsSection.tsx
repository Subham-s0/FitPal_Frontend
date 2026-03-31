import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";

interface WorkoutsSectionProps {
  onNewWorkout?: () => void;
}

const WorkoutsSection = ({ onNewWorkout }: WorkoutsSectionProps) => {
  return (
    <UserSectionShell
      title={
        <>
          My <span className="text-gradient-fire">Workouts</span>
        </>
      }
      description="Keep your daily sessions, logs, and reusable workout templates in one consistent training workspace."
      actions={
        <div className="flex flex-wrap gap-3">
          <button className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-xs font-bold uppercase text-white transition-all hover:bg-white/10">
            History
          </button>
          <button
            type="button"
            onClick={onNewWorkout}
            className="rounded-2xl bg-button-gradient px-10 py-4 text-xs font-black uppercase text-white transition-all hover:scale-105"
          >
            Create New Workout
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="group cursor-pointer rounded-[2.5rem] border border-white/5 bg-[#111] p-8 transition-all hover:border-orange-600/30">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600/10 text-orange-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black uppercase leading-none text-white">Upper Body</h3>
                <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                  Last performed: 2 days ago
                </p>
              </div>
            </div>
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-[9px] font-black uppercase text-green-500">
              Completed
            </span>
          </div>
          <div className="mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[10px] font-bold uppercase text-gray-400">Duration</span>
              <span className="font-black text-white">45 Min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[10px] font-bold uppercase text-gray-400">Volume</span>
              <span className="font-black text-white">12,400 KG</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[10px] font-bold uppercase text-gray-400">PRs</span>
              <span className="font-black text-orange-600">2 New</span>
            </div>
          </div>
          <button className="w-full rounded-2xl bg-white/5 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all group-hover:bg-white/10">
            View Details
          </button>
        </div>

        <div className="group cursor-pointer rounded-[2.5rem] border border-white/5 bg-[#111] p-8 transition-all hover:border-orange-600/30">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black uppercase leading-none text-white">Leg Day</h3>
                <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                  Last performed: 5 days ago
                </p>
              </div>
            </div>
            <span className="rounded-full bg-orange-600/10 px-3 py-1 text-[9px] font-black uppercase text-orange-600">
              Scheduled
            </span>
          </div>
          <div className="mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[10px] font-bold uppercase text-gray-400">Est. Duration</span>
              <span className="font-black text-white">60 Min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[10px] font-bold uppercase text-gray-400">Focus</span>
              <span className="font-black text-white">Quads & Calves</span>
            </div>
          </div>
          <button className="w-full rounded-2xl bg-white/5 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all group-hover:bg-button-gradient">
            Start Now
          </button>
        </div>

        <div className="group cursor-pointer rounded-[2.5rem] border border-white/5 bg-[#111] p-8 opacity-60 transition-all hover:border-orange-600/30 hover:opacity-100">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/10 text-purple-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black uppercase leading-none text-white">Cardio & Abs</h3>
                <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                  Last performed: 1 week ago
                </p>
              </div>
            </div>
          </div>
          <div className="flex h-24 items-center justify-center rounded-2xl border-2 border-dashed border-white/10">
            <p className="text-[10px] font-black uppercase text-gray-500">No recent data</p>
          </div>
          <button className="mt-6 w-full rounded-2xl bg-white/5 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all group-hover:bg-white/10">
            View History
          </button>
        </div>
      </div>
    </UserSectionShell>
  );
};

export default WorkoutsSection;
