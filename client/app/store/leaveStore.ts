import { create } from 'zustand';
import { devtools } from 'zustand/middleware'; // Optional: for Redux DevTools

export type LeavePeriod = 'today' | 'halfDay' | 'tomorrow' | 'dateRange' | '';

interface LeaveFormState {
  title: string;
  reason: string;
  leavePeriod: LeavePeriod;
  fromDateBS: string; // YYYY-MM-DD Bikram Sambat
  toDateBS: string;   // YYYY-MM-DD Bikram Sambat
  isPopoverOpen: boolean;
  isSubmitting: boolean; // Loading state for the confirm button in popover

  setTitle: (title: string) => void;
  setReason: (reason: string) => void;
  setLeavePeriod: (period: LeavePeriod) => void;
  setFromDateBS: (date: string) => void;
  setToDateBS: (date: string) => void;
  openPopover: () => void;
  closePopover: () => void;
  setSubmitting: (loading: boolean) => void;
  resetForm: () => void;
}

export const useLeaveFormStore = create<LeaveFormState>()(
  devtools( // Optional: remove devtools if not needed
    (set) => ({
      title: '',
      reason: '',
      leavePeriod: '',
      fromDateBS: '',
      toDateBS: '',
      isPopoverOpen: false,
      isSubmitting: false,

      setTitle: (title) => set({ title: title.slice(0, 20) }), // Enforce max length
      setReason: (reason) => set({ reason: reason.slice(0, 40) }), // Enforce max length
      setLeavePeriod: (period) => {
        // Reset date range fields if another period is selected
        if (period !== 'dateRange') {
          return set({ leavePeriod: period, fromDateBS: '', toDateBS: '' });
        }
        return set({ leavePeriod: period });
      },
      setFromDateBS: (date) => set({ fromDateBS: date }),
      setToDateBS: (date) => set({ toDateBS: date }),
      openPopover: () => set({ isPopoverOpen: true }),
      closePopover: () => set({ isPopoverOpen: false, isSubmitting: false }), // Also reset submitting on close
      setSubmitting: (loading) => set({ isSubmitting: loading }),
      resetForm: () => set({
        title: '',
        reason: '',
        leavePeriod: '',
        fromDateBS: '',
        toDateBS: '',
        isPopoverOpen: false,
        isSubmitting: false,
      }),
    }),
    { name: "LeaveFormStore" } // Optional: name for devtools
  )
);