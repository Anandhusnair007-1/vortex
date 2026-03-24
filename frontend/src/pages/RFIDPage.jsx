import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ListChecks, PlusCircle, ScrollText, UserPlus, X } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { PageHeader, RFIDAccessAssignment, RFIDDeviceDetail, RFIDDeviceList, StatusBadge } from '../components';
import {
  checkRFIDDevice,
  createRFIDDevice,
  updateRFIDDevice,
  getRFIDAudit,
  getRFIDDeviceAudit,
  getRFIDDeviceDetail,
  getRFIDDevices,
  getUsers,
  grantRFIDAccess,
  refreshRFIDSession,
  revokeRFIDAccess,
  deleteRFIDDevice,
  getBuildings,
  getFloors,
  getDoors,
} from '../services/api';

const MOCK_RFID_DEVICES = [
  {
    id: 'mock-rfid-01',
    name: 'Controller Alpha',
    door_name: 'Server Room',
    ip_address: '10.60.0.21',
    brand: 'zkteco',
    location: 'HQ - Floor 1',
    is_online: true,
    last_seen: new Date().toISOString(),
  },
  {
    id: 'mock-rfid-02',
    name: 'Controller Bravo',
    door_name: 'SOC Main Door',
    ip_address: '10.60.0.22',
    brand: 'generic_http',
    location: 'HQ - Floor 2',
    is_online: true,
    last_seen: new Date().toISOString(),
  },
  {
    id: 'mock-rfid-03',
    name: 'Controller Delta',
    door_name: 'NOC Entry',
    ip_address: '10.60.0.23',
    brand: 'zkteco',
    location: 'HQ - Floor 3',
    is_online: false,
    last_seen: null,
  },
];

const EMPTY_DEVICE_FORM = {
  name: '',
  door_name: '',
  ip_address: '',
  brand: 'generic_http',
  building_id: '',
  floor_id: '',
  door_id: '',
};

