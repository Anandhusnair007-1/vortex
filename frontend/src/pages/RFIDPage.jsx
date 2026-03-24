import React, { useEffect, useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { rfidAPI, usersAPI } from '../api';
import toast from 'react-hot-toast';

export const RFIDPage = () => {
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAccess, setUserAccess] = useState([]);
  const [checkedDevices, setCheckedDevices] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [devicesRes, usersRes] = await Promise.all([
        rfidAPI.getDevices(),
        usersAPI.getAll(0, 100),
      ]);
      setDevices(devicesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserAccess = async (userId) => {
    try {
      const response = await rfidAPI.getUserAccess(userId);
      const accessSet = new Set(response.data.map(a => a.device_id));
      setUserAccess(response.data);
      setCheckedDevices(accessSet);
    } catch (error) {
      toast.error('Failed to load user access');
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    loadUserAccess(user.id);
  };

  const handleDeviceToggle = (deviceId) => {
    const newSet = new Set(checkedDevices);
    if (newSet.has(deviceId)) {
      newSet.delete(deviceId);
    } else {
      newSet.add(deviceId);
    }
    setCheckedDevices(newSet);
  };

  const handleSaveAccess = async () => {
    if (!selectedUser) return;

    try {
      const grantIds = Array.from(checkedDevices).filter(
        id => !userAccess.map(a => a.device_id).includes(id)
      );
      const revokeIds = userAccess
        .map(a => a.device_id)
        .filter(id => !checkedDevices.has(id));

      if (grantIds.length > 0) {
        await rfidAPI.grantAccess(selectedUser.id, grantIds);
      }
      if (revokeIds.length > 0) {
        await rfidAPI.revokeAccess(selectedUser.id, revokeIds);
      }

      toast.success('Access updated successfully');
      loadUserAccess(selectedUser.id);
    } catch (error) {
      toast.error('Failed to update access');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">RFID Access Control</h1>
        <p className="text-slate-600">Manage door access permissions for all users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Users List */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Users</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedUser?.id === user.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                <p className="font-medium">{user.username}</p>
                <p className="text-xs opacity-75">{user.role}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="lg:col-span-3">
          {selectedUser ? (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Access for: <span className="text-blue-600">{selectedUser.username}</span>
                </h2>
                <p className="text-sm text-slate-600">Select doors to grant/revoke access</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {devices.map(device => (
                  <label
                    key={device.id}
                    className="card flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <input
                      type="checkbox"
                      checked={checkedDevices.has(device.id)}
                      onChange={() => handleDeviceToggle(device.id)}
                      className="w-4 h-4 mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{device.door_name}</p>
                      <p className="text-xs text-slate-600">{device.location}</p>
                      <p className="text-xs text-slate-400 font-mono">{device.ip}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            device.is_online ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        ></div>
                        <span className="text-xs text-slate-600">
                          {device.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveAccess}
                  disabled={isLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  <FiCheck size={16} />
                  Save Access
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-slate-600">Select a user to manage their access</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
