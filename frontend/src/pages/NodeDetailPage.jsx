import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Server, Cpu, MemoryStick, HardDrive, 
  Activity, ChevronLeft, Search, 
  Terminal, Power, Trash2
} from 'lucide-react';
import { PageHeader } from '../components';
import { getProxmoxNodes, getNodeWorkloads } from '../services/api';

export function NodeDetailPage() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const [node, setNode] = useState(null);
  const [workloads, setWorkloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [nodesData, workloadsData] = await Promise.all([
          getProxmoxNodes(),
          getNodeWorkloads(nodeId)
        ]);
        const foundNode = nodesData.find(n => n.id === nodeId || n.name === nodeId);
        setNode(foundNode);
        setWorkloads(workloadsData);
      } catch (err) {
        console.error('Failed to fetch node details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [nodeId]);

  const filteredWorkloads = workloads.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.ip?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex h-96 items-center justify-center text-vortyx-text-muted">Loading node telemetry...</div>;
  if (!node) return <div className="p-8 text-center text-vortyx-text-primary">Node not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-vortyx-text-secondary transition hover:bg-white/[0.06] hover:text-vortyx-text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <PageHeader 
          title={`Node: ${node.name}`} 
          subtitle={`Cluster: ${node.cluster_name || 'Stand-alone'} | Managed Infrastructure`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <ResourceCard label="CPU Cores" value={node.total_cpu || 'N/A'} subValue="Coresent" icon={Cpu} color="text-vortyx-accent" />
        <ResourceCard label="RAM Usage" value={`${node.ramPercent || 0}%`} subValue={`${Math.round((node.total_ram_gb || 0) * (node.ramPercent || 0) / 100)} GB Used`} icon={MemoryStick} color="text-emerald-400" />
        <ResourceCard label="Storage" value={`${node.diskPercent || 0}%`} subValue={`${Math.round((node.total_disk_gb || 0) * (node.diskPercent || 0) / 100)} GB Used`} icon={HardDrive} color="text-sky-500" />
        <ResourceCard label="Workloads" value={workloads.length} subValue="Active Instances" icon={Activity} color="text-purple-400" />
      </div>

      <section className="vortyx-panel overflow-hidden">
        <div className="border-b border-white/10 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-vortyx-text-primary">Managed Workloads</h3>
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vortyx-text-muted" />
              <input 
                type="text"
                placeholder="Search workloads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-10 pr-4 text-sm text-vortyx-text-primary placeholder-vortyx-text-muted transition focus:border-vortyx-accent/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-vortyx-text-muted">
              <tr>
                <th className="px-6 py-4 font-medium">Instance</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">IP Address</th>
                <th className="px-6 py-4 font-medium">Owner</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredWorkloads.map((w) => (
                <tr key={w.id} className="group transition hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-vortyx-accent/10 p-2 text-vortyx-accent">
                        <Server className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-vortyx-text-primary">{w.name}</p>
                        <p className="text-[11px] text-vortyx-text-muted">ID: {w.vmid}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize text-vortyx-text-secondary">{w.type}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      w.status === 'running' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${w.status === 'running' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {w.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-vortyx-text-secondary">{w.ip || 'N/A'}</td>
                  <td className="px-6 py-4 text-vortyx-text-secondary">{w.owner || 'System'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                      <button title="Console" className="rounded-lg p-1.5 text-vortyx-text-muted hover:bg-white/10 hover:text-vortyx-text-primary">
                        <Terminal className="h-4 w-4" />
                      </button>
                      <button title="Power" className="rounded-lg p-1.5 text-vortyx-text-muted hover:bg-white/10 hover:text-vortyx-text-primary">
                        <Power className="h-4 w-4" />
                      </button>
                      <button title="Delete" className="rounded-lg p-1.5 text-vortyx-text-muted hover:bg-rose-400/10 hover:text-rose-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ResourceCard({ label, value, subValue, icon: Icon, color }) {
  return (
    <div className="vortyx-panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-vortyx-text-muted">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-vortyx-text-primary">{value}</p>
        <p className="mt-1 text-xs text-vortyx-text-secondary">{subValue}</p>
      </div>
    </div>
  );
}
