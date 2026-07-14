export type Role = "member" | "executive" | "admin";
export type MemberStatus = "active" | "blocked";
export type ExecutivePositionType = "chairman" | "vice_chairman" | "secretary" | "vice_secretary" | "treasurer";
export type ScholarshipResult = "passed" | "failed" | "not_applicable";
export type AuditAction =
  | "member_blocked"
  | "member_unblocked"
  | "member_deleted"
  | "member_restored"
  | "delegation_granted"
  | "delegation_revoked";

export interface Child {
  id: string;
  memberId: string;
  name: string;
  dateOfBirth: string | null;
}

export interface MemberProfile {
  id: string;
  memberId: string;
  fullName: string;
  nameWithInitials: string;
  dateOfBirth: string | null;
  nicNumber: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  gramaNiladhariDivision: string | null;
  divisionalSecretariat: string | null;
  district: string | null;
  schoolPeriodFrom: number | null;
  schoolPeriodTo: number | null;
  academicAchievements: string | null;
  coCurricularAchievements: string | null;
  scholarshipExamResult: ScholarshipResult;
  leadershipRoles: string | null;
  extracurricularGroups: string | null;
  olResults: unknown;
  alResults: unknown;
  higherEducationQualifications: string | null;
  profilePhotoUrl: string | null;
}

export interface Member {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  executivePosition: ExecutivePositionType | null;
  status: MemberStatus;
  deletedAt: string | null;
  createdAt: string;
  profile?: MemberProfile | null;
  children?: Child[];
  /** Only populated on the /profile/me response. */
  activeDelegation?: { id: string; grantedAt: string; grantedBy: string } | null;
}

export interface PrivilegeDelegation {
  id: string;
  memberId: string;
  member: Member;
  grantedBy: string;
  granter: Member;
  grantedAt: string;
  revokedAt: string | null;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actor: Member;
  targetId: string;
  target: Member;
  action: AuditAction;
  reason: string | null;
  createdAt: string;
}

export interface FeePayment {
  id: string;
  memberId: string;
  amount: string;
  year: number;
  paidDate: string;
  recordedBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface Donation {
  id: string;
  memberId: string;
  description: string;
  amount: string | null;
  donatedDate: string;
  recordedBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface LabourContribution {
  id: string;
  memberId: string;
  description: string;
  date: string;
  hours: string | null;
  recordedBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  location: string | null;
  _count?: { attendances: number };
}

export interface MeetingAttendance {
  id: string;
  meetingId: string;
  memberId: string;
  scannedAt: string;
  scannedBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  meeting?: Meeting;
}

export interface MessageRecipientEntry {
  id: string;
  messageId: string;
  memberId: string;
  readAt: string | null;
  message: {
    id: string;
    subject: string;
    body: string;
    sentAt: string;
    recipientType: "individual" | "group" | "broadcast";
    sender: Member;
  };
}

export interface ExecutivePositionRecord {
  id: string;
  position: ExecutivePositionType;
  currentHolderId: string | null;
  currentHolder: Member | null;
  startDate: string | null;
}

export interface ExecutiveHistoryEntry {
  id: string;
  position: ExecutivePositionType;
  actorId: string;
  actor: Member;
  targetId: string;
  target: Member;
  action: "appointed" | "removed";
  reason: string | null;
  createdAt: string;
}

export interface ReportSummary {
  totalMembers: number;
  feeCollectionByYear: { year: number; total: string }[];
  donations: { total: string; count: number };
  labourContributions: { totalHours: string; count: number };
  meetingAttendance: {
    meetingId: string;
    title: string;
    meetingDate: string;
    attendeeCount: number;
    attendancePercentage: number;
  }[];
  overallAttendanceRecords: number;
}
