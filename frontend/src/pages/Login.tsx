import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Orbit,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getSSOUrl } from "../lib/auth";

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handlePlatformLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = async () => {
    setIsSSOLoading(true);
    try {
      const authUrl = await getSSOUrl();
      window.location.href = authUrl;
    } catch (err) {
      setError("Could not reach Keycloak SSO service.");
      setIsSSOLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#081120] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(227,234,247,0.26),rgba(8,17,32,0.94)_42%,rgba(4,10,22,1)_72%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.7%,rgba(255,255,255,0.04)_50%,transparent_50.3%)] opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[290px] sm:max-w-[420px]"
      >
        <div className="rounded-[12px] border border-white/8 bg-[linear-gradient(180deg,rgba(28,40,63,0.94),rgba(52,65,92,0.88))] px-7 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mb-6 flex items-center justify-center gap-2">
              <span className="text-[21px] font-medium tracking-[0.18em] text-[#173969] opacity-95 sm:text-[24px]">
                VERTEX
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#8fc1ff,#4f95ff)] shadow-[0_0_24px_rgba(79,149,255,0.45)]">
                <Orbit size={18} className="text-[#0a1730]" />
              </div>
              <span className="text-[21px] font-semibold tracking-tight text-[#dbe7ff] sm:text-[24px]">
                Vortex IT
              </span>
            </div>

            <h1 className="text-[22px] font-semibold tracking-tight text-[#eef4ff] sm:text-[36px]">Sign In</h1>
            <p className="mt-2 text-[11px] text-[#c7d2e4]/75 sm:text-[13px]">
              Access your administrative command center
            </p>
          </div>

          <form onSubmit={handlePlatformLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-[#c7d2e4]/80">Email or Username</label>
              <div className="relative">
                <AtSign size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9fb0ca]/50" />
                <input
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-[8px] border border-[#2a3a56] bg-[#091121] pl-11 pr-4 text-[14px] text-white outline-none transition placeholder:text-[#6d7d98] focus:border-[#5fa2ff] focus:shadow-[0_0_0_3px_rgba(95,162,255,0.12)]"
                  placeholder="admin@vortex.io"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium text-[#c7d2e4]/80">Password</label>
                <button
                  type="button"
                  className="text-[11px] text-[#8ebcff] transition hover:text-[#b6d3ff]"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9fb0ca]/50" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-[8px] border border-[#2a3a56] bg-[#091121] pl-11 pr-11 text-[14px] text-white outline-none transition placeholder:text-[#6d7d98] focus:border-[#5fa2ff] focus:shadow-[0_0_0_3px_rgba(95,162,255,0.12)]"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3bc] transition hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-[11px] text-[#c7d2e4]/70">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={() => setRememberDevice(!rememberDevice)}
                className="h-3.5 w-3.5 rounded border border-[#2b3951] bg-[#0b1221] text-[#5fa2ff] focus:ring-[#5fa2ff]"
              />
              <span>Remember this device</span>
            </label>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[8px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[9px] bg-[linear-gradient(90deg,#a8ccff,#4094ff)] text-[14px] font-semibold text-[#07152a] shadow-[0_8px_26px_rgba(64,148,255,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="rounded-[4px] bg-[#111a2d] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#9aa8bd]">
              Or Continue With
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleSSOLogin}
            disabled={isSSOLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-white/6 bg-[#111a2d] text-[13px] font-medium text-[#dce6f8] transition hover:bg-[#162238] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSSOLoading ? <Loader2 size={16} className="animate-spin" /> : <Orbit size={15} />}
            <span>SSO Login</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[9px] uppercase tracking-[0.25em] text-[#f0a1a1]/70">
            Internal System - Authorized Access Only
          </p>
          <p className="mt-2 text-[10px] text-[#aeb9ca]/35">
            © 2024 Vortex IT Solutions. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
