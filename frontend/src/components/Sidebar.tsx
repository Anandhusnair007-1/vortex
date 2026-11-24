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
  LogOut,
  Menu
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
    { to: "/dashboard", label: "Home", icon: <Home size={20} strokeWidth={2.5} /> },
    { to: "/request/new", label: "Apply", icon: <Building2 size={20} strokeWidth={2.5} /> },
  ];

  if (isTeamLead || isAdmin) {
    navItems.push(
      { to: "/approvals", label: "Approve", icon: <ClipboardCheck size={20} strokeWidth={2.5} /> }
    );
  }

  navItems.push(
    { to: "/requests", label: "Log", icon: <FileStack size={20} strokeWidth={2.5} /> }
  );

  if (isAdmin) {
    navItems.push(
      { to: "/admin/templates", label: "Tmpl", icon: <Library size={20} strokeWidth={2.5} /> },
      { to: "/admin/proxmox", label: "Nodes", icon: <Server size={20} strokeWidth={2.5} /> },
      { to: "/admin/users", label: "Users", icon: <Users2 size={20} strokeWidth={2.5} /> },
      { to: "/admin/settings", label: "Cfg", icon: <SettingsIcon size={20} strokeWidth={2.5} /> }
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-[88px] bg-neo-card min-h-screen py-0 flex flex-col items-center sticky top-0 z-40 border-r border-neo-border">
      {/* Top Logo / Menu Icon Area */}
      <div className="w-full h-[88px] border-b border-neo-border flex items-center justify-center bg-neo-orange text-white">
         <Menu size={28} strokeWidth={2.5} />
      </div>

      <div className="flex flex-col items-center w-full mt-4 gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative group flex flex-col items-center justify-center w-[64px] h-[64px] transition-all border ${
                isActive
                  ? "bg-neo-bg text-neo-orange border-neo-border shadow-neo-sm"
                  : "bg-white text-neo-text border-transparent hover:border-neo-border hover:shadow-neo-sm"
              }`
            }
          >
            <div className="flex flex-col items-center gap-1">
              {item.icon}
              <span className="text-[9px] font-bold uppercase tracking-widest mt-1">
                {item.label}
              </span>
              <div className="absolute left-[72px] top-1/2 -translate-y-1/2 bg-neo-text text-[10px] font-bold uppercase text-white px-3 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap border border-neo-border shadow-neo">
                {item.label}
              </div>
            </div>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center w-full border-t border-neo-border pt-4 bg-white">
        <button 
          onClick={handleLogout}
          className="relative group flex flex-col items-center justify-center w-[64px] h-[64px] bg-white text-neo-text border border-transparent hover:border-neo-border hover:shadow-neo-sm hover:text-red-600 transition-all mb-4"
        >
          <LogOut size={20} strokeWidth={2.5} />
          <span className="text-[9px] font-bold uppercase tracking-widest mt-1">
            Exit
          </span>
          <div className="absolute left-[72px] top-1/2 -translate-y-1/2 bg-red-600 text-[10px] font-bold uppercase text-white px-3 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap border border-neo-border shadow-neo">
            Logout
          </div>
        </button>

        <div className="w-full border-t border-neo-border p-4 flex justify-center bg-neo-bg">
          <div className="w-10 h-10 bg-white border border-neo-border shadow-neo-sm flex items-center justify-center font-bold text-neo-text text-sm">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
