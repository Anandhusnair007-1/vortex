export const severityColors = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
  },
};

export const roleNames = {
  admin: 'Administrator',
  'team-lead': 'Team Lead',
  engineer: 'Engineer',
  viewer: 'Viewer',
};

export const roleColors = {
  admin: 'bg-purple-100 text-purple-800',
  'team-lead': 'bg-blue-100 text-blue-800',
  engineer: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString();
};

export const formatRelativeTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const getStatusColor = (status) => {
  const colors = {
    running: 'text-green-600',
    stopped: 'text-gray-400',
    paused: 'text-yellow-500',
    pending: 'text-blue-500',
    'in_progress': 'text-blue-500',
    completed: 'text-green-600',
    failed: 'text-red-600',
  };
  return colors[status] || 'text-gray-500';
};

export const truncate = (str, length = 50) => {
  return str.length > length ? str.substring(0, length) + '...' : str;
};
