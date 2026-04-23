import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import api from "../lib/api";
import { User, UserRole, VmRequest } from "../types";
import {
  Mail,
  Monitor,
  Pencil,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import GlassSkeleton from "../components/GlassSkeleton";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type UserFormState = {
  name: string;
  email: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  password: string;
};

const initialUserForm: UserFormState = {
  name: "",
  email: "",
  role: "EMPLOYEE",
  department: "",
  is_active: true,
  password: "",
};

const roleOptions: UserRole[] = ["EMPLOYEE", "TEAM_LEAD", "IT_TEAM", "ADMIN"];

const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm);

  const { data: users, isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const resp = await api.get("/users/");
      return resp.data;
    },
  });

  const { data: requests, isLoading: isRequestsLoading } = useQuery<VmRequest[]>({
    queryKey: ["admin-user-requests"],
    queryFn: async () => {
      const resp = await api.get("/requests/");
      return resp.data;
    },
  });

  const isLoading = isUsersLoading || isRequestsLoading;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const allUsers = users || [];
  const allRequests = requests || [];

  const filteredUsers = useMemo(
    () =>
      allUsers.filter((user) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          user.name.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch) ||
          user.role.toLowerCase().includes(normalizedSearch) ||
          (user.department || "").toLowerCase().includes(normalizedSearch)
        );
      }),
    [allUsers, normalizedSearch]
  );

  const activeUsersCount = allUsers.filter((user) => user.is_active).length;
  const adminUsersCount = allUsers.filter((user) => user.role === "ADMIN").length;
  const provisionedAssetsCount = allRequests.filter(
    (request) => request.status === "ACTIVE" || request.status === "PROVISIONING"
  ).length;

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUserId(null);
    setUserForm(initialUserForm);
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setUserForm(initialUserForm);
    setIsUserModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
      is_active: user.is_active,
      password: "",
    });
    setIsUserModalOpen(true);
  };

  const saveUser = useMutation({
    mutationFn: async () => {
      if (editingUserId) {
        const resp = await api.put(`/users/${editingUserId}`, {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          department: userForm.department || null,
          is_active: userForm.is_active,
        });
        return resp.data;
      }

      const resp = await api.post("/users/", {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        department: userForm.department || null,
        is_active: userForm.is_active,
        password: userForm.password,
      });
      return resp.data;
    },
    onSuccess: () => {
      toast.success(editingUserId ? "User updated successfully" : "User created successfully");
      closeUserModal();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save user");
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const resp = await api.put(`/users/${userId}`, { is_active: isActive });
      return resp.data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? "User enabled" : "User disabled");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to update user status");
    },
  });

  const handleSaveUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingUserId && !userForm.password.trim()) {
      toast.error("Password is required for new users");
      return;
    }

    saveUser.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-10 animate-fade-in-up">
        <GlassSkeleton className="h-10 w-64" />
        <div className="glass-card overflow-hidden">
          <GlassSkeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-fade-in-up">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Identity Management</h1>
            <div className="rounded-full border border-purple/20 bg-purple/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-purple">
              {allUsers.length} Registered
            </div>
          </div>
          <p className="mt-2 text-xs font-medium text-white/30">Manage user access control and organizational roles.</p>
        </div>

        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center">
          <div className="group relative w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-purple" size={16} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="glass-input w-full border-purple/20 py-3 pl-11 pr-6 focus:border-purple/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] sm:w-72"
            />
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-6 py-3 font-bold text-white shadow-lg shadow-purple/20 transition-all hover:opacity-90 sm:w-auto"
          >
            <UserPlus size={18} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card border-white/5 bg-navy-900/40 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Active Users</p>
          <p className="mt-3 text-3xl font-bold text-white">{activeUsersCount}</p>
          <p className="mt-2 text-xs text-white/30">Accounts currently enabled in the platform.</p>
        </div>
        <div className="glass-card border-white/5 bg-navy-900/40 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Administrators</p>
          <p className="mt-3 text-3xl font-bold text-white">{adminUsersCount}</p>
          <p className="mt-2 text-xs text-white/30">Users with full administrative access.</p>
        </div>
        <div className="glass-card border-white/5 bg-navy-900/40 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Provisioned Assets</p>
          <p className="mt-3 text-3xl font-bold text-white">{provisionedAssetsCount}</p>
          <p className="mt-2 text-xs text-white/30">VMs currently active or still provisioning.</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden border-white/5 bg-navy-900/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Full Name</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Contact</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Security Role</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Status</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Infrastructure</th>
                <th className="p-6 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user, idx) => {
                const userAssets = allRequests.filter(
                  (request) =>
                    request.requester_id === user.id &&
                    (request.status === "ACTIVE" || request.status === "PROVISIONING")
                ).length;

                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gradient text-sm font-bold text-navy-900 shadow-lg shadow-cyan/10">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white transition-colors group-hover:text-cyan">{user.name}</p>
                          <p className="mt-0.5 text-[10px] font-mono uppercase text-white/20">
                            {user.department || "No department"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <Mail size={14} className="text-purple/50" />
                        {user.email}
                      </div>
                    </td>
                    <td className="p-6">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          user.role === "ADMIN"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                            : user.role === "IT_TEAM"
                              ? "border-cyan/20 bg-cyan/10 text-cyan"
                              : "border-white/10 bg-white/5 text-white/40"
                        }`}
                      >
                        {user.role === "ADMIN" ? <ShieldAlert size={10} /> : <Shield size={10} />}
                        {user.role}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "animate-pulse bg-teal" : "bg-white/20"}`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                          {user.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-white/30">
                        <Monitor size={12} />
                        {userAssets} Assets
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toggleUserStatus.mutate({
                              userId: user.id,
                              isActive: !user.is_active,
                            })
                          }
                          disabled={toggleUserStatus.isPending}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            user.is_active
                              ? "border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                              : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          {user.is_active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="px-6 py-12 text-center text-white/30">
            <p className="text-sm font-medium text-white/50">No users matched your search.</p>
            <p className="mt-2 text-xs">Try a name, email address, role, or department.</p>
          </div>
        )}
      </div>

      {isUserModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md"
            onClick={closeUserModal}
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-purple/10 bg-[#04111d] shadow-2xl shadow-purple/10"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple">User Management</p>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    {editingUserId ? "Edit User" : "Add User"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="rounded-xl p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="max-h-[calc(90vh-88px)] space-y-6 overflow-y-auto px-6 py-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-white/50">Full Name</span>
                    <input
                      required
                      type="text"
                      value={userForm.name}
                      onChange={(event) => setUserForm({ ...userForm, name: event.target.value })}
                      placeholder="Jane Doe"
                      className="glass-input w-full"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-white/50">Email</span>
                    <input
                      required
                      type="email"
                      value={userForm.email}
                      onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                      placeholder="jane@company.com"
                      className="glass-input w-full"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-white/50">Role</span>
                    <select
                      value={userForm.role}
                      onChange={(event) =>
                        setUserForm({
                          ...userForm,
                          role: event.target.value as UserRole,
                        })
                      }
                      className="glass-input w-full"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-white/50">Department</span>
                    <input
                      type="text"
                      value={userForm.department}
                      onChange={(event) => setUserForm({ ...userForm, department: event.target.value })}
                      placeholder="IT Operations"
                      className="glass-input w-full"
                    />
                  </label>
                  {!editingUserId && (
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-medium text-white/50">Temporary Password</span>
                      <input
                        required
                        type="password"
                        value={userForm.password}
                        onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                        placeholder="Create a temporary password"
                        className="glass-input w-full"
                      />
                    </label>
                  )}
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-medium text-white/50">Account Status</span>
                    <button
                      type="button"
                      onClick={() => setUserForm({ ...userForm, is_active: !userForm.is_active })}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        userForm.is_active
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-white/5 text-white/50"
                      }`}
                    >
                      {userForm.is_active ? "User will be active after save" : "User will be disabled after save"}
                    </button>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={closeUserModal}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/60 transition hover:border-white/20 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveUser.isPending}
                    className="flex items-center gap-3 rounded-xl bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-6 py-3 font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <UserPlus size={16} />
                    <span>{saveUser.isPending ? "Saving..." : editingUserId ? "Update User" : "Create User"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminUsers;
