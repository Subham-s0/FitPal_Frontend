import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Star } from 'lucide-react';
import DashboardNavbar from "@/components/DashboardNavbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Vite
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Mock Data (Ported from HTML)
const gymData = [
    {
        id: "1",
        name: "FITZONE ELITE",
        city: "Kathmandu Central",
        lat: 27.7100, lng: 85.3200,
        open: "05:00 AM", close: "11:00 PM",
        brand: "FitZone Global",
        email: "elite@fitzone.com",
        desc: "The pinnacle of high-performance training in the capital. Featuring specialized platforms for Olympic lifting, premium selectorized machines, and a dedicated recovery zone.",
        capacity: 150, checkedIn: 112,
        rating: "4.9",
        reviews: [
            { user: "Arjun K.", text: "Best squat racks in the city. Always clean.", stars: 5 },
            { user: "Sara P.", text: "Peak hours are busy but the vibe is unmatched.", stars: 4 }
        ],
        images: ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80"],
        equipment: [{ name: "Squat Racks", count: 12 }, { name: "Max Dumbbells", count: "80kg" }, { name: "Leg Press", count: 4 }, { name: "Cable Stack", count: 8 }],
        total: 142
    },
    {
        id: "2",
        name: "IRON DEPOT",
        city: "Lalitpur District",
        lat: 27.6744, lng: 85.3240,
        open: "06:00 AM", close: "10:00 PM",
        brand: "Iron Core",
        email: "iron@depot.np",
        desc: "Industrial-grade facility focused on pure hypertrophy. Built for those who prioritize iron over aesthetics, featuring vintage plates and raw concrete textures.",
        capacity: 90, checkedIn: 24,
        rating: "4.7",
        reviews: [
            { user: "Rohan S.", text: "No nonsense gym. Pure heavy lifting.", stars: 5 }
        ],
        images: ["https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&q=80"],
        equipment: [{ name: "Power Cages", count: 6 }, { name: "Flat Bench", count: 8 }, { name: "Deadlift Deck", count: 2 }, { name: "Air Bike", count: 10 }],
        total: 88
    }
];

const GymProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.CircleMarker | null>(null);

    // Find gym by ID or default to first one
    const gym = gymData.find(g => g.id === id) || gymData[0];

    useEffect(() => {
        if (!mapRef.current) return;

        // Small delay to ensure container is ready and sized
        const timer = setTimeout(() => {
            if (!mapRef.current) return;
            
            if (!mapInstanceRef.current) {
                const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([gym.lat, gym.lng], 15);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
                const marker = L.circleMarker([gym.lat, gym.lng], { radius: 8, color: '#ea580c', fillOpacity: 1 }).addTo(map);
                
                mapInstanceRef.current = map;
                markerRef.current = marker;
            } else {
                mapInstanceRef.current.setView([gym.lat, gym.lng], 15);
                mapInstanceRef.current.invalidateSize();
                if (markerRef.current) {
                    markerRef.current.setLatLng([gym.lat, gym.lng]);
                }
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [gym]);

    const handleSidebarChange = (section: string) => {
        navigate('/dashboard', { state: { activeSection: section } });
    };

    return (
        <div className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden font-sans">
            <DashboardNavbar />
            
            <div className="flex flex-1 overflow-hidden">
                <DashboardSidebar active="gyms" onChange={handleSidebarChange} />

                {/* Main Content */}
                <main className="flex-grow flex flex-col p-6 overflow-y-auto custom-scrollbar text-[13px]">
                    
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors mb-6 w-fit"
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={3} />
                        <span className="text-xs font-black uppercase tracking-widest">Back to List</span>
                    </button>

                    {/* Gallery - Displayed at Top */}
                <div className="h-[320px] flex gap-4 overflow-x-auto pb-2.5 mb-8 flex-shrink-0" id="imageGallery">
                    {gym.images.map((img, index) => (
                        <div key={index} className="min-w-[480px] h-full bg-black rounded-[1.5rem] border border-white/10 overflow-hidden flex items-center justify-center">
                            <img src={img} alt={`Gallery ${index}`} className="max-w-full max-h-full object-contain" />
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
                        
                        {/* Header Info */}
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-orange-600 font-black text-[9px] tracking-[0.3em] uppercase">Premium Facility</span>
                                        <span className="text-gray-500 text-[9px] font-bold uppercase">{`BRAND: ${gym.brand}`}</span>
                                    </div>
                                    <h1 className="text-6xl font-black tracking-tighter leading-none">
                                        {gym.name.split(' ')[0]} <span className="text-gradient-fire">{gym.name.split(' ').slice(1).join(' ')}</span>
                                    </h1>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-gray-500 font-black uppercase">Operation Window</p>
                                    <p className="text-xl font-black text-white">{`${gym.open} - ${gym.close}`}</p>
                                </div>
                            </div>
                            <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 p-5 rounded-2xl border-l-4 border-l-orange-600">
                                <p className="text-gray-400 leading-relaxed text-sm font-medium">{gym.desc}</p>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Occupancy Card */}
                            <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 p-6 rounded-[2rem]">
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Current Occupancy</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
                                        <span className="text-orange-600 text-[8px] font-black tracking-widest uppercase">Live Pulse</span>
                                    </div>
                                </div>
                                <div className="flex items-end gap-4 mb-4">
                                    <div>
                                        <p className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(234,88,12,0.3)]">{gym.checkedIn}</p>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-wider">Active</p>
                                    </div>
                                    <div className="text-gray-800 text-3xl font-light mb-1">/</div>
                                    <div>
                                        <p className="text-xl font-black text-gray-500">{gym.capacity}</p>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-wider">Capacity</p>
                                    </div>
                                </div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-orange-600 transition-all duration-1000 shadow-[0_0_15px_rgba(234,88,12,0.4)]" 
                                        style={{ width: `${(gym.checkedIn / gym.capacity) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Peak Chart Card */}
                            <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 p-6 rounded-[2rem]">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">Peak Performance Timeline</h3>
                                <div className="flex items-end justify-between h-16 gap-1.5">
                                    <div className="flex-1 bg-white/5 rounded-t h-[20%] group relative"><span className="hidden group-hover:block absolute -top-6 left-0 text-[8px] text-white">6AM</span></div>
                                    <div className="flex-1 bg-white/10 rounded-t h-[45%] group relative"><span className="hidden group-hover:block absolute -top-6 left-0 text-[8px] text-white">9AM</span></div>
                                    <div className="flex-1 bg-orange-600/20 rounded-t h-[65%] group relative"><span className="hidden group-hover:block absolute -top-6 left-0 text-[8px] text-white">12PM</span></div>
                                    <div className="flex-1 bg-orange-600 rounded-t h-[95%] group relative"><span className="hidden group-hover:block absolute -top-6 left-0 text-[8px] text-orange-600 font-bold">6PM</span></div>
                                    <div className="flex-1 bg-orange-600 rounded-t h-[85%] group relative"><span className="hidden group-hover:block absolute -top-6 left-0 text-[8px] text-white">8PM</span></div>
                                    <div className="flex-1 bg-orange-600/40 rounded-t h-[55%] group relative"><span className="hidden group-hover:block absolute -top-6 left-0 text-[8px] text-white">10PM</span></div>
                                </div>
                                <div className="flex justify-between mt-3 text-[7px] font-black text-gray-600 uppercase tracking-widest">
                                    <span>05:00</span><span>12:00</span><span>18:00 (Peak)</span><span>23:00</span>
                                </div>
                            </div>
                        </div>

                        {/* Inventory */}
                        <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 p-6 rounded-[2rem]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-black uppercase tracking-widest">Equipments</h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] text-gray-500 font-bold uppercase">Equipment Count</span>
                                    <span className="text-xl font-black text-orange-600">{gym.total}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {gym.equipment.map((e, i) => (
                                    <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl">
                                        <p className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest">{e.name}</p>
                                        <p className="text-sm font-black text-white">{e.count}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reviews */}
                        <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 p-6 rounded-[2rem]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-black uppercase tracking-widest">Community Feedback</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-orange-600">{gym.rating}</span>
                                    <div className="text-orange-600 flex gap-0.5">
                                        <Star className="w-4 h-4 fill-current" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {gym.reviews.map((r, i) => (
                                    <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] font-black uppercase text-orange-600">{r.user}</span>
                                            <span className="text-[10px] text-gray-500">{r.stars}★</span>
                                        </div>
                                        <p className="text-xs text-gray-400">{r.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Mini Map */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-[#111]/80 backdrop-blur-md rounded-[2rem] overflow-hidden flex flex-col border border-orange-600/20 shadow-2xl sticky top-6">
                            <div ref={mapRef} className="h-[220px] w-full rounded-t-[1.5rem] bg-[#0a0a0a] border-b border-white/5" />
                            <div className="p-6">
                                <div className="mb-6">
                                    <p className="text-[9px] text-gray-500 font-black uppercase mb-1">GPS Node</p>
                                    <p className="text-xs font-mono text-orange-600 font-bold">{`${gym.lat}° N, ${gym.lng}° E`}</p>
                                    <p className="mt-4 text-[9px] text-gray-500 font-black uppercase mb-1">Inquiry Portal</p>
                                    <p className="text-xs font-bold text-white truncate">{gym.email}</p>
                                </div>
                                <div className="border-t border-white/5 pt-6">
                                    <h4 className="text-[10px] font-black uppercase text-gray-500 mb-4 tracking-widest">Global Branches</h4>
                                    <div className="flex flex-col gap-2">
                                        {gymData.map((g, idx) => (
                                            <button 
                                                key={idx}
                                                className={`w-full text-left bg-white/5 border border-white/5 p-4 rounded-2xl hover:border-orange-600/50 transition-all group ${g.id === gym.id ? 'border-orange-600/50 bg-orange-600/10' : ''}`}
                                                onClick={() => navigate(`/gym/${g.id}`)}
                                            >
                                                <p className={`text-[10px] font-black transition-colors uppercase ${g.id === gym.id ? 'text-orange-600' : 'group-hover:text-orange-600'}`}>{g.name}</p>
                                                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">{g.city}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
    );
};

export default GymProfile;
