import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api';
import toast from 'react-hot-toast';
import { FiMail, FiLock } from 'react-icons/fi';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authAPI.login(username, password);
      const { access_token, refresh_token, user_id, role } = response.data;

      setTokens(access_token, refresh_token);
      setUser({
        id: user_id,
        username,
        role,
      });

      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4">
            <span className="text-2xl font-bold text-slate-900">IT</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ITops Platform</h1>
          <p className="text-slate-300">Enterprise Cybersecurity Operations</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-white rounded-lg shadow-xl p-8">
          <div className="mb-6">
            <label htmlFor="username" className="block text-sm font-medium text-slate-900 mb-2">
              Username
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-slate-400" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="input pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-900 mb-2">
              Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="input pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-center text-sm text-slate-600 mt-4">
            Demo credentials: admin / admin
          </p>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-8">
          Internal Use Only • v1.0.0
        </p>
      </div>
    </div>
  );
};
