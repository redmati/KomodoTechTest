// ─── Domain entities ─────────────────────────────────────────────────────────

export interface Tenant {
  id: number;
  name: string;
  tenantCode: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: number;
  tenantId: number;
  email: string;
  fullName: string;
  role: 'counsellor' | 'admin';
  isActive: boolean;
  createdAt: string;
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export type ReferralStatus = 'PENDING' | 'ASSIGNED' | 'CLOSED' | 'DELETED';
export type ReferrerRole = 'student' | 'parent' | 'teacher' | 'other';

export interface Referral {
  id: number;
  tenantId: number;
  studentName: string;
  schoolYear: string;
  referrerName: string;
  referrerRole: ReferrerRole;
  reason: string;
  studentConsent: boolean;
  status: ReferralStatus;
  assignedTo?: number;
  assignedToUser?: User;
  deletedBy?: number;
  deletedByUser?: User;
  deletedReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Case Profiles ───────────────────────────────────────────────────────────

export type CaseProfileStatus = 'ACTIVE' | 'CLOSED';
export type SourceType = 'MANUAL' | 'REFERRAL';
export type AccessLevel = 'VIEW_ONLY' | 'OWNER';

export interface CaseProfileAccess {
  id: number;
  profileId: number;
  userId: number;
  user?: User;
  accessLevel: AccessLevel;
  grantedBy: number;
  grantedByUser?: User;
  createdAt: string;
}

export interface CaseProfile {
  id: number;
  tenantId: number;
  studentName: string;
  schoolYear: string;
  sourceType: SourceType;
  sourceReferralId?: number;
  sourceReferral?: Referral;
  ownerId: number;
  owner?: User;
  status: CaseProfileStatus;
  createdAt: string;
  updatedAt: string;
  appointments?: Appointment[];
  caseNotes?: CaseNote[];
  access?: CaseProfileAccess[];
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Appointment {
  id: number;
  tenantId: number;
  profileId: number;
  profile?: Pick<CaseProfile, 'id' | 'studentName' | 'schoolYear'>;
  counsellorId: number;
  counsellor?: User;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Case Notes ───────────────────────────────────────────────────────────────

export interface CaseNote {
  id: number;
  tenantId: number;
  profileId: number;
  profile?: Pick<CaseProfile, 'id' | 'studentName'>;
  appointmentId?: number;
  appointment?: Pick<Appointment, 'id' | 'scheduledAt'>;
  authorId: number;
  author?: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── Form data shapes (used with react-hook-form) ────────────────────────────

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ReferralFormData {
  studentName: string;
  schoolYear: string;
  referrerName: string;
  referrerRole: ReferrerRole | '';
  reason: string;
  studentConsent: boolean;
}

export interface CreateCaseProfileFormData {
  studentName: string;
  schoolYear: string;
  sourceType: SourceType;
  sourceReferralId?: number;
}

export interface ScheduleAppointmentFormData {
  profileId: number;
  scheduledAt: string;
  durationMinutes: number;
}

export interface CreateCaseNoteFormData {
  profileId: number;
  appointmentId?: number;
  content: string;
}

export interface GrantAccessFormData {
  userId: number;
  accessLevel: AccessLevel;
}

export interface DeleteReferralFormData {
  reason: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
