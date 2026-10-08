// ── Role Types ────────────────────────────────────────────────────────────────
export type UserRole = 'student' | 'faculty' | 'parent' | 'admin';

export type Capability =
  | '*'
  // Student Capabilities
  | 'attendance:view'
  | 'marks:view'
  | 'leave:apply'
  | 'leave:view'
  | 'courses:view'
  | 'complaints:create'
  | 'complaints:view_own'
  | 'library:search'
  | 'library:loan_view'
  | 'fees:view'
  | 'placements:apply'
  | 'placements:view'
  | 'announcements:view'
  | 'events:register'
  | 'events:view'
  | 'ai:chat'
  // Faculty Capabilities
  | 'attendance:mark'
  | 'marks:enter'
  | 'leave:approve'
  | 'mentorship:log'
  | 'courses:manage'
  | 'complaints:view'
  | 'complaints:update'
  | 'reports:view'
  | 'announcements:create'
  | 'events:create'
  // Parent Capabilities
  | 'attendance:view_ward'
  | 'marks:view_ward'
  | 'fees:view_ward'
  | 'leave:view_ward'
  | 'leave:apply_ward'
  | 'complaints:view_ward';

export const ROLE_CAPABILITIES: Record<UserRole, Capability[]> = {
  admin: ['*'],
  faculty: [
    'attendance:mark',
    'attendance:view',
    'marks:enter',
    'marks:view',
    'leave:approve',
    'mentorship:log',
    'courses:manage',
    'courses:view',
    'complaints:view',
    'complaints:update',
    'reports:view',
    'announcements:create',
    'announcements:view',
    'events:create',
    'events:view',
  ],
  student: [
    'attendance:view',
    'marks:view',
    'leave:apply',
    'leave:view',
    'courses:view',
    'complaints:create',
    'complaints:view_own',
    'library:search',
    'library:loan_view',
    'fees:view',
    'placements:apply',
    'placements:view',
    'announcements:view',
    'events:register',
    'events:view',
    'ai:chat',
  ],
  parent: [
    'attendance:view_ward',
    'marks:view_ward',
    'fees:view_ward',
    'leave:view_ward',
    'leave:apply_ward',
    'announcements:view',
    'events:view',
    'complaints:view_ward',
  ],
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  departmentId?: string;
  capabilities: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface StudentDetailedProfile {
  student_id: string;
  user_id: string;
  full_name: string;
  register_number: string;
  roll_number?: string;
  avatar_url?: string;
  email?: string;
  phone_number?: string;
  personal_email?: string;
  gender?: string;
  dob?: string;
  blood_group?: string;
  permanent_address?: string;
  residential_address?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  programme_name?: string;
  department_name?: string;
  current_semester: number;
  batch_year?: string;
  section?: string;
  shift?: string;
  admission_date?: string;
  abc_id?: string;
  apaar_id?: string;
  mentor_name?: string;
  mentor_email?: string;
  mentor_phone?: string;
  parent_name?: string;
  parent_relationship?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_occupation?: string;
  is_hosteller: boolean;
  hostel_block?: string;
  room_number?: string;
  bus_route_no?: string;
  attendance_pct: number;
  cgpa: number;
  earned_credits: number;
  total_credits: number;
}

// ── Student ───────────────────────────────────────────────────────────────────
export interface Student {
  id: string;
  userId: string;
  rollNumber: string;
  name: string;
  department: string;
  batch: string;
  semester: number;
  section: string;
  parentId?: string;
  mentorId?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  subjectCode: string;
  subjectName: string;
  date: string;
  status: 'present' | 'absent' | 'od' | 'medical';
  markedBy: string;
}

export interface AttendanceSummary {
  subjectCode: string;
  subjectName: string;
  totalClasses: number;
  attended: number;
  percentage: number;
}

export interface Mark {
  id: string;
  studentId: string;
  subjectCode: string;
  subjectName: string;
  examType: 'cia1' | 'cia2' | 'cia3' | 'model' | 'semester';
  marksObtained: number;
  maxMarks: number;
  semester: number;
}

export interface TimetableEntry {
  id: string;
  dayOfWeek: number; // 0=Mon...4=Fri
  period: number;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  room: string;
  startTime: string;
  endTime: string;
}

// ── Faculty ───────────────────────────────────────────────────────────────────
export interface Faculty {
  id: string;
  userId: string;
  staffId: string;
  name: string;
  department: string;
  designation: string;
  subjects: string[];
}

// ── Parent ────────────────────────────────────────────────────────────────────
export interface Parent {
  id: string;
  userId: string;
  name: string;
  wardIds: string[];
  phone: string;
}

// ── Complaint / Campus Care ───────────────────────────────────────────────────
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintCategory = 'maintenance' | 'cleanliness' | 'electrical' | 'it' | 'canteen' | 'other';

export interface Complaint {
  id: string;
  raisedBy: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  location: string;
  status: ComplaintStatus;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// ── Event ─────────────────────────────────────────────────────────────────────
export interface CollegeEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  organizer: string;
  category: 'academic' | 'cultural' | 'sports' | 'technical' | 'other';
  imageUrl?: string;
}

// ── Notification ──────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────
export interface StatCardData {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
  description?: string;
}

// ── API Response ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── E-Content / LMS ───────────────────────────────────────────────────────────
export type EContentCategory = 'video' | 'audio' | 'mindmap' | 'document' | 'elearning';
export type EContentStatus = 'draft' | 'published' | 'archived';

export interface EContentItem {
  id: string;
  title: string;
  category: EContentCategory;
  department_code: string;
  course_code: string;
  semester?: number;
  description: string;
  faculty_id: string;
  faculty_name: string;
  storage_path?: string;
  external_url?: string;
  mime_type?: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  thumbnail_url?: string;
  status: EContentStatus;
  views_count: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  signed_url?: string;
  is_bookmarked?: boolean;
  progress_percentage?: number;
}

export interface EContentStats {
  content_id: string;
  title: string;
  total_views: number;
  unique_viewers: number;
  avg_progress: number;
  daily_views: { date: string; views: number }[];
}

export interface EContentPlatformAnalytics {
  total_items: number;
  total_views: number;
  total_in_progress: number;
  category_distribution: { name: string; value: number }[];
  department_breakdown: { department: string; count: number; views: number }[];
  monthly_trend: { month: string; views: number }[];
  top_viewed: { id: string; title: string; category: string; department: string; views: number }[];
}

// ── Placement & Career ────────────────────────────────────────────────────────
export interface PlacementEligibility {
  eligible: boolean;
  reasons: string[];
}

export interface PlacementDrive {
  id: string;
  company_name: string;
  logo_url?: string;
  role_title: string;
  job_type: string;
  ctc_range: string;
  location: string;
  eligible_departments: string[];
  min_cgpa: number;
  min_attendance: number;
  drive_date: string;
  application_deadline: string;
  job_description: string;
  rounds: string[];
  total_openings: number;
  is_active: boolean;
  created_at: string;
  eligibility?: PlacementEligibility;
  has_applied?: boolean;
  application_status?: string;
}

export interface PlacementApplication {
  id: string;
  drive_id: string;
  student_id: string;
  student_name: string;
  register_number: string;
  department: string;
  company_name: string;
  role_title: string;
  ctc_range: string;
  cgpa_at_application: number;
  attendance_at_application: number;
  status: 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected';
  applied_at: string;
  updated_at: string;
  interview_date?: string;
  notes?: string;
}

// ── Research & Innovation ─────────────────────────────────────────────────────
export interface ResearchProject {
  id: string;
  faculty_id: string;
  title: string;
  principal_investigator: string;
  co_investigator?: string;
  department_code: string;
  funding_agency: string;
  project_type: string;
  sanctioned_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  description?: string;
  grant_sanction_order?: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchPublication {
  id: string;
  faculty_id: string;
  faculty_name: string;
  title: string;
  authors: string[];
  department_code: string;
  journal_name: string;
  indexing: string;
  impact_factor?: number;
  issn_isbn?: string;
  volume_issue_pages?: string;
  publication_year: number;
  doi_or_url?: string;
  paper_type: string;
  created_at: string;
}

// ── Student Life, Clubs & YWED ────────────────────────────────────────────────
export interface ClubItem {
  id: string;
  name: string;
  category: 'club' | 'extension';
  description: string;
  faculty_in_charge: string;
  meeting_venue: string;
  meeting_day: string;
  icon_name?: string;
  banner_url?: string;
  member_count: number;
  is_member: boolean;
}

export interface YWEDCourse {
  id: string;
  course_name: string;
  course_type: 'long_term' | 'short_term';
  instructor: string;
  duration: string;
  skills_acquired: string[];
  max_intake: number;
  enrolled_count: number;
  syllabus_outline: string;
  is_enrolled: boolean;
}

export interface StartupShowcase {
  id: string;
  startup_name: string;
  founder_names: string[];
  department: string;
  founded_year: number;
  tagline: string;
  description: string;
  revenue_stage: string;
  logo_url?: string;
  website_url?: string;
  mentors: string[];
}

export interface StudentCertificate {
  id: string;
  certificate_title: string;
  issued_by: string;
  issue_date: string;
  certificate_type: 'course' | 'event' | 'club' | 'startup';
  verification_code: string;
  download_url: string;
}

// ── Alumni & Mentorship ───────────────────────────────────────────────────────
export interface AlumniProfilePublic {
  id: string;
  name: string;
  department_code: string;
  batch_year: number;
  degree: string;
  current_organization: string;
  designation: string;
  industry: string;
  location: string;
  linkedin_url?: string;
  bio?: string;
  skills: string[];
  is_mentor: boolean;
  mentorship_areas: string[];
  visibility: string;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

export interface AlumniStory {
  id: string;
  alumni_id: string;
  alumni_name: string;
  batch_year: number;
  department_code: string;
  title: string;
  story_text: string;
  current_role: string;
  photo_url?: string;
  published_at: string;
}

export interface AlumniOpportunity {
  id: string;
  alumni_id: string;
  alumni_name: string;
  company_name: string;
  role_title: string;
  location: string;
  opportunity_type: string;
  description: string;
  apply_link_or_email: string;
  posted_at: string;
}

// ── IQAC Quality Management ───────────────────────────────────────────────────
export interface IQACMeeting {
  id: string;
  title: string;
  meeting_number: string;
  meeting_date: string;
  venue: string;
  attendees: string[];
  agenda: string[];
  minutes?: string;
  decisions: string[];
  action_items_count: number;
  created_at: string;
  updated_at: string;
}

export interface IQACActionItem {
  id: string;
  meeting_id?: string;
  title: string;
  responsible_person_or_dept: string;
  target_date: string;
  status: string;
  evidence_url?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

// ── Policies & Compliance (Phase 14) ───────────────────────────────────────────
export interface PolicyItem {
  id: string;
  title: string;
  category: string;
  version: string;
  audience: string;
  requires_acknowledgement: boolean;
  effective_date: string;
  description: string;
  content: string;
  document_url?: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  is_acknowledged?: boolean;
  acknowledged_at?: string | null;
  total_acknowledgements?: number;
  total_eligible_users?: number;
}

export interface GrievanceItem {
  id: string;
  reference: string;
  category: string;
  subject: string;
  description: string;
  is_anonymous: boolean;
  status: string;
  reporter_id?: string;
  reporter_name?: string;
  reporter_email?: string;
  admin_response_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

// ── RAG & Pragya AI (Phase 15) ────────────────────────────────────────────────
export interface KnowledgeSourceItem {
  id: string;
  title: string;
  type: string;
  url?: string | null;
  category: string;
  department?: string | null;
  content: string;
  status: string;
  chunks_count: number;
  last_indexed_at?: string | null;
  created_at: string;
}

export interface RagJobItem {
  id: string;
  source_id: string;
  source_title: string;
  status: string;
  chunks: number;
  started_at: string;
  completed_at?: string | null;
}

// ── Transport & Sports (Phase 17) ─────────────────────────────────────────────
export interface BusStopItem {
  id: string;
  name: string;
  stop_order: number;
  morning_pickup_time: string;
  evening_drop_time: string;
  landmark?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface TransportRouteItem {
  id: string;
  route_number: string;
  name: string;
  start_point: string;
  destination: string;
  bus_registration: string;
  driver_name: string;
  driver_phone: string;
  total_stops: number;
  morning_departure: string;
  morning_arrival_sfrc: string;
  evening_departure_sfrc: string;
  evening_arrival_terminus: string;
  capacity: number;
  occupied_seats: number;
  note: string;
  stops: BusStopItem[];
}

export interface StudentBusPass {
  has_pass: boolean;
  pass_number?: string | null;
  student_name?: string | null;
  register_number?: string | null;
  route_number?: string | null;
  route_name?: string | null;
  boarding_stop?: string | null;
  seat_number?: string | null;
  morning_pickup_time?: string | null;
  evening_drop_time?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  valid_until?: string | null;
  status?: string | null;
}

export interface SportsTeamItem {
  id: string;
  name: string;
  sport: string;
  category: string;
  coach_name: string;
  coach_phone?: string | null;
  practice_schedule: string;
  venue: string;
  members_count: number;
  captain_name: string;
  is_joined: boolean;
  description: string;
}

export interface SportsEventItem {
  id: string;
  title: string;
  sport: string;
  tournament_name: string;
  event_date: string;
  time: string;
  venue: string;
  level: string;
  status: 'upcoming' | 'completed' | 'ongoing';
  opponent?: string | null;
  result?: string | null;
  score?: string | null;
  is_registered: boolean;
}

export interface SportsAchievementItem {
  id: string;
  title: string;
  student_name: string;
  register_number: string;
  sport: string;
  tournament: string;
  level: string;
  position: string;
  year: string;
  certificate_url?: string | null;
}





