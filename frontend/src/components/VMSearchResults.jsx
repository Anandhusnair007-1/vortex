import React from 'react';
import { ExternalLink, Eye, Monitor, Settings, Trash2 } from 'lucide-react';

import { StatusBadge } from './StatusBadge';

export function VMSearchResults({ 
  rows = [], 
  loading = false, 
  emptyMessage = 'No VM or VDI entries found.',
  onEdit,
  onDelete
}) {
  return (
    <section className="vortyx-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-vortyx-text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Node</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`sk-${idx}`}>
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="h-8 animate-pulse rounded-xl bg-white/10" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-vortyx-text-secondary" colSpan={7}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="text-vortyx-text-secondary hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-vortyx-text-primary">{row.name}</td>
                  <td className="px-4 py-3 uppercase">{row.type}</td>
                  <td className="px-4 py-3">{row.node}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.ip}</td>
                  <td className="px-4 py-3">{row.owner}</td>
                  <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
                   <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button type="button" className="vortyx-btn-ghost px-2 py-1 text-xs"><Eye className="mr-1 h-3.5 w-3.5" />View</button>
                      <button type="button" className="vortyx-btn-ghost px-2 py-1 text-xs"><ExternalLink className="mr-1 h-3.5 w-3.5" />Proxmox</button>
                      {String(row.type).toLowerCase() === 'vdi' && row.guacUrl ? (
                        <a href={row.guacUrl} target="_blank" rel="noreferrer" className="vortyx-btn-ghost px-2 py-1 text-xs">
                          <Monitor className="mr-1 h-3.5 w-3.5" />
                          Open
                        </a>
                      ) : null}
                      <button 
                        type="button" 
                        onClick={() => onEdit?.(row)}
                        className="vortyx-btn-ghost px-2 py-1 text-xs text-vortyx-text-secondary hover:text-vortyx-text-primary"
                        title="Edit Metadata"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => onDelete?.(row.id)}
                        className="vortyx-btn-ghost px-2 py-1 text-xs text-rose-400/70 hover:bg-rose-400/10 hover:text-rose-400"
                        title="Decommission Workload"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
