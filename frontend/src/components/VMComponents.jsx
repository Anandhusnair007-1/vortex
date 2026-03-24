import React from 'react';
import { FiExternalLink, FiCheck, FiX } from 'react-icons/fi';
import { getStatusColor, truncate } from '../utils/constants';

export const VMCard = ({ vm, onSelect }) => {
  const statusColor = vm.status === 'running' ? 'text-green-600' : 'text-gray-400';

  return (
    <div
      onClick={() => onSelect?.(vm)}
      className="card cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{vm.name}</h3>
          <p className="text-xs text-slate-500">{vm.vmid} on {vm.proxmox_node}</p>
        </div>
        <span className={`badge ${vm.vm_type === 'vdi' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
          {vm.vm_type.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div>
          <p className="text-slate-500">CPU</p>
          <p className="font-semibold">{vm.cpu_cores || '?'} cores</p>
        </div>
        <div>
          <p className="text-slate-500">RAM</p>
          <p className="font-semibold">{vm.ram_gb || '?'} GB</p>
        </div>
        <div>
          <p className="text-slate-500">Disk</p>
          <p className="font-semibold">{vm.disk_gb || '?'} GB</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
          <span className={`text-xs font-medium ${statusColor} capitalize`}>{vm.status}</span>
        </div>
        {vm.guac_url && (
          <a
            href={vm.guac_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Open in Guacamole"
          >
            <FiExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  );
};

export const VMSearchBar = ({ onSearch, isLoading }) => {
  return (
    <div>
      <input
        type="text"
        placeholder="Search VMs by name, IP, owner, or node..."
        onChange={(e) => onSearch(e.target.value)}
        className="input mb-4"
        disabled={isLoading}
      />
    </div>
  );
};

export const VMTable = ({ vms, onVMSelect }) => {
  if (vms.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-slate-600">No VMs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-900">Type</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-900">Node</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-900">IP Address</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-900">Specs</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-900">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {vms.map(vm => (
            <tr key={vm.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium">{vm.name}</td>
              <td className="px-4 py-3">
                <span className="badge bg-gray-100 text-gray-800">{vm.vm_type}</span>
              </td>
              <td className="px-4 py-3 text-slate-600">{vm.proxmox_node}</td>
              <td className="px-4 py-3 text-slate-600 font-mono text-xs">{vm.ip_address || '-'}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-semibold capitalize ${getStatusColor(vm.status)}`}>
                  {vm.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {vm.cpu_cores}C / {vm.ram_gb}GB
              </td>
              <td className="px-4 py-3">
                {vm.guac_url && (
                  <a
                    href={vm.guac_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Open
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const NodeCapacityCard = ({ node }) => {
  const cpuPercent = node.total_cpu ? (node.total_cpu / 256) * 100 : 0;
  const ramPercent = node.total_ram ? (node.total_ram / 2048) * 100 : 0;
  const diskPercent = node.total_disk ? (node.total_disk / 10240) * 100 : 0;

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-3">{node.node}</h3>
      <div className="space-y-3 text-xs">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-600">CPU</span>
            <span className="text-slate-900 font-semibold">{node.total_cpu} cores</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(cpuPercent, 100)}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-600">RAM</span>
            <span className="text-slate-900 font-semibold">{node.total_ram} GB</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${Math.min(ramPercent, 100)}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-600">Disk</span>
            <span className="text-slate-900 font-semibold">{node.total_disk} GB</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full"
              style={{ width: `${Math.min(diskPercent, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3">{node.vm_count} VMs</p>
    </div>
  );
};
