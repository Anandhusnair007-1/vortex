import React from "react";
import { AuditLog } from "../types";
import { History, CircleDot } from "lucide-react";

interface Props {
  logs: AuditLog[];
}

const RequestTimeline: React.FC<Props> = ({ logs }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
      <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-2">
        <History size={18} className="text-gray-400" /> Activity Timeline
      </h3>
      <div className="relative pl-6 border-l-2 border-gray-100 space-y-8">
        {logs.map((log, idx) => (
          <div key={log.id} className="relative">
            <span className={`absolute -left-8 top-0 p-1 rounded-full bg-white border-2 ${idx === 0 ? "border-blue-600" : "border-gray-200"}`}>
              <CircleDot size={10} className={idx === 0 ? "text-blue-600" : "text-gray-400"} />
            </span>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">{log.action.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-gray-400 font-medium">{new Date(log.created_at).toLocaleString()}</p>
              </div>
              <p className="text-xs text-gray-500">Performed by <span className="font-semibold text-gray-700">{log.user?.name || "System"}</span></p>
              {log.details && (
                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 italic">
                  "{log.details}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequestTimeline;
