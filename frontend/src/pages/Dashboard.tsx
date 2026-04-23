import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import api from "../lib/api";
import { VmRequest, User } from "../types";
import { Plus, Server, Clock, XCircle, CheckCircle, Settings as SettingsIcon } from "lucide-react";

export default function Dashboard() {
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");
  const location = useLocation();
  const role = user.role;

  const isTeamLead = role === "TEAM_LEAD" || role === "IT_TEAM" || role === "ADMIN";
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
      <div className="p-6 bg-[#01060A] min-h-screen">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-[#043055] animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-[#043055] animate-pulse rounded-xl" />
      </div>
    );
  }

  const stats = {
    total: requests?.length || 0,
    active: requests?.filter(r => r.status === "ACTIVE").length || 0,
    pending: requests?.filter(r => r.status.startsWith("PENDING")).length || 0,
    provisioning: requests?.filter(r => r.status === "PROVISIONING").length || 0,
    failed: requests?.filter(r => r.status === "FAILED" || r.status === "REJECTED").length || 0,
  };

  let filteredRequests = requests || [];
  let pageTitle = "Dashboard";

  if (location.pathname === "/approvals") {
    if (isAdmin || isIT) {
      filteredRequests = filteredRequests.filter(r => r.status === "PENDING_IT");
      pageTitle = "IT Approval Queue";
    } else {
      filteredRequests = filteredRequests.filter(r => r.status === "PENDING_TL");
      pageTitle = "Team Lead Approvals";
    }
  } else if (location.pathname === "/provisioning") {
    filteredRequests = filteredRequests.filter(r => r.status === "PROVISIONING");
    pageTitle = "Provisioning Queue";
  } else if (location.pathname === "/requests") {
    if (isAdmin || isIT) {
      pageTitle = "All Requests";
    } else {
      filteredRequests = filteredRequests.filter(r => r.requester_id === user.id);
      pageTitle = "My Requests";
    }
  }

  const getStatusColor = (status: string) => {
    if (status === "ACTIVE") return "text-green-400 bg-green-400/10";
    if (status.startsWith("PENDING")) return "text-yellow-400 bg-yellow-400/10";
    if (status === "PROVISIONING") return "text-blue-400 bg-blue-400/10";
    return "text-red-400 bg-red-400/10";
  };

  return (
    <div className="bg-[#01060A] min-h-screen text-gray-200 p-6 font-sans">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#043055] rounded-xl p-4 border border-[#459BCB]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#459BCB]/20 flex items-center justify-center">
              <Server size={20} className="text-[#459BCB]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">Total Requests</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#043055] rounded-xl p-4 border border-[#459BCB]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-400/20 flex items-center justify-center">
              <Clock size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
              <p className="text-xs text-gray-400">Pending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#043055] rounded-xl p-4 border border-[#459BCB]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-400/20 flex items-center justify-center">
              <Server size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.provisioning}</p>
              <p className="text-xs text-gray-400">Provisioning</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#043055] rounded-xl p-4 border border-[#459BCB]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-400/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.active}</p>
              <p className="text-xs text-gray-400">Active VMs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#043055] rounded-xl border border-[#459BCB]/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#01060A]/50 text-gray-400 text-xs">
            <tr>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Requested By</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRequests.map((req) => (
              <tr key={req.id} className="hover:bg-white/5 transition">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-white font-medium">{req.title}</p>
                    <p className="text-xs text-gray-500">{req.justification?.substring(0, 50)}...</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {req.template?.name || "-"}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {req.requester?.name || req.requester?.email || "Unknown"}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(req.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                    {req.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/request/${req.id}`} className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition">
                    <SettingsIcon size={14} />
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRequests.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <Server size={32} className="mx-auto mb-2 opacity-30" />
            <p>No requests found</p>
          </div>
        )}
      </div>
    </div>
  );
}
