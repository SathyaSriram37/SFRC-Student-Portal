'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { Users, Sparkles, Search, Briefcase, Building2, MessageSquare, Globe, ExternalLink, BookOpen, CheckCircle2, UserCheck, Star, PlusCircle, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiGet, apiPost } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { AlumniProfilePublic, AlumniStory, AlumniOpportunity } from '@/lib/types';

export default function StudentAlumniPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'stories' | 'opportunities' | 'register'>('directory');
  const [alumniList, setAlumniList] = useState<AlumniProfilePublic[]>([]);
  const [stories, setStories] = useState<AlumniStory[]>([]);
  const [opportunities, setOpportunities] = useState<AlumniOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [onlyMentors, setOnlyMentors] = useState(false);

  // Mentorship Request Dialog
  const [selectedMentor, setSelectedMentor] = useState<AlumniProfilePublic | null>(null);
  const [mentorshipModalOpen, setMentorshipModalOpen] = useState(false);
  const [preferredTopic, setPreferredTopic] = useState('Career Guidance & Tech Roadmaps');
  const [mentorshipMessage, setMentorshipMessage] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [reqSuccessMsg, setReqSuccessMsg] = useState('');
  const [reqErrorMsg, setReqErrorMsg] = useState('');

  // Alumni Self-Registration Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState('CS');
  const [regBatch, setRegBatch] = useState('2024');
  const regDegree = 'B.Sc Computer Science';
  const [regOrg, setRegOrg] = useState('');
  const [regRole, setRegRole] = useState('');
  const regIndustry = 'Information Technology';
  const regLocation = 'Chennai, India';
  const [regIsMentor, setRegIsMentor] = useState(true);
  const regVisibility = 'public';
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadAlumniData = useCallback(async () => {
    try {
      const token = await getAuthToken();

      const [almRes, storiesRes, oppsRes] = await Promise.allSettled([
        apiGet<{ items: AlumniProfilePublic[]; total: number }>('/api/v1/alumni?page=1&limit=50', token),
        apiGet<AlumniStory[]>('/api/v1/alumni/stories', token),
        apiGet<AlumniOpportunity[]>('/api/v1/alumni/opportunities', token),
      ]);

      if (almRes.status === 'fulfilled' && almRes.value?.items) {
        setAlumniList(almRes.value.items);
      }
      if (storiesRes.status === 'fulfilled' && Array.isArray(storiesRes.value)) {
        setStories(storiesRes.value);
      }
      if (oppsRes.status === 'fulfilled' && Array.isArray(oppsRes.value)) {
        setOpportunities(oppsRes.value);
      }
    } catch (err) {
      console.error('Failed to load alumni data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadAlumniData();
    })();
    return () => {
      ignore = true;
    };
  }, [loadAlumniData]);

  // Open Mentorship Request Modal
  const handleOpenMentorshipModal = (mentor: AlumniProfilePublic) => {
    setSelectedMentor(mentor);
    setMentorshipMessage('');
    setReqSuccessMsg('');
    setReqErrorMsg('');
    setMentorshipModalOpen(true);
  };

  // Submit Mentorship Request
  const handleSubmitMentorshipRequest = async () => {
    if (!selectedMentor) return;
    if (mentorshipMessage.trim().length < 10) {
      setReqErrorMsg('Please write a message explaining what advice or mentorship you are seeking (min 10 chars).');
      return;
    }

    try {
      setIsSubmittingReq(true);
      setReqErrorMsg('');
      const token = await getAuthToken();

      await apiPost(
        `/api/v1/alumni/mentorship/request/${selectedMentor.id}`,
        {
          preferred_topic: preferredTopic,
          message: mentorshipMessage.trim(),
        },
        token
      );

      setReqSuccessMsg(`🎉 Mentorship request submitted to ${selectedMentor.name}! You will be notified once connected.`);
      setTimeout(() => {
        setMentorshipModalOpen(false);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit mentorship request';
      setReqErrorMsg(msg);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // Submit Alumni Self-Registration
  const handleRegisterAlumni = async () => {
    if (!regName.trim() || !regEmail.trim() || !regOrg.trim() || !regRole.trim()) {
      alert('Please fill out all required fields (*)');
      return;
    }

    try {
      setIsRegistering(true);
      const token = await getAuthToken();
      const payload = {
        name: regName.trim(),
        email: regEmail.trim(),
        department_code: regDept,
        batch_year: parseInt(regBatch, 10) || 2024,
        degree: regDegree.trim(),
        current_organization: regOrg.trim(),
        designation: regRole.trim(),
        industry: regIndustry.trim(),
        location: regLocation.trim(),
        is_mentor: regIsMentor,
        visibility: regVisibility,
      };

      await apiPost('/api/v1/alumni/register', payload, token);
      setRegSuccessMsg('Registration submitted successfully! Your profile has been sent for administrative verification.');
      loadAlumniData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      alert(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  // Filtered Alumni Directory
  const filteredAlumni = useMemo(() => {
    return alumniList.filter((a) => {
      if (selectedDept !== 'all' && a.department_code !== selectedDept) return false;
      if (onlyMentors && !a.is_mentor) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.current_organization.toLowerCase().includes(q) ||
          a.designation.toLowerCase().includes(q) ||
          a.skills.some((s) => s.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [alumniList, selectedDept, onlyMentors, searchQuery]);

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-sfrc-900 via-sfrc-800 to-sfrc-700 text-white py-10 px-6 sm:px-10 border-b border-sfrc-700 shadow-md">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-gold/20 border border-sfrc-gold/30 text-sfrc-gold text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                SFRC Global Alumni Association
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Alumni Network & Mentorship
              </h1>
              <p className="text-sfrc-100/80 text-xs sm:text-sm max-w-3xl mt-1 leading-relaxed">
                Connect with distinguished SFRC graduates across global tech, government, academia, and enterprise. Request 1-on-1 career mentorship and explore exclusive referral opportunities.
              </p>
            </div>

            <Button
              onClick={() => setActiveTab('register')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold shrink-0 backdrop-blur-sm"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Register as Alumni
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-sfrc-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'directory'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Alumni Directory ({alumniList.length})
            </button>

            <button
              onClick={() => setActiveTab('stories')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'stories'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Success Stories ({stories.length})
            </button>

            <button
              onClick={() => setActiveTab('opportunities')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'opportunities'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Alumni Opportunities & Referrals ({opportunities.length})
            </button>
          </div>

          {activeTab === 'directory' && (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-52">
                <Search className="w-4 h-4 text-sfrc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search name, org, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-medium"
                />
              </div>

              <Select value={selectedDept} onValueChange={(v) => { if (v) setSelectedDept(v); }}>
                <SelectTrigger className="w-32 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-semibold">
                  <SelectValue placeholder="Dept" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Depts</SelectItem>
                  <SelectItem value="CS" className="text-xs">CS</SelectItem>
                  <SelectItem value="COM" className="text-xs">Commerce</SelectItem>
                  <SelectItem value="CHEM" className="text-xs">Chemistry</SelectItem>
                  <SelectItem value="MATH" className="text-xs">Math</SelectItem>
                  <SelectItem value="ENG" className="text-xs">English</SelectItem>
                  <SelectItem value="PHY" className="text-xs">Physics</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={() => setOnlyMentors((m) => !m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  onlyMentors
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-sfrc-50 border-sfrc-200 text-sfrc-700 hover:bg-sfrc-100'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                {onlyMentors ? 'Mentors Only' : 'All Alumni'}
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: Alumni Directory */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 bg-white rounded-3xl border border-sfrc-200 animate-pulse p-6 space-y-4">
                    <div className="h-12 w-12 rounded-full bg-sfrc-200" />
                    <div className="h-4 bg-sfrc-200 rounded w-1/2" />
                    <div className="h-3 bg-sfrc-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : filteredAlumni.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-sfrc-200 text-center space-y-3">
                <Users className="w-12 h-12 text-sfrc-400 mx-auto" />
                <h3 className="text-base font-bold text-sfrc-900">No Alumni Found</h3>
                <p className="text-xs text-sfrc-600">Try clearing filters or search queries.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlumni.map((alm) => (
                  <Card
                    key={alm.id}
                    className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-sfrc-300 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-4 text-xs">
                      {/* Avatar & Header */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-sfrc-100 overflow-hidden shrink-0 shadow-inner">
                          <img
                            src={alm.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                            alt={alm.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="font-bold text-base text-sfrc-900 truncate">
                              {alm.name}
                            </h3>
                            {alm.is_mentor && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200 shrink-0 flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-600 fill-amber-500" /> Mentor
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-sfrc-700 truncate mt-0.5">
                            {alm.designation}
                          </p>
                          <p className="text-[11px] text-sfrc-600 truncate">
                            {alm.current_organization}
                          </p>
                        </div>
                      </div>

                      {/* Batch & Dept Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Badge variant="outline" className="text-sfrc-800 border-sfrc-200 font-bold text-[10px]">
                          Batch of {alm.batch_year}
                        </Badge>
                        <Badge className="bg-sfrc-700 text-white font-bold text-[10px]">
                          {alm.department_code}
                        </Badge>
                        <span className="text-[11px] text-sfrc-500 font-medium">
                          {alm.location}
                        </span>
                      </div>

                      {alm.bio && (
                        <p className="text-sfrc-600 line-clamp-2 leading-relaxed text-xs">
                          {alm.bio}
                        </p>
                      )}

                      {/* Mentorship Areas / Skills */}
                      {alm.is_mentor && alm.mentorship_areas.length > 0 && (
                        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                          <p className="text-[10px] font-black text-amber-900 uppercase">Mentorship Focus:</p>
                          <p className="text-[11px] text-amber-800 font-medium">
                            {alm.mentorship_areas.join(' • ')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-sfrc-100 mt-4 flex items-center gap-2">
                      {alm.is_mentor ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenMentorshipModal(alm)}
                          className="flex-1 bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold rounded-xl h-9 shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Request Mentorship
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="flex-1 text-xs font-semibold rounded-xl h-9 border-sfrc-200 text-sfrc-500"
                        >
                          Alumni Member
                        </Button>
                      )}

                      {alm.linkedin_url && (
                        <a href={alm.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Button
                            size="sm"
                            variant="outline"
                            className="p-2 h-9 w-9 rounded-xl border-sfrc-200 text-blue-600 hover:bg-blue-50"
                            title="LinkedIn Profile"
                          >
                            <Globe className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Success Stories */}
        {activeTab === 'stories' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-sfrc-900">Alumni Success Stories & Pathways</h2>
              <p className="text-xs text-sfrc-600">Inspiring journeys from SFRC classrooms to global corporate leadership.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stories.map((st) => (
                <Card key={st.id} className="rounded-3xl border-sfrc-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="relative h-44 bg-sfrc-900 overflow-hidden">
                      <img src={st.photo_url || ''} alt={st.alumni_name} className="w-full h-full object-cover opacity-85" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sfrc-gold text-sfrc-950 mb-1 inline-block">
                          Class of {st.batch_year} • {st.department_code}
                        </span>
                        <h3 className="text-base font-bold text-white drop-shadow-sm leading-snug">{st.title}</h3>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-3 text-xs">
                      <p className="font-bold text-sfrc-700">{st.current_role}</p>
                      <p className="text-sfrc-600 leading-relaxed text-xs italic">
                        &ldquo;{st.story_text}&rdquo;
                      </p>
                    </CardContent>
                  </div>

                  <div className="p-6 pt-0 border-t border-sfrc-100 flex items-center justify-between text-[11px] text-sfrc-500 font-medium">
                    <span>{st.alumni_name}</span>
                    <span>Published {new Date(st.published_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Opportunities & Referrals */}
        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-sfrc-900">Alumni Job & Internship Referrals</h2>
              <p className="text-xs text-sfrc-600">Exclusive opportunities posted directly by SFRC alumni at their employers.</p>
            </div>

            <div className="space-y-4">
              {opportunities.map((opp) => (
                <Card key={opp.id} className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                          {opp.opportunity_type}
                        </Badge>
                        <span className="font-bold text-sfrc-900 text-base">{opp.role_title}</span>
                      </div>

                      <p className="text-xs font-bold text-sfrc-700 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-sfrc-500" />
                        {opp.company_name} • <MapPin className="w-3.5 h-3.5 text-sfrc-500 ml-1" /> {opp.location}
                      </p>

                      <p className="text-sfrc-600 leading-relaxed text-xs max-w-2xl">
                        {opp.description}
                      </p>

                      <p className="text-[11px] text-sfrc-500 pt-1 font-medium">
                        Shared by Alumni Mentor: <strong>{opp.alumni_name}</strong>
                      </p>
                    </div>

                    <div className="shrink-0">
                      <a href={opp.apply_link_or_email} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold shadow-xs">
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Apply / Request Referral
                        </Button>
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Self-Registration Form */}
        {activeTab === 'register' && (
          <Card className="rounded-3xl border-sfrc-200 bg-white p-6 sm:p-8 max-w-2xl mx-auto shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-800 font-bold text-xs uppercase mb-1">
                <UserCheck className="w-3.5 h-3.5 text-sfrc-700" />
                Alumni Registration
              </div>
              <h2 className="text-2xl font-bold text-sfrc-900">Join the SFRC Alumni Network</h2>
              <p className="text-xs text-sfrc-600">Keep in touch with your alma mater, mentor scholars, and give back to the student community.</p>
            </div>

            {regSuccessMsg ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <span>{regSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-sfrc-800">Full Name *</label>
                    <Input
                      placeholder="e.g. Priyadharshini S."
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-sfrc-800">Email Address *</label>
                    <Input
                      type="email"
                      placeholder="priya@company.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-sfrc-800">Department</label>
                    <Select value={regDept} onValueChange={(v) => { if (v) setRegDept(v); }}>
                      <SelectTrigger className="rounded-xl text-xs font-semibold">
                        <SelectValue placeholder="Dept" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CS" className="text-xs">Computer Science</SelectItem>
                        <SelectItem value="COM" className="text-xs">Commerce</SelectItem>
                        <SelectItem value="CHEM" className="text-xs">Chemistry</SelectItem>
                        <SelectItem value="MATH" className="text-xs">Mathematics</SelectItem>
                        <SelectItem value="ENG" className="text-xs">English</SelectItem>
                        <SelectItem value="PHY" className="text-xs">Physics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-sfrc-800">Batch Year</label>
                    <Input
                      type="number"
                      placeholder="2023"
                      value={regBatch}
                      onChange={(e) => setRegBatch(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-sfrc-800">Current Organization *</label>
                    <Input
                      placeholder="Google, TCS, Deloitte, ISRO"
                      value={regOrg}
                      onChange={(e) => setRegOrg(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-sfrc-800">Designation / Role *</label>
                    <Input
                      placeholder="Software Engineer, Consultant"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-sfrc-50 border border-sfrc-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sfrc-900">Opt-in as Student Mentor</p>
                    <p className="text-[11px] text-sfrc-600">Allow current SFRC students to seek 1-on-1 career guidance.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={regIsMentor}
                    onChange={(e) => setRegIsMentor(e.target.checked)}
                    className="h-4 w-4 rounded text-sfrc-700"
                  />
                </div>

                <Button
                  disabled={isRegistering}
                  onClick={handleRegisterAlumni}
                  className="w-full bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold h-10 shadow-sm mt-4"
                >
                  {isRegistering ? 'Registering...' : 'Submit Alumni Profile'}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* MENTORSHIP REQUEST DIALOG */}
      <Dialog open={mentorshipModalOpen} onOpenChange={setMentorshipModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900">
              Request Mentorship Session
            </DialogTitle>
            <DialogDescription className="text-xs text-sfrc-600">
              Connecting with {selectedMentor?.name} ({selectedMentor?.current_organization})
            </DialogDescription>
          </DialogHeader>

          {reqSuccessMsg ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{reqSuccessMsg}</span>
            </div>
          ) : (
            <div className="space-y-4 pt-2 text-xs">
              {reqErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                  {reqErrorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Preferred Discussion Topic</label>
                <Select value={preferredTopic} onValueChange={(v) => { if (v) setPreferredTopic(v); }}>
                  <SelectTrigger className="rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Career Guidance & Tech Roadmaps" className="text-xs">Career Guidance & Tech Roadmaps</SelectItem>
                    <SelectItem value="Resume & Mock Interview Prep" className="text-xs">Resume & Mock Interview Prep</SelectItem>
                    <SelectItem value="Higher Education & Research" className="text-xs">Higher Education & Research</SelectItem>
                    <SelectItem value="Industry Transition & Skills" className="text-xs">Industry Transition & Skills</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-sfrc-800">Introduction & Questions for Mentor *</label>
                <Textarea
                  placeholder="Introduce yourself, your current semester, and what specific questions you'd like guidance on..."
                  value={mentorshipMessage}
                  onChange={(e) => setMentorshipMessage(e.target.value)}
                  rows={4}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3">
            {!reqSuccessMsg && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMentorshipModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isSubmittingReq}
                  onClick={handleSubmitMentorshipRequest}
                  className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold"
                >
                  {isSubmittingReq ? 'Submitting...' : 'Send Request'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
