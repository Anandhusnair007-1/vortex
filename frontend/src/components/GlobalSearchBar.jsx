import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

export function GlobalSearchBar({
  value,
  onChange,
  onAction,
  placeholder = 'Search VMs, alerts, tasks, engineers...',
  className = '',
}) {
  return (
    <div className={`group flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] ${className}`}>
      <Search className="h-4 w-4 shrink-0 text-vortyx-text-secondary" />
      <input
        value={value}
        onChange={onChange}
        className="h-full w-full bg-transparent text-sm text-vortyx-text-primary placeholder:text-vortyx-text-muted focus:outline-none"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onAction}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-vortyx-text-secondary transition-colors hover:border-white/20 hover:text-vortyx-text-primary"
        aria-label="Advanced search"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
