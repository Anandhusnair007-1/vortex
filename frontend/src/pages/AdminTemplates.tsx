import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import api from "../lib/api";
import { VmTemplate } from "../types";
import { Monitor, Cpu, HardDrive, Layout, Plus, Search, Trash2, Edit3, X, Layers3 } from "lucide-react";
import GlassSkeleton from "../components/GlassSkeleton";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type TemplateFormState = {
  name: string;
  os: string;
  os_type: VmTemplate["os_type"];
  cpu: string;
  ram_gb: string;
  disk_gb: string;
  proxmox_template_id: string;
  iso_path: string;
  description: string;
};

const initialFormState: TemplateFormState = {
  name: "",
  os: "",
  os_type: "UBUNTU",
  cpu: "2",
  ram_gb: "4",
  disk_gb: "50",
  proxmox_template_id: "",
  iso_path: "",
  description: "",
};

const AdminTemplates: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(initialFormState);

  const { data: templates, isLoading } = useQuery<VmTemplate[]>({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const resp = await api.get("/templates");
      return resp.data;
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const payload = {
        name: templateForm.name,
        os: templateForm.os,
        os_type: templateForm.os_type,
        cpu: Number(templateForm.cpu),
        ram_gb: Number(templateForm.ram_gb),
        disk_gb: Number(templateForm.disk_gb),
        proxmox_template_id: templateForm.proxmox_template_id,
        iso_path: templateForm.iso_path || undefined,
        description: templateForm.description || undefined,
        is_active: true,
      };

      const response = editingTemplateId
        ? await api.put(`/templates/${editingTemplateId}`, payload)
        : await api.post("/templates/", payload);

      return response.data;
    },
    onSuccess: () => {
      toast.success(editingTemplateId ? "Template updated successfully" : "Template created successfully");
      setIsCreateOpen(false);
      setEditingTemplateId(null);
      setTemplateForm(initialFormState);
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
    },
    onError: () => {
      toast.error(editingTemplateId ? "Failed to update template" : "Failed to create template");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      await api.delete(`/templates/${templateId}`);
    },
    onSuccess: (_, templateId) => {
      if (editingTemplateId === templateId) {
        setIsCreateOpen(false);
        setEditingTemplateId(null);
        setTemplateForm(initialFormState);
      }
      toast.success("Template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete template");
    },
  });

  const templateList = templates || [];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTemplates = useMemo(
    () =>
      templateList.filter((template) => {
        if (!template.is_active) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          template.name.toLowerCase().includes(normalizedSearch) ||
          template.os.toLowerCase().includes(normalizedSearch) ||
          template.os_type.toLowerCase().includes(normalizedSearch) ||
          template.proxmox_template_id.toLowerCase().includes(normalizedSearch)
        );
      }),
    [normalizedSearch, templateList]
  );

  const handleCreateTemplate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveTemplate.mutate();
  };

  const openCreateModal = () => {
    setEditingTemplateId(null);
    setTemplateForm(initialFormState);
    setIsCreateOpen(true);
  };

  const openEditModal = (template: VmTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      os: template.os,
      os_type: template.os_type as VmTemplate["os_type"],
      cpu: String(template.cpu),
      ram_gb: String(template.ram_gb),
      disk_gb: String(template.disk_gb),
      proxmox_template_id: template.proxmox_template_id,
      iso_path: template.iso_path || "",
      description: template.description || "",
    });
    setIsCreateOpen(true);
  };

  const closeTemplateModal = () => {
    setIsCreateOpen(false);
    setEditingTemplateId(null);
    setTemplateForm(initialFormState);
  };

  if (isLoading) {
    return (
      <div className="space-y-10 animate-fade-in-up">
        <div className="flex justify-between items-center">
          <GlassSkeleton className="h-10 w-64" />
          <GlassSkeleton className="h-12 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <GlassSkeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">Infrastructure Templates</h1>
            <div className="px-3 py-1 bg-cyan/10 border border-cyan/20 rounded-full text-[10px] font-bold text-cyan uppercase tracking-widest">
              {templateList.filter((template) => template.is_active).length} active
            </div>
          </div>
          <p className="text-white/30 text-xs mt-2 font-medium">Manage template blueprints for Proxmox provisioning in one place.</p>
        </div>
        
        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-cyan transition-colors" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter templates..."
              className="glass-input w-full pl-11 pr-6 py-3 sm:w-64"
            />
          </div>
          <button className="btn-primary group w-full sm:w-auto" onClick={openCreateModal}>
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            <span>Add Template</span>
          </button>
        </div>
      </div>

      <div className="glass-card border-white/5 bg-navy-900/40 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">Template Catalog</p>
            <h2 className="mt-2 text-xl font-bold text-white">One workflow for templates and blueprints</h2>
            <p className="mt-2 text-sm text-white/35">
              “Add Template” is now the single creation action here. It creates the provisioning blueprint used by the platform.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-cyan/20 bg-cyan/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan">
            <Layers3 size={14} />
            Unified Flow
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTemplates.map((template, idx) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card group hover:scale-[1.02] transition-all bg-navy-900/40 relative overflow-hidden"
          >
            {/* Visual Flairs */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan/5 rounded-full blur-3xl group-hover:bg-cyan/10 transition-colors" />
            
            <div className="p-8 space-y-6">
              <div className="flex items-start">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-cyan group-hover:bg-accent-gradient group-hover:text-navy-900 transition-all duration-500">
                  <Monitor size={24} />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{template.name}</h3>
                <p className="text-white/40 text-xs mt-2 font-mono uppercase tracking-[0.1em]">ID: {template.id}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1.5">
                    <Cpu size={10} /> CPU
                  </p>
                  <p className="text-sm font-bold text-white">{template.cpu} Cores</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1.5">
                    <Layout size={10} /> RAM
                  </p>
                  <p className="text-sm font-bold text-white">{template.ram_gb} GB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1.5">
                    <HardDrive size={10} /> SSD
                  </p>
                  <p className="text-sm font-bold text-white">{template.disk_gb} GB</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${template.is_active ? "bg-teal shadow-[0_0_8px_rgba(0,255,179,0.5)]" : "bg-white/20"}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${template.is_active ? "text-teal" : "text-white/35"}`}>
                    {template.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(template)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTemplate.mutate(template.id)}
                    disabled={deleteTemplate.isPending}
                    className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/10 text-white/40 hover:text-rose-400 transition-all border border-transparent hover:border-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="glass-card border-white/5 bg-navy-900/40 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-white/60">No templates matched your search.</p>
          <p className="mt-2 text-xs text-white/30">Try a template name, OS, or Proxmox template ID.</p>
        </div>
      )}

      {isCreateOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md"
          onClick={closeTemplateModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-cyan/10 bg-[#04111d] shadow-2xl shadow-cyan/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">Template Builder</p>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  {editingTemplateId ? "Edit Infrastructure Template" : "Add Infrastructure Template"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeTemplateModal}
                className="rounded-xl p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="max-h-[calc(90vh-88px)] space-y-6 overflow-y-auto px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/50">Template Name</span>
                  <input
                    required
                    type="text"
                    value={templateForm.name}
                    onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
                    placeholder="Ubuntu Dev Workstation"
                    className="glass-input w-full"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/50">Operating System</span>
                  <input
                    required
                    type="text"
                    value={templateForm.os}
                    onChange={(event) => setTemplateForm({ ...templateForm, os: event.target.value })}
                    placeholder="Ubuntu 24.04"
                    className="glass-input w-full"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/50">OS Type</span>
                  <select
                    value={templateForm.os_type}
                    onChange={(event) =>
                      setTemplateForm({
                        ...templateForm,
                        os_type: event.target.value as VmTemplate["os_type"],
                      })
                    }
                    className="glass-input w-full"
                  >
                    <option value="UBUNTU">Ubuntu</option>
                    <option value="WINDOWS">Windows</option>
                    <option value="CENTOS">CentOS</option>
                    <option value="DEBIAN">Debian</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/50">Proxmox Template ID</span>
                  <input
                    required
                    type="text"
                    value={templateForm.proxmox_template_id}
                    onChange={(event) => setTemplateForm({ ...templateForm, proxmox_template_id: event.target.value })}
                    placeholder="ubuntu-2404-golden"
                    className="glass-input w-full"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/50">CPU Cores</span>
                  <input
                    required
                    min="1"
                    type="number"
                    value={templateForm.cpu}
                    onChange={(event) => setTemplateForm({ ...templateForm, cpu: event.target.value })}
                    className="glass-input w-full"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/50">RAM (GB)</span>
                  <input
                    required
                    min="1"
                    type="number"
                    value={templateForm.ram_gb}
                    onChange={(event) => setTemplateForm({ ...templateForm, ram_gb: event.target.value })}
                    className="glass-input w-full"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/50">Disk (GB)</span>
                  <input
                    required
                    min="1"
                    type="number"
                    value={templateForm.disk_gb}
                    onChange={(event) => setTemplateForm({ ...templateForm, disk_gb: event.target.value })}
                    className="glass-input w-full"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/50">ISO Path</span>
                  <input
                    type="text"
                    value={templateForm.iso_path}
                    onChange={(event) => setTemplateForm({ ...templateForm, iso_path: event.target.value })}
                    placeholder="/var/lib/vz/template/iso/ubuntu.iso"
                    className="glass-input w-full"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-medium text-white/50">Description</span>
                <textarea
                  value={templateForm.description}
                  onChange={(event) => setTemplateForm({ ...templateForm, description: event.target.value })}
                  placeholder="Baseline developer workstation with Docker and monitoring agents."
                  rows={4}
                  className="glass-input w-full resize-none"
                />
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={closeTemplateModal}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/60 transition hover:border-white/20 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveTemplate.isPending}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={16} />
                  <span>{saveTemplate.isPending ? (editingTemplateId ? "Saving..." : "Creating...") : editingTemplateId ? "Update Template" : "Save Template"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminTemplates;
