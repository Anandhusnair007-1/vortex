import React from 'react';
import { Activity, CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react';

import { StatusBadge } from './StatusBadge';

const ICON_MAP = {
  pending: Clock3,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};

export function LiveTaskFeed({ tasks = [], loading = false }) {
  return (
    <section className="vortyx-panel p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-vortyx-text-primary">
          <Activity className="h-4 w-4 text-vortyx-accent" />
          Live Task Feed
        </h3>
        <span className="text-xs text-vortyx-text-muted">{tasks.length} events</span>
      </div>

      {loading ? <div className="h-44 animate-pulse rounded-2xl bg-white/10" /> : null}

      {!loading && tasks.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-vortyx-text-secondary">
          No recent task activity.
        </div>
      ) : null}

      {!loading && tasks.length > 0 ? (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const Icon = ICON_MAP[String(task.status).toLowerCase()] || Clock3;
            const spinning = String(task.status).toLowerCase() === 'running';

            return (
              <li key={task.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-vortyx-text-secondary">
                      <Icon className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-vortyx-text-primary">{task.actor} {task.action}</p>
                      <p className="mt-1 text-xs text-vortyx-text-secondary">{task.target}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge value={task.status} />
                    <p className="mt-1 text-[11px] text-vortyx-text-muted">{task.time}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
