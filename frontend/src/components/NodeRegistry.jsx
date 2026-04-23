import React, { useState, useEffect } from 'react';
import { 
  Server, Plus, Trash2, Edit2, 
  ExternalLink, Activity, Info 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getProxmoxNodes, 
  createProxmoxNode, 
  deleteProxmoxNode 
} from '../services/api';

export function NodeRegistry() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    cluster_name: 'Default Cluster',
    is_active: true
  });

  const fetchNodes = async () => {
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
    fetchNodes();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createProxmoxNode(formData);
      toast.success('Node registered');
      setIsAdding(false);
      setFormData({ name: '', ip_address: '', cluster_name: 'Default Cluster', is_active: true });
      fetchNodes();
    } catch (err) {
      toast.error('Failed to register node');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This will remove the node from VORTYX management.')) return;
    try {
      await deleteProxmoxNode(id);
      toast.success('Node removed');
      fetchNodes();
    } catch (err) {
      toast.error('Failed to remove node');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-vortyx-text-primary">Proxmox Infrastructure</h3>
          <p className="text-xs text-vortyx-text-secondary mt-1">Register and manage Proxmox VE hosts for automated workload discovery.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="vortyx-button-primary flex items-center gap-2"
        >
          {isAdding ? 'Cancel' : <><Plus className="h-4 w-4" /> Add Node</>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="vortyx-panel p-6 border-vortyx-accent/30 bg-vortyx-accent/5 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-vortyx-text-muted">Node Name</label>
              <input 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. pve-01"
                className="vortyx-input w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-vortyx-text-muted">IP Address / Hostname</label>
              <input 
                required
                value={formData.ip_address}
                onChange={e => setFormData({...formData, ip_address: e.target.value})}
                placeholder="192.168.1.100:8006"
                className="vortyx-input w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-vortyx-text-muted">Cluster Name</label>
              <input 
                value={formData.cluster_name}
                onChange={e => setFormData({...formData, cluster_name: e.target.value})}
                placeholder="Default Cluster"
                className="vortyx-input w-full"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="vortyx-button-primary">Register Host</button>
          </div>
        </form>
      )}

      <div className="vortyx-panel overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase font-bold tracking-widest text-vortyx-text-muted">
            <tr>
              <th className="px-6 py-4">Node / Cluster</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Capacity Total</th>
              <th className="px-6 py-4">Utilization</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-10 text-center text-vortyx-text-muted">Fetching infrastructure state...</td></tr>
            ) : nodes.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-10 text-center text-vortyx-text-muted">No nodes registered. Add your first Proxmox host to begin.</td></tr>
            ) : nodes.map(node => (
              <tr key={node.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 text-vortyx-accent">
                      <Server className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-vortyx-text-primary">{node.name}</p>
                      <p className="text-[10px] text-vortyx-text-muted flex items-center gap-1">
                        <Activity className="h-3 w-3" /> {node.ip_address} • {node.cluster_name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${node.is_active ? 'bg-vortyx-success/10 text-vortyx-success' : 'bg-vortyx-text-muted/10 text-vortyx-text-muted'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${node.is_active ? 'bg-vortyx-success animate-pulse' : 'bg-vortyx-text-muted'}`} />
                    {node.is_active ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-vortyx-text-primary font-mono">{node.total_cpu || 0} vCPUs</span>
                    <span className="text-[10px] text-vortyx-text-secondary">{node.total_ram_gb || 0} GB RAM • {node.total_disk_gb || 0} GB Disk</span>
                  </div>
                </td>
                <td className="px-6 py-4 min-w-[140px]">
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-vortyx-accent" 
                        style={{ width: `${node.cpu_percent || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-vortyx-text-muted uppercase font-bold tracking-tighter">
                      <span>LOAD: {node.cpu_percent || 0}%</span>
                      <span>RAM: {Math.round(((node.total_ram_gb - node.free_ram_gb) / (node.total_ram_gb || 1)) * 100)}%</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        const parts = node.ip_address.split(':');
                        const host = parts[0];
                        const port = parts.length > 1 ? parts[1] : 8006;
                        window.open(`https://${host}:${port}`, '_blank');
                      }}
                      className="p-2 rounded-lg bg-white/5 text-vortyx-text-muted hover:text-vortyx-text-primary hover:bg-white/10"
                      title="Open Proxmox VE"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-2 rounded-lg bg-white/5 text-vortyx-text-muted hover:text-vortyx-text-primary hover:bg-white/10"
                      title="Edit Configuration"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(node.id)}
                      className="p-2 rounded-lg bg-white/5 text-rose-400/70 hover:text-rose-400 hover:bg-rose-400/10"
                      title="Remove Node"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="vortyx-panel p-4 flex items-center gap-3 bg-white/[0.02] border-white/5">
        <div className="p-2 rounded-lg bg-vortyx-accent/10 text-vortyx-accent">
          <Info className="h-5 w-5" />
        </div>
        <div className="text-xs text-vortyx-text-secondary italic">
          Nodes marked as "Online" are periodically synced. VORTYX will automatically discover and monitor all VMs and Containers hosted on these nodes.
        </div>
      </div>
    </div>
  );
}
