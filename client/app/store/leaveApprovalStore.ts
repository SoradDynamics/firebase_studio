// src/stores/leaveApprovalStore.ts
import { create } from 'zustand';
import { Leave, ModifiedLeave, StudentDocument, FacultyDocument, SectionDocument } from 'types';

const ITEMS_PER_LOAD = 20;

interface LeaveApprovalFilters {
  facultyId: string | null;
  class: string | null;
  section: string | null;
  searchText: string;
}

interface LeaveApprovalState {
  allStudents: StudentDocument[];
  rawLeaveRequests: Leave[];
  processedAndFilteredLeaves: Leave[];
  
  displayableLeaveRequests: Leave[];
  totalProcessedLeavesCount: number;
  currentlyDisplayedCount: number;

  modifiedLeaves: Map<string, ModifiedLeave>;
  isLoading: boolean;
  isFetchingMore: boolean;
  error: string | null;
  filters: LeaveApprovalFilters;
  faculties: FacultyDocument[];
  sections: SectionDocument[];
  classes: string[];

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAllStudents: (students: StudentDocument[]) => void;
  setFaculties: (faculties: FacultyDocument[]) => void;
  setSections: (sections: SectionDocument[]) => void;
  setClasses: (classes: string[]) => void;

  initializeAllLeaveData: () => void;
  applyFiltersAndPrepareDisplay: () => void;

  loadMoreLeaves: () => void;

  updateLeaveStatus: (leaveId: string, studentId: string, newStatus: 'approved' | 'rejected', rejectionReason?: string) => void;
  getLeaveById: (leaveId: string) => Leave | undefined;
  resetModifications: () => void;
  hasPendingChanges: () => boolean;
  clearModifications: () => void;
  setFilter: (filterName: keyof LeaveApprovalFilters, value: string | null) => void; // Typed filterName and value
}

