// src/stores/leaveApprovalStore.ts
import { create } from 'zustand';
import { Leave, ModifiedLeave, StudentDocument, FacultyDocument, SectionDocument, TeacherDocument } from 'types';

const ITEMS_PER_LOAD = 20;

interface LeaveApprovalFilters {
  facultyId: string | null;
  class: string | null;
  section: string | null;
  searchText: string;
}

type UserRole = 'admin' | 'teacher';

interface LeaveApprovalState {
  currentUserEmail: string | null;
  currentUserRole: UserRole;
  teacherDetails: TeacherDocument | null;
  teacherAssignedSectionIds: string[]; // $id of sections teacher is class_teacher for
  teacherAssignedSectionsData: SectionDocument[]; // Full data of these sections

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
  setInitialData: (data: {
    students: StudentDocument[];
    allFacultiesFromDB: FacultyDocument[];
    allSectionsFromDB: SectionDocument[];
    userEmail: string | null;
    teacherDoc: TeacherDocument | null;
    assignedSectionIdsForTeacher: string[]; // These are $id of sections
    assignedSectionsDataForTeacher: SectionDocument[]; // Full data of these sections
  }) => void;

  initializeAllLeaveData: () => void;
  applyFiltersAndPrepareDisplay: () => void;

  loadMoreLeaves: () => void;
  updateLeaveStatus: (leaveId: string, studentId: string, newStatus: 'approved' | 'rejected', rejectionReason?: string) => void;
  getLeaveById: (leaveId: string) => Leave | undefined;
  resetModifications: () => void;
  hasPendingChanges: () => boolean;
  clearModifications: () => void;
  setFilter: (filterName: keyof LeaveApprovalFilters, value: string | null) => void;
}

