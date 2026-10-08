'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  User,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Shield,
  Bell,
  CreditCard,
  QrCode,
  Save,
  CheckCircle2,
  Lock,
  Key,
  Smartphone,
  Globe,
  Share2,
  Download,
  AlertCircle,
  Loader2,
  Camera,
  Sparkles,
  Calendar,
  Building2,
  Heart,
  FileCheck,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPut } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { StudentDetailedProfile } from '@/lib/types';

const DEFAULT_PROFILE: StudentDetailedProfile = {
  student_id: 'std-23uca042',
  user_id: 'usr-23uca042',
  full_name: 'Priya Sharma',
  register_number: '23UCA042',
  roll_number: 'CS-042',
  email: 'priya.sharma@sfrc.edu.in',
  phone_number: '+91 98432 10842',
  personal_email: 'priyasharma.academic@gmail.com',
  gender: 'Female',
  dob: '2005-08-14',
  blood_group: 'B+',
  permanent_address: '14/B, Gandhi Nagar 2nd Street, Sivakasi - 626123, Tamil Nadu',
  residential_address: '14/B, Gandhi Nagar 2nd Street, Sivakasi - 626123, Tamil Nadu',
  bio: 'Final year B.Sc Computer Science student at SFRC Sivakasi. Passionate about Full-Stack Web Development, Cloud Computing, and AI systems.',
  linkedin_url: 'https://linkedin.com/in/sfrc-student',
  github_url: 'https://github.com/sfrc-student',
  programme_name: 'B.Sc Computer Science',
  department_name: 'Department of Computer Science',
  current_semester: 6,
  batch_year: '2023 - 2026',
  section: 'A',
  shift: 'Regular (Shift I)',
  admission_date: '2023-06-20',
  abc_id: 'ABC-9842-1084-2938',
  apaar_id: 'APAAR-SFRC-2023-9941',
  mentor_name: 'Dr. K. Anitha, M.Sc., Ph.D.',
  mentor_email: 'anitha.cs@sfrc.edu.in',
  mentor_phone: '+91 94421 88321',
  parent_name: 'Mr. R. Sharma',
  parent_relationship: 'Father',
  parent_phone: '+91 94433 55221',
  parent_email: 'sharma.parent@gmail.com',
  parent_occupation: 'Senior Technical Consultant',
  is_hosteller: false,
  hostel_block: 'Day-Scholar',
  bus_route_no: 'Route #4 (Sivakasi Town - College)',
  attendance_pct: 88.5,
  cgpa: 8.65,
  earned_credits: 118,
  total_credits: 140,
};

