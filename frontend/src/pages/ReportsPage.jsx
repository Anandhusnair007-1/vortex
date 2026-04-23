import React, { useMemo, useState } from 'react';
import { Download, Filter, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';

import { ChartCard, LeaderboardCard, PageHeader, StatusBadge } from '../components';

const LEADERBOARD = [
  { name: 'User-01', points: 124, role: 'team-lead' },
  { name: 'User-02', points: 110, role: 'engineer' },
  { name: 'User-03', points: 97, role: 'engineer' },
  { name: 'User-04', points: 88, role: 'engineer' },
  { name: 'User-05', points: 73, role: 'viewer' },
  { name: 'User-06', points: 66, role: 'engineer' },
];

const POINTS_TREND = [
  { day: 'Mon', user01: 14, user02: 11, user03: 10 },
  { day: 'Tue', user01: 18, user02: 16, user03: 12 },
  { day: 'Wed', user01: 12, user02: 13, user03: 14 },
  { day: 'Thu', user01: 20, user02: 12, user03: 16 },
  { day: 'Fri', user01: 17, user02: 18, user03: 11 },
  { day: 'Sat', user01: 9, user02: 8, user03: 6 },
  { day: 'Sun', user01: 13, user02: 9, user03: 7 },
];

const ALERT_SUMMARY = [
  { name: 'Critical', value: 12, color: '#EF4444' },
  { name: 'Warning', value: 29, color: '#F59E0B' },
  { name: 'Info', value: 38, color: '#4F8CFF' },
  { name: 'Resolved', value: 71, color: '#22C55E' },
];

const USER_ACTIVITY = [
  {
    id: 'ua-01',
    user: 'User-01',
    role: 'team-lead',
    module: 'VM Provisioning',
    tasks: 14,
    points: 124,
    incidentsResolved: 8,
    latestAction: 'Created vdi-blue-team-12',
  },
  {
    id: 'ua-02',
    user: 'User-02',
    role: 'engineer',
    module: 'RFID Control',
    tasks: 12,
    points: 110,
    incidentsResolved: 4,
    latestAction: 'Granted server room access to user-03',
  },
  {
    id: 'ua-03',
    user: 'User-03',
    role: 'engineer',
    module: 'Monitoring',
    tasks: 10,
    points: 97,
    incidentsResolved: 11,
    latestAction: 'Resolved sw-core-03 packet drop incident',
  },
  {
    id: 'ua-04',
    user: 'User-04',
    role: 'engineer',
    module: 'Automation',
    tasks: 9,
    points: 88,
    incidentsResolved: 5,
    latestAction: 'Triggered AWX remediation playbook',
  },
];

const MODULE_OPTIONS = ['all', 'vm', 'rfid', 'monitoring', 'automation'];
const DATE_OPTIONS = ['7d', '30d', '90d'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#121A2B] px-3 py-2 text-xs text-vortyx-text-primary shadow-xl">
      <p className="font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="text-vortyx-text-secondary">
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
}

function ActivityCard({ row }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-vortyx-text-primary">{row.user}</p>
          <p className="text-xs text-vortyx-text-secondary">{row.module}</p>
        </div>
        <StatusBadge value={row.role} className="capitalize" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <p className="text-[11px] text-vortyx-text-muted">Tasks</p>
          <p className="text-lg font-semibold text-vortyx-text-primary">{row.tasks}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <p className="text-[11px] text-vortyx-text-muted">Points</p>
          <p className="text-lg font-semibold text-vortyx-text-primary">{row.points}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <p className="text-[11px] text-vortyx-text-muted">Resolved</p>
          <p className="text-lg font-semibold text-vortyx-text-primary">{row.incidentsResolved}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-vortyx-text-secondary">Latest: {row.latestAction}</p>
    </article>
  );
}

