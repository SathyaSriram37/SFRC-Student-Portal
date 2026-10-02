'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Upload, BookOpen, Video, Headphones, GitFork, FileText, MonitorPlay, CheckCircle2, Eye, BarChart2, PlusCircle, FolderPlus, Sparkles, RefreshCw, Globe, FileUp, AlertCircle, ExternalLink } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
import type { EContentItem, EContentStats, EContentCategory, EContentStatus } from '@/lib/types';

const CATEGORIES = [
  { id: 'video', label: 'Video Tutorial', icon: Video },
  { id: 'audio', label: 'Audio Lecture', icon: Headphones },
  { id: 'mindmap', label: 'Mindmap / Concept Map', icon: GitFork },
  { id: 'document', label: 'Document / PDF Guide', icon: FileText },
  { id: 'elearning', label: 'Interactive E-Learning', icon: MonitorPlay },
];

const DEPARTMENTS = [
  { code: 'CS', name: 'Computer Science' },
  { code: 'CHEM', name: 'Chemistry' },
  { code: 'MATH', name: 'Mathematics' },
  { code: 'ENG', name: 'English' },
  { code: 'COM', name: 'Commerce' },
  { code: 'PHY', name: 'Physics' },
];

export default function FacultyEContentManagePage() {
  const [activeTab, setActiveTab] = useState<'my-content' | 'upload'>('my-content');
  const [items, setItems] = useState<EContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stats Modal State
  const [selectedStatsItem, setSelectedStatsItem] = useState<EContentItem | null>(null);
  const [statsData, setStatsData] = useState<EContentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EContentCategory>('video');
  const [departmentCode, setDepartmentCode] = useState('CS');
  const [courseCode, setCourseCode] = useState('CS301');
  const [semester, setSemester] = useState('5');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<'file' | 'external'>('file');
  const [externalUrl, setExternalUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');

  const supabase = useMemo(() => createClient(), []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, [supabase]);

  const loadFacultyContent = useCallback(async () => {
    try {
      const token = await getAuthToken();
      // List all content; faculty can see published and drafts
      const res = await apiGet<{ items: EContentItem[]; total: number }>('/api/v1/econtent?page=1&limit=50', token);
      if (res?.items) {
        setItems(res.items);
      }
    } catch (err) {
      console.error('Failed to load faculty content:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadFacultyContent();
    })();
    return () => {
      ignore = true;
    };
  }, [loadFacultyContent]);

  // Toggle Publish/Unpublish Handler
  const handleTogglePublish = async (item: EContentItem) => {
    try {
      const token = await getAuthToken();
      const res = await apiPost<{ status: string; message: string }>(
        `/api/v1/econtent/${item.id}/publish`,
        {},
        token
      );

      // Optimistically update
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: (res.status as EContentStatus) || (it.status === 'published' ? 'draft' : 'published') }
            : it
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle publish status';
      alert(msg);
    }
  };

  // Open View Stats Modal
  const handleOpenStats = async (item: EContentItem) => {
    setSelectedStatsItem(item);
    setStatsModalOpen(true);
    setStatsLoading(true);
    try {
      const token = await getAuthToken();
      const stats = await apiGet<EContentStats>(`/api/v1/econtent/${item.id}/stats`, token);
      setStatsData(stats);
    } catch (err) {
      console.error('Failed to load content stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Handle Form Submission (Draft or Publish)
  const handleSubmitContent = async (targetStatus: EContentStatus) => {
    if (!title.trim()) {
      setFormErrorMessage('Please enter a valid title.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrorMessage('');
      setFormSuccessMessage('');

      const token = await getAuthToken();
      const durationSeconds = (parseInt(durationMinutes, 10) || 10) * 60;
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      let storagePath: string | undefined = undefined;
      let mimeType: string | undefined = undefined;
      let fileSizeBytes: number | undefined = undefined;

      if (sourceType === 'file' && selectedFile) {
        storagePath = `dept/${departmentCode.toLowerCase()}/${Date.now()}/${selectedFile.name}`;
        mimeType = selectedFile.type || 'application/octet-stream';
        fileSizeBytes = selectedFile.size;
      } else if (sourceType === 'file') {
        // Sample storage path
        storagePath = `dept/${departmentCode.toLowerCase()}/${Date.now()}/sample_material.pdf`;
        mimeType = 'application/pdf';
        fileSizeBytes = 2048576;
      }

      const payload = {
        title: title.trim(),
        category,
        department_code: departmentCode,
        course_code: courseCode.trim().toUpperCase(),
        semester: parseInt(semester, 10) || 1,
        description: description.trim() || `Course resource for ${courseCode}.`,
        storage_path: storagePath,
        external_url: sourceType === 'external' ? externalUrl.trim() : undefined,
        mime_type: mimeType,
        file_size_bytes: fileSizeBytes,
        duration_seconds: durationSeconds,
        tags,
        status: targetStatus,
      };

      await apiPost<EContentItem>('/api/v1/econtent', payload, token);

      setFormSuccessMessage(
        targetStatus === 'published'
          ? '🎉 Course resource published successfully and is now visible to students!'
          : '💾 Resource saved as Draft in your library.'
      );

      // Reset form
      setTitle('');
      setDescription('');
      setExternalUrl('');
      setSelectedFile(null);
      setTagsInput('');

      // Refresh content list
      loadFacultyContent();

      // Switch to list after brief timeout
      setTimeout(() => {
        setActiveTab('my-content');
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save e-content';
      setFormErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-sfrc-surface pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-sfrc-200 py-8 px-6 sm:px-10 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sfrc-700 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Faculty LMS Studio
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-sfrc-900 tracking-tight">
              E-Content Management
            </h1>
            <p className="text-xs sm:text-sm text-sfrc-600 mt-1">
              Upload, organize, monitor student engagement, and publish digital learning assets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/student/econtent">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold border-sfrc-200">
                <Eye className="w-4 h-4 mr-1.5" /> View Student Hub
              </Button>
            </Link>

            <Button
              onClick={() => setActiveTab('upload')}
              className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Upload Resource
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-sfrc-200 pb-2">
          <button
            onClick={() => setActiveTab('my-content')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'my-content'
                ? 'bg-sfrc-700 text-white shadow-sm'
                : 'text-sfrc-700 hover:bg-sfrc-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            My Course Content ({items.length})
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'upload'
                ? 'bg-sfrc-700 text-white shadow-sm'
                : 'text-sfrc-700 hover:bg-sfrc-100'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            Upload New Material
          </button>
        </div>

        {/* TAB 1: My Content Table */}
        {activeTab === 'my-content' && (
          <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-sfrc-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-sfrc-900">Manage Course Materials</CardTitle>
                <CardDescription className="text-xs text-sfrc-600">
                  Toggle visibility, review viewer engagement, and inspect viewing statistics.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadFacultyContent}
                className="text-xs font-bold text-sfrc-700"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-sfrc-200 bg-sfrc-50 text-[11px] font-bold text-sfrc-700 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Title & Category</th>
                    <th className="py-3.5 px-4">Course & Dept</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Views</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sfrc-100 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sfrc-500 font-medium">
                        Loading resources...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sfrc-500">
                        No learning content uploaded yet. Click &quot;Upload New Material&quot; to get started.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isPub = item.status === 'published';
                      const isDraft = item.status === 'draft';

                      return (
                        <tr key={item.id} className="hover:bg-sfrc-50/70 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-sfrc-100 flex items-center justify-center shrink-0">
                                {item.category === 'video' && <Video className="w-4 h-4 text-blue-700" />}
                                {item.category === 'audio' && <Headphones className="w-4 h-4 text-amber-700" />}
                                {item.category === 'mindmap' && <GitFork className="w-4 h-4 text-purple-700" />}
                                {item.category === 'document' && <FileText className="w-4 h-4 text-emerald-700" />}
                                {item.category === 'elearning' && <MonitorPlay className="w-4 h-4 text-rose-700" />}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/student/econtent/${item.id}`}
                                  className="font-bold text-sfrc-900 hover:text-sfrc-700 block truncate max-w-sm"
                                >
                                  {item.title}
                                </Link>
                                <p className="text-[11px] text-sfrc-500 capitalize font-medium">
                                  {item.category} • Created {new Date(item.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-semibold text-sfrc-800">
                            <span className="bg-sfrc-100 px-2 py-0.5 rounded text-sfrc-900 font-bold">
                              {item.course_code}
                            </span>
                            <span className="text-sfrc-500 ml-1.5 font-medium">({item.department_code})</span>
                          </td>

                          <td className="py-4 px-4 text-sfrc-600 font-medium">
                            {item.duration_seconds ? `${Math.floor(item.duration_seconds / 60)} min` : 'Self-paced'}
                          </td>

                          <td className="py-4 px-4 font-bold text-sfrc-900">
                            {item.views_count}
                          </td>

                          <td className="py-4 px-4">
                            {isPub && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Published
                              </span>
                            )}
                            {isDraft && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sfrc-200 text-sfrc-800 border border-sfrc-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-sfrc-600" /> Draft
                              </span>
                            )}
                            {item.status === 'archived' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Archived
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6 text-right space-x-2">
                            {/* Toggle Publish */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTogglePublish(item)}
                              className={`rounded-xl text-[11px] font-bold h-8 ${
                                isPub
                                  ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
                                  : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                              }`}
                            >
                              {isPub ? 'Unpublish' : 'Publish'}
                            </Button>

                            {/* View Stats Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenStats(item)}
                              className="rounded-xl text-[11px] font-bold h-8 text-sfrc-700 hover:bg-sfrc-100"
                            >
                              <BarChart2 className="w-3.5 h-3.5 mr-1" /> Stats
                            </Button>

                            {/* Preview Detail */}
                            <Link href={`/student/econtent/${item.id}`} target="_blank">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl text-[11px] font-bold h-8 text-sfrc-600 hover:text-sfrc-900"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 2: Upload New Material Form */}
        {activeTab === 'upload' && (
          <Card className="rounded-3xl border-sfrc-200 bg-white shadow-sm p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sfrc-100 text-sfrc-800 text-xs font-bold uppercase mb-2">
                <FileUp className="w-3.5 h-3.5 text-sfrc-700" />
                Upload Digital Learning Asset
              </div>
              <h2 className="text-xl font-bold text-sfrc-900">Course Resource Details</h2>
              <p className="text-xs text-sfrc-600 mt-1">
                Provide comprehensive metadata so students can search and stream the content effortlessly.
              </p>
            </div>

            {formSuccessMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{formSuccessMessage}</span>
              </div>
            )}

            {formErrorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{formErrorMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sfrc-800">
                  Resource Title <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Advanced Operating Systems: Memory Management & Paging"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl bg-sfrc-50/50 border-sfrc-200 text-sm font-medium"
                />
              </div>

              {/* Category & Department & Course Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sfrc-800">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <Select value={category} onValueChange={(val) => { if (val) setCategory(val as EContentCategory); }}>
                    <SelectTrigger className="rounded-xl bg-sfrc-50/50 border-sfrc-200 text-xs font-semibold">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sfrc-800">Department</label>
                  <Select value={departmentCode} onValueChange={(val) => { if (val) setDepartmentCode(val); }}>
                    <SelectTrigger className="rounded-xl bg-sfrc-50/50 border-sfrc-200 text-xs font-semibold">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d.code} value={d.code} className="text-xs">
                          {d.name} ({d.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sfrc-800">Course Code</label>
                  <Input
                    type="text"
                    placeholder="e.g. CS301"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="rounded-xl bg-sfrc-50/50 border-sfrc-200 text-xs font-semibold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sfrc-800">Semester</label>
                  <Select value={semester} onValueChange={(val) => { if (val) setSemester(val); }}>
                    <SelectTrigger className="rounded-xl bg-sfrc-50/50 border-sfrc-200 text-xs font-semibold">
                      <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((s) => (
                        <SelectItem key={s} value={String(s)} className="text-xs">
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sfrc-800">Estimated Duration (Minutes)</label>
                  <Input
                    type="number"
                    placeholder="45"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="rounded-xl bg-sfrc-50/50 border-sfrc-200 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sfrc-800">Description / Syllabus Scope</label>
                <Textarea
                  placeholder="Outline key learning outcomes, prerequisites, and concepts covered in this module..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="rounded-xl bg-sfrc-50/50 border-sfrc-200 text-xs leading-relaxed"
                />
              </div>

              {/* File Storage vs External URL Toggle */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSourceType('file')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      sourceType === 'file'
                        ? 'bg-sfrc-700 text-white border-sfrc-700 shadow-sm'
                        : 'bg-sfrc-50 border-sfrc-200 text-sfrc-700 hover:bg-sfrc-100'
                    }`}
                  >
                    <FileUp className="w-4 h-4" /> Upload File to Supabase Storage
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('external')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      sourceType === 'external'
                        ? 'bg-sfrc-700 text-white border-sfrc-700 shadow-sm'
                        : 'bg-sfrc-50 border-sfrc-200 text-sfrc-700 hover:bg-sfrc-100'
                    }`}
                  >
                    <Globe className="w-4 h-4" /> External URL / YouTube Embed
                  </button>
                </div>

                {sourceType === 'file' ? (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-sfrc-200 bg-sfrc-50/40 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-sfrc-100 text-sfrc-700 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sfrc-900">
                        Drag and drop your course material here, or browse file
                      </p>
                      <p className="text-[11px] text-sfrc-500 mt-0.5">
                        Limits: Video 500MB • Audio 50MB • PDF / Documents 20MB
                      </p>
                    </div>
                    <input
                      type="file"
                      id="fileUpload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                    <label htmlFor="fileUpload">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-bold cursor-pointer border-sfrc-300"
                        onClick={() => document.getElementById('fileUpload')?.click()}
                      >
                        Select Local File
                      </Button>
                    </label>

                    {selectedFile && (
                      <div className="inline-flex items-center gap-2 p-2 bg-white rounded-xl border border-sfrc-200 text-xs font-bold text-sfrc-800 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-sfrc-800">External Streaming URL / Video Link</label>
                    <Input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=... or https://interactive.sfrc.edu/course"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      className="rounded-xl bg-sfrc-50/50 border-sfrc-200 text-xs font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Tags Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sfrc-800">Tags (comma-separated)</label>
                <Input
                  type="text"
                  placeholder="python, algorithms, data-structures, mid-term"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="rounded-xl bg-sfrc-50/50 border-sfrc-200 text-xs font-medium"
                />
              </div>
            </div>

            {/* Submission Buttons */}
            <div className="pt-4 border-t border-sfrc-200 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleSubmitContent('draft')}
                className="rounded-xl text-xs font-bold border-sfrc-300 text-sfrc-800"
              >
                Save as Draft
              </Button>

              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitContent('published')}
                className="bg-sfrc-700 hover:bg-sfrc-800 text-white rounded-xl text-xs font-bold shadow-md"
              >
                {isSubmitting ? 'Processing...' : '🚀 Publish Now'}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* STATS MODAL */}
      <Dialog open={statsModalOpen} onOpenChange={setStatsModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-sfrc-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-sfrc-700" />
              Content Engagement Analytics
            </DialogTitle>
            <DialogDescription className="text-xs text-sfrc-600">
              {selectedStatsItem?.title} ({selectedStatsItem?.course_code})
            </DialogDescription>
          </DialogHeader>

          {statsLoading ? (
            <div className="py-12 text-center text-sfrc-500 font-bold text-xs">
              Calculating viewership stats...
            </div>
          ) : statsData ? (
            <div className="space-y-6 pt-2">
              {/* Stat Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-sfrc-50 border border-sfrc-200 text-center">
                  <p className="text-[11px] font-bold text-sfrc-600 uppercase">Total Views</p>
                  <p className="text-2xl font-black text-sfrc-900 mt-1">{statsData.total_views}</p>
                </div>
                <div className="p-4 rounded-2xl bg-sfrc-50 border border-sfrc-200 text-center">
                  <p className="text-[11px] font-bold text-sfrc-600 uppercase">Unique Students</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{statsData.unique_viewers}</p>
                </div>
                <div className="p-4 rounded-2xl bg-sfrc-50 border border-sfrc-200 text-center">
                  <p className="text-[11px] font-bold text-sfrc-600 uppercase">Avg. Completion</p>
                  <p className="text-2xl font-black text-sfrc-700 mt-1">{statsData.avg_progress}%</p>
                </div>
              </div>

              {/* Daily Views LineChart */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-sfrc-800">Daily Viewership Trend (Last 7 Days)</h4>
                <div className="h-52 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={statsData.daily_views}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="#5A122D"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#D4AF37' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatsModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