const useLeaveApprovalStore = create<LeaveApprovalState>((set, get) => ({
  allStudents: [],
  rawLeaveRequests: [],
  processedAndFilteredLeaves: [],
  displayableLeaveRequests: [],
  totalProcessedLeavesCount: 0,
  currentlyDisplayedCount: 0,
  modifiedLeaves: new Map(),
  isLoading: false,
  isFetchingMore: false,
  error: null,
  filters: {
    facultyId: null,
    class: null,
    section: null,
    searchText: '',
  },
  faculties: [],
  sections: [],
  classes: [],

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setAllStudents: (students) => set({ allStudents: students }),
  setFaculties: (faculties) => set({ faculties }),
  setSections: (sections) => set({ sections }),
  setClasses: (classesList) => set({ classes: [...new Set(classesList)].sort() }),

  initializeAllLeaveData: () => {
    const students = get().allStudents;
    const allParsedLeaves: Leave[] = [];

    students.forEach(student => {
      student.leave.forEach(leaveStr => {
        try {
          const leaveData = JSON.parse(leaveStr);
          const enrichedLeave: Leave = {
            ...leaveData,
            studentId: student.$id,
            studentName: student.name,
            studentClass: student.class,
            studentFacultyId: student.facultyId,
            studentSection: student.section, // This is the section ID
          };
          allParsedLeaves.push(enrichedLeave);
        } catch (e) {
          console.error("Failed to parse leave data:", leaveStr, e);
        }
      });
    });

    allParsedLeaves.sort((a, b) => {
        const dateA = new Date(a.periodType === 'today' ? a.date || 0 : a.fromDate || 0).getTime();
        const dateB = new Date(b.periodType === 'today' ? b.date || 0 : b.fromDate || 0).getTime();
        return dateB - dateA;
    });
    
    set({ rawLeaveRequests: allParsedLeaves });
    get().applyFiltersAndPrepareDisplay();
  },

  applyFiltersAndPrepareDisplay: () => {
    const { rawLeaveRequests, filters } = get();
    let tempFiltered = [...rawLeaveRequests];

    if (filters.facultyId) {
      tempFiltered = tempFiltered.filter(leave => leave.studentFacultyId === filters.facultyId);
    }
    if (filters.class) {
      tempFiltered = tempFiltered.filter(leave => leave.studentClass === filters.class);
    }
    if (filters.section) { // filters.section is an ID
      tempFiltered = tempFiltered.filter(leave => leave.studentSection === filters.section);
    }
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      tempFiltered = tempFiltered.filter(leave =>
        leave.title.toLowerCase().includes(searchLower) ||
        leave.reason.toLowerCase().includes(searchLower) ||
        leave.studentName.toLowerCase().includes(searchLower)
      );
    }

    set({
      processedAndFilteredLeaves: tempFiltered,
      totalProcessedLeavesCount: tempFiltered.length,
      currentlyDisplayedCount: Math.min(tempFiltered.length, ITEMS_PER_LOAD),
      displayableLeaveRequests: tempFiltered.slice(0, Math.min(tempFiltered.length, ITEMS_PER_LOAD)),
    });
  },

  setFilter: (filterName, value) => { // filterName is now correctly typed
    set(state => {
      const newFilters = {
        ...state.filters,
        [filterName]: value,
      };

      // If class filter changes, adjust section filter accordingly
      if (filterName === 'class') {
        if (value === null) { // Class filter cleared
          newFilters.section = null; // Clear section filter
        } else { // Class filter set or changed
          const currentSectionId = state.filters.section;
          if (currentSectionId) {
            const sectionData = state.sections.find(s => s.$id === currentSectionId);
            // If current section doesn't belong to the new class, clear section filter
            if (!sectionData || sectionData.class !== value) {
              newFilters.section = null;
            }
          }
        }
      }
      // If faculty filter is cleared, it doesn't automatically clear class/section
      // as per current data model (students have class/faculty independently assigned).
      // If faculty filter is set, existing class/section filters remain.
      return { filters: newFilters };
    });
    get().applyFiltersAndPrepareDisplay();
  },
  
  loadMoreLeaves: () => {
    const { processedAndFilteredLeaves, currentlyDisplayedCount, totalProcessedLeavesCount, isFetchingMore } = get();
    if (currentlyDisplayedCount >= totalProcessedLeavesCount || isFetchingMore) {
      return;
    }
    set({ isFetchingMore: true });
    const newCount = Math.min(currentlyDisplayedCount + ITEMS_PER_LOAD, totalProcessedLeavesCount);
    
    // Simulate network delay if needed, but for client-side slice, can be quick
    // For a better UX with very large local lists, a slight delay or requestAnimationFrame can prevent jank.
    // setTimeout(() => { 
      set(state => ({
        displayableLeaveRequests: state.processedAndFilteredLeaves.slice(0, newCount),
        currentlyDisplayedCount: newCount,
        isFetchingMore: false,
      }));
    // }, 50); // Minimal delay
  },

  updateLeaveStatus: (leaveId, studentId, newStatus, rejectionReason) => {
    set(state => {
      const leaveToUpdate = state.rawLeaveRequests.find(l => l.leaveId === leaveId && l.studentId === studentId);
      if (!leaveToUpdate) {
          console.warn("Leave not found in raw requests for update:", leaveId);
          return state;
      }

      const newModifiedLeaves = new Map(state.modifiedLeaves);
      let modifiedLeaveEntry = newModifiedLeaves.get(leaveId);

      if (!modifiedLeaveEntry) {
        modifiedLeaveEntry = {
          ...leaveToUpdate,
          originalStatus: leaveToUpdate.status,
          status: newStatus,
        };
      } else {
        modifiedLeaveEntry.status = newStatus;
      }

      if (newStatus === 'rejected') {
        modifiedLeaveEntry.rejectionReason = rejectionReason || 'Rejected by admin';
        modifiedLeaveEntry.rejectedAt = new Date().toISOString();
      } else if (newStatus === 'approved') {
        delete modifiedLeaveEntry.rejectionReason;
        delete modifiedLeaveEntry.rejectedAt;
      }
      newModifiedLeaves.set(leaveId, modifiedLeaveEntry);

      const updatedDisplayableLeaves = state.displayableLeaveRequests.map(leave =>
        leave.leaveId === leaveId ? { ...leave, ...modifiedLeaveEntry } : leave // Spread all modified fields
      );

      return { 
        modifiedLeaves: newModifiedLeaves,
        displayableLeaveRequests: updatedDisplayableLeaves,
      };
    });
  },
  
  getLeaveById: (leaveId: string) => {
    const modified = get().modifiedLeaves.get(leaveId);
    if (modified) return modified;
    let leave = get().displayableLeaveRequests.find(l => l.leaveId === leaveId);
    if (leave) return leave;
    return get().rawLeaveRequests.find(l => l.leaveId === leaveId);
  },

  resetModifications: () => {
    const { modifiedLeaves } = get();
    if (modifiedLeaves.size === 0) return;
    set({ modifiedLeaves: new Map() });
    get().applyFiltersAndPrepareDisplay(); 
  },
  
  clearModifications: () => {
    set({ modifiedLeaves: new Map() });
  },

  hasPendingChanges: () => get().modifiedLeaves.size > 0,
}));

export default useLeaveApprovalStore;