// src/types/attendance.ts

export interface LeaveData {
    leaveId: string;
    title: string;
    reason: string;
    periodType: 'today' | 'half day' | 'tomorrow' | 'dateRange';
    appliedAt: string; // ISO Date string
    status: 'pending' | 'validated' | 'rejected' | 'approved';
    date?: string; // BS Date string "YYYY-MM-DD" for single day
    fromDate?: string; // BS Date string "YYYY-MM-DD" for range
    toDate?: string; // BS Date string "YYYY-MM-DD" for range
    rejectedAt?: string; // ISO Date string
    rejectionReason?: string;
  }
  
  export interface StudentData {
    $id: string;
    name: string;
    class: string;
    facultyId: string;
    section: string;
    stdEmail: string;
    parentId: string;
    absent: string[]; // Array of AD date strings, ideally "YYYY-MM-DD"
    leave: LeaveData[]; // Array of leave objects
    library: string[]; // Assuming array of strings
    // Appwrite system fields
    $collectionId?: string;
    $databaseId?: string;
    $createdAt?: string;
    $updatedAt?: string;
    $permissions?: string[];
  }
  
  export interface ProcessedLeave extends LeaveData {
    adDates: string[];       // All AD dates "YYYY-MM-DD" covered by this leave
    bsDatesDisplay: string[]; // All BS dates "YYYY-MM-DD" for display for this leave
  }
  
  // Ensure your types/calendar.ts has these or similar:
  // export interface DayData {
  //   day: string; // Nepali day number, e.g., "१", "15"
  //   en: string; // Gregorian date, e.g., "2023/4/14" (YYYY/M/D)
  //   ne: string; // Nepali date, e.g., "२०८०/१/१" (YYYY/M/D)
  //   tithi?: string;
  //   events?: string[]; // Original events from BS JSON
  //   dayOfWeek?: number; // 1 (Sunday) to 7 (Saturday)
  // }
  // export interface MonthData {
  //   month: number; // Nepali month number, e.g., 1 for Baisakh
  //   year: number; // Nepali year, e.g., 2080
  //   name: string; // Nepali month name, e.g., "बैशाख"
  //   days: DayData[];
  //   ad_month: string; // e.g. "Apr/May"
  //   ad_year: string; // e.g. "2023"
  // }
  // export interface CalendarData {
  //   [year: string]: MonthData[]; // Year as key, e.g., "2080"
  // }

  export interface Student {
    $id: string;
    name: string;
    class: string;
    facultyId: string;
    section: string;
    stdEmail: string;
    parentId: string; // Crucial link
    absent: string[]; // Array of AD date strings "YYYY-MM-DD"
    leave: string[]; // Array of JSON strings for LeaveData
    // ... other student fields
    $collectionId?: string;
    $databaseId?: string;
  }