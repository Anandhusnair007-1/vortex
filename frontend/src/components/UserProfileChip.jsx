import React from 'react';

export function UserProfileChip({ user, onClick, active = false }) {
  const initials = (user?.username || 'VX')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-vortyx-accent to-blue-300/80 text-xs font-semibold text-white">
        {initials}
      </span>
      <span className="hidden sm:block">
        <span className="block text-xs font-semibold leading-tight text-vortyx-text-primary">
          {user?.username || 'ops.user'}
        </span>
        <span className="block text-[11px] leading-tight text-vortyx-text-muted">
          {user?.role || 'engineer'}
        </span>
      </span>
    </button>
  );
}
