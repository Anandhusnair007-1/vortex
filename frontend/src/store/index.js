import { create } from 'zustand';

export const useAlertStore = create((set, get) => ({
  alerts: [],
  activeAlertCount: 0,
  isLoading: false,
  error: null,

  setAlerts: (alerts) => {
    set({ 
      alerts,
      activeAlertCount: alerts.filter(a => !a.is_resolved).length 
    });
  },

  addAlert: (alert) => {
    const { alerts } = get();
    set({ 
      alerts: [alert, ...alerts],
      activeAlertCount: alerts.filter(a => !a.is_resolved).length + 1
    });
  },

  resolveAlert: (alertId) => {
    const { alerts, activeAlertCount } = get();
    set({
      alerts: alerts.map(a => 
        a.id === alertId ? { ...a, is_resolved: true } : a
      ),
      activeAlertCount: Math.max(0, activeAlertCount - 1)
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export const useVMStore = create((set, get) => ({
  vms: [],
  searchResults: [],
  selectedVM: null,
  isLoading: false,
  error: null,

  setVMs: (vms) => set({ vms }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSelectedVM: (vm) => set({ selectedVM: vm }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export const useRFIDStore = create((set, get) => ({
  devices: [],
  selectedUser: null,
  userAccess: [],
  isLoading: false,
  error: null,

  setDevices: (devices) => set({ devices }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setUserAccess: (access) => set({ userAccess: access }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export const useTaskStore = create((set, get) => ({
  tasks: [],
  myTasks: [],
  isLoading: false,
  error: null,

  setTasks: (tasks) => set({ tasks }),
  setMyTasks: (tasks) => set({ myTasks: tasks }),
  addTask: (task) => {
    const { myTasks } = get();
    set({ myTasks: [task, ...myTasks] });
  },
  updateTask: (taskId, updates) => {
    const { myTasks } = get();
    set({
      myTasks: myTasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
