// src/utils/helpers.ts
export const formatDate = (dateString?: string | null, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateString) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    };
    try {
      return new Date(dateString).toLocaleDateString(undefined, defaultOptions);
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  export const getTomorrowDateString = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  
  export const getTodayDateString = (): string => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  export const calculateDaysOverdue = (dueDateString: string): number => {
      const due = new Date(dueDateString);
      const today = new Date();
      today.setHours(0,0,0,0); // Compare dates only
      due.setHours(0,0,0,0);
  
      if (due < today) {
          const diffTime = Math.abs(today.getTime() - due.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays;
      }
      return 0;
  };