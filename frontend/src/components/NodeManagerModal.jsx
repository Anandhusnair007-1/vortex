import React, { useState, useEffect } from 'react';
import { X, Plus, Server, Trash2, Edit2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProxmoxNodes, createProxmoxNode, deleteProxmoxNode } from '../services/api';

export function NodeManagerModal({ open, onClose, onRefresh }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    cluster_name: '',
    api_host: '',
    notes: ''
  });

  const loadNodes = async () => {
    setLoading(true);
    try {
      const data = await getProxmoxNodes();
      setNodes(data);
    } catch (err) {
      toast.error('Failed to load nodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadNodes();
      setIsAdding(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createProxmoxNode(formData);
      toast.success('Node added successfully');
      setFormData({ name: '', ip_address: '', cluster_name: '', api_host: '', notes: '' });
      setIsAdding(false);
      loadNodes();
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Failed to add node');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this node? VMs linked to it will lose their association.')) return;
    try {
      await deleteProxmoxNode(id);
      toast.success('Node deleted');
      loadNodes();
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Failed to delete node');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="vortyx-panel w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-white/20">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-vortyx-accent/10 p-2.5 text-vortyx-accent">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-vortyx-text-primary">Proxmox Infrastructure</h2>
              <p className="text-xs text-vortyx-text-secondary uppercase tracking-wider">Nodes Registry</p>
            </div>
          </div>
          <button onClick={onClose} className="vortyx-btn-ghost p-2 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {isAdding ? (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-vortyx-text-secondary uppercase">Node Name</label>
                  <input
                    required
                    className="vortyx-input w-full"
                    placeholder="e.g. pve-01"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-vortyx-text-secondary uppercase">IP Address</label>
                  <input
                    required
                    className="vortyx-input w-full"
                    placeholder="10.0.0.50"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-vortyx-text-secondary uppercase">Cluster Name</label>
                  <input
                    className="vortyx-input w-full"
                    placeholder="Enterprise-Datacenter-01"
                    value={formData.cluster_name}
                    onChange={(e) => setFormData({...formData, cluster_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-vortyx-text-secondary uppercase">API Endpoint (Optional)</label>
                  <input
                    className="vortyx-input w-full"
                    placeholder="https://pve-01.internal:8006"
                    value={formData.api_host}
                    onChange={(e) => setFormData({...formData, api_host: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="vortyx-btn-primary flex-1">Create Node</button>
                <button type="button" onClick={() => setIsAdding(false)} className="vortyx-btn-ghost px-6">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-vortyx-text-secondary">{nodes.length} nodes registered</p>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="vortyx-btn-ghost py-1.5 px-3 text-xs"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Host
                </button>
              </div>

              <div className="space-y-2.5">
                {nodes.length === 0 && !loading && (
                  <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 text-vortyx-text-muted">
                    <p className="text-sm">No Proxmox nodes found.</p>
                  </div>
                )}
                {nodes.map(node => (
                  <div key={node.id} className="vortyx-panel flex items-center justify-between p-4 group border-white/5 bg-white/[0.02] hover:bg-white/[0.04]">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${node.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <Server className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-vortyx-text-primary">{node.name}</h4>
                          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-vortyx-text-muted uppercase font-mono tracking-tighter">
                            {node.cluster_name || 'Standalone'}
                          </span>
                        </div>
                        <p className="text-xs text-vortyx-text-secondary font-mono">{node.ip_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 vortyx-btn-ghost rounded-lg text-vortyx-text-muted hover:text-vortyx-text-primary">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(node.id)}
                        className="p-2 vortyx-btn-ghost rounded-lg text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/10 bg-white/[0.02] flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-vortyx-text-muted flex-shrink-0" />
          <p className="text-[11px] text-vortyx-text-muted leading-relaxed">
            Nodes registered here will be scanned every 5 minutes by the VORTYX Sync Service. 
            Ensure your Proxmox API credentials have 'PVEAuditor' or higher permissions on these hosts.
          </p>
        </div>
      </div>
    </div>
  );
}
