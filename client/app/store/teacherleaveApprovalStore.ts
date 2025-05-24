// src/store/leaveApprovalStore.ts
import { create } from 'zustand';
import {
    Leave,
    ModifiedLeave,
    StudentDocument,
    FacultyDocument,
    SectionDocument,
    TeacherDocument
} from 'types'; // Adjust path to your types

const ITEMS_PER_LOAD = 20;

interface LeaveApprovalFilters {
  facultyId: string | null; // Stores faculty $ID
  class: string | null;     // Stores class name
  section: string | null;   // Stores section $ID
  searchText: string;
}

type UserRole = 'admin' | 'teacher';

interface LeaveApprovalState {
  currentUserEmail: string | null;
  currentUserRole: UserRole;
  teacherDetails: TeacherDocument | null;
  teacherAssignedSectionIds: string[]; // $IDs of sections teacher is class_teacher for
  teacherAssignedSectionsData: SectionDocument[];

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

  faculties: FacultyDocument[]; // For UI filter dropdowns (FacultyDocument objects)
  sections: SectionDocument[];  // For UI filter dropdowns (SectionDocument objects)
  classes: string[];            // For UI filter dropdowns (class name strings)

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialData: (data: {
    students: StudentDocument[];
    allFacultiesFromDB: FacultyDocument[];
    allSectionsFromDB: SectionDocument[];
    userEmail: string | null;
    teacherDoc: TeacherDocument | null;
    assignedSectionIdsForTeacher: string[]; // Section $IDs
    assignedSectionsDataForTeacher: SectionDocument[]; // Full SectionDocument objects
  }) => void;

  initializeAllLeaveData: () => void;
  applyFiltersAndPrepareDisplay: () => void;

