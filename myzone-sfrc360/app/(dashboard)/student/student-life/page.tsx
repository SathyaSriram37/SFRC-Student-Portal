'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { Heart, Users, Award, Search, CheckCircle2, ExternalLink, Download, HeartHandshake, PlusCircle, Rocket, Check, Info } from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiGet, apiPost } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { ClubItem, YWEDCourse, StartupShowcase, StudentCertificate } from '@/lib/types';

export default function StudentLifePage() {
  const [activeTab, setActiveTab] = useState<'clubs' | 'extension' | 'entrepreneurship' | 'certificates'>('clubs');
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [ywedCourses, setYwedCourses] = useState<YWEDCourse[]>([]);
  const [startups, setStartups] = useState<StartupShowcase[]>([]);
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [clubSearch, setClubSearch] = useState('');
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadStudentLifeData = useCallback(async () => {
    try {
            const token = await getAuthToken();

      const [clubsRes, ywedRes, startupsRes, certsRes] = await Promise.allSettled([
        apiGet<ClubItem[]>('/api/v1/clubs', token),
        apiGet<{ courses: YWEDCourse[]; total: number }>('/api/v1/student-life/ywed-courses', token),
        apiGet<StartupShowcase[]>('/api/v1/student-life/acide-startups', token),
        apiGet<StudentCertificate[]>('/api/v1/student-life/certificates', token),
      ]);

      if (clubsRes.status === 'fulfilled' && Array.isArray(clubsRes.value)) {
        setClubs(clubsRes.value);
      }
      if (ywedRes.status === 'fulfilled' && ywedRes.value?.courses) {
        setYwedCourses(ywedRes.value.courses);
      }
      if (startupsRes.status === 'fulfilled' && Array.isArray(startupsRes.value)) {
        setStartups(startupsRes.value);
      }
      if (certsRes.status === 'fulfilled' && Array.isArray(certsRes.value)) {
        setCertificates(certsRes.value);
      }
    } catch (err) {
      console.error('Failed to load student life data:', err);
    } finally {
          }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadStudentLifeData();
    })();
    return () => {
      ignore = true;
    };
  }, [loadStudentLifeData]);

  // Join/Leave Club toggle
  const handleToggleClub = async (club: ClubItem) => {
    try {
      setActionLoadingId(club.id);
      const token = await getAuthToken();
      const res = await apiPost<{ is_member: boolean; member_count: number; message: string }>(
        `/api/v1/clubs/${club.id}/join`,
        {},
        token
      );

      // Optimistic update
      setClubs((prev) =>
        prev.map((c) =>
          c.id === club.id
            ? { ...c, is_member: res.is_member, member_count: res.member_count }
            : c
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join club';
      alert(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // YWED Enroll toggle
  const handleToggleYWED = async (course: YWEDCourse) => {
    try {
      setActionLoadingId(course.id);
      const token = await getAuthToken();
      const res = await apiPost<{ is_enrolled: boolean; enrolled_count: number; message: string }>(
        `/api/v1/student-life/ywed-courses/${course.id}/enroll`,
        {},
        token
      );

      setYwedCourses((prev) =>
        prev.map((c) =>
          c.id === course.id
            ? { ...c, is_enrolled: res.is_enrolled, enrolled_count: res.enrolled_count }
            : c
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to enroll course';
      alert(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Download PDF certificate simulation
  const handleDownloadCertificate = (cert: StudentCertificate) => {
    setDownloadingCertId(cert.id);
    setTimeout(() => {
      setDownloadingCertId(null);
      alert(`📄 Generating official digital certificate for "${cert.certificate_title}" [Verification Code: ${cert.verification_code}]. Download started.`);
    }, 800);
  };

  // Categorize Clubs vs Extension units
  const officialClubs = useMemo(() => {
    return clubs.filter((c) => c.category === 'club');
  }, [clubs]);

  const extensionUnits = useMemo(() => {
    return clubs.filter((c) => c.category === 'extension');
  }, [clubs]);

  const filteredOfficialClubs = useMemo(() => {
    if (!clubSearch.trim()) return officialClubs;
    const q = clubSearch.toLowerCase();
    return officialClubs.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [officialClubs, clubSearch]);

  const filteredExtensionUnits = useMemo(() => {
    if (!clubSearch.trim()) return extensionUnits;
    const q = clubSearch.toLowerCase();
    return extensionUnits.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [extensionUnits, clubSearch]);

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-sfrc-900 via-sfrc-800 to-sfrc-700 text-white py-10 px-6 sm:px-10 border-b border-sfrc-700 shadow-md">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-gold/20 border border-sfrc-gold/30 text-sfrc-gold text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-sfrc-gold text-sfrc-gold" />
            SFRC Co-Curricular & Student Life Hub
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Student Life, Clubs & Entrepreneurship
          </h1>
          <p className="text-sfrc-100/80 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Discover student-led clubs, national extension units (NSS/NCC), student venture incubation (ACIDE), and women vocational career tracks (YWED).
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-sfrc-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('clubs')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'clubs'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Official Clubs ({officialClubs.length})
            </button>

            <button
              onClick={() => setActiveTab('extension')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'extension'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              NSS / NCC / Extension ({extensionUnits.length})
            </button>

            <button
              onClick={() => setActiveTab('entrepreneurship')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'entrepreneurship'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <Rocket className="w-4 h-4" />
              ACIDE & YWED ({startups.length + ywedCourses.length})
            </button>

            <button
              onClick={() => setActiveTab('certificates')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'certificates'
                  ? 'bg-sfrc-700 text-white shadow-sm'
                  : 'text-sfrc-700 hover:bg-sfrc-100'
              }`}
            >
              <Award className="w-4 h-4" />
              My Certificates ({certificates.length})
            </button>
          </div>

          {(activeTab === 'clubs' || activeTab === 'extension') && (
            <div className="relative w-64">
              <Search className="w-4 h-4 text-sfrc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search clubs & units..."
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-sfrc-50 border-sfrc-200 font-medium"
              />
            </div>
          )}
        </div>

        {/* TAB 1: Official Clubs */}
        {activeTab === 'clubs' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-sfrc-900">SFRC Official Co-Curricular Clubs</h2>
              <p className="text-xs text-sfrc-600">Join clubs to participate in intercollegiate symposia, competitions, and weekly workshops.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOfficialClubs.map((club) => {
                const isMember = club.is_member;
                const isActing = actionLoadingId === club.id;

                return (
                  <Card
                    key={club.id}
                    className="rounded-3xl border-sfrc-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      <div className="relative h-40 bg-sfrc-900 overflow-hidden">
                        <img
                          src={club.banner_url || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&auto=format&fit=crop&q=80'}
                          alt={club.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/60 text-white backdrop-blur-sm">
                            {club.member_count} Members
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <h3 className="text-base font-bold text-white drop-shadow-sm">{club.name}</h3>
                        </div>
                      </div>

                      <CardContent className="p-5 space-y-3 text-xs">
                        <p className="text-sfrc-600 line-clamp-3 leading-relaxed">
                          {club.description}
                        </p>

                        <div className="p-3 rounded-2xl bg-sfrc-50 border border-sfrc-100 space-y-1 text-[11px] text-sfrc-700">
                          <p>
                            <span className="font-bold">Faculty Advisor:</span> {club.faculty_in_charge}
                          </p>
                          <p>
                            <span className="font-bold">Venue & Day:</span> {club.meeting_venue} ({club.meeting_day})
                          </p>
                        </div>
                      </CardContent>
                    </div>

                    <div className="p-5 pt-0">
                      <Button
                        onClick={() => handleToggleClub(club)}
                        disabled={isActing}
                        className={`w-full text-xs font-bold rounded-xl h-9 transition-all shadow-xs ${
                          isMember
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-sfrc-700 hover:bg-sfrc-800 text-white'
                        }`}
                      >
                        {isMember ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Registered Member (Leave)
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4 mr-1.5" /> Join Club
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: NSS / NCC / Extension Units */}
        {activeTab === 'extension' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-sfrc-900">NSS, NCC & Extension Activity Units</h2>
              <p className="text-xs text-sfrc-600">Compulsory Part V extension activity tracks for leadership, national integration, and civic duty.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExtensionUnits.map((unit) => {
                const isMember = unit.is_member;
                const isActing = actionLoadingId === unit.id;

                return (
                  <Card
                    key={unit.id}
                    className="rounded-3xl border-sfrc-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      <div className="relative h-40 bg-sfrc-900 overflow-hidden">
                        <img
                          src={unit.banner_url || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&auto=format&fit=crop&q=80'}
                          alt={unit.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/60 text-white backdrop-blur-sm">
                            {unit.member_count} Enrolled
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <h3 className="text-base font-bold text-white drop-shadow-sm">{unit.name}</h3>
                        </div>
                      </div>

                      <CardContent className="p-5 space-y-3 text-xs">
                        <p className="text-sfrc-600 line-clamp-3 leading-relaxed">
                          {unit.description}
                        </p>

                        <div className="p-3 rounded-2xl bg-sfrc-50 border border-sfrc-100 space-y-1 text-[11px] text-sfrc-700">
                          <p>
                            <span className="font-bold">Officer / In-Charge:</span> {unit.faculty_in_charge}
                          </p>
                          <p>
                            <span className="font-bold">Parade / Activity:</span> {unit.meeting_venue} ({unit.meeting_day})
                          </p>
                        </div>
                      </CardContent>
                    </div>

                    <div className="p-5 pt-0">
                      <Button
                        onClick={() => handleToggleClub(unit)}
                        disabled={isActing}
                        className={`w-full text-xs font-bold rounded-xl h-9 transition-all shadow-xs ${
                          isMember
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-sfrc-700 hover:bg-sfrc-800 text-white'
                        }`}
                      >
                        {isMember ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Enrolled Cadet / Volunteer
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4 mr-1.5" /> Enroll in Unit
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Entrepreneurship (ACIDE + YWED) */}
        {activeTab === 'entrepreneurship' && (
          <div className="space-y-10">
            {/* SECTION 1: ACIDE Startups */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sfrc-gold/20 text-sfrc-800 font-bold text-xs uppercase mb-1">
                    <Rocket className="w-3.5 h-3.5 text-sfrc-700" />
                    ACIDE Incubation Center
                  </div>
                  <h2 className="text-2xl font-bold text-sfrc-900">Student-Founded Startups</h2>
                  <p className="text-xs text-sfrc-600">Supported by SFRC Atal Community Innovation & Incubation Drive.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {startups.map((st) => (
                  <Card
                    key={st.id}
                    className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] text-sfrc-600 uppercase">
                          Est. {st.founded_year} • {st.department}
                        </span>
                        <Badge
                          className={`text-[10px] font-bold ${
                            st.revenue_stage === 'Scaled'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : st.revenue_stage === 'Revenue Generating'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                        >
                          {st.revenue_stage}
                        </Badge>
                      </div>

                      <h3 className="text-lg font-black text-sfrc-900">{st.startup_name}</h3>
                      <p className="font-semibold text-sfrc-700 text-xs italic">
                        &ldquo;{st.tagline}&rdquo;
                      </p>
                      <p className="text-sfrc-600 leading-relaxed text-xs">
                        {st.description}
                      </p>

                      <div className="pt-2 border-t border-sfrc-100 space-y-1 text-[11px] text-sfrc-700">
                        <p>
                          <span className="font-bold">Student Founders:</span> {st.founder_names.join(', ')}
                        </p>
                        <p>
                          <span className="font-bold">Faculty Mentors:</span> {st.mentors.join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-2">
                      <a href={st.website_url || '#'} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl text-xs font-bold border-sfrc-200 text-sfrc-800 hover:bg-sfrc-50"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Visit Venture Profile
                        </Button>
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* SECTION 2: YWED Courses */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-bold">YWED Graduation Requirement Policy:</p>
                  <p className="mt-0.5">
                    Every SFRC student is required to complete either <strong>1 Long-term Course (1 Academic Year)</strong> OR <strong>2 Short-term Vocational Courses</strong> per academic year to qualify for supplementary career skill credits.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-sfrc-900">YWED Vocational Skill Courses</h2>
                <p className="text-xs text-sfrc-600">Young Women Entrepreneurship Development Center accredited career and craft training.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ywedCourses.map((crs) => {
                  const isEnrolled = crs.is_enrolled;
                  const isLongTerm = crs.course_type === 'long_term';

                  return (
                    <Card
                      key={crs.id}
                      className="rounded-3xl border-sfrc-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <Badge
                            className={`text-[10px] font-bold ${
                              isLongTerm
                                ? 'bg-sfrc-700 text-white'
                                : 'bg-sfrc-100 text-sfrc-800'
                            }`}
                          >
                            {isLongTerm ? 'Long-Term (1 Year)' : 'Short-Term'}
                          </Badge>
                          <span className="text-[11px] font-bold text-sfrc-500">
                            {crs.enrolled_count}/{crs.max_intake} Enrolled
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-sfrc-900 leading-snug">{crs.course_name}</h3>
                        <p className="text-sfrc-600 text-[11px]">
                          <strong>Instructor:</strong> {crs.instructor}
                        </p>
                        <p className="text-sfrc-600 text-[11px]">
                          <strong>Duration:</strong> {crs.duration}
                        </p>

                        <div className="pt-2 border-t border-sfrc-100 space-y-1">
                          <p className="text-[11px] font-bold text-sfrc-800">Skills Acquired:</p>
                          <div className="flex flex-wrap gap-1">
                            {crs.skills_acquired.map((sk, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-sfrc-50 border border-sfrc-200 text-[10px] font-semibold text-sfrc-700">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-2">
                        <Button
                          size="sm"
                          onClick={() => handleToggleYWED(crs)}
                          disabled={actionLoadingId === crs.id}
                          className={`w-full rounded-xl text-xs font-bold transition-all ${
                            isEnrolled
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-sfrc-700 hover:bg-sfrc-800 text-white'
                          }`}
                        >
                          {isEnrolled ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1.5" /> Enrolled (Drop)
                            </>
                          ) : (
                            <>
                              <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Enroll in Course
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Certificates */}
        {activeTab === 'certificates' && (
          <Card className="rounded-3xl border-sfrc-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <CardTitle className="text-lg font-bold text-sfrc-900">My Digital Credentials & Merit Certificates</CardTitle>
              <CardDescription className="text-xs text-sfrc-600 mt-1">
                Verified institutional certificates for YWED completion, NSS service honor, and symposium events.
              </CardDescription>
            </div>

            <div className="space-y-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-5 rounded-3xl bg-sfrc-50/70 border border-sfrc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sfrc-100 text-sfrc-800 flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
                      <Award className="w-6 h-6 text-sfrc-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-sfrc-900">{cert.certificate_title}</h4>
                      <p className="text-xs text-sfrc-600 mt-0.5">{cert.issued_by}</p>
                      <p className="text-[11px] text-sfrc-500 font-mono mt-1">
                        Code: {cert.verification_code} • Issued: {cert.issue_date}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={downloadingCertId === cert.id}
                    onClick={() => handleDownloadCertificate(cert)}
                    className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    {downloadingCertId === cert.id ? 'Preparing...' : 'Download PDF'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
