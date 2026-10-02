// ── Database Types (auto-syncs with Supabase schema) ─────────────────────────
// Run `npx supabase gen types typescript --project-id YOUR_ID > lib/supabase/database.types.ts`
// to regenerate after schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          role: 'student' | 'faculty' | 'parent' | 'admin';
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          department_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };

      departments: {
        Row: {
          id: string;
          name: string;
          code: string;
          hod_name: string | null;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };

      programmes: {
        Row: {
          id: string;
          name: string;
          code: string;
          type: 'UG' | 'PG' | 'PhD' | 'Certificate' | 'Diploma' | 'Skill' | null;
          category: 'Regular' | 'SF' | null;
          department_id: string | null;
          duration_years: number;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['programmes']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['programmes']['Insert']>;
      };

      students: {
        Row: {
          id: string;
          user_id: string | null;
          register_number: string;
          programme_id: string | null;
          department_id: string | null;
          current_semester: number;
          batch_year: number;
          date_of_joining: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['students']['Insert']>;
      };

      faculty: {
        Row: {
          id: string;
          user_id: string | null;
          employee_id: string;
          department_id: string | null;
          designation: string | null;
          specialization: string | null;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['faculty']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['faculty']['Insert']>;
      };

      parents: {
        Row: {
          id: string;
          user_id: string | null;
          relation: string;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['parents']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['parents']['Insert']>;
      };

      courses: {
        Row: {
          id: string;
          code: string;
          title: string;
          credits: number;
          semester: number;
          programme_id: string | null;
          department_id: string | null;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['courses']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['courses']['Insert']>;
      };

      enrollments: {
        Row: {
          id: string;
          student_id: string | null;
          course_id: string | null;
          academic_year: string;
          semester: number;
        };
        Insert: Omit<Database['public']['Tables']['enrollments']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['enrollments']['Insert']>;
      };

      attendance_records: {
        Row: {
          id: string;
          student_id: string | null;
          course_id: string | null;
          date: string;
          session: 'FN' | 'AN' | null;
          status: 'present' | 'absent' | 'od' | 'medical' | null;
          marked_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance_records']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['attendance_records']['Insert']>;
      };

      marks: {
        Row: {
          id: string;
          student_id: string | null;
          course_id: string | null;
          assessment_type: 'CIA1' | 'CIA2' | 'CIA3' | 'Model' | 'External' | 'Assignment' | 'Practical' | null;
          marks_obtained: number | null;
          max_marks: number;
          academic_year: string | null;
          semester: number | null;
          entered_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['marks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['marks']['Insert']>;
      };

      timetables: {
        Row: {
          id: string;
          day_of_week: number | null;
          period_number: number | null;
          start_time: string;
          end_time: string;
          course_id: string | null;
          faculty_id: string | null;
          programme_id: string | null;
          semester: number | null;
          room: string | null;
          academic_year: string | null;
        };
        Insert: Omit<Database['public']['Tables']['timetables']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['timetables']['Insert']>;
      };

      complaints: {
        Row: {
          id: string;
          complaint_number: string | null;
          reporter_id: string | null;
          title: string;
          description: string;
          category: string;
          location: string | null;
          image_urls: string[];
          severity: 'critical' | 'high' | 'medium' | 'low';
          priority: 'critical' | 'high' | 'medium' | 'low';
          status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'duplicate';
          ai_category: string | null;
          ai_summary: string | null;
          duplicate_of: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['complaints']['Row'], 'id' | 'complaint_number' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['complaints']['Insert']>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          message: string;
          type: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };

      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: never;
      };

      ai_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          title: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_conversations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_conversations']['Insert']>;
      };

      ai_messages: {
        Row: {
          id: string;
          conversation_id: string | null;
          role: 'user' | 'assistant';
          content: string;
          intent: string | null;
          source_ref: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_messages']['Insert']>;
      };
    };

    Views: Record<string, never>;
    Functions: {
      match_knowledge_chunks: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          content: string;
          metadata: Json;
          source_id: string;
          similarity: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
};

// ── Convenience type helpers ──────────────────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
