import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Filter,
  History,
  Play,
  ShieldAlert,
  Volume2,
  VolumeX,
  Siren,
  ToggleLeft,
  ToggleRight,
  Webhook,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader, StatusBadge } from '../components';
import { useAlertSocket } from '../hooks/useAlertSocket';
import { playAlertBeep, playTestBeep } from '../utils/sound';

const SOUND_PREF_KEY = 'vortyxAlertSoundEnabled';

const ACTIVE_ALERTS = [
  {
    id: 'al-01',
    severity: 'critical',
    device: 'sw-core-03',
    issue: 'Packet loss above 18% on uplink',
    source: 'observium',
    status: 'open',
    since: '2m',
  },
  {
    id: 'al-02',
    severity: 'warning',
    device: 'rfid-door-west-02',
    issue: 'Controller heartbeat delayed',
    source: 'observium',
    status: 'open',
    since: '6m',
  },
  {
    id: 'al-03',
    severity: 'info',
    device: 'awx-cluster',
    issue: 'Playbook run completed with warnings',
    source: 'awx',
    status: 'open',
    since: '11m',
  },
  {
    id: 'al-04',
    severity: 'warning',
    device: 'cam-hq-east-14',
    issue: 'RTSP stream intermittent',
    source: 'observium',
    status: 'open',
    since: '17m',
  },
];

const ALERT_HISTORY = [
  {
    id: 'h-01',
    source: 'observium',
    severity: 'critical',
    device: 'sw-core-03',
    issue: 'Packet loss above 18% on uplink',
    status: 'resolved',
    createdAt: '2026-03-24 10:23',
  },
  {
    id: 'h-02',
    source: 'awx',
    severity: 'warning',
    device: 'awx-cluster',
    issue: 'Template sync timeout retry',
    status: 'open',
    createdAt: '2026-03-24 10:11',
  },
  {
    id: 'h-03',
    source: 'observium',
    severity: 'info',
    device: 'rfid-door-east-03',
    issue: 'Controller back online',
    status: 'resolved',
    createdAt: '2026-03-24 09:54',
  },
  {
    id: 'h-04',
    source: 'observium',
    severity: 'warning',
    device: 'camera-lobby-12',
    issue: 'Frame drops observed',
    status: 'open',
    createdAt: '2026-03-24 09:31',
  },
  {
    id: 'h-05',
    source: 'awx',
    severity: 'critical',
    device: 'provision-pipeline',
    issue: 'Playbook execution failed',
    status: 'resolved',
    createdAt: '2026-03-24 09:07',
  },
];

const SOURCES = ['all', 'observium', 'awx'];
const SEVERITIES = ['all', 'critical', 'warning', 'info'];
const STATUSES = ['all', 'open', 'resolved'];

function SummaryChip({ label, value, tone = 'neutral' }) {
  const toneMap = {
    critical: 'border-red-400/30 bg-red-500/10 text-red-200',
    warning: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
    info: 'border-blue-300/30 bg-blue-400/10 text-blue-100',
    resolved: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
    neutral: 'border-white/15 bg-white/[0.03] text-vortyx-text-secondary',
  };

  return (
    <article className={`rounded-2xl border px-3 py-2 ${toneMap[tone] || toneMap.neutral}`}>
      <p className="text-[11px] uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </article>
  );
}

function SideStatCard({ icon: Icon, title, value, hint }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-vortyx-text-muted">{title}</p>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-vortyx-text-secondary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-semibold text-vortyx-text-primary">{value}</p>
      <p className="mt-1 text-xs text-vortyx-text-secondary">{hint}</p>
    </article>
  );
}