  loadMoreLeaves: () => void;
  updateLeaveStatus: (leaveId: string, studentId: string, newStatus: 'approved' | 'rejected', rejectionReason?: string) => void;
  getLeaveById: (leaveId: string) => Leave | ModifiedLeave | undefined;
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
  teacherAssignedSectionsData: [],

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
    assignedSectionIdsForTeacher, // $IDs of sections teacher is assigned to
    assignedSectionsDataForTeacher, // Full SectionDocument objects for these sections
  }) => {
    console.log("[Store.setInitialData] Received students count:", students.length);
    // ... (other console logs for debugging students, teacherDoc, etc.)

    const role: UserRole = teacherDoc ? 'teacher' : 'admin';
    console.log("[Store.setInitialData] Determined role:", role);
    
    let finalFacultiesForFilter: FacultyDocument[];
    let finalSectionsForFilter: SectionDocument[]; // These will be SectionDocument objects
    let finalClassesForFilter: string[];

    if (role === 'teacher') {
      // For teacher, UI dropdowns are scoped to their assigned sections
      finalSectionsForFilter = assignedSectionsDataForTeacher || [];
      const teacherClasses = [...new Set((assignedSectionsDataForTeacher || []).map(sec => sec.class).filter(Boolean))].sort();
      finalClassesForFilter = teacherClasses;

      const facultyIdsFromTeacherSections = new Set((assignedSectionsDataForTeacher || []).map(sec => sec.facultyId).filter(Boolean));
      if (facultyIdsFromTeacherSections.size > 0) {
        finalFacultiesForFilter = allFacultiesFromDB.filter(fac => facultyIdsFromTeacherSections.has(fac.$id));
      } else {
        // If teacher's sections don't have facultyId, derive from their fetched students
        const facultyIdsFromStudents = new Set(students.map(s => s.facultyId).filter(Boolean));
        finalFacultiesForFilter = allFacultiesFromDB.filter(fac => facultyIdsFromStudents.has(fac.$id));
      }
      console.log("[Store.setInitialData] Teacher Filter Setup: Faculties:", finalFacultiesForFilter.length, "Classes:", finalClassesForFilter.length, "Sections:", finalSectionsForFilter.length);
    } else { // Admin
      finalFacultiesForFilter = allFacultiesFromDB;
      finalSectionsForFilter = allSectionsFromDB;
      const allClasses = [...new Set(
          students.map(s => s.class).concat(allSectionsFromDB.map(s => s.class))
      )].filter(Boolean).sort();
      finalClassesForFilter = allClasses;
      console.log("[Store.setInitialData] Admin Filter Setup: Faculties:", finalFacultiesForFilter.length, "Classes:", finalClassesForFilter.length, "Sections:", finalSectionsForFilter.length);
    }

    set({
      allStudents: students,
      faculties: finalFacultiesForFilter,
      sections: finalSectionsForFilter, // These are SectionDocument[] used for UI dropdowns
      classes: finalClassesForFilter,
      currentUserEmail: userEmail,
      currentUserRole: role,
      teacherDetails: teacherDoc,
      teacherAssignedSectionIds: assignedSectionIdsForTeacher, // Store section $IDs
      teacherAssignedSectionsData: assignedSectionsDataForTeacher, // Store full section data
      isLoading: false,
      error: null,
      filters: { facultyId: null, class: null, section: null, searchText: '' },
      rawLeaveRequests: [], processedAndFilteredLeaves: [], displayableLeaveRequests: [],
      totalProcessedLeavesCount: 0, currentlyDisplayedCount: 0, modifiedLeaves: new Map(),
    });
    console.log("[Store.setInitialData] Calling initializeAllLeaveData.");
    get().initializeAllLeaveData();
  },

  initializeAllLeaveData: () => {
    const { allStudents, currentUserRole } = get();
    console.log(`[Store.initializeAllLeaveData] Initializing with ${allStudents.length} students for role: ${currentUserRole}.`);
    const allParsedLeaves: Leave[] = [];

    allStudents.forEach(student => {
      if (!student.leave || !Array.isArray(student.leave) || student.leave.length === 0) return;
      student.leave.forEach((leaveStr) => {
        try {
          const leaveData = JSON.parse(leaveStr);
          if (!leaveData.leaveId || !leaveData.title) {
            console.warn(`[Store.initializeAllLeaveData] Parsed leave data for student ${student.$id} is missing essential fields.`);
            return;
          }
          const enrichedLeave: Leave = {
            ...leaveData,
            studentId: student.$id,
            studentName: student.name,
            studentClass: student.class,             // Student's class name
            studentFacultyId: student.facultyId,     // Student's faculty $ID
            studentSection: student.section,         // Student's section NAME
          };
          allParsedLeaves.push(enrichedLeave);
        } catch (e) {
          console.error(`[Store.initializeAllLeaveData] Failed to parse leave string for student ${student.$id}: "${leaveStr}"`, e);
        }
      });
    });

    allParsedLeaves.sort((a, b) => {
        const dateAStr = a.periodType === 'today' ? a.date : a.fromDate;
        const dateBStr = b.periodType === 'today' ? b.date : b.fromDate;
        const dateA = dateAStr ? new Date(dateAStr).getTime() : 0;
        const dateB = dateBStr ? new Date(dateBStr).getTime() : 0;
        return dateB - dateA;
    });

    console.log(`[Store.initializeAllLeaveData] Total successfully parsed leave requests: ${allParsedLeaves.length}`);
    if (allParsedLeaves.length > 0 && allParsedLeaves.length < 3) {
        console.log("[Store.initializeAllLeaveData] Sample parsed leaves:", allParsedLeaves.map(l => ({leaveId: l.leaveId, studentName: l.studentName, studentSectionName: l.studentSection, studentFacultyId: l.studentFacultyId, studentClass: l.studentClass })));
    }
    set({ rawLeaveRequests: allParsedLeaves });
    get().applyFiltersAndPrepareDisplay();
  },

  applyFiltersAndPrepareDisplay: () => {
    const { rawLeaveRequests, filters, sections: sectionsInStoreForFilter } = get(); // `sectionsInStoreForFilter` are SectionDocument[]
    console.log(`[Store.applyFiltersAndPrepareDisplay] Applying UI filters. Raw leaves: ${rawLeaveRequests.length}. Filters:`, JSON.parse(JSON.stringify(filters)));
    let tempFiltered = [...rawLeaveRequests];

    if (filters.facultyId) { // filters.facultyId is faculty $ID
      tempFiltered = tempFiltered.filter(leave => leave.studentFacultyId === filters.facultyId); // leave.studentFacultyId is faculty $ID
    }
    if (filters.class) { // filters.class is class name
      tempFiltered = tempFiltered.filter(leave => leave.studentClass === filters.class); // leave.studentClass is class name
    }

    if (filters.section) { // filters.section is the $ID of the selected section from UI
      const selectedSectionDoc = sectionsInStoreForFilter.find(s => s.$id === filters.section);
      if (selectedSectionDoc) {
        const selectedSectionName = selectedSectionDoc.name;
        console.log(`[Store.applyFiltersAndPrepareDisplay] Filtering by section NAME: "${selectedSectionName}" (derived from selected section $ID: ${filters.section})`);
        tempFiltered = tempFiltered.filter(leave => leave.studentSection === selectedSectionName); // leave.studentSection is section NAME
      } else {
        console.warn(`[Store.applyFiltersAndPrepareDisplay] No section document found in store for $ID: ${filters.section}. Section filter ineffective.`);
        // If a section filter is applied but the section $id is not found in the store's list (should not happen if populated correctly),
        // it might mean we should show no results for this filter.
        // tempFiltered = []; 
      }
    }

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      tempFiltered = tempFiltered.filter(leave =>
        leave.title.toLowerCase().includes(searchLower) ||
        leave.reason.toLowerCase().includes(searchLower) ||
        (leave.studentName && leave.studentName.toLowerCase().includes(searchLower))
      );
    }

    console.log(`[Store.applyFiltersAndPrepareDisplay] Leaves after UI filtering: ${tempFiltered.length}. Displaying up to ${ITEMS_PER_LOAD}.`);
    set({
      processedAndFilteredLeaves: tempFiltered,
      totalProcessedLeavesCount: tempFiltered.length,
      currentlyDisplayedCount: Math.min(tempFiltered.length, ITEMS_PER_LOAD),
      displayableLeaveRequests: tempFiltered.slice(0, Math.min(tempFiltered.length, ITEMS_PER_LOAD)),
      isFetchingMore: false,
    });
  },

  setFilter: (filterName, value) => {
    set(state => {
      const newFilters = { ...state.filters, [filterName]: value };
      if (filterName === 'class') {
        if (value === null) { newFilters.section = null; }
        else {
          const currentSectionId = state.filters.section;
          if (currentSectionId) {
            const sectionData = state.sections.find(s => s.$id === currentSectionId);
            if (!sectionData || sectionData.class !== value) { newFilters.section = null; }
          }
        }
      }
      return { filters: newFilters };
    });
    get().applyFiltersAndPrepareDisplay();
  },

  loadMoreLeaves: () => {
    const { processedAndFilteredLeaves, currentlyDisplayedCount, totalProcessedLeavesCount, isFetchingMore } = get();
    if (currentlyDisplayedCount >= totalProcessedLeavesCount || isFetchingMore) return;
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
      const originalLeaveData = state.rawLeaveRequests.find(l => l.leaveId === leaveId && l.studentId === studentId);
      if (!originalLeaveData) {
          console.warn("Leave not found in raw requests for update:", leaveId, studentId);
          return state;
      }
      const newModifiedLeaves = new Map(state.modifiedLeaves);
      let modifiedLeaveEntry = newModifiedLeaves.get(leaveId);
      const approverName = state.currentUserRole === 'teacher' ? (state.teacherDetails?.name || 'Class Teacher') : 'Admin';

      if (!modifiedLeaveEntry) {
        modifiedLeaveEntry = { ...originalLeaveData, originalStatus: originalLeaveData.status, status: newStatus };
      } else {
        modifiedLeaveEntry.status = newStatus;
      }

      if (newStatus === 'rejected') {
        modifiedLeaveEntry.rejectionReason = rejectionReason || `Rejected by ${approverName}`;
        modifiedLeaveEntry.rejectedAt = new Date().toISOString();
        modifiedLeaveEntry.rejectedBy = approverName;
        delete modifiedLeaveEntry.approvedAt; delete modifiedLeaveEntry.approvedBy;
      } else if (newStatus === 'approved') {
        delete modifiedLeaveEntry.rejectionReason; delete modifiedLeaveEntry.rejectedAt; delete modifiedLeaveEntry.rejectedBy;
        modifiedLeaveEntry.approvedAt = new Date().toISOString();
        modifiedLeaveEntry.approvedBy = approverName;
      }

      if (modifiedLeaveEntry.status === modifiedLeaveEntry.originalStatus) {
         newModifiedLeaves.delete(leaveId);
      } else {
         newModifiedLeaves.set(leaveId, modifiedLeaveEntry);
      }

      const updatedDisplayableLeaves = state.displayableLeaveRequests.map(leave => {
        if (leave.leaveId === leaveId) {
          const mod = newModifiedLeaves.get(leaveId);
          // If it's been removed from modified (reverted), use original data with the current status
          return mod ? { ...mod } : { ...originalLeaveData, status: newStatus };
        }
        return leave;
      });
      return { modifiedLeaves: newModifiedLeaves, displayableLeaveRequests: updatedDisplayableLeaves };
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
    if (get().modifiedLeaves.size === 0) return;
    set({ modifiedLeaves: new Map() });
    get().applyFiltersAndPrepareDisplay();
  },
  clearModifications: () => set({ modifiedLeaves: new Map() }),
  hasPendingChanges: () => get().modifiedLeaves.size > 0,
}));

export default useLeaveApprovalStore;