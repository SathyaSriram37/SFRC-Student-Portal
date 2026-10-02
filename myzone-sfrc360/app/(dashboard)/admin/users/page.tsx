'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Users, Search, UserPlus, Shield, GraduationCap, BookOpen, Heart, CheckCircle2, XCircle, Loader2, ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const createUserSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['student', 'faculty', 'parent', 'admin']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  department_id: z.string().optional(),
  // Student fields
  register_number: z.string().optional(),
  batch: z.string().optional(),
  // Faculty fields
  employee_id: z.string().optional(),
  designation: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface AdminUser {
  id: string;
  email: string;
  role: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  department_id?: string;
  department_name?: string;
  is_active: boolean;
  created_at?: string;
  register_number?: string;
  employee_id?: string;
}

interface UserListResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'student',
      password: 'Password@123',
    },
  });

  const selectedRole = watch('role');

  const loadUsers = async (targetPage = page) => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let url = `/api/v1/admin/users?page=${targetPage}&limit=20`;
      if (roleFilter) url += `&role=${roleFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const res = await apiGet<UserListResponse>(url, token);
      setUsers(res.data);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, [roleFilter, statusFilter, supabase]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(1);
  };

  const handleCreateUser = async (formData: CreateUserFormData) => {
    try {
      setFeedbackMsg(null);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost('/api/v1/admin/users', formData, token);
      setFeedbackMsg({ type: 'success', text: `User ${formData.full_name} created successfully!` });
      reset();
      setIsModalOpen(false);
      loadUsers(1);
    } catch (err: unknown) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create user. Ensure email is unique.' });
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      setActionLoadingId(userId);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPost(`/api/v1/admin/users/${userId}/deactivate`, {}, token);
      setFeedbackMsg({ type: 'success', text: 'User deactivated successfully.' });
      loadUsers(page);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sfrc-950 text-white uppercase tracking-wider"><Shield className="w-3 h-3 text-sfrc-gold" /> Admin</span>;
      case 'faculty':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><BookOpen className="w-3 h-3" /> Faculty</span>;
      case 'parent':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200"><Heart className="w-3 h-3" /> Parent</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><GraduationCap className="w-3 h-3" /> Student</span>;
    }
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <AppShell role="admin" userName="Administrator">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-sfrc-900 tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6 text-sfrc-700" />
                User Management & Access Control
              </h1>
              <p className="text-xs text-sfrc-600">
                Institutional directory of active students, faculty, parents, and administrative staff
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            Create User Account
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={cn(
              'p-4 rounded-2xl border text-xs font-bold flex items-center justify-between',
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            )}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-current hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="bg-white rounded-3xl border border-sfrc-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-sfrc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, register no…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-sfrc-200 bg-sfrc-surface focus:outline-hidden focus:ring-2 focus:ring-sfrc-700 font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-sfrc-100 hover:bg-sfrc-200 text-sfrc-800 text-xs font-bold transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border border-sfrc-200 bg-sfrc-surface focus:outline-hidden font-semibold text-sfrc-800"
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border border-sfrc-200 bg-sfrc-surface focus:outline-hidden font-semibold text-sfrc-800"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl border border-sfrc-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-sfrc-200 bg-sfrc-surface text-sfrc-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Department / ID</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sfrc-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sfrc-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-sfrc-700 mb-2" />
                      Loading user records from database…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sfrc-500 font-medium">
                      No user records matched your criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-sfrc-surface/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-sfrc-100 flex items-center justify-center font-bold text-sfrc-800 text-xs shrink-0">
                            {u.full_name?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-sfrc-900">{u.full_name}</p>
                            <p className="text-[11px] text-sfrc-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-sfrc-800">{u.department_name || 'General'}</p>
                        <p className="text-[10px] text-sfrc-500 font-mono">
                          {u.register_number || u.employee_id || '—'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-sfrc-500 font-mono text-[11px]">
                        {u.created_at ? u.created_at.slice(0, 10) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {u.is_active && (
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            disabled={actionLoadingId === u.id}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                          >
                            {actionLoadingId === u.id ? 'Deactivating…' : 'Deactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-sfrc-100 flex items-center justify-between text-xs text-sfrc-600">
            <span>
              Showing {users.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, total)} of {total} users
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadUsers(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-sfrc-200 hover:bg-sfrc-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-sfrc-900">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => loadUsers(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-sfrc-200 hover:bg-sfrc-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CREATE USER MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-sfrc-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
                <h2 className="text-lg font-black text-sfrc-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-sfrc-700" />
                  Create New User Account
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-sfrc-100 flex items-center justify-center text-sfrc-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Full Name</label>
                  <input
                    {...register('full_name')}
                    placeholder="e.g. Dr. Priya S or Rathna Priya"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface focus:outline-hidden font-medium"
                  />
                  {errors.full_name && <p className="text-red-600 mt-0.5">{errors.full_name.message}</p>}
                </div>

                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Email Address</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="user@sfrc.ac.in"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface focus:outline-hidden font-medium"
                  />
                  {errors.email && <p className="text-red-600 mt-0.5">{errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-sfrc-800 mb-1">Assigned Role</label>
                    <select
                      {...register('role')}
                      className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface focus:outline-hidden font-semibold"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="parent">Parent</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-sfrc-800 mb-1">Initial Password</label>
                    <input
                      {...register('password')}
                      type="text"
                      className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Conditional fields based on selected role */}
                {selectedRole === 'student' && (
                  <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 space-y-3">
                    <p className="font-bold text-sfrc-800 uppercase tracking-wider text-[10px]">Student Record Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Register Number</label>
                        <input
                          {...register('register_number')}
                          placeholder="e.g. 26UCA042"
                          className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Batch Year</label>
                        <input
                          {...register('batch')}
                          placeholder="2026-2029"
                          className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedRole === 'faculty' && (
                  <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 space-y-3">
                    <p className="font-bold text-sfrc-800 uppercase tracking-wider text-[10px]">Faculty Record Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Employee ID</label>
                        <input
                          {...register('employee_id')}
                          placeholder="FAC088"
                          className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Designation</label>
                        <input
                          {...register('designation')}
                          placeholder="Assistant Professor"
                          className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-sfrc-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sfrc-700 hover:bg-sfrc-100 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold transition-all shadow-xs flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <AskPragyaBanner />
      </div>
    </AppShell>
  );
}