export function MonitoringPage() {
  const [activeAlerts, setActiveAlerts] = useState(ACTIVE_ALERTS);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_PREF_KEY) !== 'false');
  const { latestAlert } = useAlertSocket({ enabled: true });

  useEffect(() => {
    if (!latestAlert) return;

    setActiveAlerts((prev) => {
      if (prev.some((item) => item.id === latestAlert.id)) return prev;
      return [latestAlert, ...prev].slice(0, 12);
    });

    if (soundEnabled) {
      playAlertBeep(latestAlert);
    }
  }, [latestAlert, soundEnabled]);

  const counts = useMemo(() => {
    const critical = activeAlerts.filter((item) => item.severity === 'critical').length;
    const warning = activeAlerts.filter((item) => item.severity === 'warning').length;
    const info = activeAlerts.filter((item) => item.severity === 'info').length;
    const resolved = ALERT_HISTORY.filter((item) => item.status === 'resolved').length;
    return { critical, warning, info, resolved };
  }, [activeAlerts]);

  const filteredHistory = useMemo(() => {
    const normalizedDevice = deviceFilter.trim().toLowerCase();

    return ALERT_HISTORY.filter((row) => {
      if (sourceFilter !== 'all' && row.source !== sourceFilter) return false;
      if (severityFilter !== 'all' && row.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!normalizedDevice) return true;
      return row.device.toLowerCase().includes(normalizedDevice);
    });
  }, [deviceFilter, severityFilter, sourceFilter, statusFilter]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_PREF_KEY, String(next));
      toast.success(next ? 'Alert sound enabled' : 'Alert sound disabled');
      return next;
    });
  };

  const testSound = () => {
    if (!soundEnabled) {
      toast.error('Enable alert sound first');
      return;
    }

    playTestBeep('critical');
    toast.success('Test alert sound played');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring & Alerts"
        subtitle="Live observability across infrastructure, automation pipelines, and access devices"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={testSound} className="vortyx-btn-ghost">
              <Play className="mr-2 h-4 w-4" />
              Test Alert Sound
            </button>
            <button type="button" onClick={toggleSound} className="vortyx-btn-ghost">
              {soundEnabled ? <ToggleRight className="mr-2 h-4 w-4" /> : <ToggleLeft className="mr-2 h-4 w-4" />}
              Sound {soundEnabled ? 'On' : 'Off'}
            </button>
          </div>
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryChip label="Critical" value={counts.critical} tone="critical" />
        <SummaryChip label="Warning" value={counts.warning} tone="warning" />
        <SummaryChip label="Info" value={counts.info} tone="info" />
        <SummaryChip label="Resolved" value={counts.resolved} tone="resolved" />
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="vortyx-panel p-4 sm:p-5 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-vortyx-text-primary">Live Alerts</h3>
              <p className="mt-1 text-xs text-vortyx-text-secondary">Real-time incident feed with optional audible notification</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-vortyx-text-secondary">
                <Siren className="h-3.5 w-3.5 text-vortyx-warning" />
                {activeAlerts.length} open incidents
              </span>
              <button
                type="button"
                onClick={toggleSound}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-vortyx-text-secondary transition hover:border-blue-400/25 hover:text-vortyx-text-primary"
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-vortyx-accent" /> : <VolumeX className="h-3.5 w-3.5 text-vortyx-text-muted" />}
                Beep {soundEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {activeAlerts.map((alert) => (
              <article key={alert.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge value={alert.severity} />
                    <StatusBadge value={alert.status} />
                  </div>
                  <span className="text-xs text-vortyx-text-muted">{alert.since} ago</span>
                </div>

                <p className="text-sm font-semibold text-vortyx-text-primary">{alert.device}</p>
                <p className="mt-1 text-xs text-vortyx-text-secondary">{alert.issue}</p>

                <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-vortyx-text-muted">
                  <span>{alert.source}</span>
                  <span>live stream</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-3 lg:col-span-4">
          <SideStatCard icon={ShieldAlert} title="Total Open Alerts" value={activeAlerts.length} hint="Across all integrated sources" />
          <SideStatCard icon={CheckCircle2} title="Resolved Today" value={14} hint="Auto + manual closures" />
          <SideStatCard icon={BellRing} title="Devices Down" value={3} hint="Needs immediate triage" />
          <SideStatCard icon={Webhook} title="Last Webhook" value="1m" hint="AWX event ingestion healthy" />
        </div>
      </section>

      <section className="vortyx-panel overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="inline-flex items-center gap-2 text-base font-semibold text-vortyx-text-primary">
              <History className="h-4 w-4" />
              Alert History
            </h3>
            <span className="text-xs text-vortyx-text-muted">{filteredHistory.length} records</span>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <label>
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-vortyx-text-muted">Source</span>
              <select className="vortyx-input h-9 py-0 text-xs" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-vortyx-text-muted">Severity</span>
              <select className="vortyx-input h-9 py-0 text-xs" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
                {SEVERITIES.map((severity) => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-vortyx-text-muted">Status</span>
              <select className="vortyx-input h-9 py-0 text-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-vortyx-text-muted">Device</span>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-vortyx-text-muted" />
                <input
                  className="vortyx-input h-9 py-0 pl-8 text-xs"
                  value={deviceFilter}
                  onChange={(event) => setDeviceFilter(event.target.value)}
                  placeholder="Filter by device"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-vortyx-text-muted">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredHistory.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-vortyx-text-secondary uppercase">{row.source}</td>
                  <td className="px-4 py-3"><StatusBadge value={row.severity} /></td>
                  <td className="px-4 py-3 font-medium text-vortyx-text-primary">{row.device}</td>
                  <td className="px-4 py-3 text-vortyx-text-secondary">{row.issue}</td>
                  <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-vortyx-text-muted">{row.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
