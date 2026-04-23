import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { Key, Eye, EyeOff, Monitor, Globe, Server } from "lucide-react";

interface Props {
  requestId: string;
  showPassword?: boolean;
}

const CredentialReveal: React.FC<Props> = ({ requestId, showPassword }) => {
  const [revealed, setRevealed] = useState(false);

  const { data: creds, isLoading } = useQuery({
    queryKey: ["credentials", requestId],
    queryFn: async () => {
      if (!showPassword) return null;
      const resp = await api.get(`/requests/${requestId}/credentials`);
      return resp.data;
    },
    enabled: showPassword,
  });

  if (isLoading) return <div className="p-6 text-center text-xs text-gray-400">Fetching credentials...</div>;

  return (
    <div className="bg-gray-900 text-white rounded-xl shadow-xl overflow-hidden border border-gray-800">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
          <Key size={10} /> VM Credentials
        </span>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500/20" />
          <div className="w-2 h-2 rounded-full bg-amber-500/20" />
          <div className="w-2 h-2 rounded-full bg-green-500/20" />
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Username</label>
          <div className="flex items-center gap-3 bg-black/30 p-2.5 rounded-lg border border-white/5 group transition hover:border-white/10">
            <Server size={14} className="text-blue-400" />
            <span className="text-sm font-mono text-blue-100">{creds?.vm_username || "Check Email"}</span>
          </div>
        </div>

        {showPassword && (
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Password</label>
            <div className="flex items-center gap-3 bg-black/30 p-2.5 rounded-lg border border-white/5">
              <Shield size={14} className="text-purple-400" />
              <input
                type={revealed ? "text" : "password"}
                readOnly
                value={creds?.vm_password || ""}
                className="bg-transparent text-sm font-mono text-purple-100 outline-none w-full"
              />
              <button
                onClick={() => setRevealed(!revealed)}
                className="text-gray-500 hover:text-white transition"
              >
                {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {showPassword && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-white/5 p-2 rounded border border-white/5">
               <p className="text-[9px] uppercase font-bold text-gray-500 flex items-center gap-1.5 mb-1"><Globe size={10} /> IP Address</p>
               <p className="text-xs font-mono">{creds?.ip_address}</p>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/5">
               <p className="text-[9px] uppercase font-bold text-gray-500 flex items-center gap-1.5 mb-1"><Monitor size={10} /> Node</p>
               <p className="text-xs font-mono">{creds?.proxmox_node}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Shield = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default CredentialReveal;
