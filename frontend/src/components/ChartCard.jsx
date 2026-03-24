import React from 'react';
import { motion } from 'framer-motion';

export function ChartCard({ title, subtitle, actions, children, loading = false, className = '' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`vortyx-panel p-6 ${className}`}
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-vortyx-text-primary sm:text-lg">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-vortyx-text-secondary">{subtitle}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="min-h-[220px]">
        {loading ? <div className="h-[220px] animate-pulse rounded-2xl bg-white/10" /> : children}
      </div>
    </motion.section>
  );
}
