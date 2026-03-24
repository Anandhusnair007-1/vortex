import React, { useMemo, useState } from 'react';
import { Edit3, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader, StatusBadge } from '../components';

const ROLE_OPTIONS = ['admin', 'team-lead', 'engineer', 'viewer'];

const INITIAL_USERS = [
  {
    id: 'u1',
    username: 'user-01',
    role: 'team-lead',
    points: 124,
    status: 'active',
    createdAt: '2026-01-03',
  },
  {
    id: 'u2',
    username: 'user-02',
    role: 'engineer',
    points: 110,
    status: 'active',
    createdAt: '2026-01-18',
  },
  {
    id: 'u3',
    username: 'user-03',
    role: 'engineer',
    points: 97,
    status: 'active',
    createdAt: '2026-02-05',
  },
  {
    id: 'u4',
    username: 'user-04',
    role: 'engineer',
    points: 88,
    status: 'inactive',
    createdAt: '2026-02-27',
  },
  {
    id: 'u5',
    username: 'user-05',
    role: 'viewer',
    points: 73,
    status: 'active',
    createdAt: '2026-03-02',
  },
];

const EMPTY_FORM = {
  username: '',
  role: 'engineer',
  points: 0,
  status: 'active',
};

function UserFormModal({ open, mode, form, onChange, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#121A2B] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-vortyx-text-primary">
              {mode === 'create' ? 'Add User' : 'Edit User'}
            </h3>
            <p className="mt-1 text-xs text-vortyx-text-secondary">Manage role and account state for internal access.</p>
          </div>
          <button type="button" onClick={onClose} className="vortyx-btn-ghost h-9 w-9 p-0" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-xs text-vortyx-text-secondary">Username</span>
            <input
              className="vortyx-input"
              value={form.username}
              onChange={(event) => onChange('username', event.target.value)}
              placeholder="Enter username"
              required
              disabled={mode === 'edit'}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs text-vortyx-text-secondary">Role</span>
              <select className="vortyx-input" value={form.role} onChange={(event) => onChange('role', event.target.value)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs text-vortyx-text-secondary">Status</span>
              <select className="vortyx-input" value={form.status} onChange={(event) => onChange('status', event.target.value)}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-vortyx-text-secondary">Initial Points</span>
            <input
              type="number"
              min={0}
              className="vortyx-input"
              value={form.points}
              onChange={(event) => onChange('points', Number(event.target.value))}
            />
          </label>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="vortyx-btn-ghost">Cancel</button>
            <button type="submit" className="vortyx-btn-primary">
              {mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UsersPage() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (!normalized) return true;
      return user.username.toLowerCase().includes(normalized);
    });
  }, [query, roleFilter, users]);

  const openCreate = () => {
    setModalMode('create');
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setModalMode('edit');
    setSelectedId(user.id);
    setForm({ username: user.username, role: user.role, points: user.points, status: user.status });
    setModalOpen(true);
  };

  const toggleStatus = (id) => {
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id !== id) return user;
        const updated = { ...user, status: user.status === 'active' ? 'inactive' : 'active' };
        toast.success(`User ${updated.username} set to ${updated.status}`);
        return updated;
      })
    );
  };

  const removeUser = (id) => {
    const target = users.find((user) => user.id === id);
    setUsers((prev) => prev.filter((user) => user.id !== id));
    if (target) toast.success(`Removed user ${target.username}`);
  };

  const onSubmitForm = (event) => {
    event.preventDefault();

    if (modalMode === 'create') {
      const id = `u${Date.now()}`;
      setUsers((prev) => [
        {
          id,
          username: form.username.trim(),
          role: form.role,
          points: Number(form.points) || 0,
          status: form.status,
          createdAt: new Date().toISOString().slice(0, 10),
        },
        ...prev,
      ]);
      toast.success(`Created user ${form.username}`);
    } else {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedId
            ? { ...user, role: form.role, points: Number(form.points) || 0, status: form.status }
            : user
        )
      );
      toast.success(`Updated user ${form.username}`);
    }

    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        subtitle="Identity administration for admin, team-lead, engineer, and viewer roles"
        actions={
          <button type="button" className="vortyx-btn-primary" onClick={openCreate}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </button>
        }
      />

      <section className="vortyx-panel p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-vortyx-text-muted" />
            <input
              className="vortyx-input h-9 py-0 pl-8 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search username"
            />
          </label>

          <select className="vortyx-input h-9 py-0 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="vortyx-panel overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <h3 className="text-base font-semibold text-vortyx-text-primary">User Directory</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-vortyx-text-muted">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-vortyx-text-primary">{user.username}</td>
                  <td className="px-4 py-3"><StatusBadge value={user.role} className="capitalize" /></td>
                  <td className="px-4 py-3 text-vortyx-text-secondary">{user.points}</td>
                  <td className="px-4 py-3"><StatusBadge value={user.status} className="capitalize" /></td>
                  <td className="px-4 py-3 font-mono text-xs text-vortyx-text-muted">{user.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" className="vortyx-btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(user)}>
                        <Edit3 className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button type="button" className="vortyx-btn-ghost px-2 py-1 text-xs" onClick={() => toggleStatus(user.id)}>
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Toggle
                      </button>
                      <button type="button" className="vortyx-btn-ghost px-2 py-1 text-xs" onClick={() => removeUser(user.id)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-vortyx-text-secondary">
                    No users found for the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <UserFormModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmitForm}
      />
    </div>
  );
}

export default UsersPage;
