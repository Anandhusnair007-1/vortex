import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  Home, 
  Building2, 
  ClipboardCheck, 
  FileStack, 
  Library, 
  Server,
  Users2, 
  Settings as SettingsIcon,
  LogOut
} from "lucide-react";
import { User } from "../types";
import { useAuth } from "../hooks/useAuth";

const Sidebar: React.FC = () => {
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const role = user.role;

  const isAdmin = role === "ADMIN";
  const isTeamLead = role === "TEAM_LEAD";

  const navItems: { to: string; label: string; icon: React.ReactNode }[] = [
    { to: "/dashboard", label: "Dashboard", icon: <Home size={22} /> },
    { to: "/request/new", label: "New Request", icon: <Building2 size={22} /> },
  ];

  if (isTeamLead || isAdmin) {
    navItems.push(
      { to: "/approvals", label: "Approvals", icon: <ClipboardCheck size={22} /> }
    );
  }

  navItems.push(
    { to: "/requests", label: "All Requests", icon: <FileStack size={22} /> }
  );

  if (isAdmin) {
    navItems.push(
      { to: "/admin/templates", label: "VM Templates", icon: <Library size={22} /> },
      { to: "/admin/proxmox", label: "Servers", icon: <Server size={22} /> },
      { to: "/admin/users", label: "Users", icon: <Users2 size={22} /> },
      { to: "/admin/settings", label: "Settings", icon: <SettingsIcon size={22} /> }
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-[88px] bg-[#01060A] min-h-screen py-8 flex flex-col items-center sticky top-0 z-40 border-r border-[#459BCB]/10">
      <div className="flex flex-col items-center gap-1 w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative group flex flex-col items-center justify-center w-full py-5 transition-all duration-300 ${
                isActive ? "text-[#459BCB]" : "text-gray-500 hover:text-white"
              }`
            }
          >
            <div className="flex flex-col items-center gap-1">
              {item.icon}
              <div className="absolute left-[88px] top-1/2 -translate-y-1/2 bg-[#043055] text-[10px] font-bold uppercase text-white px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 whitespace-nowrap">
                {item.label}
              </div>
            </div>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center w-full">
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-full py-5 text-gray-500 hover:text-red-400 transition-all"
        >
          <LogOut size={22} />
          <div className="absolute left-[88px] top-1/2 -translate-y-1/2 bg-[#043055] text-[10px] font-bold uppercase text-white px-3 py-1.5 rounded-lg opacity-0 hover:opacity-100 pointer-events-none transition-all duration-300 z-50 whitespace-nowrap">
            Logout
          </div>
        </button>

        <div className="mt-4 pb-8 flex flex-col items-center gap-3 w-full">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2578B1] to-[#459BCB] flex items-center justify-center font-bold text-[#01060A] text-sm">
            {user.name?.[0] || "U"}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
