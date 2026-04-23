import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Pencil, Plus, Save, Server, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";

type ProxmoxProfile = {
  id: string;
  name: string;
  protocol: "https" | "http";
  host: string;
  port: string;
  node: string;
  user: string;
  password: string;
  status: "Ready" | "Draft";
};

const initialProxmoxProfiles: ProxmoxProfile[] = [
  {
    id: "pve-primary",
    name: "Primary Cluster",
    protocol: "https",
    host: "pve.yourcompany.com",
    port: "8006",
    node: "pve",
    user: "root@pam",
    password: "",
    status: "Ready",
  },
];

const emptyProxmoxProfile: ProxmoxProfile = {
  id: "",
  name: "",
  protocol: "https",
  host: "",
  port: "8006",
  node: "pve",
  user: "",
  password: "",
  status: "Draft",
};

const AdminProxmox: React.FC = () => {
  const [proxmoxProfiles, setProxmoxProfiles] = useState<ProxmoxProfile[]>(initialProxmoxProfiles);
  const [selectedProxmoxId, setSelectedProxmoxId] = useState(initialProxmoxProfiles[0].id);
  const [proxmoxDraft, setProxmoxDraft] = useState<ProxmoxProfile>(initialProxmoxProfiles[0]);

  const selectedProxmox = useMemo(
    () => proxmoxProfiles.find((profile) => profile.id === selectedProxmoxId) || null,
    [proxmoxProfiles, selectedProxmoxId]
  );

  const saveProxmox = useMutation({
    mutationFn: async () => ({ success: true }),
    onSuccess: () => {
      const nextId =
        proxmoxDraft.id ||
        `${proxmoxDraft.name || "proxmox"}-${Date.now()}`.toLowerCase().replace(/\s+/g, "-");

      const nextProfile: ProxmoxProfile = {
        ...proxmoxDraft,
        id: nextId,
        status: "Ready",
      };

      setProxmoxProfiles((current) => {
        const exists = current.some((profile) => profile.id === nextId);
        return exists
          ? current.map((profile) => (profile.id === nextId ? nextProfile : profile))
          : [...current, nextProfile];
      });
      setSelectedProxmoxId(nextId);
      setProxmoxDraft(nextProfile);
      toast.success("Proxmox profile saved");
    },
    onError: () => {
      toast.error("Failed to save Proxmox profile");
    },
  });

  const testProxmox = useMutation({
    mutationFn: async () => {
      const response = await api.post("/proxmox/test-connection", {
        protocol: proxmoxDraft.protocol,
        host: proxmoxDraft.host.trim(),
        port: Number(proxmoxDraft.port),
        username: proxmoxDraft.user.trim(),
        password: proxmoxDraft.password,
        node: proxmoxDraft.node.trim() || undefined,
        verify_ssl: false,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.normalized_username && data.normalized_username !== proxmoxDraft.user) {
        setProxmoxDraft((current) => ({
          ...current,
          user: data.normalized_username,
        }));
      }
      toast.success(data?.message || "Proxmox connection test passed");
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Connection test failed");
    },
  });

  const beginNewProxmox = () => {
    setSelectedProxmoxId("");
    setProxmoxDraft(emptyProxmoxProfile);
    toast("Creating a new Proxmox profile");
  };

  const editProxmox = (profileId: string) => {
    const profile = proxmoxProfiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }
    setSelectedProxmoxId(profile.id);
    setProxmoxDraft(profile);
    toast.success(`Loaded ${profile.name} for editing`);
  };

  const deleteProxmox = (profileId: string) => {
    const nextProfiles = proxmoxProfiles.filter((profile) => profile.id !== profileId);
    setProxmoxProfiles(nextProfiles);

    if (selectedProxmoxId === profileId) {
      if (nextProfiles[0]) {
        setSelectedProxmoxId(nextProfiles[0].id);
        setProxmoxDraft(nextProfiles[0]);
      } else {
        setSelectedProxmoxId("");
        setProxmoxDraft(emptyProxmoxProfile);
      }
    }

    toast.success("Proxmox profile deleted");
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Proxmox Configuration</h1>
        <p className="mt-2 text-sm text-gray-400">
          Manage server connections, test access, and save Proxmox profiles from one dedicated admin page.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,1.4fr]">
        <div className="rounded-2xl border border-[#459BCB]/10 bg-[#043055] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server size={22} className="text-[#79c8f1]" />
              <div>
                <h2 className="text-lg font-semibold text-white">Server Profiles</h2>
                <p className="text-sm text-gray-400">Add, edit, or delete cluster connections.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={beginNewProxmox}
              className="inline-flex items-center gap-2 rounded-lg bg-[#79c8f1] px-3 py-2 text-sm font-semibold text-[#01060A] transition hover:bg-[#79c8f1]/85"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          <div className="space-y-3">
            {proxmoxProfiles.map((profile) => (
              <div
                key={profile.id}
                className={`rounded-xl border p-4 transition ${
                  selectedProxmox?.id === profile.id
                    ? "border-[#79c8f1]/40 bg-[#79c8f1]/10"
                    : "border-white/10 bg-[#01060A]/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => editProxmox(profile.id)}
                    className="text-left"
                  >
                    <p className="font-semibold text-white">{profile.name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {profile.protocol}://{profile.host}:{profile.port} / {profile.node}
                    </p>
                  </button>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                    {profile.status}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => editProxmox(profile.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProxmox(profile.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#459BCB]/10 bg-[#043055] p-6">
            <div className="mb-4 flex items-center gap-3">
              <Server size={22} className="text-[#79c8f1]" />
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedProxmoxId ? "Edit Server Profile" : "New Server Profile"}
              </h2>
              <p className="text-sm text-gray-400">Configure host, port, node, and login details here.</p>
              </div>
            </div>

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#79c8f1]/20 bg-[#79c8f1]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#79c8f1]">
              {selectedProxmoxId ? `Editing ${proxmoxDraft.name || "profile"}` : "New profile"}
            </div>

            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-gray-400">Profile Name</label>
              <input
                type="text"
                value={proxmoxDraft.name}
                onChange={(event) => setProxmoxDraft({ ...proxmoxDraft, name: event.target.value })}
                placeholder="Primary Cluster"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Protocol</label>
              <select
                value={proxmoxDraft.protocol}
                onChange={(event) =>
                  setProxmoxDraft({
                    ...proxmoxDraft,
                    protocol: event.target.value as ProxmoxProfile["protocol"],
                  })
                }
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              >
                <option value="https">https</option>
                <option value="http">http</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Proxmox Host</label>
              <input
                type="text"
                value={proxmoxDraft.host}
                onChange={(event) => setProxmoxDraft({ ...proxmoxDraft, host: event.target.value })}
                placeholder="10.31.1.182"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Port</label>
              <input
                type="text"
                value={proxmoxDraft.port}
                onChange={(event) => setProxmoxDraft({ ...proxmoxDraft, port: event.target.value })}
                placeholder="8006"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Node Name</label>
              <input
                type="text"
                value={proxmoxDraft.node}
                onChange={(event) => setProxmoxDraft({ ...proxmoxDraft, node: event.target.value })}
                placeholder="pve"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Username</label>
              <input
                type="text"
                value={proxmoxDraft.user}
                onChange={(event) => setProxmoxDraft({ ...proxmoxDraft, user: event.target.value })}
                placeholder="root@pam"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-2 block text-sm text-gray-400">Password</label>
              <input
                type="password"
                value={proxmoxDraft.password}
                onChange={(event) => setProxmoxDraft({ ...proxmoxDraft, password: event.target.value })}
                placeholder="password"
                className="w-full rounded-lg border border-[#459BCB]/20 bg-[#01060A] p-3 text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => testProxmox.mutate()}
              disabled={testProxmox.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {testProxmox.isPending ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="button"
              onClick={() => saveProxmox.mutate()}
              disabled={saveProxmox.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#79c8f1] px-4 py-3 text-sm font-semibold text-[#01060A] transition hover:bg-[#79c8f1]/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {saveProxmox.isPending ? "Saving..." : "Save Proxmox"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProxmox;
