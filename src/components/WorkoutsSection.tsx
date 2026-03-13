import React from 'react';

interface WorkoutsSectionProps {
  onNewWorkout?: () => void;
}

const WorkoutsSection = ({ onNewWorkout }: WorkoutsSectionProps) => {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase leading-none">
            MY <span className="text-gradient-fire">WORKOUTS</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">Daily Sessions & Logs</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs hover:bg-white/10 transition-all">
            History
          </button>
          <button 
            onClick={onNewWorkout}
            className="bg-button-gradient text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:scale-105 transition-all">
            Create New Workout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Workout Card 1 */}
        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 hover:border-orange-600/30 transition-all group cursor-pointer">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase leading-none">Upper Body</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Last performed: 2 days ago</p>
              </div>
            </div>
            <span className="bg-green-500/10 text-green-500 text-[9px] font-black uppercase px-3 py-1 rounded-full">Completed</span>
          </div>
          <div className="space-y-3 mb-6">
             <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase text-[10px]">Duration</span>
                <span className="text-white font-black">45 Min</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase text-[10px]">Volume</span>
                <span className="text-white font-black">12,400 KG</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase text-[10px]">PRs</span>
                <span className="text-orange-600 font-black">2 New</span>
             </div>
          </div>
          <button className="w-full py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white group-hover:bg-white/10 transition-all">
            View Details
          </button>
        </div>

        {/* Workout Card 2 */}
        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 hover:border-orange-600/30 transition-all group cursor-pointer">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase leading-none">Leg Day</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Last performed: 5 days ago</p>
              </div>
            </div>
            <span className="bg-orange-600/10 text-orange-600 text-[9px] font-black uppercase px-3 py-1 rounded-full">Scheduled</span>
          </div>
          <div className="space-y-3 mb-6">
             <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase text-[10px]">Est. Duration</span>
                <span className="text-white font-black">60 Min</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase text-[10px]">Focus</span>
                <span className="text-white font-black">Quads & Calves</span>
             </div>
          </div>
          <button className="w-full py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white group-hover:bg-button-gradient transition-all shadow-lg">
            Start Now
          </button>
        </div>

        {/* Workout Card 3 */}
        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 hover:border-orange-600/30 transition-all group cursor-pointer opacity-60 hover:opacity-100">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase leading-none">Cardio & Abs</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Last performed: 1 week ago</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center h-24 border-2 border-dashed border-white/10 rounded-2xl">
             <p className="text-[10px] font-black uppercase text-gray-500">No recent data</p>
          </div>
          <button className="w-full mt-6 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white group-hover:bg-white/10 transition-all">
            View History
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutsSection;
