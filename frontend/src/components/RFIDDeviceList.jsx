import React from 'react';
import { ArrowRight, ExternalLink, MapPin, Network, Server, ShieldCheck, Trash2 } from 'lucide-react';

import { StatusBadge } from './StatusBadge';

export function RFIDDeviceList({ devices = [], onSelect, onDelete }) {
  if (devices.length === 0) {
    return (
      <section className="vortyx-panel p-5">
        <p className="text-sm text-vortyx-text-secondary">No mapped RFID devices yet.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {devices.map((device) => (
        <div
          key={device.id}
          className="vortyx-panel relative group p-4 text-left transition-all hover:-translate-y-1 hover:border-white/20"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => onSelect(device.id)}
              className="flex-1 text-left"
            >
              <p className="text-sm font-semibold text-vortyx-text-primary group-hover:text-vortyx-accent transition-colors">{device.name}</p>
              <p className="mt-1 text-xs text-vortyx-text-secondary">{device.door_name}</p>
            </button>
            <div className="flex items-center gap-2">
              <StatusBadge value={device.is_online ? 'online' : 'offline'} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(device.id);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-vortyx-text-muted transition hover:border-vortyx-danger/30 hover:bg-vortyx-danger/10 hover:text-vortyx-danger"
                aria-label="Delete device"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect(device.id)}
            className="w-full text-left"
          >
            <div className="space-y-2 text-xs text-vortyx-text-secondary">
              <p className="inline-flex items-center gap-2">
                <Network className="h-3.5 w-3.5" />
                {device.ip_address}
              </p>
              <p className="inline-flex items-center gap-2">
                <Server className="h-3.5 w-3.5" />
                {device.brand}
              </p>
              <p className="inline-flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                {device.location_path || device.location || 'Unassigned location'}
              </p>
              <p className="inline-flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Last seen {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'not available'}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-vortyx-text-primary">
                Manage Device
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`http://${device.ip_address}`, '_blank', 'noopener,noreferrer');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-vortyx-accent/10 px-3 py-1.5 text-[11px] font-bold text-vortyx-accent transition hover:bg-vortyx-accent/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Web UI
              </button>
            </div>
          </button>
        </div>
      ))}
    </section>
  );
}
