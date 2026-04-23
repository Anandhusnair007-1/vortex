import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Monitor,
  Server,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  AlertPanel,
  ChartCard,
  LeaderboardCard,
  LiveTaskFeed,
  MetricCard,
  NodeCapacityGrid,
  NodeManagerModal,
  PageHeader,
} from '../components';
import { getNodeCapacity } from '../services/api';

const metrics = [
  {
    label: 'Active VMs',
    value: '148',
    trend: '+6.2% vs last week',
    icon: Server,
    accent: 'text-vortyx-accent',
  },
  {
    label: 'Active VDIs',
    value: '67',
    trend: '+3.1% this week',
    icon: Monitor,
    accent: 'text-blue-300',
  },
  {
    label: 'Active Alerts',
    value: '23',
    trend: '-12.4% incident load',
    icon: AlertTriangle,
    accent: 'text-vortyx-warning',
    trendDirection: 'down',
  },
  {
    label: 'Running Tasks',
    value: '12',
    trend: '4 queued actions',
    icon: Activity,
    accent: 'text-blue-300',
  },
  {
    label: 'RFID Events Today',
    value: '356',
    trend: '+18.0% traffic',
    icon: Wifi,
    accent: 'text-vortyx-success',
  },
  {
    label: 'System Health',
    value: '99.2%',
    trend: 'All critical services up',
    icon: ShieldCheck,
    accent: 'text-vortyx-success',
  },
];

const alertTrendData = [
  { time: '00:00', alerts: 16 },
  { time: '04:00', alerts: 10 },
  { time: '08:00', alerts: 19 },
  { time: '12:00', alerts: 28 },
  { time: '16:00', alerts: 20 },
  { time: '20:00', alerts: 14 },
  { time: '23:00', alerts: 11 },
];

const provisioningTrendData = [
  { day: 'Mon', vm: 8, vdi: 5 },
  { day: 'Tue', vm: 12, vdi: 8 },
  { day: 'Wed', vm: 10, vdi: 6 },
  { day: 'Thu', vm: 14, vdi: 9 },
  { day: 'Fri', vm: 11, vdi: 7 },
  { day: 'Sat', vm: 5, vdi: 4 },
  { day: 'Sun', vm: 4, vdi: 2 },
];

const severityChartData = [
  { name: 'Critical', value: 7, color: '#EF4444' },
  { name: 'Warning', value: 10, color: '#F59E0B' },
  { name: 'Info', value: 6, color: '#4F8CFF' },
];

const liveAlerts = [
  {
    id: 'a1',
    severity: 'critical',
    device: 'sw-core-03',
    issue: 'Packet loss above 18% on uplink',
    source: 'observium',
    time: '2m ago',
    isResolved: false,
  },
  {
    id: 'a2',
    severity: 'warning',
    device: 'rfid-door-west-02',
    issue: 'Controller heartbeat delayed',
    source: 'observium',
    time: '6m ago',
    isResolved: false,
  },
  {
    id: 'a3',
    severity: 'info',
    device: 'awx-cluster',
    issue: 'Template sync completed',
    source: 'awx',
    time: '11m ago',
    isResolved: false,
  },
];

const mockNodes = [
  { id: 'n1', name: 'pve-01', vmCount: 16, cpuPercent: 72, ramPercent: 69, diskPercent: 63 },
  { id: 'n2', name: 'pve-02', vmCount: 14, cpuPercent: 56, ramPercent: 48, diskPercent: 58 },
  { id: 'n3', name: 'pve-03', vmCount: 12, cpuPercent: 61, ramPercent: 54, diskPercent: 41 },
  { id: 'n4', name: 'pve-04', vmCount: 19, cpuPercent: 78, ramPercent: 82, diskPercent: 72 },
  { id: 'n5', name: 'pve-05', vmCount: 11, cpuPercent: 44, ramPercent: 39, diskPercent: 31 },
  { id: 'n6', name: 'pve-06', vmCount: 15, cpuPercent: 67, ramPercent: 59, diskPercent: 51 },
];

