import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Database, Key, Save, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

type SettingsTab = "glpi" | "defaults";

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("glpi");
  const [glpiConfig, setGlpiConfig] = useState({
    url: "",
    appToken: "",
    userToken: "",
  });

  const [vmDefaults, setVmDefaults] = useState({
    defaultUsername: "admin",
    defaultPassword: "CyberDrift@2026",
  });

  const saveGLPI = useMutation({
    mutationFn: async () => ({ success: true }),
    onSuccess: () => {
      toast.success("GLPI configuration saved");
    },
    onError: () => {
      toast.error("Failed to save GLPI configuration");
    },
  });

  const saveDefaults = useMutation({
    mutationFn: async () => ({ success: true }),
    onSuccess: () => {
      toast.success("VM default credentials saved");
    },
    onError: () => {
      toast.error("Failed to save VM defaults");
    },
  });

  const tabs: Array<{
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
    accent: string;
  }> = [
    {
      id: "glpi",
      label: "GLPI",
      icon: <Database size={14} />,
      accent: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    },
    {
      id: "defaults",
      label: "VM Defaults",
      icon: <ShieldCheck size={14} />,
      accent: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="mt-2 text-sm text-gray-400">
          Manage platform integrations and default credentials from a single admin view.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                isActive ? tab.accent : "border-white/10 bg-white/[0.02] text-white/45 hover:text-white/75"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "glpi" && (
        <div className="rounded-2xl border border-[#459BCB]/10 bg-[#043055] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Database size={22} className="text-cyan-300" />
            <div>
              <h2 className="text-lg font-semibold text-white">GLPI Configuration</h2>
              <p className="text-sm text-gray-400">Set the helpdesk integration details for ticket creation.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-gray-400">GLPI URL</label>
              <input
                type="text"
                value={glpiConfig.url}
                onChange={(event) => setGlpiConfig({ ...glpiConfig, url: event.target.value })}
                placeholder="https://glpi.yourcompany.com"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">App Token</label>
              <input
                type="text"
                value={glpiConfig.appToken}
                onChange={(event) => setGlpiConfig({ ...glpiConfig, appToken: event.target.value })}
                placeholder="App token"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-2 block text-sm text-gray-400">User Token</label>
              <input
                type="text"
                value={glpiConfig.userToken}
                onChange={(event) => setGlpiConfig({ ...glpiConfig, userToken: event.target.value })}
                placeholder="User token"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveGLPI.mutate()}
            disabled={saveGLPI.isPending}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#79c8f1] px-4 py-3 text-sm font-semibold text-[#01060A] transition hover:bg-[#79c8f1]/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {saveGLPI.isPending ? "Saving..." : "Save GLPI"}
          </button>
        </div>
      )}

      {activeTab === "defaults" && (
        <div className="rounded-2xl border border-[#459BCB]/10 bg-[#043055] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Key size={22} className="text-violet-300" />
            <div>
              <h2 className="text-lg font-semibold text-white">Default VM/VDI Credentials</h2>
              <p className="text-sm text-gray-400">These credentials are used for newly provisioned systems.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-gray-400">Default Username</label>
              <input
                type="text"
                value={vmDefaults.defaultUsername}
                onChange={(event) => setVmDefaults({ ...vmDefaults, defaultUsername: event.target.value })}
                placeholder="admin"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Default Password</label>
              <input
                type="text"
                value={vmDefaults.defaultPassword}
                onChange={(event) => setVmDefaults({ ...vmDefaults, defaultPassword: event.target.value })}
                placeholder="Password"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveDefaults.mutate()}
            disabled={saveDefaults.isPending}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-300 px-4 py-3 text-sm font-semibold text-[#01060A] transition hover:bg-violet-300/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {saveDefaults.isPending ? "Saving..." : "Save Defaults"}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
