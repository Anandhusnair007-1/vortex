import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#121A2B] px-3 py-2 text-xs text-vortyx-text-primary shadow-xl">
      <p className="font-semibold">{payload[0].payload.name}</p>
      <p className="text-vortyx-text-secondary">{payload[0].value} pts</p>
    </div>
  );
};

export function LeaderboardCard({ data = [], loading = false }) {
  return (
    <section className="vortyx-panel p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-base font-semibold text-vortyx-text-primary">Engineer Leaderboard</h3>
        <span className="text-xs text-vortyx-text-muted">Monthly points</span>
      </div>

      {loading ? <div className="h-64 animate-pulse rounded-2xl bg-white/10" /> : null}

      {!loading && data.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-vortyx-text-secondary">
          No leaderboard data available.
        </div>
      ) : null}

      {!loading && data.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="leaderboardBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.82} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="points" radius={[8, 8, 0, 0]} fill="url(#leaderboardBlue)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </section>
  );
}