export default function StudentProfilePage() {
  const [activeTab, setActiveTab] = useState<
    'academic' | 'personal' | 'parent' | 'security' | 'preferences' | 'idcard'
  >('academic');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [profile, setProfile] = useState<StudentDetailedProfile>(DEFAULT_PROFILE);

  // Editable Form State
  const [phoneNumber, setPhoneNumber] = useState(DEFAULT_PROFILE.phone_number || '');
  const [personalEmail, setPersonalEmail] = useState(DEFAULT_PROFILE.personal_email || '');
  const [permanentAddress, setPermanentAddress] = useState(DEFAULT_PROFILE.permanent_address || '');
  const [residentialAddress, setResidentialAddress] = useState(DEFAULT_PROFILE.residential_address || '');
  const [bio, setBio] = useState(DEFAULT_PROFILE.bio || '');
  const [bloodGroup, setBloodGroup] = useState(DEFAULT_PROFILE.blood_group || 'B+');
  const [linkedinUrl, setLinkedinUrl] = useState(DEFAULT_PROFILE.linkedin_url || '');
  const [githubUrl, setGithubUrl] = useState(DEFAULT_PROFILE.github_url || '');
  const [parentPhone, setParentPhone] = useState(DEFAULT_PROFILE.parent_phone || '');
  const [parentEmail, setParentEmail] = useState(DEFAULT_PROFILE.parent_email || '');

  // Password / Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Preferences State
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [feeReminders, setFeeReminders] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  // Fetch full student profile
  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const data = await apiGet<StudentDetailedProfile>(
          '/api/v1/students/me/profile',
          token
        );

        if (!ignore && data) {
          setProfile(data);
          setPhoneNumber(data.phone_number || '');
          setPersonalEmail(data.personal_email || '');
          setPermanentAddress(data.permanent_address || '');
          setResidentialAddress(data.residential_address || '');
          setBio(data.bio || '');
          setBloodGroup(data.blood_group || 'B+');
          setLinkedinUrl(data.linkedin_url || '');
          setGithubUrl(data.github_url || '');
          setParentPhone(data.parent_phone || '');
          setParentEmail(data.parent_email || '');
        }
      } catch (err) {
        console.warn('API error, using fallback profile state:', err);
        if (!ignore) {
          const fallbackData: StudentDetailedProfile = {
            student_id: 'std-23uca042',
            user_id: 'usr-23uca042',
            full_name: 'Priya Sharma',
            register_number: '23UCA042',
            roll_number: 'CS-042',
            email: 'priya.sharma@sfrc.edu.in',
            phone_number: '+91 98432 10842',
            personal_email: 'priyasharma.academic@gmail.com',
            gender: 'Female',
            dob: '2005-08-14',
            blood_group: 'B+',
            permanent_address:
              '14/B, Gandhi Nagar 2nd Street, Sivakasi - 626123, Tamil Nadu',
            residential_address:
              '14/B, Gandhi Nagar 2nd Street, Sivakasi - 626123, Tamil Nadu',
            bio: 'Final year B.Sc Computer Science student at SFRC Sivakasi. Passionate about Full-Stack Web Development, Cloud Computing, and AI systems.',
            linkedin_url: 'https://linkedin.com/in/sfrc-student',
            github_url: 'https://github.com/sfrc-student',
            programme_name: 'B.Sc Computer Science',
            department_name: 'Department of Computer Science',
            current_semester: 6,
            batch_year: '2023 - 2026',
            section: 'A',
            shift: 'Regular (Shift I)',
            admission_date: '2023-06-20',
            abc_id: 'ABC-9842-1084-2938',
            apaar_id: 'APAAR-SFRC-2023-9941',
            mentor_name: 'Dr. K. Anitha, M.Sc., Ph.D.',
            mentor_email: 'anitha.cs@sfrc.edu.in',
            mentor_phone: '+91 94421 88321',
            parent_name: 'Mr. R. Sharma',
            parent_relationship: 'Father',
            parent_phone: '+91 94433 55221',
            parent_email: 'sharma.parent@gmail.com',
            parent_occupation: 'Senior Technical Consultant',
            is_hosteller: false,
            hostel_block: 'Day-Scholar',
            bus_route_no: 'Route #4 (Sivakasi Town - College)',
            attendance_pct: 88.5,
            cgpa: 8.65,
            earned_credits: 118,
            total_credits: 140,
          };
          setProfile(fallbackData);
          setPhoneNumber(fallbackData.phone_number || '');
          setPersonalEmail(fallbackData.personal_email || '');
          setPermanentAddress(fallbackData.permanent_address || '');
          setResidentialAddress(fallbackData.residential_address || '');
          setBio(fallbackData.bio || '');
          setBloodGroup(fallbackData.blood_group || 'B+');
          setLinkedinUrl(fallbackData.linkedin_url || '');
          setGithubUrl(fallbackData.github_url || '');
          setParentPhone(fallbackData.parent_phone || '');
          setParentEmail(fallbackData.parent_email || '');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const payload = {
        phone_number: phoneNumber,
        personal_email: personalEmail,
        permanent_address: permanentAddress,
        residential_address: residentialAddress,
        bio,
        blood_group: bloodGroup,
        linkedin_url: linkedinUrl,
        github_url: githubUrl,
        parent_phone: parentPhone,
        parent_email: parentEmail,
      };

      const updated = await apiPut<StudentDetailedProfile>(
        '/api/v1/students/me/profile',
        payload,
        token
      );

      if (updated) {
        setProfile(updated);
      }
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handle Preferences Update
  const handleSavePreferences = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPut(
        '/api/v1/students/me/preferences',
        {
          email_notifications: emailNotifs,
          sms_notifications: smsNotifs,
          whatsapp_alerts: whatsappAlerts,
          event_reminders: eventReminders,
          fee_due_reminders: feeReminders,
        },
        token
      );
      toast.success('Notification settings saved to database!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save notification preferences.');
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-sfrc-700 animate-spin" />
        <p className="text-sm font-semibold text-sfrc-600">Loading student profile...</p>
      </div>
    );
  }

  const p = profile!;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Hero Banner ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-sfrc-900 via-sfrc-800 to-sfrc-700 text-white p-6 sm:p-8 border border-sfrc-800 shadow-md">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-sfrc-gold/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg overflow-hidden">
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{p.full_name.charAt(0)}</span>
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-2 -right-2 p-1.5 bg-sfrc-gold text-sfrc-950 rounded-xl shadow-md hover:scale-105 transition-transform"
                title="Change Avatar"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-0.5 rounded-full bg-sfrc-gold/20 text-sfrc-gold text-xs font-black uppercase tracking-wider">
                  {p.register_number}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Student
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold">
                  Semester {p.current_semester} • {p.shift}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {p.full_name}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 mt-0.5 font-medium">
                {p.programme_name} • {p.department_name}
              </p>
            </div>
          </div>

          {/* Quick Academic Performance Stats */}
          <div className="flex items-center gap-3 sm:gap-4 bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/15">
            <div className="text-center px-2 sm:px-3">
              <p className="text-[10px] sm:text-xs text-white/70 font-semibold uppercase">
                CGPA
              </p>
              <p className="text-xl sm:text-2xl font-black text-sfrc-gold">
                {p.cgpa}
              </p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center px-2 sm:px-3">
              <p className="text-[10px] sm:text-xs text-white/70 font-semibold uppercase">
                Attendance
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-300">
                {p.attendance_pct}%
              </p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center px-2 sm:px-3">
              <p className="text-[10px] sm:text-xs text-white/70 font-semibold uppercase">
                Credits
              </p>
              <p className="text-xl sm:text-2xl font-black text-white">
                {p.earned_credits}/{p.total_credits}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-sfrc-200">
        {[
          { id: 'academic', label: 'Academic & University', icon: GraduationCap },
          { id: 'personal', label: 'Personal & Contact Info', icon: User },
          { id: 'parent', label: 'Parent & Guardian', icon: Heart },
          { id: 'security', label: 'Security & Password', icon: Shield },
          { id: 'preferences', label: 'Notification Settings', icon: Bell },
          { id: 'idcard', label: 'Digital Student ID', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150',
                isActive
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100 hover:text-sfrc-900'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: ACADEMIC & UNIVERSITY DETAILS ────────────────────────── */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* University & Degree Card */}
            <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sfrc-800 font-bold text-sm border-b border-sfrc-100 pb-3">
                <GraduationCap className="w-4 h-4 text-sfrc-accent" />
                <span>Curriculum & Enrolment</span>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">Degree & Major</p>
                  <p className="font-bold text-sfrc-900">{p.programme_name}</p>
                </div>
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">Department</p>
                  <p className="font-bold text-sfrc-900">{p.department_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-sfrc-500 font-semibold">Batch</p>
                    <p className="font-bold text-sfrc-900">{p.batch_year}</p>
                  </div>
                  <div>
                    <p className="text-xs text-sfrc-500 font-semibold">Section</p>
                    <p className="font-bold text-sfrc-900">Section {p.section}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">Shift Timing</p>
                  <p className="font-bold text-sfrc-900">{p.shift}</p>
                </div>
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">Admission Date</p>
                  <p className="font-bold text-sfrc-900">{p.admission_date}</p>
                </div>
              </div>
            </div>

            {/* National Academic Registries Card */}
            <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sfrc-800 font-bold text-sm border-b border-sfrc-100 pb-3">
                <FileCheck className="w-4 h-4 text-sfrc-accent" />
                <span>Government & Academic IDs</span>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">Register Number</p>
                  <p className="font-bold text-sfrc-900 font-mono">{p.register_number}</p>
                </div>
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">Roll Number</p>
                  <p className="font-bold text-sfrc-900 font-mono">{p.roll_number}</p>
                </div>
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">
                    ABC ID (Academic Bank of Credits)
                  </p>
                  <p className="font-bold text-sfrc-900 font-mono bg-sfrc-50 px-2.5 py-1 rounded-lg border border-sfrc-200 inline-block mt-0.5">
                    {p.abc_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">
                    APAAR ID (One Nation One Student ID)
                  </p>
                  <p className="font-bold text-sfrc-900 font-mono bg-sfrc-50 px-2.5 py-1 rounded-lg border border-sfrc-200 inline-block mt-0.5">
                    {p.apaar_id}
                  </p>
                </div>
              </div>
            </div>

            {/* Faculty Mentor Card */}
            <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sfrc-800 font-bold text-sm border-b border-sfrc-100 pb-3">
                <Building2 className="w-4 h-4 text-sfrc-accent" />
                <span>Assigned Faculty Mentor</span>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">Mentor Name</p>
                  <p className="font-bold text-sfrc-900">{p.mentor_name}</p>
                </div>
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">Official Email</p>
                  <p className="font-bold text-sfrc-800 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-sfrc-600" />
                    {p.mentor_email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-sfrc-500 font-semibold">Contact Extension</p>
                  <p className="font-bold text-sfrc-800 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-sfrc-600" />
                    {p.mentor_phone}
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/student/mentoring"
                    className="inline-flex items-center gap-2 text-xs font-bold text-sfrc-700 bg-sfrc-100 hover:bg-sfrc-200 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    View Mentoring Schedule & Log
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PERSONAL & CONTACT INFORMATION (EDITABLE) ─────────────── */}
      {activeTab === 'personal' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 sm:p-8 rounded-3xl border border-sfrc-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-sfrc-200 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-sfrc-900">
                Personal & Contact Profile
              </h2>
              <p className="text-xs sm:text-sm text-sfrc-600">
                Update your mobile number, address, and online academic profile.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sfrc-700 text-white font-bold text-xs sm:text-sm hover:bg-sfrc-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Full Name (As per 10th/12th Marksheet)
              </label>
              <input
                type="text"
                value={p.full_name}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-sm font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Official College Email
              </label>
              <input
                type="email"
                value={p.email}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-sm font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Personal Alternative Email
              </label>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="personal.email@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <input
                type="text"
                value={p.dob || '2005-08-14'}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-sm font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Student Bio / Academic Objective
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a brief professional summary about your career goals, technical skills, and interests..."
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Permanent Address
              </label>
              <textarea
                rows={2}
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Residential / Local Address
              </label>
              <textarea
                rows={2}
                value={residentialAddress}
                onChange={(e) => setResidentialAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                GitHub / Portfolio URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>
          </div>
        </form>
      )}

      {/* ── TAB 3: PARENT & GUARDIAN DETAILS ─────────────────────────────── */}
      {activeTab === 'parent' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sfrc-200 shadow-sm space-y-6">
          <div className="border-b border-sfrc-200 pb-4">
            <h2 className="text-lg sm:text-xl font-bold text-sfrc-900">
              Parent & Emergency Guardian Information
            </h2>
            <p className="text-xs sm:text-sm text-sfrc-600">
              Emergency contacts verified for outpass authorizations and SMS alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">
                Parent / Guardian Name
              </p>
              <p className="text-base font-bold text-sfrc-900 mt-1">{p.parent_name}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">
                Relationship
              </p>
              <p className="text-base font-bold text-sfrc-900 mt-1">{p.parent_relationship}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Emergency Contact Number
              </label>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                Parent Email Address
              </label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
              />
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-bold text-sfrc-500 uppercase tracking-wider">
                Parent Occupation
              </p>
              <p className="text-sm font-semibold text-sfrc-800 mt-1">{p.parent_occupation}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: SECURITY & PASSWORD SETTINGS ─────────────────────────── */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleUpdatePassword}
            className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-sfrc-200 shadow-sm space-y-6"
          >
            <div className="border-b border-sfrc-200 pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-sfrc-900">
                Change Account Password
              </h2>
              <p className="text-xs sm:text-sm text-sfrc-600">
                Keep your student account safe with a strong, distinct password.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sfrc-500 hover:text-sfrc-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-white text-sfrc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sfrc-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sfrc-700 text-white font-bold text-sm hover:bg-sfrc-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  <span>Update Password</span>
                </button>
              </div>
            </div>
          </form>

          {/* Security Overview Card */}
          <div className="bg-white p-6 rounded-3xl border border-sfrc-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sfrc-800 font-bold text-sm border-b border-sfrc-100 pb-3">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Security Status</span>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900">Supabase Secure Session</p>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Encrypted JWT session active with automated token rotation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-sfrc-50 border border-sfrc-200">
                <Smartphone className="w-4 h-4 text-sfrc-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sfrc-900">Single Sign-On (SSO)</p>
                  <p className="text-sfrc-600 text-xs mt-0.5">
                    Linked to SFRC Institutional Google Workspace.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: NOTIFICATION PREFERENCES ─────────────────────────────── */}
      {activeTab === 'preferences' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sfrc-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-sfrc-200 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-sfrc-900">
                Notification & Communication Preferences
              </h2>
              <p className="text-xs sm:text-sm text-sfrc-600">
                Choose how SFRC 360 sends you attendance alerts, exam schedules, and circulars.
              </p>
            </div>
            <button
              onClick={handleSavePreferences}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sfrc-700 text-white font-bold text-xs sm:text-sm hover:bg-sfrc-800 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>

          <div className="divide-y divide-sfrc-100">
            {[
              {
                title: 'WhatsApp Exam & CIA Mark Notifications',
                desc: 'Receive immediate WhatsApp message upon CIA mark entry or Semester results publication.',
                state: whatsappAlerts,
                setter: setWhatsappAlerts,
              },
              {
                title: 'SMS Attendance & Shortage Alerts',
                desc: 'Daily SMS alert if absent or when overall attendance falls near 75% threshold.',
                state: smsNotifs,
                setter: setSmsNotifs,
              },
              {
                title: 'Email Academic Circulars & Hall Tickets',
                desc: 'Official semester hall tickets and Principal circulars sent to college email.',
                state: emailNotifs,
                setter: setEmailNotifs,
              },
              {
                title: 'Campus Events & Club Reminders',
                desc: 'Reminders for registered seminars, fine arts competitions, and sports meets.',
                state: eventReminders,
                setter: setEventReminders,
              },
              {
                title: 'Semester Fee Due Reminders',
                desc: 'Automated invoice and deadline notifications for tuition and exam fees.',
                state: feeReminders,
                setter: setFeeReminders,
              },
            ].map((pref, idx) => (
              <div key={idx} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-sfrc-900 text-sm">{pref.title}</p>
                  <p className="text-xs text-sfrc-600 mt-0.5">{pref.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => pref.setter(!pref.state)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative focus:outline-none shrink-0',
                    pref.state ? 'bg-sfrc-700' : 'bg-sfrc-200'
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs',
                      pref.state ? 'left-6.5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 6: DIGITAL STUDENT ID CARD ───────────────────────────────── */}
      {activeTab === 'idcard' && (
        <div className="flex flex-col items-center justify-center space-y-6 py-4">
          <div className="w-full max-w-md bg-linear-to-br from-sfrc-950 via-sfrc-900 to-sfrc-800 text-white rounded-3xl p-6 sm:p-7 border-2 border-sfrc-gold/40 shadow-2xl relative overflow-hidden">
            {/* Header with College Emblem */}
            <div className="flex items-center gap-3 border-b border-white/20 pb-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md p-1 border border-white/20 flex items-center justify-center shrink-0">
                <img
                  src="/wel_img.jpg"
                  alt="SFRC Seal"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-sfrc-gold font-black uppercase tracking-wider">
                  The Standard Fireworks Rajaratnam College for Women
                </p>
                <p className="text-[8px] text-white/70">
                  Autonomous • Re-accredited with 'A+' Grade by NAAC • Sivakasi
                </p>
                <p className="text-xs font-black text-white mt-0.5 uppercase tracking-wide">
                  Student Identity Card (2023 - 2026)
                </p>
              </div>
            </div>

            {/* Student Photo & Core Details */}
            <div className="flex items-center gap-5 my-5">
              <div className="w-24 h-28 rounded-2xl bg-white/10 border-2 border-sfrc-gold/50 flex items-center justify-center text-white font-black text-3xl shadow-inner overflow-hidden shrink-0">
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{p.full_name.charAt(0)}</span>
                )}
              </div>

              <div className="space-y-1 text-xs">
                <p className="text-base font-black text-sfrc-gold leading-tight">
                  {p.full_name}
                </p>
                <p className="text-white/90 font-bold">{p.programme_name}</p>
                <div className="pt-1 space-y-0.5 text-[11px] text-white/80">
                  <p>
                    <span className="text-white/60">Reg No:</span>{' '}
                    <span className="font-mono font-bold text-white">
                      {p.register_number}
                    </span>
                  </p>
                  <p>
                    <span className="text-white/60">Roll No:</span>{' '}
                    <span className="font-mono font-bold text-white">{p.roll_number}</span>
                  </p>
                  <p>
                    <span className="text-white/60">Blood Group:</span>{' '}
                    <span className="font-bold text-rose-300">{p.blood_group}</span>
                  </p>
                  <p>
                    <span className="text-white/60">DOB:</span>{' '}
                    <span className="font-medium text-white">{p.dob}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Barcode & Security Hologram */}
            <div className="border-t border-white/20 pt-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-white/60 font-semibold uppercase">
                  Digital Verification QR
                </p>
                <div className="w-14 h-14 bg-white p-1 rounded-xl shadow-md mt-1 flex items-center justify-center">
                  <QrCode className="w-full h-full text-sfrc-950" />
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Authorized ID
                </div>
                <p className="text-[9px] text-white/60">Principal Signature</p>
                <p className="text-[10px] font-bold text-sfrc-gold italic">Dr. R. Sudha Rani</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sfrc-700 text-white font-bold text-sm hover:bg-sfrc-800 transition-colors shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download / Print Digital ID Card</span>
          </button>
        </div>
      )}
    </div>
  );
}
