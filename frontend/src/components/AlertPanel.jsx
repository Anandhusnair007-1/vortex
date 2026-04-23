import React from 'react';
import { CheckCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

import { StatusBadge } from './StatusBadge';

function AlertRow({ alert, onResolve }) {
  const severityClass = {
    critical: 'from-red-500/80 via-red-500/25 to-transparent shadow-[0_0_24px_rgba(239,68,68,0.18)]',
    warning: 'from-amber-400/80 via-amber-400/20 to-transparent',
    info: 'from-blue-400/80 via-blue-400/20 to-transparent',
  }[String(alert.severity).toLowerCase()] || 'from-white/40 via-white/10 to-transparent';

  return (
    <motion.div
      layout
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${severityClass}`} />
      <div className="mb-3 flex items-center justify-between gap-2 pl-2">
        <StatusBadge value={alert.severity} />
        <span className="text-xs text-vortyx-text-muted">{alert.time}</span>
      </div>
      <p className="pl-2 text-sm font-semibold text-vortyx-text-primary">{alert.device}</p>
      <p className="mt-1 pl-2 text-xs leading-5 text-vortyx-text-secondary">{alert.issue}</p>
      <div className="mt-4 flex items-center justify-between gap-2 pl-2">
        <span className="text-[11px] uppercase tracking-wide text-vortyx-text-muted">{alert.source}</span>
        {!alert.isResolved && onResolve ? (
          <button type="button" onClick={() => onResolve(alert.id)} className="vortyx-btn-ghost px-2 py-1 text-xs">
            Resolve
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

export function AlertPanel({ title = 'Live Alerts', alerts = [], loading = false, error = null, onResolve }) {
  return (
    <section className="vortyx-panel p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-vortyx-text-primary">
          <ShieldAlert className="h-4 w-4 text-vortyx-warning" />
          {title}
        </h3>
        <span className="text-xs text-vortyx-text-muted">{alerts.length} active</span>
      </div>

      {loading ? <div className="h-40 animate-pulse rounded-2xl bg-white/10" /> : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      {!loading && !error && alerts.length === 0 ? (
        <div className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <CheckCheck className="mb-2 h-5 w-5 text-vortyx-success" />
          <p className="text-sm font-medium text-vortyx-text-primary">No active alerts</p>
          <p className="mt-1 text-xs text-vortyx-text-secondary">All monitored systems are stable.</p>
        </div>
      ) : null}

      {!loading && !error && alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} onResolve={onResolve} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