function DeviceFormModal({ open, isEditing, form, onChange, onClose, onSubmit, buildings = [], floors = [], doors = [] }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#121A2B] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-vortyx-text-primary">
              {isEditing ? 'Edit RFID Controller' : 'Add RFID Controller'}
            </h3>
            <p className="mt-1 text-xs text-vortyx-text-secondary">
              {isEditing ? 'Modify the properties of this device.' : 'Map this controller to a specific door in the location registry.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="vortyx-btn-ghost h-9 w-9 p-0" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-[11px] font-medium text-vortyx-text-secondary">Controller Name</span>
            <input className="vortyx-input" value={form.name} onChange={(e) => onChange('name', e.target.value)} required placeholder="e.g. DC-East-Alpha" />
          </label>

          <label>
            <span className="mb-1 block text-[11px] font-medium text-vortyx-text-secondary">IP Address</span>
            <input className="vortyx-input" value={form.ip_address} onChange={(e) => onChange('ip_address', e.target.value)} required placeholder="10.x.x.x" />
          </label>

          <label>
            <span className="mb-1 block text-[11px] font-medium text-vortyx-text-secondary">Hardware Brand</span>
            <select className="vortyx-input" value={form.brand} onChange={(e) => onChange('brand', e.target.value)}>
              <option value="generic_http">Generic HTTP</option>
              <option value="zkteco">ZKTeco</option>
            </select>
          </label>

          <div className="sm:col-span-2 border-t border-white/5 pt-4">
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-vortyx-accent">
              Location Mapping {isEditing && '(Optional for Edits)'}
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-[11px] text-vortyx-text-secondary">Building</span>
                <select className="vortyx-input" value={form.building_id || ''} onChange={(e) => onChange('building_id', e.target.value)} required={!isEditing}>
                  <option value="">Select Building...</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[11px] text-vortyx-text-secondary">Floor</span>
                <select className="vortyx-input" value={form.floor_id || ''} onChange={(e) => onChange('floor_id', e.target.value)} required={!isEditing} disabled={!form.building_id}>
                  <option value="">Select Floor...</option>
                  {floors.map(f => <option key={f.id} value={f.id}>Floor {f.level_number} ({f.name})</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[11px] text-vortyx-text-secondary">Target Door</span>
                <select className="vortyx-input" value={form.door_id || ''} onChange={(e) => onChange('door_id', e.target.value)} required={!isEditing} disabled={!form.floor_id}>
                  <option value="">Select Door...</option>
                  {doors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="vortyx-btn-ghost">Cancel</button>
          <button type="submit" className="vortyx-btn-primary px-6">
            {isEditing ? 'Save Changes' : 'Register Device'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AuditTable({ rows = [] }) {
  return (
    <section className="vortyx-panel overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3 sm:px-5">
        <h3 className="text-base font-semibold text-vortyx-text-primary">RFID Audit Log</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-vortyx-text-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Door / Device</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-vortyx-text-secondary" colSpan={6}>
                  No RFID audit records available.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-vortyx-text-primary">{row.username}</td>
                  <td className="px-4 py-3 text-vortyx-text-secondary">{row.door_name}</td>
                  <td className="px-4 py-3 capitalize text-vortyx-text-secondary">{row.action}</td>
                  <td className="px-4 py-3 text-vortyx-text-secondary">{row.granted_by || row.revoked_by || 'system'}</td>
                  <td className="px-4 py-3"><StatusBadge value={row.result || 'success'} /></td>
                  <td className="px-4 py-3 text-vortyx-text-secondary">{new Date(row.timestamp).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RFIDPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { deviceId } = useParams();

  const [devices, setDevices] = useState([]);
  const [deviceDetail, setDeviceDetail] = useState(null);
  const [deviceAudit, setDeviceAudit] = useState([]);
  const [globalAudit, setGlobalAudit] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState(EMPTY_DEVICE_FORM);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  
  const handleOpenForm = (device = null) => {
    if (device) {
      setEditingDeviceId(device.id);
      setDeviceForm({
        name: device.name || '',
        ip_address: device.ip_address || '',
        brand: device.brand || 'generic_http',
        building_id: '',
        floor_id: '',
        door_id: '',
      });
      setIsAddModalOpen(true);
    } else {
      setEditingDeviceId(null);
      setDeviceForm(EMPTY_DEVICE_FORM);
      setIsAddModalOpen(true);
    }
  };
  
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [doors, setDoors] = useState([]);

  const mode = useMemo(() => {
    if (location.pathname.includes('/access-assignment')) return 'assignment';
    if (location.pathname.includes('/audit')) return 'audit';
    if (deviceId) return 'detail';
    return 'overview';
  }, [deviceId, location.pathname]);

  const loadDeviceDetail = useCallback(async (id) => {
    if (id.startsWith('mock-')) {
      setDeviceDetail(MOCK_RFID_DEVICES.find(d => d.id === id) || null);
      setDeviceAudit([]);
      return;
    }
    const [detail, audit] = await Promise.all([getRFIDDeviceDetail(id), getRFIDDeviceAudit(id)]);
    setDeviceDetail(detail);
    setDeviceAudit(audit);
  }, []);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        const [deviceRows, userRows, auditRows] = await Promise.all([
          getRFIDDevices(),
          getUsers(),
          getRFIDAudit(),
        ]);
        setDevices(deviceRows.length > 0 ? deviceRows : MOCK_RFID_DEVICES);
        setUsers(userRows);
        setGlobalAudit(auditRows);
        if (!selectedUserId && userRows[0]) {
          setSelectedUserId(userRows[0].id);
        }
        if (deviceId) {
          await loadDeviceDetail(deviceId);
        }
      } catch (error) {
        setDevices(MOCK_RFID_DEVICES);
        setUsers([]);
        setGlobalAudit([]);
        toast.error(error.message || 'Failed to load RFID module');
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [deviceId, loadDeviceDetail, selectedUserId]);

  useEffect(() => {
    if (isAddModalOpen && buildings.length === 0) {
      getBuildings().then(setBuildings).catch(() => {});
    }
  }, [isAddModalOpen, buildings.length]);

  const handleToggleDevice = (id) => {
    setSelectedDeviceIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleDeviceFormChange = async (key, value) => {
    setDeviceForm((prev) => ({ ...prev, [key]: value }));
    
    // Cascading location fetches
    if (key === 'building_id') {
      setDeviceForm(prev => ({ ...prev, building_id: value, floor_id: '', door_id: '' }));
      if (value) {
        const data = await getFloors(value);
        setFloors(data);
      } else {
        setFloors([]);
      }
      setDoors([]);
    } else if (key === 'floor_id') {
      setDeviceForm(prev => ({ ...prev, floor_id: value, door_id: '' }));
      if (value) {
        const data = await getDoors(value);
        setDoors(data);
      } else {
        setDoors([]);
      }
    }
  };

  const handleSaveDevice = async (event) => {
    event.preventDefault();
    
    // Find the selected door to get its name for legacy compatibility
    const selectedDoor = doors.find(d => d.id === deviceForm.door_id);

    const payload = {
      name: deviceForm.name,
      ip_address: deviceForm.ip_address,
      brand: deviceForm.brand,
    };
    
    if (selectedDoor) {
      payload.door_id = selectedDoor.id;
      payload.door_name = selectedDoor.name || 'Unknown Door';
      payload.location = buildings.find(b => b.id === deviceForm.building_id)?.name || 'Unknown Location';
    } else if (!editingDeviceId) {
      payload.door_name = 'Unknown Door';
    }

    try {
      if (editingDeviceId) {
        const updated = await updateRFIDDevice(editingDeviceId, payload);
        toast.success(`Updated ${updated.name}`);
        setDevices((prev) => prev.map((d) => d.id === updated.id ? updated : d));
        if (deviceId && deviceDetail?.id === updated.id) {
          setDeviceDetail(updated);
        }
      } else {
        const created = await createRFIDDevice(payload);
        setDevices((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
        toast.success(`Registered ${created.door_name}`);
      }
    } catch (_) {
      const isEditMsg = editingDeviceId ? 'Updated' : 'Registered';
      toast.success(`${isEditMsg} ${payload.name || payload.door_name} in demo mode`);
    }

    setDeviceForm(EMPTY_DEVICE_FORM);
    setEditingDeviceId(null);
    setIsAddModalOpen(false);
  };

  const handleGrant = async () => {
    if (!selectedUserId || selectedDeviceIds.length === 0) {
      toast.error('Choose a user and at least one door first');
      return;
    }
    try {
      await grantRFIDAccess({ user_id: selectedUserId, device_ids: selectedDeviceIds });
      toast.success('RFID access granted');
      const [deviceRows, userRows, auditRows] = await Promise.all([getRFIDDevices(), getUsers(), getRFIDAudit()]);
      setDevices(deviceRows);
      setUsers(userRows);
      setGlobalAudit(auditRows);
      if (deviceId) await loadDeviceDetail(deviceId);
    } catch (error) {
      toast.error(error.message || 'Failed to grant access');
    }
  };

  const handleRevoke = async () => {
    if (!selectedUserId || selectedDeviceIds.length === 0) {
      toast.error('Choose a user and at least one door first');
      return;
    }
    try {
      await revokeRFIDAccess({ user_id: selectedUserId, device_ids: selectedDeviceIds });
      toast.success('RFID access revoked');
      const [deviceRows, userRows, auditRows] = await Promise.all([getRFIDDevices(), getUsers(), getRFIDAudit()]);
      setDevices(deviceRows);
      setUsers(userRows);
      setGlobalAudit(auditRows);
      if (deviceId) await loadDeviceDetail(deviceId);
    } catch (error) {
      toast.error(error.message || 'Failed to revoke access');
    }
  };

  const handleCheckDevice = async () => {
    if (!deviceId) return;
    if (deviceId.startsWith('mock-')) {
      toast.success('Mock device is responding. Latency: 5ms.');
      return;
    }
    try {
      const result = await checkRFIDDevice(deviceId);
      toast.success(result.message);
      const [deviceRows, userRows, auditRows] = await Promise.all([getRFIDDevices(), getUsers(), getRFIDAudit()]);
      setDevices(deviceRows);
      setUsers(userRows);
      setGlobalAudit(auditRows);
      await loadDeviceDetail(deviceId);
    } catch (error) {
      toast.error(error.message || 'Connectivity check failed');
    }
  };

  const handleRefreshSession = async () => {
    if (!deviceId) return;
    if (deviceId.startsWith('mock-')) {
      toast.success('Mock session token rotated successfully.');
      return;
    }
    try {
      const result = await refreshRFIDSession(deviceId);
      toast.success(result.message);
      const [deviceRows, userRows, auditRows] = await Promise.all([getRFIDDevices(), getUsers(), getRFIDAudit()]);
      setDevices(deviceRows);
      setUsers(userRows);
      setGlobalAudit(auditRows);
      await loadDeviceDetail(deviceId);
    } catch (error) {
      toast.error(error.message || 'Session refresh failed');
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('Are you sure you want to remove this RFID device? This will also remove all access records for this device.')) {
      return;
    }

    try {
      await deleteRFIDDevice(id);
      toast.success('RFID device removed');
      setDevices((prev) => prev.filter((d) => d.id !== id));
      const auditRows = await getRFIDAudit();
      setGlobalAudit(auditRows);
    } catch (error) {
      if (id.startsWith('mock-')) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
        toast.success('Removed mock device');
      } else {
        toast.error(error.message || 'Failed to remove device');
      }
    }
  };

  const onlineCount = devices.filter((device) => device.is_online).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="RFID Device Control"
        subtitle="Manage mapped door controllers and access operations from one panel"
        actions={
          <>
            <button type="button" onClick={() => handleOpenForm()} className="vortyx-btn-ghost">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Device
            </button>
            <button type="button" onClick={() => navigate('/rfid/access-assignment')} className="vortyx-btn-primary">
              <UserPlus className="mr-2 h-4 w-4" />
              Access Assignment
            </button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="vortyx-panel p-4">
          <p className="text-xs uppercase tracking-wider text-vortyx-text-muted">Mapped Devices</p>
          <p className="mt-1 text-2xl font-semibold text-vortyx-text-primary">{devices.length}</p>
        </article>
        <article className="vortyx-panel p-4">
          <p className="text-xs uppercase tracking-wider text-vortyx-text-muted">Online Controllers</p>
          <p className="mt-1 text-2xl font-semibold text-vortyx-text-primary">{onlineCount}</p>
        </article>
        <article className="vortyx-panel p-4">
          <p className="text-xs uppercase tracking-wider text-vortyx-text-muted">Recent Audit Entries</p>
          <p className="mt-1 text-2xl font-semibold text-vortyx-text-primary">{globalAudit.length}</p>
        </article>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => navigate('/rfid')} className="vortyx-btn-ghost">
          <ListChecks className="mr-2 h-4 w-4" />
          Device List
        </button>
        <button type="button" onClick={() => navigate('/rfid/access-assignment')} className="vortyx-btn-ghost">
          <UserPlus className="mr-2 h-4 w-4" />
          Access Assignment
        </button>
        <button type="button" onClick={() => navigate('/rfid/audit')} className="vortyx-btn-ghost">
          <ScrollText className="mr-2 h-4 w-4" />
          Audit Log
        </button>
      </section>

      {mode === 'overview' ? (
        <RFIDDeviceList
          devices={devices}
          onSelect={(id) => navigate(`/rfid/devices/${id}`)}
          onDelete={handleDeleteDevice}
        />
      ) : null}

      {mode === 'detail' ? (
        <RFIDDeviceDetail
          device={deviceDetail}
          auditEntries={deviceAudit}
          onBack={() => navigate('/rfid')}
          onCheck={handleCheckDevice}
          onRefreshSession={handleRefreshSession}
          onOpenAssignment={() => navigate('/rfid/access-assignment')}
          onEdit={() => handleOpenForm(deviceDetail)}
        />
      ) : null}

      {mode === 'assignment' ? (
        <RFIDAccessAssignment
          users={users}
          devices={devices}
          selectedUserId={selectedUserId}
          selectedDeviceIds={selectedDeviceIds}
          onUserChange={setSelectedUserId}
          onToggleDevice={handleToggleDevice}
          onGrant={handleGrant}
          onRevoke={handleRevoke}
        />
      ) : null}

      {mode === 'audit' ? <AuditTable rows={globalAudit} /> : null}

      {isLoading ? <div className="h-16 rounded-2xl bg-white/10 animate-pulse" /> : null}

      <DeviceFormModal
        open={isAddModalOpen}
        isEditing={!!editingDeviceId}
        form={deviceForm}
        onChange={handleDeviceFormChange}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSaveDevice}
        buildings={buildings}
        floors={floors}
        doors={doors}
      />
    </div>
  );
}
