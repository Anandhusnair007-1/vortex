import React, { useEffect } from 'react';
import { useAlertStore, useTaskStore, useVMStore } from '../store';
import { alertsAPI, vmsAPI, tasksAPI, usersAPI } from '../api';
import { AlertPanel } from '../components/AlertComponents';
import toast from 'react-hot-toast';
import { FiAlertCircle, FiDatabase, FiCheckSquare, FiUsers } from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';

export const DashboardPage = () => {
  const { alerts, activeAlertCount, setAlerts, resolveAlert, setLoading: setAlertLoading } = useAlertStore();
  const { myTasks, setMyTasks, setLoading: setTasksLoading } = useTaskStore();
  const { user } = useAuthStore();
  const [stats, setStats] = React.useState({ totalVMs: 0, totalUsers: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        setAlertLoading(true);
        setTasksLoading(true);

        // Load active alerts
        const alertsResponse = await alertsAPI.getActive();
        setAlerts(alertsResponse.data);

        // Load my tasks
        if (user?.role !== 'viewer') {
          const tasksResponse = await tasksAPI.getMyTasks(0, 10, 'pending');
          setMyTasks(tasksResponse.data);
        }

        // Load stats
        const [vmsResponse, usersResponse] = await Promise.all([
          vmsAPI.getAll(0, 1),
          usersAPI.getAll(0, 1),
        ]);

        setStats({
          totalVMs: vmsResponse.data.length || 0,
          totalUsers: usersResponse.data.length || 0,
        });
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setAlertLoading(false);
        setTasksLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Welcome back, {user?.username}!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FiAlertCircle}
          label="Active Alerts"
          value={activeAlertCount}
          color="text-red-600"
          href="/alerts"
        />
        <StatCard
          icon={FiCheckSquare}
          label="My Tasks"
          value={myTasks.length}
          color="text-blue-600"
          href="/tasks"
        />
        <StatCard
          icon={FiDatabase}
          label="Total VMs"
          value={stats.totalVMs}
          color="text-purple-600"
          href="/vms"
        />
        <StatCard
          icon={FiUsers}
          label="Team Members"
          value={stats.totalUsers}
          color="text-green-600"
          href="/users"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts Section */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Active Alerts</h2>
          </div>
          <AlertPanel alerts={alerts} onResolve={resolveAlert} />
        </div>

        {/* Quick Info */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-3">Quick Info</h3>
            <div className="space-y-3 text-sm">
              <div className="border-b border-slate-200 pb-3">
                <p className="text-slate-600">Your Role</p>
                <p className="font-semibold text-slate-900 capitalize">{user?.role}</p>
              </div>
              <div className="border-b border-slate-200 pb-3">
                <p className="text-slate-600">Points Earned</p>
                <p className="font-semibold text-slate-900 flex items-center gap-1">
                  {user?.points || 0} <span className="text-lg">⭐</span>
                </p>
              </div>
              <div>
                <p className="text-slate-600">Last Login</p>
                <p className="font-semibold text-slate-900">Just now</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <a href="/vms" className="btn-secondary w-full text-center text-sm">
                Search VMs
              </a>
              <a href="/alerts" className="btn-secondary w-full text-center text-sm">
                View Alerts
              </a>
              <a href="/tasks" className="btn-secondary w-full text-center text-sm">
                My Tasks
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, href }) => {
  return (
    <a href={href} className="card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 ${color} bg-${color}-50 rounded-lg`}>
          <Icon size={24} className={color} />
        </div>
      </div>
    </a>
  );
};
