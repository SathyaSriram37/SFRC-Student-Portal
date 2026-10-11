'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, GraduationCap, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export interface StudentLookupItem {
  id: string;
  user_id: string;
  register_number: string;
  full_name: string;
  department_name?: string;
  programme_name?: string;
  current_semester?: number;
  section?: string;
  batch?: string;
  is_active: boolean;
}

interface StudentSearchSelectorProps {
  selectedStudents: StudentLookupItem[];
  onAddStudent: (student: StudentLookupItem) => void;
  onRemoveStudent: (studentId: string) => void;
  disabled?: boolean;
}

export default function StudentSearchSelector({
  selectedStudents,
  onAddStudent,
  onRemoveStudent,
  disabled = false,
}: StudentSearchSelectorProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentLookupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setIsLoading(false);
      setSearchError(null);
      return;
    }

    const handler = setTimeout(async () => {
      try {
        setIsLoading(true);
        setSearchError(null);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const data = await apiGet<StudentLookupItem[]>(
          `/api/v1/admin/students/lookup?q=${encodeURIComponent(trimmed)}`,
          token
        );
        setResults(data || []);
        setIsOpen(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to search students';
        setSearchError(msg);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, supabase]);

  const handleSelect = (student: StudentLookupItem) => {
    onAddStudent(student);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const isAlreadySelected = (id: string) => {
    return selectedStudents.some((s) => s.id === id);
  };

  return (
    <div className="space-y-2.5" ref={containerRef}>
      {/* Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-sfrc-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen && e.target.value.trim().length > 0) setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim().length > 0) setIsOpen(true);
            }}
            placeholder="Type student name or register no (e.g. 22UCA042, Priya)..."
            className={cn(
              'w-full pl-9 pr-9 py-2 rounded-xl border text-xs bg-white text-sfrc-900 placeholder:text-sfrc-400',
              'focus:outline-hidden focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all',
              'border-sfrc-200 disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 text-sfrc-500 animate-spin absolute right-3 pointer-events-none" />
          )}
          {!isLoading && query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="absolute right-2.5 p-1 text-sfrc-400 hover:text-sfrc-700 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results Dropdown */}
        {isOpen && query.trim().length > 0 && (
          <div className="absolute z-60 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-2xl border border-sfrc-200 shadow-xl p-1.5 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-sfrc-500">
                <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                Searching student directory...
              </div>
            ) : searchError ? (
              <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-4 text-center text-xs text-sfrc-500">
                No active students found matching &quot;{query}&quot;
              </div>
            ) : (
              results.map((student) => {
                const selected = isAlreadySelected(student.id);
                return (
                  <button
                    key={student.id}
                    type="button"
                    disabled={selected}
                    onClick={() => handleSelect(student)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between',
                      selected
                        ? 'bg-pink-50/60 text-sfrc-400 cursor-not-allowed'
                        : 'hover:bg-pink-50/80 text-sfrc-800 cursor-pointer'
                    )}
                  >
                    <div>
                      <div className="font-bold text-sfrc-900 flex items-center gap-2">
                        <span>{student.full_name}</span>
                        <span className="font-mono text-[10px] bg-sfrc-100 text-sfrc-700 px-1.5 py-0.5 rounded font-bold">
                          {student.register_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-sfrc-500 mt-0.5">
                        {student.department_name || student.programme_name || 'Student'}
                        {student.current_semester ? ` • Semester ${student.current_semester}` : ''}
                        {student.section ? ` (${student.section})` : ''}
                      </p>
                    </div>
                    {selected ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-lg">
                        <Check className="w-3 h-3" /> Linked
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-pink-700 hover:underline">
                        + Link
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected Student Chips List */}
      <div className="space-y-1.5">
        {selectedStudents.length === 0 ? (
          <p className="text-[11px] text-sfrc-500 italic p-2 bg-sfrc-surface rounded-xl border border-sfrc-200/80">
            No students linked yet. Search by name or register number above to add wards.
          </p>
        ) : (
          <div className="space-y-1.5">
            {selectedStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-pink-50/70 border border-pink-200/80 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-pink-950 truncate">{student.full_name}</p>
                    <p className="text-[11px] text-pink-800 font-mono">
                      {student.register_number}
                      {student.department_name ? ` • ${student.department_name}` : ''}
                      {student.current_semester ? ` • Sem ${student.current_semester}` : ''}
                    </p>
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemoveStudent(student.id)}
                    className="p-1 rounded-lg text-pink-500 hover:text-red-700 hover:bg-pink-100/80 transition-colors cursor-pointer shrink-0 ml-2"
                    title="Remove ward link"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
