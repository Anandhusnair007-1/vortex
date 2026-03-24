import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bolt,
  LogOut,
  Search,
  Settings2,
  Shield,
  User,
  UserCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { getActiveAlerts, logout } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { StatusBadge } from './StatusBadge';

function FloatingPanel({ title, children, className = '' }) {
  return (
    <div className={`absolute right-0 top-[calc(100%+14px)] z-50 w-80 rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.92)] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-vortyx-text-primary">{title}</h3>
      {children}
    </div>
  );
}

export function TopNavbar({ navItems, activePath, user }) {
  const [query, setQuery] = useState('');
  const [openPanel, setOpenPanel] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isPinned, setIsPinned] = useState(true);
  const navigate = useNavigate();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logoutStore = useAuthStore((state) => state.logout);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const rows = await getActiveAlerts();
        setAlerts(rows);
      } catch (_) {
        setAlerts([]);
      }
    };
    loadAlerts();
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingUp = currentScrollY < lastScrollY;
      const nearTop = currentScrollY < 32;

      setIsPinned(nearTop || scrollingUp);
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeAlerts = useMemo(() => alerts.length, [alerts]);
  const displayUser = user || { username: 'admin', role: 'admin' };

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch (_) {
      // clear local session even if revoke fails
    } finally {
      logoutStore();
      toast.success('Logged out');
    }
  };

  const quickActions = [
    { label: 'Provision VM / VDI', path: '/vms' },
    { label: 'Manage RFID Devices', path: '/rfid' },
    { label: 'Open Monitoring', path: '/monitoring' },
    { label: 'Review Reports', path: '/reports' },
    { label: 'Open Users', path: '/users' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 px-4 pt-4 transition-transform duration-300 ease-out sm:px-6 lg:px-8 ${
        isPinned ? 'translate-y-0' : '-translate-y-[calc(100%+24px)]'
      }`}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.72)] px-5 py-4 shadow-[0_26px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex shrink-0 items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] text-vortyx-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Shield className="h-5 w-5" />
                </span>
                <span className="block text-[30px] font-semibold leading-none tracking-[0.04em] text-vortyx-text-primary">VORTYX</span>
              </Link>

              <div className="hidden flex-1 lg:block">
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <Search className="h-4 w-4 text-vortyx-text-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search modules, users, tasks..."
                    className="w-full bg-transparent text-sm text-vortyx-text-primary placeholder:text-vortyx-text-muted focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => navigate('/vms')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-vortyx-text-secondary transition hover:border-blue-400/30 hover:text-vortyx-text-primary"
                    aria-label="Search workspace"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPanel((prev) => (prev === 'alerts' ? null : 'alerts'))}
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-vortyx-text-secondary transition hover:border-blue-400/30 hover:text-vortyx-text-primary"
                  >
                    <Bell className="h-4 w-4" />
                    {activeAlerts > 0 ? (
                      <span className="absolute right-0 top-0 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-vortyx-accent px-1 text-[10px] font-semibold text-white shadow-[0_0_18px_rgba(59,130,246,0.45)]">
                        {activeAlerts}
                      </span>
                    ) : null}
                  </button>
                  {openPanel === 'alerts' ? (
                    <FloatingPanel title="Notifications">
                      <div className="space-y-2">
                        {alerts.length === 0 ? (
                          <p className="text-sm text-vortyx-text-secondary">No active notifications.</p>
                        ) : (
                          alerts.slice(0, 6).map((alert) => (
                            <button
                              key={alert.id}
                              type="button"
                              onClick={() => {
                                navigate('/monitoring');
                                setOpenPanel(null);
                              }}
                              className="block w-full rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-left transition hover:border-white/15"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-vortyx-text-primary">{alert.device_name}</p>
                                <StatusBadge value={alert.severity} />
                              </div>
                              <p className="mt-1 text-xs text-vortyx-text-secondary">{alert.issue_type}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </FloatingPanel>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPanel((prev) => (prev === 'quick' ? null : 'quick'))}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-vortyx-text-secondary transition hover:border-blue-400/30 hover:text-vortyx-text-primary"
                  >
                    <Bolt className="h-4 w-4" />
                    Quick Action
                  </button>
                  {openPanel === 'quick' ? (
                    <FloatingPanel title="Quick Action" className="w-72">
                      <div className="space-y-2">
                        {quickActions.map((action) => (
                          <button
                            key={action.path}
                            type="button"
                            onClick={() => {
                              navigate(action.path);
                              setOpenPanel(null);
                            }}
                            className="block w-full rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-left text-sm text-vortyx-text-primary transition hover:border-blue-400/25"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </FloatingPanel>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPanel((prev) => (prev === 'profile' ? null : 'profile'))}
                    className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 transition hover:border-blue-400/30"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#dbeafe,#93c5fd)] text-sm font-semibold text-[#0f172a]">
                      {(displayUser.username || 'AD').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="hidden text-left sm:block">
                      <span className="block text-sm font-semibold text-vortyx-text-primary">{displayUser.username}</span>
                      <span className="block text-xs text-vortyx-text-muted">{displayUser.role}</span>
                    </span>
                  </button>
                  {openPanel === 'profile' ? (
                    <FloatingPanel title="Profile" className="w-72">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                        <div className="flex items-center gap-3">
                          <UserCircle2 className="h-10 w-10 text-vortyx-accent" />
                          <div>
                            <p className="text-sm font-semibold text-vortyx-text-primary">{displayUser.username}</p>
                            <p className="text-xs text-vortyx-text-secondary">{displayUser.role}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/profile');
                          setOpenPanel(null);
                        }}
                        className="mt-3 inline-flex w-full items-center justify-start gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-vortyx-text-primary transition hover:border-blue-400/25"
                      >
                        <User className="h-4 w-4" />
                        Open Profile
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-3 inline-flex w-full items-center justify-start gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-vortyx-text-primary transition hover:border-blue-400/25"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </FloatingPanel>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="flex items-center gap-2">
                {navItems.map((item) => {
                  const isActive = item.path === activePath;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                        isActive
                          ? 'bg-[rgba(59,130,246,0.18)] text-white shadow-[0_12px_30px_rgba(59,130,246,0.18)] ring-1 ring-blue-400/20'
                          : 'text-vortyx-text-secondary hover:bg-white/[0.05] hover:text-vortyx-text-primary'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="lg:hidden">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3">
                <Search className="h-4 w-4 text-vortyx-text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search modules, users, tasks..."
                  className="w-full bg-transparent text-sm text-vortyx-text-primary placeholder:text-vortyx-text-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => navigate('/vms')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-vortyx-text-secondary"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {navItems.map((item) => {
                  const isActive = item.path === activePath;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                        isActive
                          ? 'bg-[rgba(59,130,246,0.18)] text-white ring-1 ring-blue-400/20'
                          : 'bg-white/[0.04] text-vortyx-text-secondary'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
