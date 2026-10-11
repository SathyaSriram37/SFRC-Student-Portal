'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  GraduationCap,
  Briefcase,
  Building2,
  Save,
  CheckCircle2,
  Loader2,
  Award,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPut } from '@/lib/api-client';

interface FacultyProfileData {
  faculty_id: string;
  full_name: string;
  employee_id: string;
  designation: string;
  department_name: string;
  email: string;
  phone: string;
  qualification: string;
  specialization: string;
}

export default function FacultyProfilePage() {
  const [profile, setProfile] = useState<FacultyProfileData | null>(null);
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await apiGet<FacultyProfileData>('/api/v1/faculty/me/profile', token);
        if (!ignore && res) {
          setProfile(res);
          setPhone(res.phone || '');
          setQualification(res.qualification || '');
          setSpecialization(res.specialization || '');
        }
      } catch (err: unknown) {
        console.error('Failed to load faculty profile:', err);
        const msg = err instanceof Error ? err.message : 'Failed to fetch faculty profile.';
        toast.error(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await apiPut(
        '/api/v1/faculty/me/profile',
        {
          phone,
          qualification,
          specialization,
        },
        token
      );

      toast.success('Faculty profile updated successfully!');
      if (profile) {
        setProfile({
          ...profile,
          phone,
          qualification,
          specialization,
        });
      }
    } catch (err: unknown) {
      console.error('Failed to update faculty profile:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell role="faculty" userName={profile?.full_name || 'Faculty'}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
        {/* Header Profile Card */}
        <div className="bg-gradient-to-r from-sfrc-900 via-sfrc-800 to-sfrc-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-sfrc-300" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-sfrc-700/50 border-2 border-sfrc-500/30 flex items-center justify-center text-3xl font-black text-sfrc-200 shadow-inner">
                {profile?.full_name?.charAt(0) || 'F'}
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-700/60 text-sfrc-200 text-xs font-semibold">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Faculty Portal
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {profile?.full_name || 'Faculty Member'}
                </h1>
                <p className="text-sm text-sfrc-200">
                  {profile?.designation} • {profile?.department_name}
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2">
                  <span className="px-3 py-1 rounded-lg bg-white/10 text-xs font-mono">
                    ID: {profile?.employee_id || 'FAC-EMP'}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                    Active Faculty
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium">
                    Shift I (Regular)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Content */}
        {!isLoading && profile && (
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal & Academic Details */}
              <div className="bg-white rounded-3xl border border-sfrc-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-sfrc-100">
                  <div className="w-10 h-10 rounded-xl bg-sfrc-100 flex items-center justify-center text-sfrc-800">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-sfrc-900">Personal & Academic Info</h2>
                    <p className="text-xs text-sfrc-500">Official personnel information on file</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value={profile.full_name}
                      className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-sm font-medium cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      disabled
                      value={profile.employee_id}
                      className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-sm font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                      Department
                    </label>
                    <input
                      type="text"
                      disabled
                      value={profile.department_name}
                      className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-sm font-medium cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                      Designation
                    </label>
                    <input
                      type="text"
                      disabled
                      value={profile.designation}
                      className="w-full px-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-sm font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                      Academic Qualification
                    </label>
                    <input
                      type="text"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      placeholder="e.g. M.Sc., M.Phil., Ph.D."
                      className="w-full px-4 py-2.5 rounded-xl border border-sfrc-300 focus:outline-none focus:ring-2 focus:ring-sfrc-500 bg-white text-sfrc-900 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                      Research Specialization
                    </label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Cloud Computing, AI & Data Science"
                      className="w-full px-4 py-2.5 rounded-xl border border-sfrc-300 focus:outline-none focus:ring-2 focus:ring-sfrc-500 bg-white text-sfrc-900 text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-3xl border border-sfrc-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-sfrc-100">
                  <div className="w-10 h-10 rounded-xl bg-sfrc-100 flex items-center justify-center text-sfrc-800">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-sfrc-900">Contact & Communication</h2>
                    <p className="text-xs text-sfrc-500">Official email and contact phone number</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                      Official Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-sfrc-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        disabled
                        value={profile.email}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sfrc-200 bg-sfrc-50 text-sfrc-800 text-sm font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1.5">
                      Contact Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-sfrc-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sfrc-300 focus:outline-none focus:ring-2 focus:ring-sfrc-500 bg-white text-sfrc-900 text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-sfrc-900 text-white font-bold text-sm hover:bg-sfrc-800 active:scale-95 transition-all shadow-md disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Profile Updates
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Institutional Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-sfrc-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-sfrc-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-sfrc-900">Institution Credentials</h3>
                    <p className="text-[11px] text-sfrc-500">Autonomous Accreditation</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-sfrc-700">
                  <div className="p-3 rounded-xl bg-sfrc-50 border border-sfrc-100">
                    <span className="font-bold block text-sfrc-900 mb-0.5">College:</span>
                    The Standard Fireworks Rajaratnam College for Women (Autonomous)
                  </div>
                  <div className="p-3 rounded-xl bg-sfrc-50 border border-sfrc-100">
                    <span className="font-bold block text-sfrc-900 mb-0.5">Location:</span>
                    Sivakasi, Tamil Nadu - 626123
                  </div>
                  <div className="p-3 rounded-xl bg-sfrc-50 border border-sfrc-100">
                    <span className="font-bold block text-sfrc-900 mb-0.5">Accreditation:</span>
                    NAAC Re-Accredited &apos;A+&apos; Grade (4th Cycle)
                  </div>
                  <div className="p-3 rounded-xl bg-sfrc-50 border border-sfrc-100">
                    <span className="font-bold block text-sfrc-900 mb-0.5">Affiliation:</span>
                    Affiliated to Madurai Kamaraj University
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-200/80 p-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Production Audit Logging Active
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  All faculty profile changes are cryptographically authenticated via Supabase session and recorded in the college database audit logs.
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
