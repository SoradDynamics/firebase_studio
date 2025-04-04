// types/calendar.ts

export interface DayData {
  tithi: string;
  event?: string;
  day: string;
  dayInEn?: string;
  en: string;
  dayOfWeek: number; // Your convention: 1=Sun, 2=Mon, ..., 7=Sat
  isHoliday?: boolean;
  color?: string;
}

export interface MonthData {
  month: number; // 1-12
  days: DayData[];
}

export interface CalendarData {
  [bsYear: string]: MonthData[];
}

// Props for the Table component (which will now include navigation)
export interface TableContainerProps {
  currentMonthData: MonthData | undefined;
  bsMonthName: string;
  bsYear: string;
  gregorianInfo: string;
  availableYears: string[];
  currentBsYear: string;
  currentBsMonth: number;
  onYearChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onMonthChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  calendarData: CalendarData | null; // Needed for month dropdown logic
}

// Props for the Events component
export interface EventsProps {
  days: DayData[];
  bsMonthName: string;
}
export interface EventData {
  $id?: string; // Appwrite document ID (optional)
  name: string;
  dates: string[]; // Array of dates in YYYY/MM/DD format
  holiday: boolean;
id?: string;
}