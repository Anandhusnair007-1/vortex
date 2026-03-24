import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection = 'up',
  accent = 'text-vortyx-accent',
  loading = false,
}) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="vortyx-panel group p-6"
    >
      {loading ? (
        <div className="space-y-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
          <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-7 w-20 animate-pulse rounded bg-white/10" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.05] ${accent}`}>
              {Icon ? <Icon className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
            </span>
          </div>
          <p className="text-sm text-vortyx-text-secondary">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-vortyx-text-primary">{value}</p>
          {trend ? (
            <p
              className={`mt-3 text-xs font-medium ${
                trendDirection === 'down' ? 'text-vortyx-danger' : 'text-vortyx-success'
              }`}
            >
              {trend}
            </p>
          ) : null}
        </>
      )}
    </motion.article>
  );
}
