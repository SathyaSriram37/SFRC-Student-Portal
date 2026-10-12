'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  GraduationCap,
  BookOpen,
  Heart,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Edit2,
  KeyRound,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Building,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  AlertTriangle,
  FileText,
  UserX,
} from 'lucide-react';
import AskPragyaBanner from '@/components/shared/AskPragyaBanner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import StudentSearchSelector, { StudentLookupItem } from '@/components/admin/StudentSearchSelector';

// ── Schemas ─────────────────────────────────────────────────────────────────

const createUserSchema = z
  .object({
    full_name: z.string().min(2, 'Full name is required (min 2 chars)'),
    email: z.string().optional(),
    role: z.enum(['student', 'faculty', 'parent', 'admin']),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    department_id: z.string().optional(),
    // Student fields
    programme_id: z.string().optional(),
    register_number: z.string().optional(),
    current_semester: z.coerce.number().min(1).max(10).optional(),
    batch: z.string().optional(),
    section: z.string().optional(),
    date_of_birth: z.string().optional(),
    blood_group: z.string().optional(),
    permanent_address: z.string().optional(),
    emergency_contact: z.string().optional(),
    // Faculty fields
    employee_id: z.string().optional(),
    designation: z.string().optional(),
    qualification: z.string().optional(),
    specialization: z.string().optional(),
    // Parent fields
    relation: z.string().optional(),
    ward_student_ids: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'parent') {
      // Parent: require at least one contact identifier (email or phone)
      if (!data.email && !data.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either personal email or phone number is required for Parent account',
          path: ['email'],
        });
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid email address (e.g. parent@gmail.com)',
          path: ['email'],
        });
      }
      if (data.phone && !/^\+?[0-9]{10,15}$/.test(data.phone.replace(/[\s-]/g, ''))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid 10-digit mobile number',
          path: ['phone'],
        });
      }
    } else {
      // Non-parent: strictly require valid institutional email
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A valid institutional email is required',
          path: ['email'],
        });
      }
    }
  });

type CreateUserFormData = z.infer<typeof createUserSchema>;

const editUserSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  department_id: z.string().optional(),
  // Student fields
  programme_id: z.string().optional(),
  register_number: z.string().optional(),
  current_semester: z.coerce.number().min(1).max(10).optional(),
  batch: z.string().optional(),
  section: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_group: z.string().optional(),
  permanent_address: z.string().optional(),
  emergency_contact: z.string().optional(),
  // Faculty fields
  employee_id: z.string().optional(),
  designation: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  // Parent fields
  relation: z.string().optional(),
  ward_student_ids: z.array(z.string()).optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

// ── Types ───────────────────────────────────────────────────────────────────

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

interface UserCounts {
  total: number;
  students: number;
  faculty: number;
  parents: number;
  admins: number;
  active: number;
  inactive: number;
}

interface LinkedWardItem {
  student_id: string;
  user_id: string;
  full_name: string;
  register_number: string;
  programme_name?: string;
  relation?: string;
}

interface LinkedParentItem {
  parent_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  relation?: string;
}

interface AdminUserDetails {
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
  updated_at?: string;
  // Student
  student_id?: string;
  register_number?: string;
  roll_number?: string;
  programme_id?: string;
  programme_name?: string;
  current_semester?: number;
  batch?: string;
  section?: string;
  date_of_birth?: string;
  blood_group?: string;
  permanent_address?: string;
  emergency_contact?: string;
  abc_id?: string;
  apaar_id?: string;
  linked_parents?: LinkedParentItem[];
  // Faculty
  faculty_id?: string;
  employee_id?: string;
  designation?: string;
  qualification?: string;
  specialization?: string;
  // Parent
  parent_id?: string;
  relation?: string;
  ward_student_id?: string;
  linked_wards?: LinkedWardItem[];
  // Auth
  last_sign_in_at?: string;
}

