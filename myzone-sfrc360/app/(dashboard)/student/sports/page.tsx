'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  Calendar,
  Users,
  CheckCircle2,
  MapPin,
  Flame,
  Medal,
  Loader2,
  Activity,
  Check,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type {
  SportsTeamItem,
  SportsEventItem,
  SportsAchievementItem,
} from '@/lib/types';

export default function StudentSportsPage() {
  const [teams, setTeams] = useState<SportsTeamItem[]>([]);
  const [events, setEvents] = useState<SportsEventItem[]>([]);
  const [achievements, setAchievements] = useState<SportsAchievementItem[]>([]);
  const [activeTab, setActiveTab] = useState<'teams' | 'events' | 'achievements'>('teams');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const token = await getAuthToken();
        const [teamsRes, eventsRes, achRes] = await Promise.allSettled([
          apiGet<SportsTeamItem[]>('/api/v1/sports/teams', token),
          apiGet<SportsEventItem[]>('/api/v1/sports/events', token),
          apiGet<SportsAchievementItem[]>('/api/v1/sports/achievements', token),
        ]);

        if (!ignore) {
          if (teamsRes.status === 'fulfilled' && Array.isArray(teamsRes.value)) {
            setTeams(teamsRes.value);
          }
          if (eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value)) {
            setEvents(eventsRes.value);
          }
          if (achRes.status === 'fulfilled' && Array.isArray(achRes.value)) {
            setAchievements(achRes.value);
          }
        }
      } catch (err) {
        console.error('Failed to load sports data:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [getAuthToken]);

  // Join/Leave Team toggle
  const handleToggleJoin = async (teamId: string) => {
    setJoiningId(teamId);
    try {
      const token = await getAuthToken();
      const updated = await apiPost<SportsTeamItem>(
        `/api/v1/sports/teams/${teamId}/join`,
        {},
        token
      );
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
    } catch (err) {
      console.error('Failed to toggle team join status:', err);
    } finally {
      setJoiningId(null);
    }
  };

  const filteredTeams = useMemo(() => {
    return teams.filter(
      (t) => categoryFilter === 'all' || t.category.toLowerCase() === categoryFilter.toLowerCase()
    );
  }, [teams, categoryFilter]);

  const upcomingEvents = useMemo(() => {
    return events.filter((e) => e.status === 'upcoming');
  }, [events]);

  const pastEvents = useMemo(() => {
    return events.filter((e) => e.status === 'completed');
  }, [events]);

  return (
    <AppShell role="student" userName="Student Athlete">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Profile Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-700 dark:bg-sfrc-950 dark:text-sfrc-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5 text-sfrc-accent animate-pulse" />
              Physical Education & Athletics
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              SFRC Sports, Varsity Teams & Tournaments
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Join college sports squads, track upcoming zonal fixtures, and celebrate collegiate achievements.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="p-1 bg-muted/60 rounded-2xl border border-border flex items-center">
            <button
              onClick={() => setActiveTab('teams')}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                activeTab === 'teams'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Teams ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                activeTab === 'events'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tournaments ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                activeTab === 'achievements'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Wall of Fame ({achievements.length})
            </button>
          </div>
        </div>

        {/* TAB 1: TEAMS GRID */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-muted-foreground font-semibold">Filter:</span>
              {['all', 'Outdoor', 'Indoor', 'Track & Field'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'px-3 py-1 rounded-lg font-bold border transition-colors',
                    categoryFilter === cat
                      ? 'bg-sfrc-700 text-white border-sfrc-700'
                      : 'bg-card text-foreground border-border hover:bg-muted'
                  )}
                >
                  {cat === 'all' ? 'All Squads (8)' : cat}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-sfrc-700 dark:text-sfrc-300" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Loading sports rosters…
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredTeams.map((team) => (
                  <Card
                    key={team.id}
                    className="p-5 border-border shadow-xs hover:border-sfrc-accent/60 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold tracking-wider"
                        >
                          {team.category}
                        </Badge>
                        <span className="text-xs font-bold text-sfrc-700 dark:text-sfrc-300 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {team.members_count} Athletes
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-foreground line-clamp-1">
                          {team.name}
                        </h3>
                        <p className="text-xs font-bold text-sfrc-700 dark:text-sfrc-300 mt-0.5">
                          Sport: {team.sport}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {team.description}
                        </p>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-border text-[11px]">
                        <p className="text-muted-foreground">
                          <strong>Coach:</strong> {team.coach_name}
                        </p>
                        <p className="text-muted-foreground">
                          <strong>Captain:</strong> {team.captain_name}
                        </p>
                        <p className="text-muted-foreground truncate">
                          <strong>Practice:</strong> {team.practice_schedule}
                        </p>
                        <p className="text-muted-foreground truncate">
                          <strong>Venue:</strong> {team.venue}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border mt-4">
                      <Button
                        onClick={() => handleToggleJoin(team.id)}
                        disabled={joiningId === team.id}
                        size="sm"
                        className={cn(
                          'w-full text-xs font-bold gap-1.5 shadow-xs transition-all',
                          team.is_joined
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-sfrc-700 hover:bg-sfrc-800 text-white'
                        )}
                      >
                        {joiningId === team.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : team.is_joined ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Squad Member ✓
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5" />
                            Join Squad
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TOURNAMENTS & FIXTURES */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Upcoming Tournaments */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Upcoming Tournaments & Matches ({upcomingEvents.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {upcomingEvents.map((ev) => (
                  <Card key={ev.id} className="p-5 border-border shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                        {ev.level} Level
                      </Badge>
                      <span className="text-xs font-bold text-sfrc-700 dark:text-sfrc-300">
                        {ev.sport}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">{ev.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.tournament_name}</p>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sfrc-700 dark:text-sfrc-300" />
                        {new Date(ev.event_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {ev.time}
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-sfrc-700 dark:text-sfrc-300" />
                        {ev.venue}
                      </p>
                      {ev.opponent && (
                        <p className="flex items-center gap-1.5 text-foreground font-semibold">
                          <Users className="w-3.5 h-3.5 text-sfrc-700 dark:text-sfrc-300" />
                          vs. {ev.opponent}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Past Results */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Completed Matches & Tournament Results ({pastEvents.length})
              </h2>

              <Card className="overflow-hidden border-border shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                        <th className="p-3.5 pl-4">Tournament & Match</th>
                        <th className="p-3.5">Sport</th>
                        <th className="p-3.5">Opponent</th>
                        <th className="p-3.5">Result</th>
                        <th className="p-3.5">Score / Points</th>
                        <th className="p-3.5 pr-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pastEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3.5 pl-4 max-w-xs">
                            <p className="font-bold text-foreground">{ev.title}</p>
                            <p className="text-[11px] text-muted-foreground">{ev.tournament_name}</p>
                          </td>
                          <td className="p-3.5 font-bold text-foreground">{ev.sport}</td>
                          <td className="p-3.5 text-muted-foreground">{ev.opponent || 'Zonal Finals'}</td>
                          <td className="p-3.5">
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                              {ev.result}
                            </Badge>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-foreground">{ev.score || 'N/A'}</td>
                          <td className="p-3.5 pr-4 text-muted-foreground">
                            {new Date(ev.event_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: WALL OF FAME (ACHIEVEMENTS) */}
        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((ach) => (
                <Card
                  key={ach.id}
                  className="p-5 border-border shadow-xs bg-gradient-to-br from-card via-sfrc-50/15 to-sfrc-100/20 dark:from-card dark:to-muted/20 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                      <Medal className="w-5 h-5" />
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                      {ach.position}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-snug">{ach.title}</h3>
                    <p className="text-xs text-sfrc-700 dark:text-sfrc-300 font-semibold mt-1">
                      {ach.sport} • {ach.tournament}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border text-xs space-y-1">
                    <p className="text-foreground font-bold">
                      Recipient: {ach.student_name} ({ach.register_number})
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Level: {ach.level} • Academic Year: {ach.year}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
