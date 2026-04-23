import React from 'react';

const STYLE_MAP = {
  critical: 'border-red-400/35 bg-red-500/12 text-red-200',
  warning: 'border-amber-300/35 bg-amber-400/12 text-amber-100',
  info: 'border-blue-300/35 bg-blue-400/12 text-blue-100',
  success: 'border-emerald-300/35 bg-emerald-400/12 text-emerald-100',
  running: 'border-emerald-300/35 bg-emerald-400/12 text-emerald-100',
  online: 'border-emerald-300/35 bg-emerald-400/12 text-emerald-100',
  stopped: 'border-slate-300/20 bg-slate-300/10 text-slate-200',
  offline: 'border-red-400/35 bg-red-500/12 text-red-200',
  resolved: 'border-slate-300/20 bg-slate-300/10 text-slate-200',
  pending: 'border-blue-300/35 bg-blue-400/12 text-blue-100',
  failed: 'border-red-400/35 bg-red-500/12 text-red-200',
};

export function StatusBadge({ value, className = '' }) {
  const key = String(value || '').toLowerCase();
  const style = STYLE_MAP[key] || 'border-white/15 bg-white/5 text-vortyx-text-secondary';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${style} ${className}`}
    >
      {String(value || 'unknown')}
    </span>
  );
}
