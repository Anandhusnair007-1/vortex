import React from 'react';
import { ArrowLeft, Edit2, RefreshCcw, ShieldCheck, Wifi } from 'lucide-react';

import { StatusBadge } from './StatusBadge';

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-wider text-vortyx-text-muted">{label}</p>
      <p className="mt-1 text-sm text-vortyx-text-primary">{value}</p>
    </div>
  );
}

export function RFIDDeviceDetail({
  device,
  auditEntries = [],
  onBack,
  onCheck,
  onRefreshSession,
  onOpenAssignment,
  onEdit,
}) {
  if (!device) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="vortyx-btn-ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Devices
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-vortyx-text-primary">{device.door_name}</h2>
            <p className="mt-1 text-sm text-vortyx-text-secondary">{device.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={device.is_online ? 'online' : 'offline'} />
          <button type="button" onClick={onCheck} className="vortyx-btn-ghost">
            <Wifi className="mr-2 h-4 w-4" />
            Check Connectivity
          </button>
          <button type="button" onClick={onRefreshSession} className="vortyx-btn-ghost">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh Session
          </button>
          <button type="button" onClick={onEdit} className="vortyx-btn-ghost">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Device
          </button>
          <button type="button" onClick={onOpenAssignment} className="vortyx-btn-primary">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Access Assignment
          </button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="vortyx-panel p-5 lg:col-span-7">
          <h3 className="text-base font-semibold text-vortyx-text-primary">Device Information</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Device Name" value={device.name} />
            <InfoRow label="Door Name" value={device.door_name} />
            <InfoRow label="IP Address" value={device.ip_address} />
            <InfoRow label="Brand" value={device.brand} />
            <InfoRow label="Location" value={device.location || 'Unassigned'} />
            <InfoRow label="Active Access" value={String(device.active_access_count || 0)} />
          </div>
        </div>

        <div className="vortyx-panel p-5 lg:col-span-5">
          <h3 className="text-base font-semibold text-vortyx-text-primary">Backend Session Status</h3>
          <div className="mt-4 space-y-3">
            <InfoRow
              label="Session State"
              value={device.session_status?.session_active ? 'Active backend-managed session' : 'No active backend session'}
            />
            <InfoRow label="Credential Source" value={device.session_status?.credential_source || 'unconfigured'} />
            <InfoRow
              label="Expires At"
              value={
                device.session_status?.expires_at
                  ? new Date(device.session_status.expires_at).toLocaleString()
                  : 'Not available'
              }
            />
          </div>
        </div>
      </section>

      <section className="vortyx-panel overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-semibold text-vortyx-text-primary">Recent Audit Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-vortyx-text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditEntries.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-vortyx-text-secondary" colSpan={5}>
                    No device audit entries yet.
                  </td>
                </tr>
              ) : (
                auditEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-vortyx-text-primary">{entry.username}</td>
                    <td className="px-4 py-3 capitalize text-vortyx-text-secondary">{entry.action}</td>
                    <td className="px-4 py-3 text-vortyx-text-secondary">{entry.granted_by || entry.revoked_by || 'system'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={entry.result || 'success'} />
                    </td>
                    <td className="px-4 py-3 text-vortyx-text-secondary">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