const liveTasks = [
  {
    id: 't1',
    actor: 'User-01',
    action: 'created VDI-12',
    target: 'Golden image ubuntu-devops-v3',
    status: 'completed',
    time: 'just now',
  },
  {
    id: 't2',
    actor: 'User-02',
    action: 'granted RFID access',
    target: 'Door DC-ServerRoom-01 to user-07',
    status: 'completed',
    time: '3m ago',
  },
  {
    id: 't3',
    actor: 'User-03',
    action: 'resolved switch alert',
    target: 'sw-edge-19 packet drop incident',
    status: 'running',
    time: '7m ago',
  },
  {
    id: 't4',
    actor: 'User-04',
    action: 'queued VM provisioning',
    target: 'vm-sec-audit-32',
    status: 'pending',
    time: '9m ago',
  },
];

const leaderboard = [
  { name: 'User-01', points: 124 },
  { name: 'User-02', points: 110 },
  { name: 'User-03', points: 97 },
  { name: 'User-04', points: 88 },
  { name: 'User-05', points: 72 },
  { name: 'User-06', points: 66 },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a] px-3 py-2 text-xs text-vortyx-text-primary shadow-xl">
      <p className="font-semibold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-vortyx-text-secondary">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function SeverityLegend({ data }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
      {data.map((item) => (
        <div key={item.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
          <p className="font-semibold" style={{ color: item.color }}>
            {item.name}
          </p>
          <p className="mt-1 text-vortyx-text-secondary">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState([]);
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [showNodeManager, setShowNodeManager] = useState(false);
  
  const alertCount = useMemo(() => liveAlerts.length, []);

  useEffect(() => {
    async function fetchNodes() {
      try {
        const data = await getNodeCapacity();
        setNodes(data);
      } catch (err) {
        console.error('Failed to fetch node capacity:', err);
        setNodes(mockNodes); // Fallback to mocks for demo
      } finally {
        setLoadingNodes(false);
      }
    }
    fetchNodes();
  }, []);

  const handleRefreshNodes = async () => {
    setLoadingNodes(true);
    try {
      const data = await getNodeCapacity();
      setNodes(data);
    } catch (err) {
      console.error('Failed to refresh node capacity:', err);
    } finally {
      setLoadingNodes(false);
    }
  };

  const handleNodeClick = (node) => {
    navigate(`/datacenter/nodes/${node.id || node.name}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Command Center"
        subtitle="Enterprise visibility across provisioning, infrastructure health, RFID control, and active incident response."
      />

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <ChartCard title="Alert Trends" subtitle="24-hour incident pressure" className="xl:col-span-5">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={alertTrendData}>
              <defs>
                <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="alerts" name="Alerts" stroke="#3B82F6" fill="url(#alertGrad)" strokeWidth={2.4} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Provisioning Activity" subtitle="VM vs VDI over 7 days" className="xl:col-span-4">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={provisioningTrendData}>
              <defs>
                <linearGradient id="vmBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.78} />
                </linearGradient>
                <linearGradient id="vdiBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#93C5FD" stopOpacity={0.92} />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.74} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9FB0D0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="vm" name="VM" fill="url(#vmBarGrad)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="vdi" name="VDI" fill="url(#vdiBarGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="xl:col-span-3">
          <AlertPanel title="Live Alerts" alerts={liveAlerts} />
          <p className="mt-3 flex items-center gap-2 text-xs text-vortyx-text-muted">
            <AlertTriangle className="h-3.5 w-3.5 text-vortyx-warning" />
            {alertCount} unresolved alerts require action
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <NodeCapacityGrid 
            nodes={nodes} 
            loading={loadingNodes} 
            onNodeClick={handleNodeClick} 
            onManageNodes={() => setShowNodeManager(true)}
          />
        </div>

        <ChartCard title="Alert Severity" subtitle="Current unresolved distribution" className="xl:col-span-3">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={severityChartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={86}
                paddingAngle={3}
              >
                {severityChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <SeverityLegend data={severityChartData} />
        </ChartCard>

        <div className="xl:col-span-4">
          <LiveTaskFeed tasks={liveTasks} />
        </div>
      </section>

      <section>
        <LeaderboardCard data={leaderboard} />
      </section>

      <NodeManagerModal 
        open={showNodeManager} 
        onClose={() => setShowNodeManager(false)} 
        onRefresh={handleRefreshNodes}
      />
    </div>
  );
}
