import React from 'react';
import { ChevronLeft, Save, Sparkles, Plus, X, ChevronDown, Clock } from 'lucide-react';

interface NewRoutineProps {
  onBack: () => void;
}

const NewRoutine = ({ onBack }: NewRoutineProps) => {
  return (
    <div className="w-full text-white text-[13px]">
      <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors mb-6 w-fit"
      >
          <ChevronLeft className="w-5 h-5" strokeWidth={3} />
          <span className="text-xs font-black uppercase tracking-widest">Back to Routines</span>
      </button>

      {/* Main Content */}
      <div className="flex flex-col">
        <div className="w-full">
            {/* Header Card */}
            <div className="bg-[#111] p-10 rounded-[2.5rem] mb-10 border border-white/5 border-l-4 border-l-orange-600 shadow-2xl">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex-grow mr-10">
                        <input 
                          type="text" 
                          placeholder="ROUTINE TITLE" 
                          className="bg-transparent text-6xl font-black text-white outline-none w-full tracking-tighter uppercase placeholder-white/5"
                        />
                        <p className="text-orange-600 text-[10px] font-black uppercase mt-3 tracking-[0.3em]">Program Architecture</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="border border-orange-600/40 text-orange-600 font-extrabold px-8 py-4 rounded-2xl text-[10px] uppercase flex items-center gap-2 hover:bg-orange-600/10 transition-all">
                           <Sparkles size={14} /> AI Optimize
                        </button>
                        <button className="bg-button-gradient text-white font-black px-10 py-4 rounded-2xl text-[10px] uppercase shadow-xl shadow-orange-600/30 hover:scale-105 transition-all">
                           Save Program
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Weekly Frequency</label>
                        <div className="flex items-center gap-2">
                            <input type="number" defaultValue="4" className="bg-transparent text-2xl font-black text-white outline-none w-12" />
                            <span className="text-gray-600 font-bold">DAYS / WEEK</span>
                        </div>
                    </div>
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Primary Goal</label>
                        <select className="bg-transparent text-sm font-black text-white outline-none w-full uppercase cursor-pointer appearance-none">
                            <option className="bg-[#111]">Muscle Hypertrophy</option>
                            <option className="bg-[#111]">Strength Powerlifting</option>
                        </select>
                    </div>
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Est. Duration</label>
                        <div className="flex items-center gap-2">
                            <input type="number" defaultValue="75" className="bg-transparent text-2xl font-black text-white outline-none w-12" />
                            <span className="text-gray-600 font-bold">MINUTES</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Left Column: Workouts List */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    <div className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5">
                        <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-6 px-2">Workouts in Routine</h3>
                        
                        <div className="space-y-3 mb-8">
                            <div className="p-5 rounded-[1.5rem] bg-orange-600/5 border-l-4 border-l-orange-600 cursor-pointer">
                                <p className="font-black text-base text-white uppercase">Push Day (A)</p>
                                <p className="text-[9px] text-orange-600 font-bold uppercase mt-1">6 Exercises</p>
                            </div>
                            <div className="p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-white/20 cursor-pointer transition-all">
                                <p className="font-black text-base text-gray-500 uppercase">Pull Day (B)</p>
                                <p className="text-[9px] text-gray-700 font-bold uppercase mt-1">0 Exercises</p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-white/5">
                            <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all">
                                Add Workout
                            </button>
                            <button className="w-full py-4 bg-orange-600/10 border border-orange-600/30 rounded-2xl text-[10px] font-black uppercase text-orange-600 hover:bg-button-gradient hover:text-white transition-all flex justify-center gap-2">
                                <Plus size={14} strokeWidth={3} /> Create New Workout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Workout Editor */}
                <div className="col-span-12 lg:col-span-9">
                    <div className="bg-[#111] rounded-[2.5rem] overflow-hidden border border-white/5">
                        <div className="p-10 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <input type="text" defaultValue="PUSH DAY (A)" className="bg-transparent text-4xl font-black text-white outline-none uppercase tracking-tighter" />
                                <p className="text-gray-500 text-[10px] font-black uppercase mt-2 tracking-widest">Editing Selected Day</p>
                            </div>
                            <button className="border border-orange-600/40 text-orange-600 font-extrabold px-8 py-3 rounded-2xl text-[10px] uppercase hover:bg-orange-600/10 transition-all">
                                + Add Exercise
                            </button>
                        </div>

                        <div className="p-10 space-y-6">
                            {/* Exercise Item */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-black rounded-2xl border border-white/10 flex items-center justify-center text-orange-600 font-black text-xl">BP</div>
                                        <div>
                                            <h4 className="text-white font-black text-xl uppercase tracking-tight">Bench Press (Barbell)</h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-orange-600 text-[10px] font-black uppercase tracking-widest">Chest / Triceps</p>
                                                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                                {/* Added Est. Time here */}
                                                <div className="flex items-center gap-1 text-gray-500">
                                                    <Clock size={10} />
                                                    <input 
                                                        type="text" 
                                                        placeholder="10 min" 
                                                        className="bg-transparent text-[10px] font-bold uppercase w-12 outline-none text-gray-400 focus:text-white" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors">
                                            <ChevronDown size={20} />
                                        </button>
                                        <button className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-red-500 transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-4 text-[10px] font-black uppercase text-gray-500 mb-3 px-6">
                                    <div className="col-span-1 text-center">Set</div>
                                    <div className="col-span-3">Weight (KG)</div>
                                    <div className="col-span-3">Target Reps</div>
                                    <div className="col-span-3">Est. Time</div>
                                    <div className="col-span-2 text-right">Action</div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="grid grid-cols-12 gap-4 items-center bg-black p-4 rounded-2xl border border-white/5">
                                        <div className="col-span-1 text-center font-black text-orange-600 text-lg">1</div>
                                        <div className="col-span-3">
                                            <input type="number" placeholder="0" className="bg-white/[0.03] border border-white/10 text-white w-full p-3 rounded-xl text-center font-black text-base outline-none focus:border-orange-600 transition-colors" />
                                        </div>
                                        <div className="col-span-3">
                                            <input type="number" placeholder="0" className="bg-white/[0.03] border border-white/10 text-white w-full p-3 rounded-xl text-center font-black text-base outline-none focus:border-orange-600 transition-colors" />
                                        </div>
                                        <div className="col-span-3">
                                            <input type="text" placeholder="0m" className="bg-white/[0.03] border border-white/10 text-white w-full p-3 rounded-xl text-center font-black text-base outline-none focus:border-orange-600 transition-colors" />
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <button className="text-gray-800 text-xl font-black hover:text-red-500 px-4 transition-colors">×</button>
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full mt-6 py-5 border-2 border-dashed border-white/5 rounded-2xl text-[10px] font-black uppercase text-gray-600 hover:text-orange-600 hover:border-orange-600/30 transition-all">
                                    + Add New Set
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default NewRoutine;
