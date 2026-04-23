import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import api from "../lib/api";
import { VmRequest, User } from "../types";
import { Server, Clock, CheckCircle, Settings as SettingsIcon, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");
  const location = useLocation();
  const role = user.role;

  const isIT = role === "IT_TEAM" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  const { data: requests, isLoading } = useQuery<VmRequest[]>({
    queryKey: ["requests"],
    queryFn: async () => {
      const resp = await api.get("/requests/");
      return resp.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-neo-bg min-h-screen">
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 neo-card bg-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="h-64 neo-card bg-gray-200 animate-pulse" />
      </div>
    );
  }

  const stats = {
    total: requests?.length || 0,
    active: requests?.filter(r => r.status === "ACTIVE").length || 0,
    pending: requests?.filter(r => r.status.startsWith("PENDING")).length || 0,
    provisioning: requests?.filter(r => r.status === "PROVISIONING").length || 0,
  };

  let filteredRequests = requests || [];
  let pageTitle = "DASH_BOARD";

  if (location.pathname === "/approvals") {
    if (isAdmin || isIT) {
      filteredRequests = filteredRequests.filter(r => r.status === "PENDING_IT");
      pageTitle = "IT_QUEUE";
    } else {
      filteredRequests = filteredRequests.filter(r => r.status === "PENDING_TL");
      pageTitle = "TL_QUEUE";
    }
  } else if (location.pathname === "/provisioning") {
    filteredRequests = filteredRequests.filter(r => r.status === "PROVISIONING");
    pageTitle = "PROV_QUEUE";
  } else if (location.pathname === "/requests") {
    if (isAdmin || isIT) {
      pageTitle = "ALL_REQ";
    } else {
      filteredRequests = filteredRequests.filter(r => r.requester_id === user.id);
      pageTitle = "MY_REQ";
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "ACTIVE") return <span className="neo-badge bg-green-400 text-black border-neo-border">ACTIVE</span>;
    if (status.startsWith("PENDING")) return <span className="neo-badge-orange">{status.replace("_", " ")}</span>;
    if (status === "PROVISIONING") return <span className="neo-badge bg-blue-400 text-black border-neo-border">PROVISION</span>;
    return <span className="neo-badge bg-red-500 text-white border-neo-border">{status}</span>;
  };

  return (
    <div className="bg-neo-bg min-h-screen text-neo-text p-4 md:p-8 font-sans">
      {/* Page Title & Top Header */}
      <div className="mb-8 border-b-2 border-neo-border pb-4 flex justify-between items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-neo-muted mb-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-neo-orange inline-block"></span> VORTEX SYSTEM
          </p>
          <h1 className="text-6xl md:text-8xl font-pixel text-neo-text leading-none tracking-tighter uppercase">
            {pageTitle}
          </h1>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-xs font-mono font-bold uppercase tracking-widest bg-white border border-neo-border px-3 py-1 shadow-neo-sm">
            USER: {user.name}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="neo-card p-0 flex flex-col">
          <div className="p-4 border-b border-neo-border flex justify-between items-center bg-gray-50">
            <span className="text-xs font-bold uppercase tracking-widest">Total Req</span>
            <Server size={16} strokeWidth={2.5} />
          </div>
          <div className="p-6 flex items-end justify-between">
            <p className="text-5xl font-pixel">{stats.total}</p>
            <p className="text-xs font-mono text-neo-muted mb-1">UNITS</p>
          </div>
        </div>
        
        <div className="neo-card p-0 flex flex-col">
          <div className="p-4 border-b border-neo-border flex justify-between items-center bg-neo-orange text-white">
            <span className="text-xs font-bold uppercase tracking-widest">Pending</span>
            <Clock size={16} strokeWidth={2.5} />
          </div>
          <div className="p-6 flex items-end justify-between">
            <p className="text-5xl font-pixel">{stats.pending}</p>
            <p className="text-xs font-mono text-neo-muted mb-1">AWAIT</p>
          </div>
        </div>
        
        <div className="neo-card p-0 flex flex-col">
          <div className="p-4 border-b border-neo-border flex justify-between items-center bg-blue-400 text-black">
            <span className="text-xs font-bold uppercase tracking-widest">Deploying</span>
            <Server size={16} strokeWidth={2.5} />
          </div>
          <div className="p-6 flex items-end justify-between">
            <p className="text-5xl font-pixel">{stats.provisioning}</p>
            <p className="text-xs font-mono text-neo-muted mb-1">PROV</p>
          </div>
        </div>
        
        <div className="neo-card p-0 flex flex-col">
          <div className="p-4 border-b border-neo-border flex justify-between items-center bg-green-400 text-black">
            <span className="text-xs font-bold uppercase tracking-widest">Active</span>
            <CheckCircle size={16} strokeWidth={2.5} />
          </div>
          <div className="p-6 flex items-end justify-between">
            <p className="text-5xl font-pixel">{stats.active}</p>
            <p className="text-xs font-mono text-neo-muted mb-1">LIVE</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="neo-card overflow-hidden">
        <div className="bg-neo-text text-white p-3 border-b border-neo-border flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-white inline-block"></span> REQUEST LOG
          </h2>
          <span className="font-pixel text-xl">{filteredRequests.length.toString().padStart(2, '0')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-neo-border text-xs font-bold uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 border-r border-neo-border">Request ID / Title</th>
                <th className="px-6 py-4 border-r border-neo-border">Template</th>
                <th className="px-6 py-4 border-r border-neo-border">User</th>
                <th className="px-6 py-4 border-r border-neo-border">Date</th>
                <th className="px-6 py-4 border-r border-neo-border">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neo-border">
              {filteredRequests.map((req, idx) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 border-r border-neo-border">
                    <div>
                      <p className="font-bold text-neo-text group-hover:text-neo-orange transition-colors">
                        {req.title}
                      </p>
                      <p className="text-xs font-mono text-neo-muted mt-1">
                        REQ-{req.id.toString().padStart(4, '0')}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-r border-neo-border font-mono text-sm">
                    {req.template?.name || "-"}
                  </td>
                  <td className="px-6 py-4 border-r border-neo-border font-medium">
                    {req.requester?.name || req.requester?.email || "Unknown"}
                  </td>
                  <td className="px-6 py-4 border-r border-neo-border font-mono text-sm">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 border-r border-neo-border">
                    {getStatusBadge(req.status)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      to={`/request/${req.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 border border-neo-border hover:bg-neo-orange hover:text-white hover:shadow-neo-sm transition-all"
                      title="View Details"
                    >
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center border-t border-neo-border bg-gray-50">
            <div className="w-16 h-16 border-2 border-neo-border border-dashed flex items-center justify-center mb-4 text-neo-muted">
              <Server size={24} strokeWidth={2.5} />
            </div>
            <p className="font-bold uppercase tracking-widest text-neo-text">No Data Found</p>
            <p className="text-sm font-mono text-neo-muted mt-2">Queue is currently empty</p>
          </div>
        )}
      </div>
    </div>
  );
}
