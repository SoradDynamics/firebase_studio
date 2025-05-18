// types/student.ts (or extend types/calendar.ts)

export interface LeaveRecord {
  leaveId: string;
  title: string;
  reason: string;
  periodType: "dateRange" | "today" | "tomorrow" | string; // Be more specific if "today", "tomorrow" are fixed types
  appliedAt: string; // ISO Date string
  status: "approved" | "pending" | "rejected" | string;
  fromDate?: string; // BS: YYYY-MM-DD
  toDate?: string;   // BS: YYYY-MM-DD
  date?: string;     // BS: YYYY-MM-DD (for single day leaves)
  rejectedAt?: string; // ISO Date string
  // Add any other fields from your leave object structure
}

export interface StudentDocument {
  $id: string;
  name: string;
  class: string; // Assuming class is an ID or name
  facultyId: string;
  section: string; // Assuming section is an ID or name
  stdEmail?: string;
  parentId: string;
  absent: string[]; // Array of AD date strings: "YYYY-MM-DD"
  leave: string[];  // Array of JSON strings, each parsable to LeaveRecord
  // Add other fields from coll-student
}

export interface AttendanceMark {
  adDate: string; // AD Date string: "YYYY-MM-DD"
  type: 'absent' | 'leave';
  originalRecord?: any; // Optional: store the original leave/absent record for details
}