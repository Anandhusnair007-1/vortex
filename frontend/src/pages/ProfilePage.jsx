import React from 'react';
import { BadgeCheck, KeyRound, ShieldCheck, UserCircle2 } from 'lucide-react';

import { PageHeader, StatusBadge } from '../components';
import { useAuthStore } from '../store/authStore';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user) || {
    username: 'unknown',
    role: 'unknown',
    is_active: true,
    created_at: null,
  };

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : 'Internal account';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operator Profile"
        subtitle="Account identity, role posture, and session context for the current VORTYX operator."
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="vortyx-panel p-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#dbeafe,#93c5fd)] text-[#0f172a] shadow-[0_10px_30px_rgba(59,130,246,0.2)]">
              <UserCircle2 className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold text-vortyx-text-primary">{user.username}</h2>
              <p className="mt-1 text-sm text-vortyx-text-secondary">Primary operator identity for this session</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge value={user.role} />
                <StatusBadge value={user.is_active ? 'online' : 'offline'} />
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-vortyx-text-muted">Role</p>
              <p className="mt-2 text-lg font-semibold text-vortyx-text-primary">{user.role}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-vortyx-text-muted">Joined</p>
              <p className="mt-2 text-lg font-semibold text-vortyx-text-primary">{joinedDate}</p>
            </div>
          </div>
        </article>

        <article className="vortyx-panel p-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-vortyx-success" />
                <div>
                  <p className="text-sm font-semibold text-vortyx-text-primary">Access Posture</p>
                  <p className="mt-1 text-xs text-vortyx-text-secondary">
                    Your role determines which infrastructure and administration actions are available.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-vortyx-accent" />
                <div>
                  <p className="text-sm font-semibold text-vortyx-text-primary">Session Identity</p>
                  <p className="mt-1 text-xs text-vortyx-text-secondary">
                    This session is bound to the authenticated VORTYX operator account currently in use.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-vortyx-warning" />
                <div>
                  <p className="text-sm font-semibold text-vortyx-text-primary">Credential Handling</p>
                  <p className="mt-1 text-xs text-vortyx-text-secondary">
                    Password changes and full identity administration can be expanded here in the next pass.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