const useLeaveApprovalStore = create<LeaveApprovalState>((set, get) => ({
  currentUserEmail: null,
  currentUserRole: 'admin',
  teacherDetails: null,
  teacherAssignedSectionIds: [],
  teacherAssignedSectionsData: [], // Initialize

  allStudents: [],
  rawLeaveRequests: [],
  processedAndFilteredLeaves: [],
  displayableLeaveRequests: [],
  totalProcessedLeavesCount: 0,
  currentlyDisplayedCount: 0,
  modifiedLeaves: new Map(),
  isLoading: true,
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
  setError: (error) => set({ error, isLoading: false }),

  setInitialData: ({ 
    students, 
    allFacultiesFromDB, 
    allSectionsFromDB, 
    userEmail, 
    teacherDoc, 
    assignedSectionIdsForTeacher, // These are $id of sections
    assignedSectionsDataForTeacher, // Full data of these sections
  }) => {
    const role: UserRole = teacherDoc ? 'teacher' : 'admin';
    
    let finalFacultiesForFilter: FacultyDocument[];
    let finalSectionsForFilter: SectionDocument[]; // These will be the teacher's assigned sections if role is teacher
    let finalClassesForFilter: string[];

    if (role === 'teacher') {
      finalSectionsForFilter = assignedSectionsDataForTeacher; // Use the already filtered sections for the teacher
      const teacherClasses = [...new Set(assignedSectionsDataForTeacher.map(sec => sec.class))].filter(Boolean).sort();
      finalClassesForFilter = teacherClasses;
      
      const teacherFacultyIds = new Set(assignedSectionsDataForTeacher.map(sec => sec.facultyId));
      finalFacultiesForFilter = allFacultiesFromDB.filter(fac => teacherFacultyIds.has(fac.$id));
      if (finalFacultiesForFilter.length === 0 && assignedSectionsDataForTeacher.length > 0 && allFacultiesFromDB.length > 0) {
          // If teacher's sections don't map to any specific faculties but faculties exist,
          // maybe show all, or an empty list. Showing filtered (even if empty) is often less confusing.
          // For now, this keeps it strict: only faculties related to their sections.
      } else if (finalFacultiesForFilter.length === 0 && allFacultiesFromDB.length > 0) {
        // Fallback if no sections or sections have no facultyId, show all.
        // finalFacultiesForFilter = allFacultiesFromDB;
      }
    } else { // Admin
      finalFacultiesForFilter = allFacultiesFromDB;
      finalSectionsForFilter = allSectionsFromDB;
      const studentClasses = students.map(s => s.class);
      const sectionClasses = allSectionsFromDB.map(s => s.class);
      const allClasses = [...new Set([...studentClasses, ...sectionClasses])].filter(Boolean).sort();
      finalClassesForFilter = allClasses;
    }
    
    console.log('[Store.setInitialData] Role:', role);
    console.log('[Store.setInitialData] Students for store:', students.map(s=>s.name));
    console.log('[Store.setInitialData] Teacher assigned sections data for store/filters:', assignedSectionsDataForTeacher.map(s=>s.name));
    console.log('[Store.setInitialData] Final sections for filter dropdown:', finalSectionsForFilter.map(s=>s.name));


    set({
      allStudents: students,
      faculties: finalFacultiesForFilter,
      sections: finalSectionsForFilter, // This is now correctly scoped for teacher
      classes: finalClassesForFilter,
      currentUserEmail: userEmail,
      currentUserRole: role,
      teacherDetails: teacherDoc,
      teacherAssignedSectionIds: assignedSectionIdsForTeacher, // $ids of sections
      teacherAssignedSectionsData: assignedSectionsDataForTeacher, // Full data for display
      isLoading: false,
      error: null,
      filters: { facultyId: null, class: null, section: null, searchText: '' },
    });
    get().initializeAllLeaveData();
  },

  initializeAllLeaveData: () => {
    const { allStudents } = get(); 
    const allParsedLeaves: Leave[] = [];

    allStudents.forEach(student => {
      student.leave.forEach(leaveStr => {
        try {
          const leaveData = JSON.parse(leaveStr);
          const enrichedLeave: Leave = {
            ...leaveData,
            studentId: student.$id,
            studentName: student.name,
            studentClass: student.class,
            studentFacultyId: student.facultyId,
            studentSection: student.section, // This is student's section $id
          };
          allParsedLeaves.push(enrichedLeave);
        } catch (e) {
          console.error("[Store.initializeAllLeaveData] Failed to parse leave data:", leaveStr, e);
        }
      });
    });

    allParsedLeaves.sort((a, b) => {
        const dateA = new Date(a.periodType === 'today' ? a.date || 0 : a.fromDate || 0).getTime();
        const dateB = new Date(b.periodType === 'today' ? b.date || 0 : b.fromDate || 0).getTime();
        return dateB - dateA;
    });
    
    console.log('[Store.initializeAllLeaveData] All parsed leaves:', allParsedLeaves.length, allParsedLeaves.slice(0,5));
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
    if (filters.section) { // filters.section is a section $id from the dropdown
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
    
    console.log('[Store.applyFiltersAndPrepareDisplay] Filtered leaves count:', tempFiltered.length);
    set({
      processedAndFilteredLeaves: tempFiltered,
      totalProcessedLeavesCount: tempFiltered.length,
      currentlyDisplayedCount: Math.min(tempFiltered.length, ITEMS_PER_LOAD),
      displayableLeaveRequests: tempFiltered.slice(0, Math.min(tempFiltered.length, ITEMS_PER_LOAD)),
    });
  },

  setFilter: (filterName, value) => {
    set(state => {
      const newFilters = {
        ...state.filters,
        [filterName]: value,
      };

      if (filterName === 'class') {
        if (value === null) {
          newFilters.section = null;
        } else {
          const currentSectionId = state.filters.section;
          if (currentSectionId) {
            const sectionData = state.sections.find(s => s.$id === currentSectionId); // state.sections is already scoped
            if (!sectionData || sectionData.class !== value) {
              newFilters.section = null;
            }
          }
        }
      }
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
    
      set(state => ({
        displayableLeaveRequests: state.processedAndFilteredLeaves.slice(0, newCount),
        currentlyDisplayedCount: newCount,
        isFetchingMore: false,
      }));
  },

  updateLeaveStatus: (leaveId, studentId, newStatus, rejectionReason) => {
    set(state => {
      const leaveToUpdate = state.rawLeaveRequests.find(l => l.leaveId === leaveId && l.studentId === studentId);
      if (!leaveToUpdate) {
          console.warn("[Store.updateLeaveStatus] Leave not found in raw requests for update:", leaveId, studentId);
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
        const rejecter = state.currentUserRole === 'teacher' ? (state.teacherDetails?.name || 'Class Teacher') : 'Admin';
        modifiedLeaveEntry.rejectionReason = rejectionReason || `Rejected by ${rejecter}`;
        modifiedLeaveEntry.rejectedAt = new Date().toISOString();
      } else if (newStatus === 'approved') {
        delete modifiedLeaveEntry.rejectionReason;
        delete modifiedLeaveEntry.rejectedAt;
      }
      newModifiedLeaves.set(leaveId, modifiedLeaveEntry);

      const updatedDisplayableLeaves = state.displayableLeaveRequests.map(leave =>
        leave.leaveId === leaveId ? { ...leave, ...modifiedLeaveEntry } : leave
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