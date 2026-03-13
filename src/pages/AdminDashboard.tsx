import { useState } from "react";
import { 
  Users, 
  DollarSign, 
  Activity, 
  Dumbbell, 
  UserPlus, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Bell,
  Award
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Legend
} from 'recharts';
import AdminNavbar from "@/components/AdminNavbar";
import AdminSidebar from "@/components/AdminSidebar";
import ManageUsers from "@/components/admin/ManageUsers";
import ManageGyms from "@/components/admin/ManageGyms";
import ManagePlans from "@/components/admin/ManagePlans";
import ManagePayments from "@/components/admin/ManagePayments";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('home');

  // Mock Data
  const revenueData = [
    { name: '1', revenue: 4000, refunds: 240 },
    { name: '5', revenue: 3000, refunds: 139 },
    { name: '10', revenue: 2000, refunds: 980 },
    { name: '15', revenue: 2780, refunds: 390 },
    { name: '20', revenue: 1890, refunds: 480 },
    { name: '25', revenue: 2390, refunds: 380 },
    { name: '30', revenue: 3490, refunds: 430 },
  ];

  const checkInData = [
    { name: 'Mon', count: 120 },
    { name: 'Tue', count: 132 },
    { name: 'Wed', count: 101 },
    { name: 'Thu', count: 134 },
    { name: 'Fri', count: 190 },
    { name: 'Sat', count: 230 },
    { name: 'Sun', count: 210 },
  ];

  const topGyms = [
    { name: "Iron Paradise", checkins: 1240, trend: "+12%" },
    { name: "FitZone Elite", checkins: 1100, trend: "+8%" },
    { name: "PowerHouse", checkins: 980, trend: "-2%" },
    { name: "Gold's Gym", checkins: 850, trend: "+5%" },
    { name: "Muscle Factory", checkins: 720, trend: "+1%" },
  ];

  const healthStats = [
    { label: "Payment Success", count: "98.2%", reason: "Last 7 Days", color: "text-emerald-500", icon: <CheckCircle className="w-5 h-5 text-emerald-500" /> },
    { label: "Failed Payments", count: 23, reason: "Insufficient Funds", color: "text-red-500", icon: <AlertTriangle className="w-5 h-5 text-red-500" /> },
    { label: "Khalti Failures", count: 5, reason: "Timeout", color: "text-orange-500", icon: <AlertTriangle className="w-5 h-5 text-orange-500" /> },
    { label: "Refunds Issued", count: 12, amount: "Rs. 15,000", color: "text-yellow-500", icon: <AlertTriangle className="w-5 h-5 text-yellow-500" /> },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <div className="space-y-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Dashboard <span className="text-gradient-fire">Overview</span></h1>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Welcome back, Super Admin</p>
            </div>

            {/* 1. KPI Cards (Only 4) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <KPICard title="Total Revenue" value="Rs. 4.2M" change="+12.5%" icon={<DollarSign className="w-5 h-5 text-orange-600" />} />
                <KPICard title="Active Members" value="1,240" change="+5.2%" icon={<Users className="w-5 h-5 text-orange-600" />} />
                <KPICard title="Active Gyms" value="42/45" subtext="93% Active" icon={<Dumbbell className="w-5 h-5 text-orange-600" />} />
                <KPICard title="New Users" value="156" change="+22%" icon={<UserPlus className="w-5 h-5 text-pink-500" />} />
            </div>

            {/* 2. Growth & Trend Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend */}
                <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-[2rem] p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-600" />
                            Revenue Trend
                        </h3>
                        <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs text-gray-400 outline-none">
                            <option>Last 30 Days</option>
                            <option>Last 7 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Revenue" />
                                <Line type="monotone" dataKey="refunds" stroke="#ef4444" strokeWidth={2} dot={false} name="Refunds" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Check-ins Trend with Total Check-ins Stat */}
                <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 shadow-xl flex flex-col">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                           <h3 className="font-bold text-lg text-white flex items-center gap-2 mb-2">
                               <Activity className="w-5 h-5 text-blue-500" />
                               Check-ins
                           </h3>
                           <div className="flex items-baseline gap-2">
                             <span className="text-3xl font-black text-white">15.4K</span>
                             <span className="text-xs font-bold text-green-500">+8.1% vs last month</span>
                           </div>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Total Check-ins</p>
                        </div>
                    </div>
                    <div className="h-[250px] w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={checkInData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 3. Operations & Gym Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Operations Health */}
                <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 shadow-xl">
                     <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        System Health
                    </h3>
                    <div className="space-y-4">
                        {healthStats.map((stat, idx) => (
                            <div key={idx} className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/5">
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-white font-medium text-sm mt-1">
                                        {stat.reason ? stat.reason : `Amount: ${stat.amount}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xl font-black block ${stat.color}`}>{stat.count}</span>
                                    {stat.icon && <div className="flex justify-end mt-1">{stat.icon}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Gyms */}
                <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-[2rem] p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-500" />
                            Top Performing Gyms (MTD)
                        </h3>
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <Activity className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                    <th className="pb-3 pl-2">Gym Name</th>
                                    <th className="pb-3 text-center">Check-ins</th>
                                    <th className="pb-3 text-center">Trend</th>
                                    <th className="pb-3 text-right pr-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-[11px] font-bold border-b border-white/5">
                                {topGyms.map((gym, i) => (
                                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="py-3 pl-2 text-white">{gym.name}</td>
                                        <td className="py-3 text-center text-gray-300">{gym.checkins.toLocaleString()}</td>
                                        <td className={`py-3 text-center ${gym.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{gym.trend}</td>
                                        <td className="py-3 text-right pr-2"><span className="bg-green-500/10 text-green-500 px-2 py-1 rounded-md text-[9px] uppercase tracking-wide">High Activity</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Network Peak Hours (Aggregate)</p>
                            <div className="flex gap-2">
                                <span className="w-2 h-2 rounded-full bg-white/5"></span>
                                <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                            </div>
                        </div>
                        <div className="flex items-end gap-1 h-12">
                            <div className="flex-grow bg-white/5 rounded-sm h-[20%] hover:bg-white/10 transition-all relative group"></div>
                            <div className="flex-grow bg-white/5 rounded-sm h-[15%] hover:bg-white/10 transition-all"></div>
                            <div className="flex-grow bg-orange-600/20 rounded-sm h-[45%] hover:bg-orange-600/30 transition-all"></div>
                            <div className="flex-grow bg-orange-600/40 rounded-sm h-[60%] hover:bg-orange-600/50 transition-all"></div>
                            <div className="flex-grow bg-orange-600/30 rounded-sm h-[50%] hover:bg-orange-600/40 transition-all"></div>
                            <div className="flex-grow bg-orange-600/80 rounded-sm h-[85%] hover:bg-orange-600/90 transition-all"></div>
                            <div className="flex-grow bg-orange-600 rounded-sm h-[100%] hover:bg-orange-500 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]"></div>
                            <div className="flex-grow bg-orange-600/60 rounded-sm h-[70%] hover:bg-orange-600/70 transition-all"></div>
                            <div className="flex-grow bg-white/5 rounded-sm h-[30%] hover:bg-white/10 transition-all"></div>
                        </div>
                        <div className="flex justify-between text-[8px] font-black text-gray-600 uppercase mt-2">
                            <span>6 AM</span><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span><span>9 PM</span><span>12 AM</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        );
      case 'users':
        return <ManageUsers />;
      case 'gyms':
        return <ManageGyms />;
      case 'plans':
        return <ManagePlans />;
      case 'payments':
        return <ManagePayments />;
      case 'settings':
        return <div className="text-white text-3xl font-bold p-8">Settings Section</div>;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-black text-white font-sans selection:bg-orange-500/30 flex flex-col overflow-hidden">
      <AdminNavbar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar active={activeSection} onChange={setActiveSection} />
        <main className="flex-1 overflow-y-auto p-8 relative bg-black">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, change, subtext, icon }: any) => (
    <div className="bg-[#111] border border-white/5 rounded-[1.5rem] p-5 shadow-lg hover:border-orange-600/30 transition-all group">
        <div className="flex justify-between items-start mb-2">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">{title}</p>
            <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                {icon}
            </div>
        </div>
        <h3 className="text-2xl font-black text-white mb-1">{value}</h3>
        {change && (
            <div className="flex items-center gap-1">
                {change.startsWith('+') ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-bold ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{change} vs last month</span>
            </div>
        )}
        {subtext && <p className="text-xs text-gray-400 font-medium">{subtext}</p>}
    </div>
);

export default AdminDashboard;