export function ReportsPage() {
  const [dateRange, setDateRange] = useState('30d');
  const [engineer, setEngineer] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  const engineerOptions = useMemo(() => ['all', ...LEADERBOARD.map((item) => item.name.toLowerCase())], []);

  const filteredLeaderboard = useMemo(() => {
    if (engineer === 'all') return LEADERBOARD;
    return LEADERBOARD.filter((item) => item.name.toLowerCase() === engineer);
  }, [engineer]);

  const filteredActivities = useMemo(() => {
    return USER_ACTIVITY.filter((item) => {
      if (engineer !== 'all' && item.user.toLowerCase() !== engineer) return false;
      if (moduleFilter === 'all') return true;
      return item.module.toLowerCase().includes(moduleFilter);
    });
  }, [engineer, moduleFilter]);

  const totalPoints = useMemo(
    () => filteredLeaderboard.reduce((acc, item) => acc + item.points, 0),
    [filteredLeaderboard]
  );

  const exportCSV = () => {
    const headers = ['user', 'role', 'module', 'tasks', 'points', 'incidents_resolved', 'latest_action'];
    const rows = filteredActivities.map((row) => [
      row.user,
      row.role,
      row.module,
      row.tasks,
      row.points,
      row.incidentsResolved,
      row.latestAction,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vortyx-reports-${dateRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Reports"
        subtitle="Leadership analytics for engineer throughput, incidents, and operational quality"
        actions={
          <button type="button" className="vortyx-btn-primary" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </button>
        }
      />

      <section className="vortyx-panel p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-vortyx-text-muted">
          <Filter className="h-3.5 w-3.5" />
          Report Filters
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-vortyx-text-muted">Date Range</span>
            <select className="vortyx-input h-9 py-0 text-xs" value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
              {DATE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-vortyx-text-muted">Engineer</span>
            <select className="vortyx-input h-9 py-0 text-xs" value={engineer} onChange={(event) => setEngineer(event.target.value)}>
              {engineerOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-vortyx-text-muted">Module</span>
            <select className="vortyx-input h-9 py-0 text-xs" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
              {MODULE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="vortyx-panel p-4">
          <p className="text-xs uppercase tracking-wider text-vortyx-text-muted">Total Points</p>
          <p className="mt-1 text-2xl font-semibold text-vortyx-text-primary">{totalPoints}</p>
        </article>
        <article className="vortyx-panel p-4">
          <p className="text-xs uppercase tracking-wider text-vortyx-text-muted">Top Performer</p>
          <p className="mt-1 text-2xl font-semibold text-vortyx-text-primary">{filteredLeaderboard[0]?.name || '-'}</p>
        </article>
        <article className="vortyx-panel p-4">
          <p className="text-xs uppercase tracking-wider text-vortyx-text-muted">Incidents This Range</p>
          <p className="mt-1 text-2xl font-semibold text-vortyx-text-primary">150</p>
        </article>
        <article className="vortyx-panel p-4">
          <p className="text-xs uppercase tracking-wider text-vortyx-text-muted">Trend</p>
          <p className="mt-1 inline-flex items-center gap-1 text-2xl font-semibold text-vortyx-success">
            <TrendingUp className="h-5 w-5" />
            +8.4%
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <LeaderboardCard data={filteredLeaderboard} />
        </div>

        <ChartCard title="Engineer Points Trend" subtitle={`Window: ${dateRange}`} className="xl:col-span-5">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={POINTS_TREND}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#9FB0D0', fontSize: 11 }} />
              <Line type="monotone" dataKey="user01" name="User-01" stroke="#4F8CFF" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="user02" name="User-02" stroke="#22C55E" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="user03" name="User-03" stroke="#F59E0B" strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alert Summary" subtitle="Incident distribution" className="xl:col-span-3">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={ALERT_SUMMARY} dataKey="value" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={3}>
                {ALERT_SUMMARY.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {filteredActivities.map((row) => (
          <ActivityCard key={row.id} row={row} />
        ))}

        {filteredActivities.length === 0 ? (
          <div className="vortyx-panel flex min-h-[180px] items-center justify-center p-6 text-center text-sm text-vortyx-text-secondary lg:col-span-2">
            No activity cards match your current filters.
          </div>
        ) : null}
      </section>

      <ChartCard title="Module Throughput" subtitle="Actions completed per module">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={[
              { module: 'VM', value: 42 },
              { module: 'RFID', value: 31 },
              { module: 'Monitoring', value: 53 },
              { module: 'Automation', value: 26 },
            ]}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="module" tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="#4F8CFF" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

export default ReportsPage;
