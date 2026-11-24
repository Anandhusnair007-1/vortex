import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-neo-bg text-neo-text font-sans flex overflow-hidden selection:bg-neo-orange selection:text-white">
      {/* Left Navigation Rail */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen relative z-10 w-full overflow-hidden">
        {/* Scrollable Content View */}
        <main className="flex-1 overflow-y-auto w-full p-8 relative">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
