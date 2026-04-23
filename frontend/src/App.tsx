import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import RequestDetail from "./pages/RequestDetail";

import Layout from "./components/Layout";
import AdminTemplates from "./pages/AdminTemplates";
import AdminProxmox from "./pages/AdminProxmox";
import AdminSettings from "./pages/AdminSettings";
import AdminUsers from "./pages/AdminUsers";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <>
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requests" element={<Dashboard />} />
            <Route path="/approvals" element={<Dashboard />} />
            <Route path="/request/new" element={<NewRequest />} />
            <Route path="/request/:id" element={<RequestDetail />} />
            <Route path="/admin/templates" element={<AdminTemplates />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/proxmox" element={<AdminProxmox />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
