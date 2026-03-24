import React from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import { severityColors, formatRelativeTime } from '../utils/constants';
import { alertsAPI } from '../api';
import toast from 'react-hot-toast';

export const AlertCard = ({ alert, onResolve }) => {
  const colors = severityColors[alert.severity] || severityColors.info;

  const handleResolve = async () => {
    try {
      await alertsAPI.resolveAlert(alert.id);
      onResolve(alert.id);
      toast.success('Alert resolved');
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  return (
    <div className={`card ${colors.bg} border-l-4 ${colors.border} flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top`}>
      <div className="flex items-start gap-3 flex-1">
        <div className={`w-3 h-3 rounded-full ${colors.dot} flex-shrink-0 mt-1`}></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`alert-badge ${colors.badge}`}>{alert.severity.toUpperCase()}</span>
            <span className="text-xs text-slate-500">{formatRelativeTime(alert.created_at)}</span>
          </div>
          <h3 className="font-semibold text-slate-900 mt-1">{alert.device_name}</h3>
          <p className="text-sm text-slate-700 mt-1">{alert.issue}</p>
          {alert.description && (
            <p className="text-xs text-slate-600 mt-2">{alert.description}</p>
          )}
        </div>
      </div>
      {!alert.is_resolved && (
        <button
          onClick={handleResolve}
          className={`btn-sm ${colors.badge} hover:opacity-80`}
        >
          <FiCheck size={16} />
        </button>
      )}
    </div>
  );
};

export const AlertPanel = ({ alerts, onResolve }) => {
  if (alerts.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="text-4xl mb-2">✓</div>
        <p className="text-slate-600">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <AlertCard key={alert.id} alert={alert} onResolve={onResolve} />
      ))}
    </div>
  );
};

export const AlertBell = ({ count }) => {
  return (
    <div className="relative">
      <div className="text-2xl">🔔</div>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
};
