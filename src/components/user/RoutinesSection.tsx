import React, { useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface RoutinesSectionProps {
  onNewRoutine?: () => void;
}

const RoutinesSection = ({ onNewRoutine }: RoutinesSectionProps) => {
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const muscleOptions = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'legs', label: 'Legs' },
    { value: 'arms', label: 'Arms' },
    { value: 'core', label: 'Core' },
  ];

  const equipmentOptions = [
    { value: 'barbell', label: 'Barbell' },
    { value: 'dumbbell', label: 'Dumbbell' },
    { value: 'machine', label: 'Machine' },
    { value: 'cable', label: 'Cable' },
    { value: 'bodyweight', label: 'Bodyweight' },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase leading-none">
            <span className="text-gradient-fire">ROUTINES</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">Exercise Library</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        <div className="col-span-12 lg:col-span-6 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
              Active Programs
            </h3>
            <span className="text-orange-600 font-bold text-[10px]">2 TOTAL</span>
          </div>
          
          <div className="bg-[#111] rounded-[2.5rem] overflow-hidden border-orange-600/30 border-2 transition-all duration-300">
            <div className="p-8 border-b border-white/5 bg-white/[0.03] flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">12 Week Shred</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-orange-600 text-[10px] font-black uppercase tracking-widest">4 Days / Week</span>
                  <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                  <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Hypertrophy</span>
                </div>
              </div>
              <button className="bg-white/5 p-3 rounded-xl text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
              </button>
            </div>

            <div className="p-4 space-y-2 bg-black/20">
              <div className="bg-orange-600/10 border-l-4 border-orange-600 p-5 rounded-[1.5rem] flex justify-between items-center cursor-pointer transition-all">
                <span className="font-bold text-white uppercase tracking-tight text-base">Push Day (A)</span>
                <span className="text-[10px] font-black text-orange-600 bg-orange-600/10 px-4 py-1.5 rounded-full uppercase">6 Exercises</span>
              </div>
              <div className="p-5 rounded-[1.5rem] border border-transparent hover:border-white/10 flex justify-between items-center cursor-pointer transition-all">
                <span className="font-bold text-gray-500 uppercase tracking-tight text-base">Pull Day (B)</span>
                <span className="text-[10px] font-black text-gray-700 uppercase">5 Exercises</span>
              </div>
              <div className="p-5 rounded-[1.5rem] border border-transparent hover:border-white/10 flex justify-between items-center cursor-pointer transition-all">
                <span className="font-bold text-gray-500 uppercase tracking-tight text-base">Leg Day (C)</span>
                <span className="text-[10px] font-black text-gray-700 uppercase">7 Exercises</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111] rounded-[2.5rem] p-8 opacity-40 hover:opacity-100 transition-all border border-white/5 group">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-white uppercase group-hover:text-orange-600 transition-colors">Strength Focus</h2>
                <p className="text-gray-600 text-[10px] font-bold uppercase mt-1">3 Days / Week • Powerlifting</p>
              </div>
              <div className="text-gray-700">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <div className="bg-[#111] rounded-[2.5rem] overflow-hidden border border-white/5">
            <div className="p-6 bg-white/[0.04] border-b border-white/5 flex justify-between items-center">
              <div>
                <p className="text-orange-600 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Currently Viewing Workout</p>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Push Day (Chest/Tri)</h2>
              </div>
              <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5 text-center">
                <p className="text-gray-500 text-[8px] font-black uppercase mb-0.5">Time Goal</p>
                <p className="text-lg font-black text-white">75 <span className="text-orange-600 text-[9px] uppercase">min</span></p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-[1.5rem] group hover:border-orange-600/40 transition-all">
                <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center flex-shrink-0 text-orange-600 font-black text-base">
                  BP
                </div>
                <div className="flex-grow">
                  <h4 className="text-white font-black text-base uppercase leading-none">Barbell Bench Press</h4>
                  <p className="text-orange-600 text-[8px] font-black uppercase mt-1 tracking-widest">Primary • Chest</p>
                </div>
                <div className="bg-black/40 px-3 py-2 rounded-lg text-right">
                  <p className="text-white font-black text-lg leading-none">4 <span className="text-gray-600 text-[9px] uppercase ml-1">Sets</span></p>
                  <p className="text-gray-500 text-[8px] font-bold uppercase mt-0.5">8-12 Reps</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-[1.5rem] group hover:border-orange-600/40 transition-all">
                <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center flex-shrink-0 text-orange-600 font-black text-base">
                  SD
                </div>
                <div className="flex-grow">
                  <h4 className="text-white font-black text-base uppercase leading-none">Side Deltoid Raise</h4>
                  <p className="text-orange-600 text-[8px] font-black uppercase mt-1 tracking-widest">Isolation • Shoulders</p>
                </div>
                <div className="bg-black/40 px-3 py-2 rounded-lg text-right">
                  <p className="text-white font-black text-lg leading-none">3 <span className="text-gray-600 text-[9px] uppercase ml-1">Sets</span></p>
                  <p className="text-gray-500 text-[8px] font-bold uppercase mt-0.5">15-20 Reps</p>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button className="flex-grow bg-white/5 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">
                  Edit
                </button>
                <button className="flex-grow bg-button-gradient text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-orange-600/20">
                  Start Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutinesSection;
