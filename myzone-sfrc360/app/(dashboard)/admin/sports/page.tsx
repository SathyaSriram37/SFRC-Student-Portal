'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Calendar,
  Medal,
  Plus,
  Search,
  CheckCircle2,
  Shield,
  Award,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SportsTeamItem, SportsEventItem, SportsAchievementItem } from '@/lib/types';

export default function AdminSportsPage() {
  const [activeTab, setActiveTab] = useState<'teams' | 'events' | 'achievements'>('teams');
  const [teams, setTeams] = useState<SportsTeamItem[]>([]);
  const [events, setEvents] = useState<SportsEventItem[]>([]);
  const [achievements, setAchievements] = useState<SportsAchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    sport: '',
    coach_name: '',
    description: '',
    venue: 'SFRC Sports Ground',
    practice_schedule: 'Mon, Wed, Fri 4:30 PM - 6:00 PM',
    captain_name: 'To be elected'
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [teamsRes, eventsRes, achRes] = await Promise.all([
          fetch('http://localhost:8000/api/v1/sports/teams'),
          fetch('http://localhost:8000/api/v1/sports/events'),
          fetch('http://localhost:8000/api/v1/sports/achievements')
        ]);

        if (!ignore && teamsRes.ok) setTeams(await teamsRes.json());
        if (!ignore && eventsRes.ok) setEvents(await eventsRes.json());
        if (!ignore && achRes.ok) setAchievements(await achRes.json());
      } catch (err) {
        console.error('Failed to load sports data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/sports/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeam.name,
          sport: newTeam.sport,
          coach_name: newTeam.coach_name,
          description: newTeam.description,
          venue: newTeam.venue,
          practice_schedule: newTeam.practice_schedule,
          captain_name: newTeam.captain_name
        })
      });

      if (res.ok) {
        const created = await res.json();
        setTeams(prev => [...prev, created]);
        setShowCreateModal(false);
        setNewTeam({
          name: '',
          sport: '',
          coach_name: '',
          description: '',
          venue: 'SFRC Sports Ground',
          practice_schedule: 'Mon, Wed, Fri 4:30 PM - 6:00 PM',
          captain_name: 'To be elected'
        });
        setSuccessMsg(`Team "${created.name}" created successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to create team:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.sport && t.sport.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.coach_name && t.coach_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Athletics & Physical Education Office
            </span>
          </div>
          <h1 className="text-2xl font-bold">Sports & Tournament Management</h1>
          <p className="text-emerald-200/80 text-sm">
            Oversee varsity squads, inter-collegiate fixtures, team rosters, and honor rolls.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Varsity Team
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Registered Teams</div>
            <div className="text-2xl font-bold text-white mt-1">{teams.length}</div>
          </div>
          <Shield className="h-8 w-8 text-emerald-400 opacity-60" />
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Total Athletes Enrolled</div>
            <div className="text-2xl font-bold text-white mt-1">
              {teams.reduce((acc, t) => acc + (t.members_count || 0), 0)}
            </div>
          </div>
          <Users className="h-8 w-8 text-blue-400 opacity-60" />
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Tournaments & Fixtures</div>
            <div className="text-2xl font-bold text-white mt-1">{events.length}</div>
          </div>
          <Calendar className="h-8 w-8 text-indigo-400 opacity-60" />
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Honor Roll Accolades</div>
            <div className="text-2xl font-bold text-white mt-1">{achievements.length}</div>
          </div>
          <Medal className="h-8 w-8 text-amber-400 opacity-60" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'teams'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Shield className="h-4 w-4" />
          Active Teams ({teams.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'events'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Events & Fixtures ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'achievements'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Medal className="h-4 w-4" />
          State & National Laurels ({achievements.length})
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 animate-pulse">
          Loading athletics repository...
        </div>
      ) : (
        <>
          {activeTab === 'teams' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by sport, team name, or head coach..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Teams Table */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-4">Squad Name</th>
                        <th className="p-4">Sport Category</th>
                        <th className="p-4">Head Coach / Mentor</th>
                        <th className="p-4 text-center">Athletes Enrolled</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredTeams.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            No sports squads match your search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTeams.map(team => (
                          <tr key={team.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-white">{team.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                {team.description}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {team.sport}
                              </span>
                            </td>
                            <td className="p-4 text-slate-300">
                              {team.coach_name}
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-medium text-white">{team.members_count}</span>
                              <span className="text-slate-500 text-xs"> athletes</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                <Sparkles className="h-3 w-3" /> Active
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(ev => (
                <div key={ev.id} className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full uppercase mb-1.5 ${
                        ev.status === 'upcoming'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {ev.level} • {ev.status}
                      </span>
                      <h3 className="font-bold text-white text-base leading-snug">{ev.title}</h3>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{ev.event_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{ev.venue}</span>
                    </div>
                  </div>
                  {ev.result && (
                    <div className="mt-2 p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg text-xs">
                      <span className="text-slate-400 font-medium">Outcome: </span>
                      <span className="text-amber-300 font-semibold">{ev.result}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map(ach => (
                <div key={ach.id} className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        {ach.sport} • {ach.level}
                      </span>
                      <span className="text-xs text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                        {ach.year}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base">{ach.title}</h3>
                    <p className="text-xs text-slate-300">
                      Awarded to <span className="font-semibold text-white">{ach.student_name}</span> ({ach.position})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Create Varsity Team</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Team / Squad Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SFRC Archery Squad"
                  value={newTeam.name}
                  onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Sport Category
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Archery"
                  value={newTeam.sport}
                  onChange={e => setNewTeam({ ...newTeam, sport: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Head Coach / Faculty Mentor
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. P. Meenakshi"
                  value={newTeam.coach_name}
                  onChange={e => setNewTeam({ ...newTeam, coach_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Team Overview & Training Regime
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide squad details, training timings, and prerequisites..."
                  value={newTeam.description}
                  onChange={e => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs text-slate-400">
                <AlertCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Squad will immediately become visible in the student sports portal for registration.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
                >
                  {saving ? 'Creating Squad...' : 'Save & Register Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
