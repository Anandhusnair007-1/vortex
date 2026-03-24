import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  FiHome,
  FiDatabase,
  FiLock,
  FiAlertCircle,
  FiCheckSquare,
  FiBarChart2,
  FiUsers,
} from 'react-icons/fi';

const navItems = [
  { path: '/', label: 'Dashboard', icon: FiHome, roles: ['admin', 'team-lead', 'engineer', 'viewer'] },
  { path: '/alerts', label: 'Alerts', icon: FiAlertCircle, roles: ['admin', 'team-lead', 'engineer', 'viewer'] },
  { path: '/vms', label: 'VM Inventory', icon: FiDatabase, roles: ['admin', 'team-lead', 'engineer', 'viewer'] },
  { path: '/rfid', label: 'RFID Access', icon: FiLock, roles: ['admin', 'team-lead', 'engineer'] },
  { path: '/tasks', label: 'Tasks', icon: FiCheckSquare, roles: ['admin', 'team-lead', 'engineer'] },
  { path: '/reports', label: 'Reports', icon: FiBarChart2, roles: ['admin', 'team-lead'] },
  { path: '/users', label: 'Users', icon: FiUsers, roles: ['admin'] },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = React.useState(true);

  const visibleItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 fixed left-0 top-16 bottom-0 overflow-y-auto`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left hover:bg-slate-800 transition-colors"
      >
        <span className="text-2xl">≡</span>
      </button>

      {/* Navigation Items */}
      <nav className="space-y-1 px-2 py-4">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={isOpen ? '' : item.label}
            >
              <Icon size={20} className="flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
