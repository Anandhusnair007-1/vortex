import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Loader2, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { login } from '../services/api';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);
    try {
      const payload = await login(username, password);
      setTokens(payload.access_token, payload.refresh_token);
      setUser(payload.user);
      toast.success(`Signed in as ${payload.user.username}`);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign in. Verify your credentials and try again.');
      toast.error(error.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(132,102,255,0.18),transparent_28%),linear-gradient(180deg,#726a86_0%,#625c76_100%)] px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-[1120px] items-center justify-center">
        <div className="grid w-full max-w-[920px] overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(42,38,55,0.98),rgba(31,28,43,0.98))] shadow-[0_36px_90px_rgba(16,12,27,0.42)] lg:grid-cols-[0.88fr_1.12fr]">
          <section className="relative min-h-[320px] border-b border-white/6 p-5 sm:p-6 lg:border-b-0 lg:border-r lg:border-white/6">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(124,91,255,0.35),rgba(37,31,53,0.9))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_18%,rgba(255,255,255,0.18),transparent_16%),radial-gradient(circle_at_50%_58%,rgba(18,13,25,0.35),transparent_34%),linear-gradient(180deg,rgba(16,13,26,0.05),rgba(16,13,26,0.34))]" />
            <div className="absolute inset-x-0 bottom-0 h-[56%] bg-[linear-gradient(180deg,rgba(46,38,66,0.05),rgba(17,13,28,0.42))]" />
            <div className="absolute bottom-0 left-0 right-0 h-[54%] bg-[radial-gradient(ellipse_at_center,rgba(35,29,49,0.86)_0%,rgba(23,18,33,0.96)_65%,rgba(18,14,28,1)_100%)]" />
            <div className="absolute bottom-[20%] left-[8%] right-[14%] h-[26%] rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(64,53,95,0.92)_0%,rgba(41,33,63,0.85)_46%,rgba(26,22,40,0)_76%)] blur-[2px]" />
            <div className="absolute bottom-[10%] left-[18%] right-[6%] h-[22%] rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(27,22,39,0.98)_0%,rgba(22,18,34,0.9)_42%,rgba(22,18,34,0)_74%)]" />
            <div className="relative flex h-full flex-col justify-between rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-3 text-sm font-semibold tracking-[0.16em] text-white">
                    VX
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/80"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to website
                </button>
              </div>

              <div className="pb-2">
                <p className="max-w-[220px] text-xl font-medium leading-tight text-white">
                  Secure workflows.
                  <br />
                  Confident operations.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="h-1 w-8 rounded-full bg-white" />
                  <span className="h-1 w-8 rounded-full bg-white/25" />
                </div>
              </div>
            </div>
          </section>

          <section className="relative px-8 py-10 sm:px-10 sm:py-11">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,96,240,0.14),transparent_24%)]" />
            <div className="relative">
              <div className="mb-10 flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-vortyx-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-vortyx-text-muted">Enterprise Access</p>
                  <h1 className="text-xl font-semibold text-vortyx-text-primary">VORTYX</h1>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  Sign in
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-vortyx-text-secondary">
                  Access infrastructure operations, provisioning workflows, monitoring, and RFID controls from one secure workspace.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-vortyx-text-muted">
                      Username
                    </span>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-vortyx-text-muted" />
                      <input
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#352f45]/90 pl-12 pr-4 text-sm text-white placeholder:text-white/28 focus:border-[#8f72ff]/70 focus:outline-none focus:ring-2 focus:ring-[#8f72ff]/18"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        required
                      />
                    </div>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-vortyx-text-muted">
                      Password
                    </span>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-vortyx-text-muted" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#352f45]/90 pl-12 pr-12 text-sm text-white placeholder:text-white/28 focus:border-[#8f72ff]/70 focus:outline-none focus:ring-2 focus:ring-[#8f72ff]/18"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-vortyx-text-muted transition hover:bg-white/[0.05] hover:text-white"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                </div>

                <div className="flex flex-col gap-3 pt-1 text-xs text-vortyx-text-muted sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-white/15 bg-transparent"
                      checked={rememberSession}
                      onChange={(event) => setRememberSession(event.target.checked)}
                    />
                    Remember session
                  </label>
                  <span>Internal access only</span>
                </div>

                {errorMessage ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#8e72ff,#6b5adb)] text-sm font-semibold text-white shadow-[0_18px_36px_rgba(104,87,208,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? 'Signing In...' : 'Sign In'}
                </button>

                <p className="text-center text-[11px] text-vortyx-text-muted">
                  Authentication is managed internally for this environment.
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
