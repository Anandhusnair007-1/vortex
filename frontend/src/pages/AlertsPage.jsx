import React, { useEffect, useState } from 'react';
import { useAlertStore } from '../store';
import { alertsAPI } from '../api';
import { AlertPanel } from '../components/AlertComponents';
import { useWebSocketAlerts } from '../hooks';

export const AlertsPage = () => {
  const { alerts, setAlerts, resolveAlert, setLoading } = useAlertStore();
  const [filter, setFilter] = useState('all');
  const ws = useWebSocketAlerts();

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        const response = await alertsAPI.getActive();
        setAlerts(response.data);
      } catch (error) {
        console.error('Failed to load alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unresolved') return !alert.is_resolved;
    if (filter === 'critical') return alert.severity === 'critical';
    if (filter === 'warning') return alert.severity === 'warning';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Alerts</h1>
        <p className="text-slate-600">{filteredAlerts.length} alert(s)</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'unresolved', 'critical', 'warning'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <AlertPanel alerts={filteredAlerts} onResolve={resolveAlert} />
    </div>
  );
};
