'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Headphones, FileText, MonitorPlay, Bookmark, Share2, Clock, User, CheckCircle2, ExternalLink, Download, Maximize2, ZoomIn, ZoomOut, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiGet, apiPost } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { EContentItem } from '@/lib/types';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'Self-paced';
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  }
  return `${mins} min`;
}

export default function StudentEContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = (params?.id as string) || '';

  const [content, setContent] = useState<EContentItem | null>(null);
  const [relatedItems, setRelatedItems] = useState<EContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [mindmapZoom, setMindmapZoom] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  // Record view & progress update to backend
  const updateProgress = useCallback(
    async (newPercentage: number) => {
      if (!contentId) return;
      try {
        const token = await getAuthToken();
        const clamped = Math.min(100, Math.max(0, Math.round(newPercentage)));
        await apiPost(
          `/api/v1/econtent/${contentId}/view`,
          { progress_percentage: clamped },
          token
        );
        setProgress(clamped);
        if (clamped >= 100) {
          setIsCompleted(true);
        }
      } catch (err) {
        console.error('Failed to update viewing progress:', err);
      }
    },
    [contentId, getAuthToken]
  );

  // Fetch content detail and related content
  useEffect(() => {
    if (!contentId) return;

    let isMounted = true;
    const loadContent = async () => {
      try {
        setIsLoading(true);
        const token = await getAuthToken();

        // 1. Fetch content detail
        const detail = await apiGet<EContentItem>(`/api/v1/econtent/${contentId}`, token);
        if (!isMounted) return;
        setContent(detail);
        setIsBookmarked(!!detail.is_bookmarked);
        setProgress(detail.progress_percentage || 0);
        if ((detail.progress_percentage || 0) >= 100) {
          setIsCompleted(true);
        }

        // 2. Fetch related content for course/department
        const relatedRes = await apiGet<{ items: EContentItem[] }>(
          `/api/v1/econtent?dept=${detail.department_code}&limit=5`,
          token
        );
        if (!isMounted) return;
        if (relatedRes?.items) {
          setRelatedItems(relatedRes.items.filter((i) => i.id !== contentId));
        }

        // 3. Trigger initial view registration
        await apiPost(
          `/api/v1/econtent/${contentId}/view`,
          { progress_percentage: detail.progress_percentage || 5 },
          token
        );
      } catch (err) {
        console.error('Failed to load e-content details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [contentId, getAuthToken]);

  // Setup 30s auto-progress updater interval
  useEffect(() => {
    if (!content) return;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        let currentPct = prev;

        // If playing HTML5 video
        if (videoRef.current && videoRef.current.duration > 0) {
          currentPct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        } else if (audioRef.current && audioRef.current.duration > 0) {
          currentPct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        } else {
          // Document / Mindmap: increment by 10% every 30s of active reading up to 100%
          currentPct = Math.min(100, prev + 10);
        }

        const nextVal = Math.min(100, Math.max(prev, Math.round(currentPct)));
        updateProgress(nextVal);
        return nextVal;
      });
    }, 30000); // 30 seconds

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [content, updateProgress]);

  // Bookmark Toggle
  const handleToggleBookmark = async () => {
    if (!content) return;
    try {
      setBookmarkLoading(true);
      const token = await getAuthToken();
      const res = await apiPost<{ bookmarked: boolean; message: string }>(
        `/api/v1/econtent/${content.id}/bookmark`,
        {},
        token
      );
      setIsBookmarked(res.bookmarked);
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Mark Complete Action
  const handleMarkComplete = async () => {
    await updateProgress(100);
    setIsCompleted(true);
  };

  // Share link copy
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sfrc-surface flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-sfrc-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-sfrc-800">Loading Learning Content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-sfrc-surface p-8 max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="text-xs font-bold text-sfrc-700">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Catalog
        </Button>
        <div className="p-8 rounded-2xl bg-white border border-sfrc-200 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-xl font-bold text-sfrc-900">Resource Not Found</h2>
          <p className="text-xs text-sfrc-600">
            This learning content may have been unpublished or removed by the faculty.
          </p>
          <Link href="/student/econtent">
            <Button className="bg-sfrc-700 hover:bg-sfrc-800 text-white text-xs font-bold rounded-xl">
              Browse Available Content
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const youtubeId = content.external_url ? extractYouTubeId(content.external_url) : null;
  const isYoutube = !!youtubeId;
  const mediaUrl = content.signed_url || content.external_url;

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-sfrc-200 sticky top-0 z-20 px-6 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-sfrc-600">
            <Link href="/student/econtent" className="hover:text-sfrc-900 font-bold flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> E-Content Hub
            </Link>
            <span>/</span>
            <span className="text-sfrc-800 font-bold">{content.department_code}</span>
            <span>/</span>
            <span className="truncate max-w-[200px] sm:max-w-xs text-sfrc-900 font-semibold">{content.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="text-xs font-bold rounded-xl h-8 border-sfrc-200"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copied Link
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 mr-1" /> Share
                </>
              )}
            </Button>

            <Button
              variant={isBookmarked ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleBookmark}
              disabled={bookmarkLoading}
              className={`text-xs font-bold rounded-xl h-8 ${
                isBookmarked
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'border-sfrc-200 text-sfrc-800'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 mr-1 ${isBookmarked ? 'fill-white' : ''}`} />
              {isBookmarked ? 'Saved' : 'Bookmark'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Player & Content Display */}
        <div className="lg:col-span-2 space-y-6">
          {/* Media Player Container */}
          <div className="bg-black rounded-3xl overflow-hidden shadow-xl border border-sfrc-800 relative">
            {/* 1. Video Player */}
            {content.category === 'video' && (
              <div className="aspect-video w-full bg-black relative flex items-center justify-center">
                {isYoutube ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&enablejsapi=1`}
                    title={content.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    poster={content.thumbnail_url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                    onTimeUpdate={() => {
                      if (videoRef.current && videoRef.current.duration > 0) {
                        const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                        setProgress(Math.round(pct));
                      }
                    }}
                    onEnded={() => updateProgress(100)}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            )}

            {/* 2. Audio Player */}
            {content.category === 'audio' && (
              <div className="p-8 bg-gradient-to-br from-sfrc-900 via-sfrc-800 to-amber-950 text-white text-center space-y-6">
                <div className="w-24 h-24 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
                  <Headphones className="w-12 h-12 text-amber-400 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">{content.title}</h3>
                  <p className="text-xs text-amber-200/80">{content.faculty_name} • {content.course_code}</p>
                </div>
                <div className="max-w-md mx-auto pt-2">
                  <audio
                    ref={audioRef}
                    src={mediaUrl}
                    controls
                    className="w-full rounded-xl"
                    onTimeUpdate={() => {
                      if (audioRef.current && audioRef.current.duration > 0) {
                        const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                        setProgress(Math.round(pct));
                      }
                    }}
                    onEnded={() => updateProgress(100)}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}

            {/* 3. Mindmap Interactive Viewer */}
            {content.category === 'mindmap' && (
              <div className="bg-sfrc-950 p-4 relative min-h-[420px] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMindmapZoom((z) => Math.min(2.5, z + 0.25))}
                    className="h-7 w-7 p-0 text-white hover:bg-white/20"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMindmapZoom((z) => Math.max(0.5, z - 0.25))}
                    className="h-7 w-7 p-0 text-white hover:bg-white/20"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMindmapZoom(1)}
                    className="h-7 w-7 p-0 text-white hover:bg-white/20"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  {mediaUrl && (
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                      title="Open Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="overflow-auto w-full max-h-[600px] flex items-center justify-center p-4">
                  <img
                    src={mediaUrl || content.thumbnail_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80'}
                    alt={content.title}
                    style={{ transform: `scale(${mindmapZoom})`, transition: 'transform 0.2s ease-out' }}
                    className="max-w-full object-contain rounded-xl shadow-2xl"
                  />
                </div>
              </div>
            )}

            {/* 4. Document / PDF Viewer */}
            {content.category === 'document' && (
              <div className="w-full bg-sfrc-900 min-h-[500px] flex flex-col">
                {mediaUrl?.endsWith('.pdf') || content.mime_type === 'application/pdf' ? (
                  <iframe
                    src={`${mediaUrl}#toolbar=1`}
                    title={content.title}
                    className="w-full h-[600px] border-0 rounded-b-3xl"
                  />
                ) : (
                  <div className="p-12 text-center text-white space-y-6 my-auto">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
                      <FileText className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">{content.title}</h3>
                      <p className="text-xs text-sfrc-300 max-w-md mx-auto">
                        Official course document provided by {content.faculty_name}.
                      </p>
                    </div>
                    {mediaUrl && (
                      <a
                        href={mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg"
                      >
                        <Download className="w-4 h-4" /> Download / Open Document
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. E-Learning Interactive Viewer */}
            {content.category === 'elearning' && (
              <div className="w-full bg-sfrc-950 min-h-[500px] flex flex-col items-center justify-center p-8 text-center text-white">
                <div className="w-20 h-20 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
                  <MonitorPlay className="w-10 h-10 text-rose-400" />
                </div>
                <h3 className="text-2xl font-bold">{content.title}</h3>
                <p className="text-xs text-sfrc-300 max-w-md mx-auto mt-2">
                  Interactive self-paced e-learning module.
                </p>
                {mediaUrl && (
                  <div className="mt-6 flex items-center gap-3">
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xl"
                    >
                      <ExternalLink className="w-4 h-4" /> Launch Interactive Course
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title & Metadata Card */}
          <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-sfrc-700 text-white font-bold uppercase text-[10px]">
                  {content.department_code}
                </Badge>
                <Badge variant="outline" className="text-sfrc-700 border-sfrc-300 font-bold text-[10px]">
                  {content.course_code}
                </Badge>
                {content.semester && (
                  <Badge variant="secondary" className="bg-sfrc-100 text-sfrc-800 text-[10px]">
                    Semester {content.semester}
                  </Badge>
                )}
                <Badge variant="secondary" className="capitalize text-[10px]">
                  {content.category}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 leading-tight">
                {content.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-sfrc-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-sfrc-500" />
                  <span className="font-semibold text-sfrc-800">{content.faculty_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sfrc-500" />
                  <span>Duration: {formatDuration(content.duration_seconds)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-sfrc-500" />
                  <span>{content.views_count} total views</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-sfrc-100 pt-4">
              <h3 className="text-sm font-bold text-sfrc-900">About this Resource</h3>
              <p className="text-xs sm:text-sm text-sfrc-700 leading-relaxed whitespace-pre-line">
                {content.description}
              </p>
            </div>

            {/* Tags */}
            {content.tags && content.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sfrc-100">
                <span className="text-xs font-bold text-sfrc-600">Tags:</span>
                {content.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-sfrc-100 text-sfrc-800 text-[11px] font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Progress, Completion & Sidebar Widgets */}
        <div className="space-y-6">
          {/* Progress Tracker Card */}
          <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sfrc-900">Your Learning Progress</h3>
              <span className="text-xs font-black text-sfrc-700 bg-sfrc-100 px-2 py-0.5 rounded-md">
                {progress}%
              </span>
            </div>

            <Progress value={progress} className="h-2.5 bg-sfrc-100" />

            <div className="flex items-center justify-between text-[11px] text-sfrc-600">
              <span>{isCompleted ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started'}</span>
              <span>Updated automatically every 30s</span>
            </div>

            <div className="pt-2">
              {isCompleted ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Module Completed! Great job!</span>
                </div>
              ) : (
                <Button
                  onClick={handleMarkComplete}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl h-9 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark as Completed (100%)
                </Button>
              )}
            </div>
          </Card>

          {/* Faculty Card */}
          <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sfrc-600">Instructor</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sfrc-100 text-sfrc-800 flex items-center justify-center font-black text-base shadow-inner">
                {content.faculty_name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-sfrc-900 text-sm">{content.faculty_name}</h4>
                <p className="text-xs text-sfrc-600">Department of {content.department_code}</p>
                <p className="text-[11px] text-sfrc-500 font-medium">SFRC Faculty Member</p>
              </div>
            </div>
          </Card>

          {/* Related Resources */}
          {relatedItems.length > 0 && (
            <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-sfrc-900">Related in {content.department_code}</h3>
                <Link href={`/student/econtent?dept=${content.department_code}`} className="text-xs font-bold text-sfrc-700 hover:text-sfrc-900">
                  View all
                </Link>
              </div>

              <div className="space-y-3">
                {relatedItems.slice(0, 4).map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/student/econtent/${rel.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-sfrc-50 border border-transparent hover:border-sfrc-200 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-sfrc-900 overflow-hidden shrink-0 relative">
                      <img
                        src={rel.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80'}
                        alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-sfrc-900 group-hover:text-sfrc-700 truncate">
                        {rel.title}
                      </p>
                      <p className="text-[11px] text-sfrc-600 flex items-center gap-1 mt-0.5">
                        <span className="capitalize font-semibold text-sfrc-700">{rel.category}</span>
                        <span>•</span>
                        <span>{formatDuration(rel.duration_seconds)}</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
