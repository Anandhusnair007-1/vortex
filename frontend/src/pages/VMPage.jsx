import React, { useEffect, useMemo, useState } from 'react';
import { Filter, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  GlobalSearchBar,
  LiveTaskFeed,
  NodeCapacityGrid,
  PageHeader,
  ProvisionModal,
  VMSearchResults,
} from '../components';
import { 
  getNodeCapacity, 
  getProvisioningTasks, 
  getVMs, 
  provisionVDI, 
  provisionVM,
  updateWorkload,
  deleteWorkload
} from '../services/api';

export function VMPage() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [nodeFilter, setNodeFilter] = useState('all');
  const [openModal, setOpenModal] = useState(null);
  const [inventoryRows, setInventoryRows] = useState([]);
  const [nodeCapacity, setNodeCapacity] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPage = async () => {
    setIsLoading(true);
    try {
      const [inventory, nodes, liveTasks] = await Promise.all([
        getVMs(),
        getNodeCapacity(),
        getProvisioningTasks(),
      ]);
      setInventoryRows(inventory);
      setNodeCapacity(nodes);
      setTasks(liveTasks);
    } catch (error) {
      toast.error(error.message || 'Failed to load provisioning center');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const nodes = useMemo(() => ['all', ...new Set(inventoryRows.map((item) => item.node))], [inventoryRows]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return inventoryRows.filter((item) => {
      if (nodeFilter !== 'all' && item.node !== nodeFilter) return false;

      if (activeFilter === 'vm' || activeFilter === 'vdi') {
        if (item.type !== activeFilter) return false;
      }

      if (activeFilter === 'running' || activeFilter === 'stopped') {
        if (item.status !== activeFilter) return false;
      }

      if (!normalized) return true;
      return [item.name, item.ip, item.owner, item.node].some((field) =>
        String(field || '').toLowerCase().includes(normalized)
      );
    });
  }, [activeFilter, inventoryRows, nodeFilter, query]);

  const handleProvisionSubmit = async (payload, mode) => {
    try {
      if (mode === 'vm') {
        await provisionVM(payload);
      } else {
        await provisionVDI(payload);
      }
      toast.success(`${mode.toUpperCase()} request queued for ${payload.name}`);
      setOpenModal(null);
      await loadPage();
    } catch (error) {
      toast.error(error.message || `Failed to queue ${mode.toUpperCase()} request`);
    }
  };

  const handleDecommission = async (id) => {
    if (!window.confirm('Are you sure you want to decommission this workload? This action will remove it from VORTYX inventory but preserves the Proxmox instance (use Proxmox for hard deletion).')) return;
    try {
      await deleteWorkload(id);
      toast.success('Workload decommissioned successfully');
      await loadPage();
    } catch (err) {
      toast.error(err.message || 'Failed to decommission workload');
    }
  };

  const handleEditWorkload = async (workload) => {
    const newOwner = window.prompt(`Update owner for ${workload.name}:`, workload.owner || '');
    if (newOwner === null) return;
    try {
      await updateWorkload(workload.id, { owner: newOwner });
      toast.success('Workload metadata updated');
      await loadPage();
    } catch (err) {
      toast.error(err.message || 'Failed to update workload');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provisioning Center"
        subtitle="Provision, search, and manage workloads across Proxmox nodes with async task tracking"
        actions={
          <>
            <button type="button" onClick={() => setOpenModal('vm')} className="vortyx-btn-primary">
              <PlusCircle className="mr-2 h-4 w-4" />
              New VM
            </button>
            <button type="button" onClick={() => setOpenModal('vdi')} className="vortyx-btn-ghost">
              <PlusCircle className="mr-2 h-4 w-4" />
              New VDI
            </button>
          </>
        }
      />

      <section className="vortyx-panel p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <GlobalSearchBar
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by VM name, IP, owner, or node"
          />

          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-vortyx-text-secondary">
            <Filter className="h-4 w-4" />
            Live inventory filters
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {['all', 'vm', 'vdi', 'running', 'stopped'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilter === filter
                  ? 'border-white/20 bg-white/12 text-vortyx-text-primary'
                  : 'border-white/10 bg-white/[0.03] text-vortyx-text-secondary hover:border-white/20 hover:text-vortyx-text-primary'
              }`}
            >
              {filter === 'all' ? 'All' : filter.toUpperCase()}
            </button>
          ))}

          <div className="ml-auto inline-flex items-center gap-2">
            <label className="text-xs text-vortyx-text-muted">By Node</label>
            <select
              className="vortyx-input h-9 w-36 py-0 text-xs"
              value={nodeFilter}
              onChange={(event) => setNodeFilter(event.target.value)}
            >
              {nodes.map((node) => (
                <option key={node} value={node}>
                  {node === 'all' ? 'All Nodes' : node}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-vortyx-text-secondary">
              Inventory Results
            </h2>
            <p className="text-xs text-vortyx-text-muted">{filteredRows.length} workloads matched</p>
          </div>
          <VMSearchResults 
            rows={filteredRows} 
            loading={isLoading} 
            emptyMessage="No VM/VDI matched your filters." 
            onDelete={handleDecommission}
            onEdit={handleEditWorkload}
          />
        </div>

        <div className="xl:col-span-4">
          <LiveTaskFeed tasks={tasks.slice(0, 8)} loading={isLoading} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-vortyx-text-secondary">
          Node Utilization
        </h2>
        <NodeCapacityGrid nodes={nodeCapacity} loading={isLoading} />
      </section>

      <ProvisionModal
        open={openModal === 'vm'}
        mode="vm"
        onClose={() => setOpenModal(null)}
        onSubmit={handleProvisionSubmit}
      />

      <ProvisionModal
        open={openModal === 'vdi'}
        mode="vdi"
        onClose={() => setOpenModal(null)}
        onSubmit={handleProvisionSubmit}
      />
    </div>
  );
}
