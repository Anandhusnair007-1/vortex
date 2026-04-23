import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#01060A] text-white font-sans flex overflow-hidden">
      {/* Left Navigation Rail */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen relative z-10 w-full overflow-hidden">
        {/* Scrollable Content View */}
        <main className="flex-1 overflow-y-auto w-full p-8 relative">
          <Outlet />
        </main>
      </div>
      
      {/* Cinematic Ambient Glow Effects */}
      <div className="pointer-events-none fixed top-[-20vh] right-[-10vw] w-[40vw] h-[40vw] rounded-full bg-[#459BCB]/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-20vh] left-[-10vw] w-[30vw] h-[30vw] rounded-full bg-[#2578B1]/10 blur-[120px]" />
    </div>
  );
};

export default Layout;