interface UserListResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const OFFICIAL_DEPARTMENTS = [
  { name: 'Department of Tamil', code: 'TAM' },
  { name: 'Department of English', code: 'ENG' },
  { name: 'Department of History', code: 'HIST' },
  { name: 'Department of Commerce', code: 'COM' },
  { name: 'Department of Commerce (Professional Accounting)', code: 'COM-PA' },
  { name: 'Department of Business Administration', code: 'BBA' },
  { name: 'Department of Mathematics', code: 'MATH' },
  { name: 'Department of Physics', code: 'PHY' },
  { name: 'Department of Chemistry', code: 'CHEM' },
  { name: 'Department of Botany', code: 'BOT' },
  { name: 'Department of Microbiology', code: 'MBIO' },
  { name: 'Department of Nutrition and Dietetics', code: 'ND' },
  { name: 'Department of Computer Science', code: 'CS' },
  { name: 'Department of Computer Applications', code: 'CA' },
  { name: 'Department of Data Science', code: 'DS' },
  { name: 'Department of Costume Design & Fashion', code: 'CDF' },
  { name: 'Department of Psychology', code: 'PSY' },
  { name: 'Department of Geography', code: 'GEO' },
  { name: 'Department of Physical Education', code: 'PED' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departmentsList, setDepartmentsList] = useState<Array<{ id?: string; name: string; code: string }>>(OFFICIAL_DEPARTMENTS);
  const [programmesList, setProgrammesList] = useState<Array<{ id: string; name: string; code: string; degree_level: string; department?: string }>>([]);
  const [stats, setStats] = useState<UserCounts>({
    total: 0,
    students: 0,
    faculty: 0,
    parents: 0,
    admins: 0,
    active: 0,
    inactive: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'student' | 'faculty' | 'parent' | 'active' | 'inactive'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Modals & Drawers state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewDetailsUser, setViewDetailsUser] = useState<AdminUserDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserDetails | null>(null);
  const [resetPwdResult, setResetPwdResult] = useState<{ email: string; tempPass: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<AdminUser | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected wards for creating and editing parent accounts
  const [selectedWards, setSelectedWards] = useState<StudentLookupItem[]>([]);
  const [editSelectedWards, setEditSelectedWards] = useState<StudentLookupItem[]>([]);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadAcademicMeta() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const [deptRes, progRes] = await Promise.all([
          apiGet<Array<{ id: string; name: string; code: string }>>('/api/v1/admin/departments', token),
          apiGet<Array<{ id: string; name: string; code: string; degree_level: string; department?: string }>>('/api/v1/admin/academics/programmes', token),
        ]);
        if (deptRes && deptRes.length > 0) setDepartmentsList(deptRes);
        if (progRes && progRes.length > 0) setProgrammesList(progRes);
      } catch (err) {
        console.error('Failed to load academic meta from database:', err);
      }
    }
    loadAcademicMeta();
  }, [supabase]);

  // Form for creating user
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    watch: watchCreate,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreateSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'student',
      password: 'Sfrc@2026',
      current_semester: 1,
      batch: '2026-2029',
      section: 'A',
      designation: 'Assistant Professor',
      relation: 'Parent',
    },
  });

  const selectedCreateRole = watchCreate('role');

  // Form for editing user
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
  });

  // Load summary stats from authoritative backend
  const loadStats = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await apiGet<UserCounts>('/api/v1/admin/users/stats', token);
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.warn('Failed to fetch user stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, [supabase]);

  // Load authoritative user directory from backend with fallback
  const loadUsers = useCallback(async (targetPage = 1, targetTab?: typeof activeTab) => {
    const effectiveTab = targetTab !== undefined ? targetTab : activeTab;
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let roleParam = '';
      let statusParam = '';

      if (effectiveTab === 'student') roleParam = 'student';
      else if (effectiveTab === 'faculty') roleParam = 'faculty';
      else if (effectiveTab === 'parent') roleParam = 'parent';
      else if (effectiveTab === 'active') statusParam = 'active';
      else if (effectiveTab === 'inactive') statusParam = 'inactive';

      let url = `/api/v1/admin/users?page=${targetPage}&limit=20`;
      if (roleParam) url += `&role=${roleParam}`;
      if (statusParam) url += `&status=${statusParam}`;
      if (deptFilter) url += `&dept=${encodeURIComponent(deptFilter)}`;
      if (searchQuery.trim()) url += `&q=${encodeURIComponent(searchQuery.trim())}`;

      try {
        const res = await apiGet<UserListResponse>(url, token);
        if (res && Array.isArray(res.data)) {
          setUsers(res.data);
          setTotal(res.total);
          setPage(res.page);
          return;
        }
      } catch (backendErr) {
        console.warn('Backend list_users error, attempting direct query:', backendErr);
      }

      // Supabase fallback query if backend API is temporarily offline
      let query = supabase.from('user_profiles').select('*', { count: 'exact' });
      if (roleParam) query = query.eq('role', roleParam);
      if (statusParam) query = query.eq('is_active', statusParam === 'active');
      if (deptFilter) query = query.eq('department_name', deptFilter);
      if (searchQuery.trim()) {
        query = query.or(`full_name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`);
      }

      const { data: profiles, count, error } = await query
        .order('created_at', { ascending: false })
        .range((targetPage - 1) * 20, targetPage * 20 - 1);

      if (error) {
        console.error('Supabase query error:', error);
        setUsers([]);
        setTotal(0);
      } else if (profiles) {
        const mapped: AdminUser[] = profiles.map((p: any) => ({
          id: p.id,
          email: p.email,
          role: p.role,
          full_name: p.full_name || p.email?.split('@')[0],
          phone: p.phone,
          avatar_url: p.avatar_url,
          department_id: p.department_id,
          department_name: p.department_name,
          is_active: p.is_active ?? true,
          created_at: p.created_at,
        }));
        setUsers(mapped);
        setTotal(count ?? mapped.length);
        setPage(targetPage);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, deptFilter, searchQuery, supabase]);

  useEffect(() => {
    loadStats();
    loadUsers(1);
  }, [loadStats, loadUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(1);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setPage(1);
    loadUsers(1, tab);
  };

  // Open detailed view drawer
  const handleOpenDetails = async (userId: string) => {
    try {
      setIsDetailsLoading(true);
      setViewDetailsUser(null);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const details = await apiGet<AdminUserDetails>(`/api/v1/admin/users/${userId}`, token);
      setViewDetailsUser(details);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to fetch user details.' });
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = async (user: AdminUser) => {
    try {
      setIsDetailsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const details = await apiGet<AdminUserDetails>(`/api/v1/admin/users/${user.id}`, token);
      setEditingUser(details);

      if (details.role.toLowerCase() === 'parent' && details.linked_wards) {
        setEditSelectedWards(
          details.linked_wards.map((lw) => ({
            id: lw.student_id,
            user_id: lw.user_id,
            register_number: lw.register_number,
            full_name: lw.full_name,
            programme_name: lw.programme_name,
            is_active: true,
          }))
        );
      } else {
        setEditSelectedWards([]);
      }

      resetEdit({
        full_name: details.full_name,
        phone: details.phone || '',
        department_id: details.department_id || '',
        programme_id: details.programme_id || '',
        register_number: details.register_number || '',
        current_semester: details.current_semester || 1,
        batch: details.batch || '',
        section: details.section || '',
        date_of_birth: details.date_of_birth || '',
        blood_group: details.blood_group || '',
        permanent_address: details.permanent_address || '',
        emergency_contact: details.emergency_contact || '',
        employee_id: details.employee_id || '',
        designation: details.designation || '',
        qualification: details.qualification || '',
        specialization: details.specialization || '',
        relation: details.relation || 'Parent',
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to prepare user edit form.' });
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Submit edit form
  const handleSaveEdit = async (formData: EditUserFormData) => {
    if (!editingUser) return;
    try {
      setFeedbackMsg(null);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const payload: Record<string, any> = {
        full_name: formData.full_name.trim(),
      };
      if (formData.phone?.trim()) payload.phone = formData.phone.trim();
      if (formData.department_id) payload.department_id = formData.department_id;

      const editRole = editingUser.role.toLowerCase();
      if (editRole === 'student') {
        payload.register_number = formData.register_number?.trim();
        if (formData.programme_id) payload.programme_id = formData.programme_id;
        payload.current_semester = formData.current_semester || 1;
        payload.batch = formData.batch;
        payload.section = formData.section;
        payload.date_of_birth = formData.date_of_birth;
        payload.blood_group = formData.blood_group;
        payload.permanent_address = formData.permanent_address;
        payload.emergency_contact = formData.emergency_contact;
      } else if (editRole === 'faculty') {
        payload.employee_id = formData.employee_id?.trim();
        payload.designation = formData.designation;
        payload.qualification = formData.qualification;
        payload.specialization = formData.specialization;
      } else if (editRole === 'parent') {
        payload.relation = formData.relation || 'Parent';
        payload.ward_student_ids = editSelectedWards.map((w) => w.id);
      }

      await apiPut(`/api/v1/admin/users/${editingUser.id}`, payload, token);

      setFeedbackMsg({ type: 'success', text: `Profile for ${formData.full_name} updated successfully in database.` });
      setEditingUser(null);
      setEditSelectedWards([]);
      // If details drawer is open for this user, refresh it
      if (viewDetailsUser && viewDetailsUser.id === editingUser.id) {
        handleOpenDetails(editingUser.id);
      }
      loadUsers(page);
      loadStats();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to update user profile.' });
    }
  };

  // Submit create user form
  const handleCreateUser = async (formData: CreateUserFormData) => {
    try {
      setFeedbackMsg(null);
      if (formData.role === 'parent' && selectedWards.length === 0) {
        setFeedbackMsg({
          type: 'error',
          text: 'Please search and link at least one student ward to this parent account.',
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const payload: Record<string, any> = {
        full_name: formData.full_name.trim(),
        role: formData.role,
        password: formData.password,
      };

      if (formData.email?.trim()) {
        payload.email = formData.email.trim();
      }
      if (formData.phone?.trim()) {
        payload.phone = formData.phone.trim();
      }
      if (formData.department_id) {
        payload.department_id = formData.department_id;
      }

      if (formData.role === 'student') {
        payload.register_number = formData.register_number?.trim();
        if (formData.programme_id) payload.programme_id = formData.programme_id;
        payload.current_semester = formData.current_semester || 1;
        payload.batch = formData.batch;
        payload.section = formData.section;
        payload.date_of_birth = formData.date_of_birth;
        payload.blood_group = formData.blood_group;
        payload.permanent_address = formData.permanent_address;
        payload.emergency_contact = formData.emergency_contact;
      } else if (formData.role === 'faculty') {
        payload.employee_id = formData.employee_id?.trim();
        payload.designation = formData.designation;
        payload.qualification = formData.qualification;
        payload.specialization = formData.specialization;
      } else if (formData.role === 'parent') {
        payload.relation = formData.relation || 'Parent';
        payload.ward_student_ids = selectedWards.map((w) => w.id);
      }

      const res = await apiPost<{ status: string; message: string; user_id: string }>(
        '/api/v1/admin/users',
        payload,
        token
      );

      setFeedbackMsg({
        type: 'success',
        text: res.message || `User ${formData.full_name} successfully created in Supabase Auth & Database.`,
      });
      resetCreate();
      setSelectedWards([]);
      setIsCreateModalOpen(false);
      loadUsers(1);
      loadStats();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Failed to create user. Verify input information.',
      });
    }
  };

  // Toggle user activation state (Activate / Deactivate)
  const handleToggleActiveState = async (user: AdminUser) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    const confirmPrompt = user.is_active
      ? `Are you sure you want to deactivate ${user.full_name}? The user will be banned from signing in until re-activated.`
      : `Are you sure you want to activate ${user.full_name}? The user's account and login will be restored immediately.`;

    if (!confirm(confirmPrompt)) return;

    try {
      setActionLoadingId(user.id);
      setFeedbackMsg(null);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await apiPost<{ status: string; message: string }>(
        `/api/v1/admin/users/${user.id}/${action}`,
        {},
        token
      );

      setFeedbackMsg({ type: 'success', text: res.message || `User ${action}d successfully.` });
      // Update local state immediately
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !user.is_active } : u))
      );
      if (viewDetailsUser && viewDetailsUser.id === user.id) {
        setViewDetailsUser({ ...viewDetailsUser, is_active: !user.is_active });
      }
      loadStats();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || `Failed to ${action} user.` });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Trigger Password Reset
  const handleResetPassword = async (user: AdminUser) => {
    if (!confirm(`Reset password for ${user.full_name} (${user.email})? A secure temporary password will be generated.`)) return;

    try {
      setActionLoadingId(user.id);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await apiPost<{ status: string; message: string; temporary_password: string }>(
        `/api/v1/admin/users/${user.id}/reset-password`,
        {},
        token
      );

      setResetPwdResult({
        email: user.email,
        tempPass: res.temporary_password,
      });
      setCopiedPass(false);
      setFeedbackMsg({ type: 'success', text: `Password reset successfully for ${user.email}.` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to reset password in Supabase Auth.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Perform delete / archive
  const handleConfirmDelete = async (permanent: boolean) => {
    if (!deleteTargetUser) return;
    try {
      setActionLoadingId(deleteTargetUser.id);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await apiDelete<{ status: string; message: string }>(
        `/api/v1/admin/users/${deleteTargetUser.id}?permanent=${permanent}`,
        token
      );

      setFeedbackMsg({ type: 'success', text: res.message || 'Operation completed successfully.' });
      setDeleteTargetUser(null);
      if (viewDetailsUser && viewDetailsUser.id === deleteTargetUser.id) {
        setViewDetailsUser(null);
      }
      loadUsers(page);
      loadStats();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Operation failed.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sfrc-950 text-white uppercase tracking-wider shadow-2xs">
            <Shield className="w-3 h-3 text-sfrc-gold" /> Admin
          </span>
        );
      case 'faculty':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3 h-3 text-blue-600" /> Faculty
          </span>
        );
      case 'parent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
            <Heart className="w-3 h-3 text-pink-600" /> Parent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <GraduationCap className="w-3 h-3 text-emerald-600" /> Student
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="w-10 h-10 rounded-2xl bg-white border border-sfrc-200 flex items-center justify-center text-sfrc-700 hover:bg-sfrc-50 transition-colors shadow-2xs"
            title="Return to Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-sfrc-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-sfrc-700" />
              Institutional User Management
            </h1>
            <p className="text-xs text-sfrc-600">
              Authoritative database directory of SFRC Students, Faculty, Parents, and Administrators
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              loadStats();
              loadUsers(page);
            }}
            disabled={isLoading}
            className="px-3.5 py-2.5 rounded-2xl bg-white border border-sfrc-200 hover:bg-sfrc-50 text-sfrc-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Reload live database records"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            Refresh
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Create User Account
          </button>
        </div>
      </div>

      {/* ── Live Database Metrics Stats Bar ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Users */}
        <div
          onClick={() => handleTabChange('all')}
          className={cn(
            'p-3.5 rounded-2xl border transition-all cursor-pointer',
            activeTab === 'all'
              ? 'bg-sfrc-900 text-white border-sfrc-900 shadow-md ring-2 ring-sfrc-700'
              : 'bg-white border-sfrc-200 text-sfrc-800 hover:border-sfrc-400 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', activeTab === 'all' ? 'text-sfrc-200' : 'text-sfrc-500')}>
              All Users
            </span>
            <Users className={cn('w-4 h-4', activeTab === 'all' ? 'text-sfrc-gold' : 'text-sfrc-600')} />
          </div>
          <p className="text-xl font-black mt-1">
            {isStatsLoading ? '…' : stats.total}
          </p>
        </div>

        {/* Students */}
        <div
          onClick={() => handleTabChange('student')}
          className={cn(
            'p-3.5 rounded-2xl border transition-all cursor-pointer',
            activeTab === 'student'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-600'
              : 'bg-white border-sfrc-200 text-sfrc-800 hover:border-emerald-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', activeTab === 'student' ? 'text-emerald-200' : 'text-sfrc-500')}>
              Students
            </span>
            <GraduationCap className={cn('w-4 h-4', activeTab === 'student' ? 'text-emerald-300' : 'text-emerald-600')} />
          </div>
          <p className="text-xl font-black mt-1">
            {isStatsLoading ? '…' : stats.students}
          </p>
        </div>

        {/* Faculty */}
        <div
          onClick={() => handleTabChange('faculty')}
          className={cn(
            'p-3.5 rounded-2xl border transition-all cursor-pointer',
            activeTab === 'faculty'
              ? 'bg-blue-900 text-white border-blue-900 shadow-md ring-2 ring-blue-600'
              : 'bg-white border-sfrc-200 text-sfrc-800 hover:border-blue-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', activeTab === 'faculty' ? 'text-blue-200' : 'text-sfrc-500')}>
              Faculty
            </span>
            <BookOpen className={cn('w-4 h-4', activeTab === 'faculty' ? 'text-blue-300' : 'text-blue-600')} />
          </div>
          <p className="text-xl font-black mt-1">
            {isStatsLoading ? '…' : stats.faculty}
          </p>
        </div>

        {/* Parents */}
        <div
          onClick={() => handleTabChange('parent')}
          className={cn(
            'p-3.5 rounded-2xl border transition-all cursor-pointer',
            activeTab === 'parent'
              ? 'bg-pink-900 text-white border-pink-900 shadow-md ring-2 ring-pink-600'
              : 'bg-white border-sfrc-200 text-sfrc-800 hover:border-pink-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', activeTab === 'parent' ? 'text-pink-200' : 'text-sfrc-500')}>
              Parents
            </span>
            <Heart className={cn('w-4 h-4', activeTab === 'parent' ? 'text-pink-300' : 'text-pink-600')} />
          </div>
          <p className="text-xl font-black mt-1">
            {isStatsLoading ? '…' : stats.parents}
          </p>
        </div>

        {/* Active Users */}
        <div
          onClick={() => handleTabChange('active')}
          className={cn(
            'p-3.5 rounded-2xl border transition-all cursor-pointer',
            activeTab === 'active'
              ? 'bg-emerald-950 text-white border-emerald-950 shadow-md ring-2 ring-emerald-500'
              : 'bg-white border-sfrc-200 text-sfrc-800 hover:border-emerald-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', activeTab === 'active' ? 'text-emerald-200' : 'text-sfrc-500')}>
              Active
            </span>
            <CheckCircle2 className={cn('w-4 h-4', activeTab === 'active' ? 'text-emerald-400' : 'text-emerald-600')} />
          </div>
          <p className="text-xl font-black mt-1">
            {isStatsLoading ? '…' : stats.active}
          </p>
        </div>

        {/* Inactive Users */}
        <div
          onClick={() => handleTabChange('inactive')}
          className={cn(
            'p-3.5 rounded-2xl border transition-all cursor-pointer',
            activeTab === 'inactive'
              ? 'bg-red-950 text-white border-red-950 shadow-md ring-2 ring-red-600'
              : 'bg-white border-sfrc-200 text-sfrc-800 hover:border-red-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', activeTab === 'inactive' ? 'text-red-200' : 'text-sfrc-500')}>
              Inactive
            </span>
            <XCircle className={cn('w-4 h-4', activeTab === 'inactive' ? 'text-red-400' : 'text-red-600')} />
          </div>
          <p className="text-xl font-black mt-1">
            {isStatsLoading ? '…' : stats.inactive}
          </p>
        </div>
      </div>

      {/* ── Feedback Banner ─────────────────────────────────────────────────── */}
      {feedbackMsg && (
        <div
          className={cn(
            'p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fadeIn',
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          )}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-current hover:opacity-70 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Filter Tabs & Search Controls Toolbar ────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-sfrc-200 p-4 shadow-2xs space-y-4">
        {/* Role Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-sfrc-100 pb-3">
          {[
            { id: 'all', label: 'All Users', count: stats.total },
            { id: 'student', label: 'Students', count: stats.students },
            { id: 'faculty', label: 'Faculty', count: stats.faculty },
            { id: 'parent', label: 'Parents', count: stats.parents },
            { id: 'active', label: 'Active', count: stats.active },
            { id: 'inactive', label: 'Inactive', count: stats.inactive },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                activeTab === tab.id
                  ? 'bg-sfrc-700 text-white shadow-2xs'
                  : 'bg-sfrc-50 text-sfrc-700 hover:bg-sfrc-100'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-sfrc-200 text-sfrc-800'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Department Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-sfrc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by full name, email, register no, or staff ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-sfrc-200 bg-sfrc-surface focus:outline-hidden focus:ring-2 focus:ring-sfrc-700 font-medium text-sfrc-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Dropdown */}
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs border border-sfrc-200 bg-sfrc-surface focus:outline-hidden font-semibold text-sfrc-800"
            >
              <option value="">All Departments ({departmentsList.length})</option>
              {departmentsList.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            {(searchQuery || deptFilter || activeTab !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('');
                  setActiveTab('all');
                  loadUsers(1, 'all');
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-sfrc-600 hover:bg-sfrc-100 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Authoritative Real Users Table ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-sfrc-200 shadow-2xs overflow-hidden">
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
                    Querying authoritative database records…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sfrc-500 font-medium">
                    <Users className="w-8 h-8 text-sfrc-300 mx-auto mb-2" />
                    No authoritative user records matched your criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-sfrc-surface/60 transition-colors">
                    {/* User name & email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sfrc-100 border border-sfrc-200 flex items-center justify-center font-bold text-sfrc-800 text-xs shrink-0">
                          {u.full_name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-sfrc-900">{u.full_name}</p>
                          <p className="text-[11px] text-sfrc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                    {/* Department & Identifier */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-sfrc-800">{u.department_name || 'General'}</p>
                      <p className="text-[10px] text-sfrc-500 font-mono">
                        {u.register_number || u.employee_id || 'ID pending'}
                      </p>
                    </td>

                    {/* Account Status */}
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-sfrc-500 font-mono text-[11px]">
                      {u.created_at ? u.created_at.slice(0, 10) : '—'}
                    </td>

                    {/* Actions Toolbar */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => handleOpenDetails(u.id)}
                          className="p-1.5 rounded-lg text-sfrc-700 hover:bg-sfrc-100 transition-colors"
                          title="View complete profile details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit User */}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
                          title="Edit permitted profile fields"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => handleResetPassword(u)}
                          disabled={actionLoadingId === u.id}
                          className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
                          title="Reset account password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {/* Toggle Active / Deactivate */}
                        <button
                          onClick={() => handleToggleActiveState(u)}
                          disabled={actionLoadingId === u.id}
                          className={cn(
                            'px-2 py-1 rounded-lg text-[11px] font-bold transition-colors border',
                            u.is_active
                              ? 'text-red-700 hover:bg-red-50 border-red-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                          )}
                          title={u.is_active ? 'Deactivate account' : 'Activate account'}
                        >
                          {actionLoadingId === u.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : u.is_active ? (
                            'Deactivate'
                          ) : (
                            'Activate'
                          )}
                        </button>

                        {/* Archive / Delete */}
                        <button
                          onClick={() => setDeleteTargetUser(u)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="Archive or delete user account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Controls ────────────────────────────────────────────── */}
        <div className="p-4 border-t border-sfrc-100 flex items-center justify-between text-xs text-sfrc-600">
          <span>
            Showing {users.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, total)} of {total} authoritative records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadUsers(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-sfrc-200 hover:bg-sfrc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sfrc-900">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => loadUsers(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-sfrc-200 hover:bg-sfrc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── DRAWER / MODAL: VIEW DETAILED USER PROFILE ───────────────────────── */}
      {viewDetailsUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sfrc-200 max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-sfrc-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sfrc-100 border border-sfrc-200 flex items-center justify-center font-black text-sfrc-900 text-lg">
                  {viewDetailsUser.full_name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-lg font-black text-sfrc-900 flex items-center gap-2">
                    {viewDetailsUser.full_name}
                    {getRoleBadge(viewDetailsUser.role)}
                  </h2>
                  <p className="text-xs text-sfrc-500 font-mono">{viewDetailsUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setViewDetailsUser(null)}
                className="w-8 h-8 rounded-full hover:bg-sfrc-100 flex items-center justify-center text-sfrc-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Status Card */}
            <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-sfrc-500 font-semibold block text-[10px] uppercase tracking-wider">Account State</span>
                {viewDetailsUser.is_active ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active & Authorized
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-red-600">
                    <XCircle className="w-3.5 h-3.5" /> Inactive / Banned
                  </span>
                )}
              </div>
              <div>
                <span className="text-sfrc-500 font-semibold block text-[10px] uppercase tracking-wider">Created Date</span>
                <span className="font-mono text-sfrc-800">{viewDetailsUser.created_at?.slice(0, 10) || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-sfrc-500 font-semibold block text-[10px] uppercase tracking-wider">Last Sign-In</span>
                <span className="font-mono text-sfrc-800">{viewDetailsUser.last_sign_in_at ? viewDetailsUser.last_sign_in_at.slice(0, 19).replace('T', ' ') : 'Never'}</span>
              </div>
            </div>

            {/* 1. Student Detailed Profile */}
            {viewDetailsUser.role.toLowerCase() === 'student' && (
              <div className="space-y-4">
                {/* Academic Information */}
                <div>
                  <h3 className="text-xs font-black text-sfrc-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-sfrc-700" /> Academic Information
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-sfrc-surface p-3.5 rounded-2xl border border-sfrc-200">
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Department</span>
                      <span className="font-bold text-sfrc-900">{viewDetailsUser.department_name || 'Computer Applications'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Programme / Degree</span>
                      <span className="font-bold text-sfrc-900">{viewDetailsUser.programme_name || 'B.C.A.'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Register Number</span>
                      <span className="font-mono font-bold text-sfrc-900">{viewDetailsUser.register_number || 'Not available'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Current Semester</span>
                      <span className="font-bold text-sfrc-900">Semester {viewDetailsUser.current_semester ?? 1}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Batch Year</span>
                      <span className="font-bold text-sfrc-900">{viewDetailsUser.batch || '2026-2029'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Section</span>
                      <span className="font-bold text-sfrc-900">Section {viewDetailsUser.section || 'A'}</span>
                    </div>
                  </div>
                </div>

                {/* Personal & Contact */}
                <div>
                  <h3 className="text-xs font-black text-sfrc-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-sfrc-700" /> Personal & Contact Details
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-sfrc-surface p-3.5 rounded-2xl border border-sfrc-200">
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Contact Phone</span>
                      <span className="font-mono text-sfrc-900">{viewDetailsUser.phone || 'Not available'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Date of Birth</span>
                      <span className="font-mono text-sfrc-900">{viewDetailsUser.date_of_birth || 'Not available'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Blood Group</span>
                      <span className="font-bold text-sfrc-900">{viewDetailsUser.blood_group || 'Not available'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Permanent Address</span>
                      <span className="text-sfrc-900">{viewDetailsUser.permanent_address || 'Not available'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Emergency Contact</span>
                      <span className="font-mono text-sfrc-900">{viewDetailsUser.emergency_contact || 'Not available'}</span>
                    </div>
                  </div>
                </div>

                {/* Linked Parents */}
                <div>
                  <h3 className="text-xs font-black text-sfrc-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-pink-600" /> Linked Parent / Guardian
                  </h3>
                  {viewDetailsUser.linked_parents && viewDetailsUser.linked_parents.length > 0 ? (
                    <div className="space-y-2">
                      {viewDetailsUser.linked_parents.map((p) => (
                        <div key={p.parent_id} className="p-3 rounded-2xl bg-pink-50 border border-pink-200 text-xs flex items-center justify-between">
                          <div>
                            <p className="font-bold text-pink-900">{p.full_name} ({p.relation || 'Parent'})</p>
                            <p className="text-[11px] text-pink-700">{p.email} • {p.phone || 'No phone'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-sfrc-500 italic bg-sfrc-surface p-3 rounded-2xl border border-sfrc-200">
                      No linked parent account recorded in database.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 2. Faculty Detailed Profile */}
            {viewDetailsUser.role.toLowerCase() === 'faculty' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-black text-sfrc-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" /> Employment & Academic Profile
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-sfrc-surface p-3.5 rounded-2xl border border-sfrc-200">
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Employee ID</span>
                      <span className="font-mono font-bold text-sfrc-900">{viewDetailsUser.employee_id || 'Not available'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Department</span>
                      <span className="font-bold text-sfrc-900">{viewDetailsUser.department_name || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Designation</span>
                      <span className="font-bold text-sfrc-900">{viewDetailsUser.designation || 'Assistant Professor'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Qualification</span>
                      <span className="font-bold text-sfrc-900">{viewDetailsUser.qualification || 'M.Sc., Ph.D.'}</span>
                    </div>
                    <div>
                      <span className="text-sfrc-500 block text-[10px] font-semibold">Phone</span>
                      <span className="font-mono text-sfrc-900">{viewDetailsUser.phone || 'Not available'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Parent Detailed Profile */}
            {viewDetailsUser.role.toLowerCase() === 'parent' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-black text-sfrc-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-pink-600" /> Linked Student / Ward
                  </h3>
                  {viewDetailsUser.linked_wards && viewDetailsUser.linked_wards.length > 0 ? (
                    <div className="space-y-2">
                      {viewDetailsUser.linked_wards.map((w) => (
                        <div key={w.student_id} className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 text-xs flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sfrc-900">{w.full_name}</p>
                            <p className="text-[11px] text-sfrc-600">
                              Register No: <span className="font-mono font-bold">{w.register_number}</span> • {w.programme_name || 'UG Programme'}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-pink-100 text-pink-800 font-bold text-[10px]">
                            {w.relation || 'Ward'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-sfrc-500 italic bg-sfrc-surface p-3 rounded-2xl border border-sfrc-200">
                      No linked student record found for this parent.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Drawer Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-sfrc-100">
              <button
                onClick={() => {
                  const targetUser = users.find((u) => u.id === viewDetailsUser.id);
                  if (targetUser) handleOpenEdit(targetUser);
                }}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit User Record
              </button>
              <button
                onClick={() => setViewDetailsUser(null)}
                className="px-4 py-2 rounded-xl bg-sfrc-100 text-sfrc-800 hover:bg-sfrc-200 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT USER RECORD ─────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sfrc-200 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
              <h2 className="text-lg font-black text-sfrc-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-sfrc-700" />
                Edit Profile: {editingUser.full_name}
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full hover:bg-sfrc-100 flex items-center justify-center text-sfrc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit(handleSaveEdit)} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-sfrc-800 mb-1">Full Name</label>
                  <input
                    {...registerEdit('full_name')}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium text-sfrc-900"
                  />
                  {editErrors.full_name && <p className="text-red-600 mt-0.5">{editErrors.full_name.message}</p>}
                </div>

                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Phone Number</label>
                  <input
                    {...registerEdit('phone')}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-mono text-sfrc-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Department</label>
                  <select
                    {...registerEdit('department_id')}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-semibold text-sfrc-800"
                  >
                    <option value="">Select Department</option>
                    {departmentsList.map((d) => (
                      <option key={d.code} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student specific edit fields */}
              {editingUser.role.toLowerCase() === 'student' && (
                <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 space-y-3">
                  <p className="font-bold text-sfrc-800 uppercase tracking-wider text-[10px]">Academic & Personal Fields</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Enrolled Degree Programme / Course</label>
                      <select
                        {...registerEdit('programme_id')}
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-semibold text-sfrc-800 text-xs"
                      >
                        <option value="">Select Enrolled Degree Programme</option>
                        {programmesList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.degree_level}) — {p.department}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Register Number</label>
                      <input
                        {...registerEdit('register_number')}
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Semester</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        {...registerEdit('current_semester')}
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Batch Year</label>
                      <input
                        {...registerEdit('batch')}
                        placeholder="2026-2029"
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Section</label>
                      <input
                        {...registerEdit('section')}
                        placeholder="A"
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        {...registerEdit('date_of_birth')}
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Blood Group</label>
                      <input
                        {...registerEdit('blood_group')}
                        placeholder="O+, A+, B+"
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Permanent Address</label>
                      <input
                        {...registerEdit('permanent_address')}
                        placeholder="Address"
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Faculty specific edit fields */}
              {editingUser.role.toLowerCase() === 'faculty' && (
                <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 space-y-3">
                  <p className="font-bold text-sfrc-800 uppercase tracking-wider text-[10px]">Faculty Employment Fields</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Employee ID</label>
                      <input
                        {...registerEdit('employee_id')}
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Designation</label>
                      <input
                        {...registerEdit('designation')}
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Parent specific edit fields */}
              {editingUser.role.toLowerCase() === 'parent' && (
                <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-pink-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-pink-600" /> Parent Ward Relationship
                    </p>
                    <span className="text-[10px] font-semibold text-pink-700">
                      {editSelectedWards.length} student(s) linked
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Relationship</label>
                    <select
                      {...registerEdit('relation')}
                      className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-medium text-sfrc-900"
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Manage Linked Students / Wards</label>
                    <StudentSearchSelector
                      selectedStudents={editSelectedWards}
                      onAddStudent={(stu) => {
                        if (!editSelectedWards.some((w) => w.id === stu.id)) {
                          setEditSelectedWards([...editSelectedWards, stu]);
                        }
                      }}
                      onRemoveStudent={(id) => {
                        setEditSelectedWards(editSelectedWards.filter((w) => w.id !== id));
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sfrc-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-sfrc-700 hover:bg-sfrc-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-5 py-2 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
                >
                  {isEditSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE NEW USER ACCOUNT ─────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sfrc-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-sfrc-100 pb-3">
              <h2 className="text-lg font-black text-sfrc-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sfrc-700" />
                Create Real User Account
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-sfrc-100 flex items-center justify-center text-sfrc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit(handleCreateUser)} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-sfrc-800 mb-1">Full Name *</label>
                <input
                  {...registerCreate('full_name')}
                  placeholder={selectedCreateRole === 'parent' ? 'e.g. S. Ramanathan' : 'e.g. Karpagam S or Dr. Priya M'}
                  className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium text-sfrc-900"
                />
                {createErrors.full_name && <p className="text-red-600 mt-0.5">{createErrors.full_name.message}</p>}
              </div>

              {selectedCreateRole === 'parent' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-sfrc-800">Personal Email Address</label>
                    <span className="text-[10px] text-sfrc-500 font-semibold">(Optional if Mobile Number is provided)</span>
                  </div>
                  <input
                    {...registerCreate('email')}
                    type="email"
                    placeholder="parent@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium text-sfrc-900"
                  />
                  {createErrors.email && <p className="text-red-600 mt-0.5">{createErrors.email.message}</p>}
                  <p className="text-[10px] text-sfrc-500 mt-1">Parents can use personal email providers (Gmail, Yahoo, Outlook, etc.).</p>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Institutional Email *</label>
                  <input
                    {...registerCreate('email')}
                    type="email"
                    placeholder="user@sfrc.ac.in"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-medium text-sfrc-900"
                  />
                  {createErrors.email && <p className="text-red-600 mt-0.5">{createErrors.email.message}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Assigned Role</label>
                  <select
                    {...registerCreate('role')}
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-semibold text-sfrc-800"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">Initial Password *</label>
                  <input
                    {...registerCreate('password')}
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-mono text-sfrc-900"
                  />
                  {createErrors.password && <p className="text-red-600 mt-0.5">{createErrors.password.message}</p>}
                </div>
              </div>

              {selectedCreateRole === 'parent' ? (
                <div>
                  <label className="block font-bold text-sfrc-800 mb-1">
                    Mobile Number {watchCreate('email') ? '(Optional if email provided)' : '*'}
                  </label>
                  <input
                    {...registerCreate('phone')}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-mono"
                  />
                  {createErrors.phone && <p className="text-red-600 mt-0.5">{createErrors.phone.message}</p>}
                  <p className="text-[10px] text-sfrc-500 mt-1">10-digit mobile number for communication and portal login.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-sfrc-800 mb-1">Phone</label>
                    <input
                      {...registerCreate('phone')}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-sfrc-800 mb-1">Department</label>
                    <select
                      {...registerCreate('department_id')}
                      className="w-full px-3 py-2 rounded-xl border border-sfrc-200 bg-sfrc-surface font-semibold text-sfrc-800"
                    >
                      <option value="">Select Department</option>
                      {departmentsList.map((d) => (
                        <option key={d.code} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Conditional role fields */}
              {selectedCreateRole === 'student' && (
                <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 space-y-3">
                  <p className="font-bold text-sfrc-800 uppercase tracking-wider text-[10px]">Student Record Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Enrolled Degree Programme / Course</label>
                      <select
                        {...registerCreate('programme_id')}
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-semibold text-sfrc-800 text-xs"
                      >
                        <option value="">Select Enrolled Degree Programme</option>
                        {programmesList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.degree_level}) — {p.department}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Register Number</label>
                      <input
                        {...registerCreate('register_number')}
                        placeholder="26UCA042"
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Semester</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        {...registerCreate('current_semester')}
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Batch</label>
                      <input
                        {...registerCreate('batch')}
                        placeholder="2026-2029"
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Section</label>
                      <input
                        {...registerCreate('section')}
                        placeholder="A"
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedCreateRole === 'faculty' && (
                <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 space-y-3">
                  <p className="font-bold text-sfrc-800 uppercase tracking-wider text-[10px]">Faculty Employment Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Employee ID</label>
                      <input
                        {...registerCreate('employee_id')}
                        placeholder="FAC088"
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Designation</label>
                      <input
                        {...registerCreate('designation')}
                        placeholder="Assistant Professor"
                        className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedCreateRole === 'parent' && (
                <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-pink-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-pink-600" /> Parent Ward Link
                    </p>
                    <span className="text-[10px] font-semibold text-pink-700">
                      {selectedWards.length} student(s) selected
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Relationship</label>
                    <select
                      {...registerCreate('relation')}
                      className="w-full px-3 py-1.5 rounded-xl border border-sfrc-200 bg-white font-medium text-sfrc-900"
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-sfrc-700 mb-1">Search & Link Students / Wards *</label>
                    <StudentSearchSelector
                      selectedStudents={selectedWards}
                      onAddStudent={(stu) => {
                        if (!selectedWards.some((w) => w.id === stu.id)) {
                          setSelectedWards([...selectedWards, stu]);
                        }
                      }}
                      onRemoveStudent={(id) => {
                        setSelectedWards(selectedWards.filter((w) => w.id !== id));
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sfrc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sfrc-700 hover:bg-sfrc-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreateSubmitting}
                  className="px-5 py-2 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
                >
                  {isCreateSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account in Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PASSWORD RESET SUCCESS ───────────────────────────────────── */}
      {resetPwdResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sfrc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-emerald-800" />
              </div>
              <div>
                <h3 className="text-base font-black text-sfrc-900">Password Reset Complete</h3>
                <p className="text-xs text-sfrc-500 font-mono">{resetPwdResult.email}</p>
              </div>
            </div>

            <p className="text-xs text-sfrc-600">
              The user account password has been updated in Supabase Auth. Provide this secure temporary password to the user:
            </p>

            <div className="p-3.5 rounded-2xl bg-sfrc-surface border border-sfrc-200 flex items-center justify-between">
              <code className="text-sm font-black font-mono text-sfrc-900">{resetPwdResult.tempPass}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetPwdResult.tempPass);
                  setCopiedPass(true);
                  setTimeout(() => setCopiedPass(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-sfrc-200 hover:bg-sfrc-100 text-xs font-bold text-sfrc-800 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPass ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setResetPwdResult(null)}
                className="px-4 py-2 rounded-xl bg-sfrc-700 hover:bg-sfrc-800 text-white font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM ARCHIVE OR DELETE ─────────────────────────────────── */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sfrc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-sfrc-900">Manage Record Removal</h3>
                <p className="text-xs text-sfrc-500 font-mono">{deleteTargetUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-sfrc-600">
              Choose an action for institutional record retention. Academic and audit history is preserved during Archive.
            </p>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => handleConfirmDelete(false)}
                className="w-full p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left cursor-pointer transition-colors"
              >
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-amber-700" /> Archive / Soft Deactivate (Recommended)
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Deactivates the user and bans login while preserving all historic grades, attendance, and audit records.
                </p>
              </button>

              <button
                onClick={() => handleConfirmDelete(true)}
                className="w-full p-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-left cursor-pointer transition-colors"
              >
                <div className="font-bold text-red-900 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-red-700" /> Permanent Database Deletion
                </div>
                <p className="text-[11px] text-red-700 mt-0.5">
                  Removes user profile and Auth record completely. Blocked if active library loans or grievances exist.
                </p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 rounded-xl text-sfrc-700 hover:bg-sfrc-100 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pragya Support Banner ───────────────────────────────────────────── */}
      <AskPragyaBanner />
    </div>
  );
}
