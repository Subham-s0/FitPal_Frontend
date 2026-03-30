import { Search } from "lucide-react";

interface DesktopMapSearchOverlayProps {
  value: string;
  onChange: (val: string) => void;
}

const DesktopMapSearchOverlay = ({ value, onChange }: DesktopMapSearchOverlayProps) => {
  return (
    <div className="absolute right-6 top-6 z-[1000] w-64 hidden md:block">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search gyms..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-full border border-[#2a2a2a] bg-[#141414] py-3 pl-11 pr-4 text-sm font-medium text-white outline-none transition-colors placeholder:text-slate-500 focus:border-orange-600"
        />
      </div>
    </div>
  );
};

export default DesktopMapSearchOverlay;
