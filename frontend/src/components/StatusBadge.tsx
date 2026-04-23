import React from "react";
import { RequestStatus } from "../types";

interface StatusBadgeProps {
  status: RequestStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (status: RequestStatus) => {
    switch (status) {
      case "PENDING_TL":
        return "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
      case "PENDING_IT":
        return "bg-cyan/15 border-cyan/40 text-cyan shadow-[0_0_15px_rgba(0,212,255,0.2)]";
      case "PROVISIONING":
        return "bg-purple-500/15 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] animate-glow-pulse";
      case "ACTIVE":
        return "bg-teal/15 border-teal/40 text-teal shadow-[0_0_15px_rgba(0,255,179,0.2)]";
      case "FAILED":
        return "bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
      case "REJECTED":
        return "bg-white/10 border-white/20 text-white/50";
      default:
        return "bg-white/10 border-white/20 text-white/70";
    }
  };

  const labels: Record<RequestStatus, string> = {
    PENDING_TL: "Pending Approval",
    PENDING_IT: "Ready for Provision",
    PROVISIONING: "Provisioning",
    ACTIVE: "Active",
    FAILED: "Failed",
    REJECTED: "Rejected",
  };

  return (
    <span className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase transition-all duration-500 ${getStatusStyles(status)}`}>
      {labels[status]}
    </span>
  );
};

export default StatusBadge;
