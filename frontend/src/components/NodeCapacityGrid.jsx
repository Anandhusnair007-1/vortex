import React from 'react';
import { Cpu, HardDrive, MemoryStick, Server } from 'lucide-react';

function UtilBar({ label, value, colorClass }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-vortyx-text-secondary">{label}</span>
        <span className="text-vortyx-text-primary">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

export function NodeCapacityGrid({ nodes = [], loading = false, onNodeClick, onManageNodes }) {
  return (
    <section className="vortyx-panel p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-vortyx-text-primary">
          <Server className="h-4 w-4 text-vortyx-accent" />
          Node Capacity
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-vortyx-text-muted">{nodes.length} nodes</span>
          <button 
            onClick={onManageNodes}
            className="vortyx-btn-ghost py-1 px-2.5 text-[10px] uppercase font-bold tracking-widest"
          >
            Manage
          </button>
        </div>
      </div>

      {loading ? <div className="h-44 animate-pulse rounded-2xl bg-white/10" /> : null}

      {!loading && nodes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-vortyx-text-secondary">
          No node telemetry yet.
        </div>
      ) : null}

      {!loading && nodes.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => (
            <article 
              key={node.id || node.name} 
              onClick={() => onNodeClick?.(node)}
              className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-300 ${onNodeClick ? 'cursor-pointer hover:border-vortyx-accent/40 hover:bg-white/[0.06] hover:translate-y-[-2px]' : ''}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-vortyx-text-primary">{node.name}</p>
                <span className="text-[11px] text-vortyx-text-muted">{node.vmCount || 0} workloads</span>
              </div>
              <div className="space-y-2.5">
                <UtilBar label={<span className="inline-flex items-center gap-1"><Cpu className="h-3 w-3" />CPU</span>} value={node.cpuPercent || 0} colorClass="bg-vortyx-accent" />
                <UtilBar label={<span className="inline-flex items-center gap-1"><MemoryStick className="h-3 w-3" />RAM</span>} value={node.ramPercent || 0} colorClass="bg-emerald-400" />
                <UtilBar label={<span className="inline-flex items-center gap-1"><HardDrive className="h-3 w-3" />Disk</span>} value={node.diskPercent || 0} colorClass="bg-sky-500" />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
