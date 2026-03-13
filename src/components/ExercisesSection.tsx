import React from 'react';
import { ArrowLeft, Play, Search, ChevronDown } from 'lucide-react';

interface ExercisesSectionProps {
  onBack: () => void;
}

const ExercisesSection = ({ onBack }: ExercisesSectionProps) => {
  return (
    <div className="flex w-full h-[calc(100vh-6rem)] overflow-hidden bg-[#050505] text-white font-sans border border-white/5">
      {/* Main Content */}
      <main className="flex-grow overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
                <button onClick={onBack} className="text-gray-500 hover:text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all">
                    <ArrowLeft className="w-4 h-4" strokeWidth={3} /> Back to Home
                </button>
                <div className="flex gap-2 ml-4">
                    <button className="bg-orange-600/10 text-orange-600 border border-orange-600/20 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-button-gradient hover:text-white transition-all">
                        Replace
                    </button>
                    <button className="bg-white/5 text-gray-500 border border-white/10 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                        Remove
                    </button>
                </div>
            </div>

            {/* Hero Card */}
            <div className="bg-[#111] border border-white/5 rounded-[2.5rem] overflow-hidden p-12 flex flex-col lg:flex-row gap-12 items-center">
                <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-orange-600/10 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Advanced</span>
                        <span className="bg-blue-600/10 text-blue-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Strength</span>
                    </div>
                    <h1 className="text-6xl font-black uppercase tracking-tighter mb-6 leading-none">Triceps Extension <br/><span className="text-gradient-fire">(Barbell)</span></h1>
                    <div className="grid grid-cols-2 gap-6 max-w-sm">
                        <div className="bg-white/5 p-4 rounded-2xl">
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Equipment</p>
                            <p className="text-sm font-bold">Olympic Barbell</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl">
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Target</p>
                            <p className="text-sm font-bold">Triceps Brachii</p>
                        </div>
                    </div>
                </div>
                <div className="w-full lg:w-[400px] aspect-video bg-black rounded-[2.5rem] relative overflow-hidden group border border-white/5 shadow-2xl">
                    <img src="https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800" className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" alt="Exercise" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-gradient-fire rounded-full flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform">
                            <Play className="w-8 h-8 ml-1 fill-current" />
                        </div>
                    </div>
                    <div className="absolute bottom-4 left-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Tutorial Video</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-12 gap-8">
                {/* Chart */}
                <div className="col-span-12 lg:col-span-8 bg-[#111] border border-white/5 rounded-[2.5rem] p-10">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Weight Trend (12W)</h3>
                        <div className="flex gap-2">
                            <span className="w-3 h-3 rounded-full bg-orange-600"></span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Weight (KG)</span>
                        </div>
                    </div>
                    <div className="relative h-64 w-full px-2">
                        <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: 'rgba(249, 115, 22, 0.2)', stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: 'rgba(249, 115, 22, 0)', stopOpacity: 1 }} />
                                </linearGradient>
                            </defs>
                            <path d="M0,180 L150,160 L300,170 L450,130 L600,140 L750,90 L900,100 L1000,60" fill="none" stroke="rgba(249, 115, 22, 0.1)" strokeWidth="40" strokeLinecap="round"/>
                            <path className="chart-line" d="M0,180 L150,160 L300,170 L450,130 L600,140 L750,90 L900,100 L1000,60" fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round"/>
                            <circle cx="1000" cy="60" r="5" fill="#f97316" />
                            <circle cx="1000" cy="60" r="5" fill="#f97316" className="dot-pulse" />
                        </svg>
                        <div className="flex justify-between mt-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">
                            <span>Week 1</span><span>Week 4</span><span>Week 8</span><span>Week 12</span>
                        </div>
                    </div>
                </div>

                {/* Personal Best & 1RM */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Personal Best</p>
                        <div className="flex items-end gap-2">
                            <span className="text-5xl font-black text-white">92.5</span>
                            <span className="text-orange-600 font-black text-xl mb-1 uppercase">kg</span>
                        </div>
                        <p className="text-[10px] text-gray-600 font-bold mt-2 uppercase">Achieved: Oct 12, 2023</p>
                    </div>
                    <div className="glass-card rounded-[2.5rem] p-8 border-t-4 border-t-orange-600">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Estimated 1RM</p>
                        <div className="flex items-end gap-2">
                            <span className="text-5xl font-black text-white">104</span>
                            <span className="text-orange-600 font-black text-xl mb-1 uppercase">kg</span>
                        </div>
                        <div className="mt-4 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-fire h-full w-[85%]"></div>
                        </div>
                    </div>
                </div>

                {/* Recent History */}
                <div className="col-span-12 lg:col-span-5 glass-card rounded-[2.5rem] p-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-8">Recent History</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                            <div>
                                <p className="text-[10px] font-black text-white uppercase">Dec 15, 2023</p>
                                <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">4 Sets • 12 Reps</p>
                            </div>
                            <p className="text-lg font-black text-orange-600">80.0<span className="text-[10px] ml-1">KG</span></p>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-white/[0.03] rounded-2xl border border-white/5 opacity-60">
                            <div>
                                <p className="text-[10px] font-black text-white uppercase">Dec 08, 2023</p>
                                <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">4 Sets • 10 Reps</p>
                            </div>
                            <p className="text-lg font-black text-orange-600">77.5<span className="text-[10px] ml-1">KG</span></p>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="col-span-12 lg:col-span-7 bg-[#111] border border-white/5 rounded-[2.5rem] p-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-8">Instructions</h3>
                    <div className="space-y-6">
                        <div className="flex gap-6">
                            <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center text-orange-600 font-black flex-shrink-0">01</div>
                            <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase">Lower the barbell by bending the elbows until it is just above the forehead.</p>
                        </div>
                        <div className="flex gap-6">
                            <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center text-orange-600 font-black flex-shrink-0">02</div>
                            <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase">Keep the upper arms perpendicular to the floor and the elbows tucked in throughout.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </main>

      {/* Right Sidebar (Library) */}
      <aside className="w-80 bg-[#0a0a0a] border-l border-white/5 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5 space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Library</h2>
                <button className="bg-orange-600/10 text-orange-600 border border-orange-600/20 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-gradient-fire hover:text-white transition-all">
                    + Custom
                </button>
            </div>
            
            <div className="space-y-4">
                <div className="relative">
                    <input type="text" placeholder="Search by name..." className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-orange-600 transition-all placeholder:text-gray-600" />
                    <Search className="w-4 h-4 absolute left-4 top-4 text-gray-600" />
                </div>
                <div className="relative">
                    <select className="w-full bg-white/5 border border-white/10 p-4 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-orange-600 transition-all appearance-none cursor-pointer text-gray-400">
                        <option>All Muscle Groups</option>
                        <option>Triceps</option>
                        <option>Chest</option>
                        <option>Shoulders</option>
                        <option>Back</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-4 text-gray-600 pointer-events-none" />
                </div>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-3">
            <div className="flex items-center gap-5 p-5 rounded-[1.5rem] active-exercise cursor-pointer transition-all">
                <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center text-orange-600 font-black text-sm">TE</div>
                <div>
                    <h4 className="text-[11px] font-black uppercase leading-tight text-white tracking-wide">Triceps Extension</h4>
                    <p className="text-[9px] font-black text-orange-600/60 uppercase mt-1 tracking-widest">Triceps • Barbell</p>
                </div>
            </div>
            <div className="flex items-center gap-5 p-5 rounded-[1.5rem] border border-transparent hover:border-white/5 hover:bg-white/[0.02] cursor-pointer transition-all">
                <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center text-gray-700 font-black text-sm">TD</div>
                <div>
                    <h4 className="text-[11px] font-black uppercase leading-tight text-gray-500 tracking-wide">Triceps Dips</h4>
                    <p className="text-[9px] font-black text-gray-700 uppercase mt-1 tracking-widest">Triceps • Bodyweight</p>
                </div>
            </div>
            <div className="flex items-center gap-5 p-5 rounded-[1.5rem] border border-transparent hover:border-white/5 hover:bg-white/[0.02] cursor-pointer transition-all">
                <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center text-gray-700 font-black text-sm">BP</div>
                <div>
                    <h4 className="text-[11px] font-black uppercase leading-tight text-gray-500 tracking-wide">Bench Press</h4>
                    <p className="text-[9px] font-black text-gray-700 uppercase mt-1 tracking-widest">Chest • Barbell</p>
                </div>
            </div>
        </div>
      </aside>
    </div>
  );
};

export default ExercisesSection;