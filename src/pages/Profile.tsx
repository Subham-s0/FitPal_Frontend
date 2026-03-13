import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "@/components/DashboardNavbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { 
  User, 
  Gem, 
  Flag, 
  Camera, 
  Edit, 
  Check, 
  Lock,
  ChevronDown,
  ArrowDown,
  X,
  Calendar,
  PlusCircle,
  Sparkles
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'membership' | 'goals'>('profile');

  // Mock user data matching the html
  const user = {
    name: "John Doe",
    initials: "JD",
    memberType: "Elite Pro Member",
    activeSince: "Active Since 2023",
    mass: 84.5,
    progress: 2.1,
    id: "USR-2023-8892",
    username: "johndoe",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 000-0000",
    age: 28,
    gender: "Male",
    fitnessLevel: "Elite"
  };

  const showToast = (message: string) => {
    toast.success(message, {
      className: "bg-green-600 border-none text-white font-bold",
    });
  };

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-orange-600/40 overflow-hidden">
      <DashboardNavbar />
      <div className="flex flex-1 overflow-hidden relative">

        <DashboardSidebar active="profile" onChange={(section) => {
             if (section === 'profile') return;
             navigate('/dashboard', { state: { activeSection: section } });
        }} />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-12 relative z-10 bg-[#050505]">
           <div className="max-w-7xl mx-auto">
              
              {/* Header */}
              <header className="mb-12 space-y-2">
                  <div className="flex items-center gap-3">
                      <div className="h-[1px] w-12 bg-orange-600"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600">FitPal Elite System</span>
                  </div>
                  <div className="flex justify-between items-end">
                      <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
                          User <span className="text-gradient-fire">Profile</span>.
                      </h1>
                  </div>
              </header>

              {/* Navigation Tabs */}
              <nav className="flex flex-wrap gap-2 mb-10 bg-white/5 backdrop-blur-2xl p-1.5 rounded-full border border-white/10 shadow-2xl">
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`flex-1 min-w-[120px] px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'profile' 
                        ? 'bg-orange-600 text-black shadow-[0_0_20px_rgba(234,88,12,0.4)]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                      <User className="w-5 h-5" />
                      Profile
                  </button>
                  <button 
                    onClick={() => setActiveTab('membership')} 
                    className={`flex-1 min-w-[120px] px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'membership' 
                        ? 'bg-orange-600 text-black shadow-[0_0_20px_rgba(234,88,12,0.4)]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                      <Gem className="w-5 h-5" />
                      Membership
                  </button>
                  <button 
                    onClick={() => setActiveTab('goals')} 
                    className={`flex-1 min-w-[120px] px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'goals' 
                        ? 'bg-orange-600 text-black shadow-[0_0_20px_rgba(234,88,12,0.4)]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                      <Flag className="w-5 h-5" />
                      Goals
                  </button>
              </nav>

              <div className="grid grid-cols-12 gap-10">
                  
                  {/* Left Sidebar */}
                  <aside className="col-span-12 lg:col-span-4 space-y-6">
                      <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
                          
                          <div className="relative mb-8 w-40 h-40 mx-auto">
                              <div className="absolute inset-0 bg-orange-600/20 rounded-[3.5rem]"></div>
                              <div className="absolute inset-0 bg-[#0a0a0a] border border-white/10 rounded-[3.5rem] z-10 flex items-center justify-center overflow-hidden relative group">
                                  <span className="text-orange-600 text-6xl italic font-black">{user.initials}</span>
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Camera className="text-white w-8 h-8" />
                                  </div>
                              </div>
                          </div>

                          <div className="text-center space-y-1 mb-10">
                              <h3 className="text-2xl font-black uppercase italic">{user.name}</h3>
                              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{user.memberType}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{user.activeSince}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-[#0a0a0a] p-5 rounded-3xl border border-white/5 text-center relative group">
                                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Mass</p>
                                  <div className="flex items-center justify-center gap-1">
                                      <input 
                                        type="number" 
                                        defaultValue={user.mass} 
                                        className="bg-transparent text-xl font-black italic text-center w-16 focus:outline-none focus:text-orange-600 transition-colors appearance-none" 
                                        onChange={() => showToast('Weight updated')}
                                      />
                                      <span className="text-orange-600 text-[10px] font-black">KG</span>
                                  </div>
                                  <Edit className="absolute top-2 right-2 w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="bg-[#0a0a0a] p-5 rounded-3xl border border-white/5 text-center">
                                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Progress</p>
                                  <p className="text-xl font-black italic text-green-500 flex items-center justify-center gap-1">
                                      <ArrowDown className="w-4 h-4" /> {user.progress}
                                  </p>
                              </div>
                          </div>
                      </div>
                  </aside>

                  {/* Main Content Area */}
                  <main className="col-span-12 lg:col-span-8">
                      <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/5 rounded-3xl p-8 lg:p-12 min-h-[600px]">
                          
                          {/* PROFILE TAB */}
                          {activeTab === 'profile' && (
                            <section className="space-y-12">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Personal Information
                                </h4>
                                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">User ID</label>
                                        <input type="text" value="USR-2023-8892" readOnly className="w-full bg-[#0a0a0a]/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-500 focus:outline-none cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Username</label>
                                        <input type="text" defaultValue="johndoe" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">First Name</label>
                                        <input type="text" defaultValue="John" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Last Name</label>
                                        <input type="text" defaultValue="Doe" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Email</label>
                                        <input type="email" defaultValue="john.doe@example.com" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Phone No</label>
                                        <input type="tel" defaultValue="+1 (555) 000-0000" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Age</label>
                                        <input type="number" defaultValue="28" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Weight (KG)</label>
                                        <input type="number" defaultValue="84.5" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Gender</label>
                                        <div className="relative">
                                            <select className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all appearance-none">
                                                <option>Male</option>
                                                <option>Female</option>
                                                <option>Other</option>
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <ChevronDown className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Fitness Level</label>
                                        <div className="relative">
                                            <select className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all appearance-none">
                                                <option>Beginner</option>
                                                <option>Intermediate</option>
                                                <option>Advanced</option>
                                                <option>Elite</option>
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <ChevronDown className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button onClick={() => showToast('Profile updated successfully')} className="bg-button-gradient text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-[0_0_30px_rgba(234,88,12,0.3)] transition-all">
                                        Save Changes
                                    </button>
                                </div>

                                {/* CHANGE PASSWORD SECTION */}
                                <div className="pt-12 border-t border-white/5">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 flex items-center gap-2">
                                            <Lock className="w-4 h-4" />
                                            Security
                                        </h4>
                                        <button onClick={() => showToast('Password reset link sent to email')} className="bg-white/5 text-slate-300 border border-white/10 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                                            Change Password
                                        </button>
                                    </div>
                                </div>
                            </section>
                          )}

                          {/* MEMBERSHIP TAB */}
                          {activeTab === 'membership' && (
                            <section className="space-y-12">
                                
                                {/* Plan Card */}
                                <div className="bg-gradient-to-b from-orange-600/20 to-[#0a0a0a] border-2 border-orange-600 p-8 rounded-[2.5rem] relative overflow-hidden shadow-[0_0_50px_rgba(234,88,12,0.1)]">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-3 rounded-full bg-orange-600/20">
                                                <Gem className="w-8 h-8 text-orange-500" />
                                            </div>
                                            <div>
                                                <h5 className="text-3xl font-black italic uppercase text-white">Pro Plan</h5>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold uppercase">Current</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-8 font-medium max-w-md">Most popular choice for serious fitness enthusiasts with AI plans and priority access.</p>
                                        
                                        <div className="grid md:grid-cols-4 gap-4 mb-8">
                                            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                                                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Status</p>
                                                <p className="text-lg font-black uppercase text-white">Active</p>
                                            </div>
                                            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                                                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Billing</p>
                                                <p className="text-lg font-black uppercase text-white">Monthly</p>
                                            </div>
                                            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                                                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Price</p>
                                                <p className="text-lg font-black uppercase text-white">1,999</p>
                                            </div>
                                            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                                                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Currency</p>
                                                <p className="text-lg font-black uppercase text-white">NPR</p>
                                            </div>
                                        </div>
                                        
                                        <button className="w-full bg-button-gradient text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:shadow-[0_0_30px_rgba(234,88,12,0.3)] transition-all">
                                            Manage Subscription
                                        </button>
                                    </div>
                                </div>

                                {/* Benefits */}
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 mb-6">Plan Benefits</h4>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-600">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-300">Unlimited gym access 24/7</span>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl">
                                            <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-600">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-300">3 PT sessions/month</span>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl">
                                            <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-600">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-300">Group fitness classes</span>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl">
                                            <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-600">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-300">Nutrition consultation</span>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl">
                                            <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-600">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-300">Sauna & steam room</span>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl">
                                            <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-600">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-300">Guest passes (2/mo)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Billing */}
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 mb-6">Billing Method</h4>
                                    <div className="flex items-center justify-between p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-10 bg-[#5C2D91] rounded-lg flex items-center justify-center text-white text-[8px] font-black tracking-widest border border-white/10 shadow-lg">
                                                KHALTI
                                            </div>
                                            <div>
                                                <p className="text-white font-black tracking-widest">98•••• ••••</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Verified ID</p>
                                            </div>
                                        </div>
                                        <button className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-white transition-colors">Edit</button>
                                    </div>
                                    <button className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors flex items-center gap-2">
                                        <span className="text-lg">+</span> Add payment method
                                    </button>
                                </div>
                            </section>
                          )}

                          {/* GOALS TAB */}
                          {activeTab === 'goals' && (
                            <section className="space-y-12">
                                
                                {/* Main Focus Setting */}
                                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6">
                                     <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 ml-1">Main Focus</label>
                                        <div className="relative">
                                            <select className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all appearance-none">
                                                <option>Hypertrophy (Muscle Gain)</option>
                                                <option>Strength & Power</option>
                                                <option>Endurance & Cardio</option>
                                                <option>Flexibility & Mobility</option>
                                                <option>Weight Loss</option>
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <ChevronDown className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Goal Stats */}
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-[2rem] p-6">
                                        <Gem className="text-blue-500 mb-2 w-6 h-6" />
                                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Total Goals</p>
                                        <p className="text-3xl font-black text-white italic">3</p>
                                    </div>
                                    <div className="bg-green-500/5 border border-green-500/20 rounded-[2rem] p-6">
                                        <Check className="text-green-500 mb-2 w-6 h-6" />
                                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Completed</p>
                                        <p className="text-3xl font-black text-white italic">1</p>
                                    </div>
                                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-[2rem] p-6">
                                        <ArrowDown className="text-orange-500 mb-2 w-6 h-6" />
                                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">In Progress</p>
                                        <p className="text-3xl font-black text-white italic">2</p>
                                    </div>
                                </div>

                                {/* Active Goals List */}
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 mb-6">Active Mission</h4>
                                    <div className="space-y-4">
                                        {/* Goal Item 1 */}
                                        <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/5 hover:border-orange-600/30 transition-colors group">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h5 className="text-xl font-black italic uppercase mb-1">Weight Loss Goal</h5>
                                                    <p className="text-xs text-slate-500 font-bold">Target: 75 kg • Current: 84.5 kg</p>
                                                </div>
                                                <button className="text-slate-600 hover:text-red-500 transition-colors">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                                                    <span className="text-slate-500">Progress</span>
                                                    <span className="text-orange-600">32%</span>
                                                </div>
                                                <div className="w-full bg-black h-3 rounded-full overflow-hidden border border-white/10">
                                                    <div className="bg-gradient-to-r from-orange-600 to-red-600 h-full w-[32%] group-hover:w-[35%] transition-all duration-1000"></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                                <Calendar className="w-4 h-4" />
                                                Deadline: June 1, 2025
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Previous Goals */}
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Previous Missions</h4>
                                    <div className="space-y-4 opacity-60 hover:opacity-100 transition-opacity">
                                        <div className="bg-white/[0.01] rounded-3xl p-6 border border-white/5">
                                            <div className="flex justify-between items-center mb-4">
                                                <div>
                                                    <h5 className="text-lg font-black italic uppercase mb-1 text-slate-400">Muscle Gain 5kg</h5>
                                                    <p className="text-[10px] text-slate-600 font-bold">Completed: Dec 2023</p>
                                                </div>
                                                <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-500/20">
                                                    Success
                                                </div>
                                            </div>
                                            <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-white/5">
                                                <div className="bg-green-600 h-full w-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Set New Goal */}
                                <div className="bg-[#0a0a0a] rounded-3xl p-8 border border-white/5">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 mb-6 flex items-center gap-2">
                                        <PlusCircle className="w-4 h-4" />
                                        Set New Goal
                                    </h4>
                                    <form onSubmit={(e) => { e.preventDefault(); showToast('New goal created'); }}>
                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Type</label>
                                                <div className="relative">
                                                    <select required className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all appearance-none">
                                                        <option value="">Select Type</option>
                                                        <option>Weight Loss</option>
                                                        <option>Muscle Gain</option>
                                                        <option>Endurance</option>
                                                        <option>Strength</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Target Value</label>
                                                <input required type="text" placeholder="e.g. 75 kg" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Current Value</label>
                                                <input required type="text" placeholder="e.g. 84.5 kg" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Deadline</label>
                                                <input required type="date" className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-orange-600 transition-all" />
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full bg-white/5 border border-white/10 text-slate-300 hover:bg-orange-600 hover:text-black hover:border-orange-600 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all mt-4">
                                            + Create Goal
                                        </button>
                                    </form>
                                </div>
                            </section>
                          )}

                      </div>
                  </main>
              </div>
           </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
