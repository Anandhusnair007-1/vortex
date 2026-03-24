const API_BASE = (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes('localhost'))
  ? process.env.REACT_APP_API_URL 
  : `${window.location.protocol}//${window.location.hostname}:8000`;

function getStoredAccessToken() {
  return localStorage.getItem('accessToken');
}

function getStoredRefreshToken() {
  return localStorage.getItem('refreshToken');
}

async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('Session expired');
  }

  const response = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    throw new Error('Session expired');
  }

  const payload = await response.json();
  localStorage.setItem('accessToken', payload.access_token);
  localStorage.setItem('refreshToken', payload.refresh_token);
  return payload.access_token;
}

async function request(path, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getStoredAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (response.status === 401 && retry && getStoredRefreshToken()) {
    const newToken = await refreshAccessToken();
    return request(
      path,
      {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${newToken}`,
        },
      },
      false
    );
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch (_) {
      // keep fallback
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function mapInventoryRow(item) {
  return {
    ...item,
    type: item.vm_type,
    node: item.proxmox_node,
    ip: item.ip_address,
    owner: item.owner_username,
    guacUrl: item.guac_url,
  };
}

function mapNodeCapacity(row, index) {
  const totalCpu = row.total_cpu || 0;
  const totalRam = row.total_ram || 0;
  const totalDisk = row.total_disk || 0;
  const freeCpu = row.free_cpu ?? 0;
  const freeRam = row.free_ram ?? 0;
  const freeDisk = row.free_disk ?? 0;

  return {
    id: row.node || `node-${index}`,
    name: row.node,
    vmCount: row.vm_count || 0,
    cpuPercent: totalCpu > 0 ? Math.round(((totalCpu - freeCpu) / totalCpu) * 100) : 0,
    ramPercent: totalRam > 0 ? Math.round(((totalRam - freeRam) / totalRam) * 100) : 0,
    diskPercent: totalDisk > 0 ? Math.round(((totalDisk - freeDisk) / totalDisk) * 100) : 0,
    lastSynced: row.last_synced,
  };
}

export async function login(username, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, false);
}

export async function logout(refreshToken) {
  return request('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  }, false);
}

export async function getCurrentUser() {
  return request('/api/auth/me');
}

export async function getActiveAlerts() {
  return request('/api/alerts?limit=10');
}

export async function getVMProfiles() {
  return request('/api/provision/vm-profiles');
}

export async function getVDIImages() {
  return request('/api/provision/vdi-images');
}

export async function getVMs() {
  const rows = await request('/api/vms?limit=250');
  return rows.map(mapInventoryRow);
}

export async function getNodeCapacity() {
  const rows = await request('/api/vms/nodes/capacity');
  return rows.map(mapNodeCapacity);
}

export async function getProvisioningTasks() {
  const rows = await request('/api/tasks?limit=20');
  return rows.map((task) => ({
    ...task,
    actor: task.metadata_json?.requested_by || 'system',
    action: task.task_type.replaceAll('_', ' '),
    target: task.target_name,
    time: task.completed_at || task.started_at,
  }));
}

export async function provisionVM(payload) {
  return request('/api/provision/vm', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function provisionVDI(payload) {
  return request('/api/provision/vdi', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getRFIDDevices() {
  return request('/api/rfid/devices');
}

export async function createRFIDDevice(payload) {
  return request('/api/rfid/devices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRFIDDevice(deviceId, payload) {
  return request(`/api/rfid/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getRFIDDeviceDetail(deviceId) {
  return request(`/api/rfid/devices/${deviceId}`);
}

export async function deleteRFIDDevice(deviceId) {
  return request(`/api/rfid/devices/${deviceId}`, {
    method: 'DELETE',
  });
}

export async function checkRFIDDevice(deviceId) {
  return request(`/api/rfid/devices/${deviceId}/check`, {
    method: 'POST',
  });
}

export async function refreshRFIDSession(deviceId) {
  return request(`/api/rfid/devices/${deviceId}/refresh-session`, {
    method: 'POST',
  });
}

export async function getRFIDDeviceAudit(deviceId) {
  return request(`/api/rfid/devices/${deviceId}/audit?limit=50`);
}

export async function getRFIDAudit() {
  return request('/api/rfid/audit?limit=100');
}

export async function getUsers() {
  const rows = await request('/api/users?limit=200');
  return rows.map((user) => ({
    ...user,
    points: user.points_total,
    status: user.is_active ? 'active' : 'inactive',
    createdAt: user.created_at,
  }));
}

export async function getRFIDUserAccess(userId) {
  return request(`/api/rfid/users/${userId}/access`);
}

export async function grantRFIDAccess(payload) {
  return request('/api/rfid/access/grant', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function revokeRFIDAccess(payload) {
  return request('/api/rfid/access/revoke', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Datacenter / Proxmox Nodes ---

export async function getProxmoxNodes() {
  return request('/api/proxmox/nodes');
}

export async function createProxmoxNode(payload) {
  return request('/api/proxmox/nodes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProxmoxNode(nodeId, payload) {
  return request(`/api/proxmox/nodes/${nodeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProxmoxNode(nodeId) {
  return request(`/api/proxmox/nodes/${nodeId}`, {
    method: 'DELETE',
  });
}

export async function getNodeWorkloads(nodeId) {
  const rows = await request(`/api/proxmox/nodes/${nodeId}/workloads`);
  return rows.map(mapInventoryRow);
}

// --- Workloads / Inventory ---

export async function updateWorkload(vmId, payload) {
  return request(`/api/vms/${vmId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkload(vmId) {
  return request(`/api/vms/${vmId}`, {
    method: 'DELETE',
  });
}

// --- Locations ---

export async function getBuildings() {
  return request('/api/locations/buildings');
}

export async function createBuilding(payload) {
  return request('/api/locations/buildings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBuilding(id, payload) {
  return request(`/api/locations/buildings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBuilding(id) {
  return request(`/api/locations/buildings/${id}`, {
    method: 'DELETE',
  });
}

export async function getFloors(buildingId = null) {
  const query = buildingId ? `?building_id=${buildingId}` : '';
  return request(`/api/locations/floors${query}`);
}

export async function createFloor(payload) {
  return request('/api/locations/floors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFloor(id, payload) {
  return request(`/api/locations/floors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteFloor(id) {
  return request(`/api/locations/floors/${id}`, {
    method: 'DELETE',
  });
}

export async function getDoors(floorId = null) {
  const query = floorId ? `?floor_id=${floorId}` : '';
  return request(`/api/locations/doors${query}`);
}

export async function createDoor(payload) {
  return request('/api/locations/doors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDoor(id, payload) {
  return request(`/api/locations/doors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteDoor(id) {
  return request(`/api/locations/doors/${id}`, {
    method: 'DELETE',
  });
}

// --- Provisioning Config API ---

export async function getGoldenImages() {
  return request('/api/provision/config/images');
}

export async function createGoldenImage(payload) {
  return request('/api/provision/config/images', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCloudInitProfiles() {
  return request('/api/provision/config/profiles');
}

export async function createCloudInitProfile(payload) {
  return request('/api/provision/config/profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
