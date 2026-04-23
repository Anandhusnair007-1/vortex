import React, { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { TopNavbar } from './components/TopNavbar';
import { getCurrentUser } from './services/api';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { VMPage } from './pages/VMPage';
import { RFIDPage } from './pages/RFIDPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { NodeDetailPage } from './pages/NodeDetailPage';
import { DatacenterManager } from './pages/DatacenterManager';
import { useAuthStore } from './store/authStore';

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: 'easeOut' },
};

function ProtectedRoutes() {
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.user);

  const navItems = useMemo(() => {
    return [
      { label: 'Dashboard', path: '/' },
      { label: 'VM / VDI', path: '/vms' },
      { label: 'Infrastructure', path: '/infrastructure' },
      { label: 'RFID', path: '/rfid' },
      { label: 'Monitoring', path: '/monitoring' },
      { label: 'Reports', path: '/reports' },
      { label: 'Users', path: '/users' },
    ];
  }, []);

  const activePath = useMemo(() => {
    if (location.pathname.startsWith('/vms')) return '/vms';
    if (location.pathname.startsWith('/infrastructure')) return '/infrastructure';
    if (location.pathname.startsWith('/rfid')) return '/rfid';
    if (location.pathname.startsWith('/monitoring')) return '/monitoring';
    if (location.pathname.startsWith('/reports')) return '/reports';
    if (location.pathname.startsWith('/users')) return '/users';
    return '/';
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-vortyx-bg text-vortyx-text-primary">
      <div className="vortyx-noise" aria-hidden="true" />
      <TopNavbar navItems={navItems} activePath={activePath} user={currentUser} />

      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} {...pageTransition}>
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/datacenter/nodes/:nodeId" element={<NodeDetailPage />} />
              <Route path="/infrastructure" element={<DatacenterManager />} />
              <Route path="/vms" element={<VMPage />} />
              <Route path="/rfid" element={<RFIDPage />} />
              <Route path="/rfid/devices/:deviceId" element={<RFIDPage />} />
              <Route path="/rfid/access-assignment" element={<RFIDPage />} />
              <Route path="/rfid/audit" element={<RFIDPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const logoutStore = useAuthStore((state) => state.logout);
  const setLoading = useAuthStore((state) => state.setLoading);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    const bootstrap = async () => {
      if (!accessToken) {
        setUser(null);
        return;
      }

      setLoading(true);
      try {
        const current = await getCurrentUser();
        setUser(current);
      } catch (_) {
        logoutStore();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [accessToken, logoutStore, setLoading, setUser]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-vortyx-bg text-vortyx-text-primary">Loading...</div>;
  }

  if (!user || !accessToken) {
    return <LoginPage />;
  }

  return <ProtectedRoutes />;
}

export default App;
