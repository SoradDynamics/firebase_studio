// /types/models.ts
//for leave amangement student, parent
import { Models } from 'appwrite';

// Base Appwrite Document type
export interface AppwriteDocument extends Models.Document {
  // Add any common custom fields if necessary, though usually not needed here
}

export interface Student extends AppwriteDocument {
  name: string;
  class: string; // Assuming this is a class ID referencing coll-class (not shown in your schema)
                 // or just a string like "Grade 10"
  facultyId?: string; // Assuming it can be optional or linked
  // section: string; // Assuming this is a section ID or name
  stdEmail?: string;
  parentId: string;
}

export interface Parent extends AppwriteDocument {
  name: string;
  email: string;
  contact?: string[];
  students?: string[]; // Array of student document IDs
}

// You can define Section and Faculty too if needed for other parts,
// but they are not directly used in this specific parent-student view component logic.
// export interface Section extends AppwriteDocument {
//   name: string;
//   subjects?: string[];
//   class: string; // class ID
//   facultyId: string; // faculty ID
// }

// export interface Faculty extends AppwriteDocument {
//   name: string;
//   classes?: string[]; // array of class IDs
// }


export type LeaveStatus = 'pending' | 'validated' | 'rejected' | 'approved' | 'cancelled';

export interface LeaveEntry {
  leaveId: string; // Unique ID for this specific leave entry
  title: string;
  reason: string;
  periodType: 'today' | 'halfDay' | 'tomorrow' | 'dateRange';
  appliedAt: string; // ISO Date string
  status: LeaveStatus;
  date?: string;      // BS Date YYYY-MM-DD (for today, halfDay, tomorrow)
  fromDate?: string;  // BS Date YYYY-MM-DD (for dateRange)
  toDate?: string;    // BS Date YYYY-MM-DD (for dateRange)
  // Optional fields for actions
  validatedAt?: string; // ISO Date string
  rejectedAt?: string;  // ISO Date string
  rejectionReason?: string; // If rejected by parent/admin
  approvedAt?: string;  // ISO Date string (by admin)
  approvedBy?: string;  // Admin ID
}

// Update Student interface if not already done
export interface Student extends Models.Document { // Assuming Document is Appwrite's base
  id?: string; // Your custom ID if you have one, $id is Appwrite's
  $id: string;
  name: string;
  class: string;
  facultyId?: string;
  section?: string;
  stdEmail?: string;
  parentId: string; // This is the Appwrite $id of the parent document
  absent?: string[]; // Assuming array of ISO date strings
  leave?: string[];  // Array of JSON strings, each string is a LeaveEntry
  // other student fields
}

// Calendar types
export interface DayData {
  day: number; // Nepali day number
  en: string;  // English date "YYYY/M/D"
  np: string;  // Nepali date "YYYY/M/D" (optional, might be redundant if day gives np day)
  tithi?: string;
  dayOfWeek: number; // 1 (Sun) to 7 (Sat)
  // Add other properties from your calendar JSON if needed
}
export interface MonthData {
  month: number; // Nepali month number
  year: number; // Nepali year (redundant if year is key in CalendarData)
  name: string; // Nepali month name
  days: DayData[];
  ad_month_start?: string; // Optional AD month start
  ad_month_end?: string;   // Optional AD month end
}
export interface CalendarData {
  [year: string]: MonthData[]; // Year as key (e.g., "2081")
}

export interface MarkedDate {
  bsDate: string;
  type: 'absent' | 'leave' | string; // Added string to allow other types
  details?: string;
}
