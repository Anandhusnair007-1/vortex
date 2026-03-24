import React from 'react';

export function RFIDAccessAssignment({
  users = [],
  devices = [],
  selectedUserId,
  selectedDeviceIds = [],
  onUserChange,
  onToggleDevice,
  onGrant,
  onRevoke,
}) {
  return (
    <div className="space-y-6">
      <section className="vortyx-panel p-5">
        <h3 className="text-base font-semibold text-vortyx-text-primary">Access Assignment</h3>
        <p className="mt-1 text-sm text-vortyx-text-secondary">
          Choose a user, select one or more mapped doors, then grant or revoke access through the backend device proxy.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
          <label>
            <span className="mb-1 block text-xs text-vortyx-text-secondary">User</span>
            <select className="vortyx-input" value={selectedUserId} onChange={(event) => onUserChange(event.target.value)}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.role})
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-2 text-xs text-vortyx-text-secondary">Mapped Doors / Devices</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {devices.map((device) => {
                const checked = selectedDeviceIds.includes(device.id);
                return (
                  <label key={device.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => onToggleDevice(device.id)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-vortyx-text-primary">{device.door_name}</span>
                      <span className="block text-xs text-vortyx-text-secondary">
                        {device.name} · {device.ip_address} · {device.brand}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" className="vortyx-btn-primary" onClick={onGrant}>
            Grant Access
          </button>
          <button type="button" className="vortyx-btn-ghost" onClick={onRevoke}>
            Revoke Access
          </button>
        </div>
      </section>
    </div>
  );
}
