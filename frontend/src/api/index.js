import apiClient from './client';

export const authAPI = {
  login: (username, password) =>
    apiClient.post('/api/auth/login', { username, password }),
  refresh: (refreshToken) =>
    apiClient.post('/api/auth/refresh', { refresh_token: refreshToken }),
  logout: () => apiClient.post('/api/auth/logout'),
};

export const usersAPI = {
  getAll: (skip = 0, limit = 50) =>
    apiClient.get('/api/users/', { params: { skip, limit } }),
  getById: (userId) =>
    apiClient.get(`/api/users/${userId}`),
  getMe: () =>
    apiClient.get('/api/users/me/profile'),
  create: (userData) =>
    apiClient.post('/api/users/', userData),
  update: (userId, userData) =>
    apiClient.put(`/api/users/${userId}`, userData),
  delete: (userId) =>
    apiClient.delete(`/api/users/${userId}`),
};

export const rfidAPI = {
  getDevices: () =>
    apiClient.get('/api/rfid/devices'),
  createDevice: (deviceData) =>
    apiClient.post('/api/rfid/devices', deviceData),
  getUserAccess: (userId) =>
    apiClient.get(`/api/rfid/users/${userId}/access`),
  grantAccess: (userId, deviceIds) =>
    apiClient.post('/api/rfid/grant', { user_id: userId, device_ids: deviceIds }),
  revokeAccess: (userId, deviceIds) =>
    apiClient.post('/api/rfid/revoke', { user_id: userId, device_ids: deviceIds }),
  getAuditLog: () =>
    apiClient.get('/api/rfid/audit'),
};

export const alertsAPI = {
  getActive: (severity = null, source = null) =>
    apiClient.get('/api/alerts', { params: { severity, source } }),
  getHistory: (skip = 0, limit = 50, days = 7) =>
    apiClient.get('/api/alerts/history', { params: { skip, limit, days } }),
  createAlert: (alertData) =>
    apiClient.post('/api/alerts', alertData),
  resolveAlert: (alertId) =>
    apiClient.post(`/api/alerts/${alertId}/resolve`),
};

export const vmsAPI = {
  search: (query, limit = 50) =>
    apiClient.get('/api/vms/search', { params: { q: query, limit } }),
  getAll: (skip = 0, limit = 50, filters = {}) =>
    apiClient.get('/api/vms/', { params: { skip, limit, ...filters } }),
  getById: (vmId) =>
    apiClient.get(`/api/vms/${vmId}`),
  register: (vmData) =>
    apiClient.post('/api/vms/register', vmData),
  getNodesCapacity: () =>
    apiClient.get('/api/vms/nodes/capacity'),
};

export const tasksAPI = {
  getAll: (skip = 0, limit = 50, filters = {}) =>
    apiClient.get('/api/tasks/', { params: { skip, limit, ...filters } }),
  getMyTasks: (skip = 0, limit = 50, status = null) =>
    apiClient.get('/api/tasks/my-tasks', { params: { skip, limit, status } }),
  getById: (taskId) =>
    apiClient.get(`/api/tasks/${taskId}`),
  create: (taskData) =>
    apiClient.post('/api/tasks/', taskData),
  update: (taskId, updateData) =>
    apiClient.put(`/api/tasks/${taskId}`, updateData),
  delete: (taskId) =>
    apiClient.delete(`/api/tasks/${taskId}`),
};
