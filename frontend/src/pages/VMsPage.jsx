import React, { useEffect, useState } from 'react';
import { useVMStore } from '../store';
import { vmsAPI } from '../api';
import { VMSearchBar, VMTable, NodeCapacityCard } from '../components/VMComponents';
import { debounce } from 'lodash';

export const VMsPage = () => {
  const { searchResults, setSearchResults, setLoading } = useVMStore();
  const [vms, setVMs] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: null, type: null });

  const handleSearch = debounce(async (query) => {
    if (query.length === 0) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await vmsAPI.search(query);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    const loadVMs = async () => {
      try {
        setLoading(true);
        const [vmsResponse, nodesResponse] = await Promise.all([
          vmsAPI.getAll(0, 100, filters),
          vmsAPI.getNodesCapacity(),
        ]);
        setVMs(vmsResponse.data);
        setNodes(nodesResponse.data);
      } catch (error) {
        console.error('Failed to load VMs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVMs();
  }, [filters]);

  const displayVMs = searchTerm ? searchResults : vms;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">VM Inventory</h1>
        <p className="text-slate-600">Search and manage virtual machines across all Proxmox nodes</p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <VMSearchBar
          onSearch={(query) => {
            setSearchTerm(query);
            handleSearch(query);
          }}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* VMs List */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">
              {searchTerm ? `Search Results (${displayVMs.length})` : `All VMs (${displayVMs.length})`}
            </h2>
          </div>
          <VMTable vms={displayVMs} />
        </div>

        {/* Nodes Capacity */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Node Capacity</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {nodes.map(node => (
              <NodeCapacityCard key={node.node} node={node} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
