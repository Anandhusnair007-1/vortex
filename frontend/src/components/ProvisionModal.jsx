import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

import { 
  getGoldenImages, 
  getCloudInitProfiles 
} from '../services/api';

const INITIAL_VM = {
  name: '',
  owner_username: '',
  cpu_cores: 2,
  ram_gb: 4,
  disk_gb: 60,
  vm_profile_id: '',
  advanced: {},
};

const INITIAL_VDI = {
  name: '',
  owner_username: '',
  cpu_cores: 4,
  ram_gb: 8,
  disk_gb: 80,
  golden_image_id: '',
  advanced: {},
};

export function ProvisionModal({ open, mode = 'vm', onClose, onSubmit }) {
  const [vmForm, setVmForm] = useState(INITIAL_VM);
  const [vdiForm, setVdiForm] = useState(INITIAL_VDI);
  const [vmProfiles, setVmProfiles] = useState([]);
  const [vdiImages, setVdiImages] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isVM = mode === 'vm';
  const title = isVM ? 'New VM Provision Request' : 'New VDI Provision Request';
  const description = 'Provisioning runs as async task using Golden Images and OS Profiles';

  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      try {
        if (isVM) {
          const profiles = await getCloudInitProfiles();
          // Normalize: our API uses 'name', component expects 'label'
          const normalized = profiles.map(p => ({ ...p, label: p.name }));
          setVmProfiles(normalized);
          if (normalized[0]) {
            setVmForm((prev) => ({ ...prev, vm_profile_id: prev.vm_profile_id || normalized[0].id }));
          }
          return;
        }

        const images = await getGoldenImages();
        const normalized = images.map(i => ({ ...i, label: i.name }));
        setVdiImages(normalized);
        if (normalized[0]) {
          setVdiForm((prev) => ({ ...prev, golden_image_id: prev.golden_image_id || normalized[0].id }));
        }
      } catch (err) {
        console.error("Failed to load provisioning options:", err);
      }
    };

    loadOptions();
  }, [isVM, open]);

  const form = isVM ? vmForm : vdiForm;
  const setForm = isVM ? setVmForm : setVdiForm;

  const canSubmit = useMemo(() => {
    const baseValid = form.name.trim() && form.owner_username.trim();
    if (!baseValid) return false;
    return isVM ? Boolean(form.vm_profile_id) : Boolean(form.golden_image_id);
  }, [form, isVM]);

  if (!open) return null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit?.(form, mode);
  };

  const options = isVM ? vmProfiles : vdiImages;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#121A2B] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-vortyx-text-primary">{title}</h3>
            <p className="mt-1 text-xs text-vortyx-text-secondary">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="vortyx-btn-ghost h-9 w-9 p-0" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs text-vortyx-text-secondary">Name</span>
            <input className="vortyx-input" value={form.name} onChange={(event) => handleChange('name', event.target.value)} />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs text-vortyx-text-secondary">Owner</span>
            <input
              className="vortyx-input"
              value={form.owner_username}
              onChange={(event) => handleChange('owner_username', event.target.value)}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-vortyx-text-secondary">CPU</span>
            <input
              className="vortyx-input"
              type="number"
              min={1}
              value={form.cpu_cores}
              onChange={(event) => handleChange('cpu_cores', Number(event.target.value))}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-vortyx-text-secondary">RAM (GB)</span>
            <input
              className="vortyx-input"
              type="number"
              min={1}
              value={form.ram_gb}
              onChange={(event) => handleChange('ram_gb', Number(event.target.value))}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-vortyx-text-secondary">Disk (GB)</span>
            <input
              className="vortyx-input"
              type="number"
              min={10}
              value={form.disk_gb}
              onChange={(event) => handleChange('disk_gb', Number(event.target.value))}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-vortyx-text-secondary">
              {isVM ? 'Template / OS Profile' : 'Golden Image'}
            </span>
            <select
              className="vortyx-input"
              value={isVM ? form.vm_profile_id : form.golden_image_id}
              onChange={(event) => handleChange(isVM ? 'vm_profile_id' : 'golden_image_id', event.target.value)}
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-vortyx-text-primary">Advanced</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAdvanced ? (
            <div className="mt-3">
              <label>
                <span className="mb-1 block text-xs text-vortyx-text-secondary">Notes</span>
                <textarea
                  className="vortyx-input min-h-24 py-3"
                  value={form.advanced?.notes || ''}
                  onChange={(event) => handleChange('advanced', { ...(form.advanced || {}), notes: event.target.value })}
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="vortyx-btn-ghost">Cancel</button>
          <button type="submit" disabled={!canSubmit} className="vortyx-btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            Queue Request
          </button>
        </div>
      </form>
    </div>
  );
}
