import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { useAuthStore } from './store/authStore';
import { usersAPI } from './api';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AlertsPage } from './pages/AlertsPage';
import { VMsPage } from './pages/VMsPage';
import { RFIDPage } from './pages/RFIDPage';
import { TasksPage } from './pages/TasksPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

// Layouts
const PrivateLayout = ({ children }) => (
  <div className="flex h-screen bg-slate-50">
    <Sidebar />
    <div className="flex-1 flex flex-col ml-20">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { accessToken, user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(!user);

  useEffect(() => {
    const loadUser = async () => {
      if (accessToken && !user) {
        try {
          const response = await usersAPI.getMe();
          setUser(response.data);
        } catch (error) {
          console.error('Failed to load user:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [accessToken, user, setUser]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block w-8 h-8 bg-slate-900 rounded-lg animate-pulse"></div>
          </div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <PrivateLayout>{children}</PrivateLayout>;
};

function App() {
  const { accessToken } = useAuthStore();

  return (
    <>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!accessToken ? <LoginPage /> : <Navigate to="/" replace />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
          <Route path="/vms" element={<ProtectedRoute><VMsPage /></ProtectedRoute>} />
          <Route path="/rfid" element={<ProtectedRoute><RFIDPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>

      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </>
  );
}

export default App;
