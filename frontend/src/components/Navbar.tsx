import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, Search, User as UserIcon, Shield, ChevronRight, Settings as SettingsIcon, Server } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="h-20 bg-[#043055] sticky top-0 z-50 px-8 flex items-center justify-between border-b border-[#459BCB]/10">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 w-1/4">
        <div className="text-white">
          <Shield size={28} className="text-[#459BCB]" fill="currentColor" />
        </div>
        <span className="font-bold text-xl text-white tracking-widest">
          VORTEX
        </span>
      </div>

      {/* Center: Tabs */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center bg-[#01060A] rounded-full p-1 border border-[#459BCB]/10">
          <Link to="/dashboard" className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#459BCB] text-white text-sm font-semibold shadow-sm">
            <Shield size={16} className="text-[#01060A]" />
            Dashboard
          </Link>
          <Link to="/requests" className="flex items-center gap-2 px-6 py-2.5 rounded-full text-gray-400 hover:text-white text-sm font-medium transition-colors">
             <Search size={16} />
             Requests
          </Link>
          <Link to="/provisioning" className="flex items-center gap-2 px-6 py-2.5 rounded-full text-gray-400 hover:text-white text-sm font-medium transition-colors">
             <Server size={16} />
             Provisioning
          </Link>
          <Link to="/approvals" className="flex items-center gap-2 px-6 py-2.5 rounded-full text-gray-400 hover:text-white text-sm font-medium transition-colors">
             <Bell size={16} />
             Approvals
          </Link>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-4 w-1/4">
        {/* Search Input */}
        <div className="relative mr-2">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
           <input 
             type="text" 
             placeholder="Search" 
             className="w-48 bg-[#01060A] border border-[#459BCB]/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#459BCB]/30 transition-all font-medium placeholder-gray-500"
           />
        </div>
        
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#01060A] text-gray-400 hover:text-white border border-[#459BCB]/10 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#459BCB] rounded-full border-2 border-[#043055]"></span>
        </button>

        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#01060A] text-gray-400 hover:text-white border border-[#459BCB]/10 transition-colors">
          <SettingsIcon size={18} />
        </button>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#459BCB] to-[#2578B1] p-[2px] ml-2">
           <div className="w-full h-full rounded-full bg-[#043055] flex items-center justify-center overflow-hidden">
              <UserIcon size={20} className="text-white/80" />
           </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
