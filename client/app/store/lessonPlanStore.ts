import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  databases,
  ID,
  Query,
  account,
  APPWRITE_DATABASE_ID,
  FACULTIES_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
  ROUTINE_COLLECTION_ID,
} from '~/utils/appwrite';
import {
  LessonPlan,
  TeacherInfo,
  TeacherAssignment,
  LessonPlanFiltersState,
  Faculty,
  Section,
  RoutineDescItem,
  LessonPlanFormData,
} from 'types/lesson_plan';
import { SelectOption } from '../../components/pages/common/CustomSelect'; // Adjust path

export const LESSON_PLANS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_LESSON_PLAN_COLLECTION_ID;

interface LessonPlanStoreState {
  teacherInfo: TeacherInfo | null;
  rawAssignments: TeacherAssignment[];

  facultyOptions: SelectOption[];
  classOptions: SelectOption[];
  sectionOptions: SelectOption[];
  subjectOptions: SelectOption[];
  statusOptions: SelectOption[];

  lessonPlans: LessonPlan[];
  selectedLessonPlan: LessonPlan | null;
  filters: LessonPlanFiltersState;

  isLoadingAssignments: boolean;
  isLoadingLessonPlans: boolean;
  isSubmitting: boolean;
  error: string | null;

  isDrawerOpen: boolean;
  drawerMode: 'add' | 'edit' | 'view';
  isDeleteModalOpen: boolean;
  lessonPlanToDeleteId: string | null;

  fetchTeacherInfoAndAssignments: () => Promise<void>;
  setFilter: <K extends keyof LessonPlanFiltersState>(filterName: K, value: LessonPlanFiltersState[K]) => void;
  loadLessonPlans: () => Promise<void>;
  
  openDrawer: (mode: 'add' | 'edit' | 'view', lessonPlan?: LessonPlan) => void;
  closeDrawer: () => void;
  
  openDeleteModal: (lessonPlanId: string) => void;
  closeDeleteModal: () => void;
  confirmDeleteLessonPlan: () => Promise<void>;

  submitLessonPlan: (formData: LessonPlanFormData) => Promise<boolean>;
  _updateFilterOptions: () => void; // Expose for potential manual call if needed
}

const initialFilters: LessonPlanFiltersState = {
  facultyId: null,
  className: null,
  sectionId: null,
  subject: null,
  status: null,
  searchText: '',
};

export const useLessonPlanStore = create<LessonPlanStoreState>()(
  devtools((set, get) => ({
    teacherInfo: null,
    rawAssignments: [],
    facultyOptions: [],
    classOptions: [],
    sectionOptions: [],
    subjectOptions: [],
    statusOptions: [
        { id: "Planned", name: "Planned" },
        { id: "Completed", name: "Completed" },
        { id: "Partially Completed", name: "Partially Completed" },
        { id: "Postponed", name: "Postponed" },
        { id: "Cancelled", name: "Cancelled" },
    ],
    lessonPlans: [],
    selectedLessonPlan: null,
    filters: initialFilters,
    isLoadingAssignments: false,
    isLoadingLessonPlans: false,
    isSubmitting: false,
    error: null,
    isDrawerOpen: false,
    drawerMode: 'add',
    isDeleteModalOpen: false,
    lessonPlanToDeleteId: null,

    fetchTeacherInfoAndAssignments: async () => {
      set({ isLoadingAssignments: true, error: null, rawAssignments: [], facultyOptions: [], classOptions:[], sectionOptions:[], subjectOptions:[] }); // Reset assignments
      try {
        const user = await account.get();
        const teacherInfo = { id: user.$id, email: user.email, name: user.name };
        set({ teacherInfo });

        const routineResponse = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          ROUTINE_COLLECTION_ID,
          [Query.limit(500)] // Adjust limit as needed
        );

        const assignmentsSet = new Set<string>();
        const newRawAssignments: TeacherAssignment[] = [];
        const facultyIds = new Set<string>();
        const sectionIds = new Set<string>();

        routineResponse.documents.forEach(doc => {
          const routineItemsForDoc: RoutineDescItem[] = [];
          // **** START JSON PARSING FIX ****
          if (Array.isArray(doc.desc)) {
            (doc.desc as string[]).forEach(jsonStringPeriodOrBreak => {
              try {
                // Assuming each string in doc.desc is a single JSON object
                const item = JSON.parse(jsonStringPeriodOrBreak) as RoutineDescItem;
                routineItemsForDoc.push(item);
              } catch (e) {
                console.error(`Error parsing individual period/break string in 'desc' for routine doc ${doc.$id}:`, jsonStringPeriodOrBreak, e);
              }
            });
          } else if (typeof doc.desc === 'string' && doc.desc.trim().startsWith('[')) {
            // Attempt to parse if doc.desc is a single string representing a JSON array
            try {
                const items = JSON.parse(doc.desc as string) as RoutineDescItem[];
                routineItemsForDoc.push(...items);
            } catch (e) {
                console.error(`Error parsing 'desc' as a single JSON array string for routine doc ${doc.$id}:`, doc.desc, e);
            }
          } else if (doc.desc) { // Log if it's some other unexpected format but not empty
            console.warn(`Routine doc ${doc.$id} 'desc' attribute is not an array of strings or a JSON array string as expected:`, doc.desc);
          }
          // **** END JSON PARSING FIX ****

          routineItemsForDoc.forEach(item => {
            if (item.type === 'period' && item.teacherId === teacherInfo.id) {
              const assignmentKey = `${doc.faculty}-${doc.class}-${doc.section}-${item.subject}`;
              if (!assignmentsSet.has(assignmentKey)) {
                assignmentsSet.add(assignmentKey);
                newRawAssignments.push({
                  facultyId: doc.faculty as string,
                  facultyName: '', // Will populate later
                  className: doc.class as string,
                  sectionId: doc.section as string,
                  sectionName: '', // Will populate later
                  subject: item.subject as string,
                });
                facultyIds.add(doc.faculty as string);
                sectionIds.add(doc.section as string);
              }
            }
          });
        });
        
        let facultyData: Faculty[] = [];
        if (facultyIds.size > 0) {
            const facultyDocs = await databases.listDocuments(
                APPWRITE_DATABASE_ID, 
                FACULTIES_COLLECTION_ID, 
                [Query.equal('$id', Array.from(facultyIds)), Query.limit(facultyIds.size)]
            );
            facultyData = facultyDocs.documents as Faculty[];
        }
        
        let sectionData: Section[] = [];
        if (sectionIds.size > 0) {
            const sectionDocs = await databases.listDocuments(
                APPWRITE_DATABASE_ID, 
                SECTIONS_COLLECTION_ID, 
                [Query.equal('$id', Array.from(sectionIds)), Query.limit(sectionIds.size)]
            );
            sectionData = sectionDocs.documents as Section[];
        }

        const populatedAssignments = newRawAssignments.map(assignment => ({
            ...assignment,
            facultyName: facultyData.find(f => f.$id === assignment.facultyId)?.name || assignment.facultyId,
            sectionName: sectionData.find(s => s.$id === assignment.sectionId)?.name || assignment.sectionId,
        }));

        set({ rawAssignments: populatedAssignments, isLoadingAssignments: false });
        get()._updateFilterOptions();

      } catch (err: any) {
        console.error('Error fetching teacher assignments:', err);
        set({ error: err.message || 'Failed to load assignments', isLoadingAssignments: false });
      }
    },

    _updateFilterOptions: () => {
        const { rawAssignments, filters } = get();
        
        const uniqueFaculties = Array.from(new Set(rawAssignments.map(a => a.facultyId)))
            .map(fid => ({ id: fid, name: rawAssignments.find(a => a.facultyId === fid)?.facultyName || fid }));

        let filteredByFaculty = rawAssignments;
        if (filters.facultyId) {
            filteredByFaculty = rawAssignments.filter(a => a.facultyId === filters.facultyId);
        }
        const uniqueClasses = Array.from(new Set(filteredByFaculty.map(a => a.className)))
            .map(cName => ({ id: cName, name: cName }));

        let filteredByClass = filteredByFaculty;
        if (filters.className) {
            filteredByClass = filteredByFaculty.filter(a => a.className === filters.className);
        }
        const uniqueSections = Array.from(new Set(filteredByClass.map(a => a.sectionId)))
            .map(sid => ({ id: sid, name: filteredByClass.find(a => a.sectionId === sid)?.sectionName || sid }));
        
        let filteredBySection = filteredByClass;
        if(filters.sectionId) {
            filteredBySection = filteredByClass.filter(a => a.sectionId === filters.sectionId);
        }
        const uniqueSubjects = Array.from(new Set(filteredBySection.map(a => a.subject)))
            .map(sName => ({ id: sName, name: sName }));

        set({ 
            facultyOptions: uniqueFaculties, 
            classOptions: uniqueClasses, 
            sectionOptions: uniqueSections, 
            subjectOptions: uniqueSubjects 
        });
    },

    setFilter: (filterName, value) => {
        console.log(`[setFilter] Called for ${filterName} with value:`, value);
        const oldFilters = get().filters;
        const newFilters = {
          ...oldFilters,
          [filterName]: value,
          ...(filterName === 'facultyId' && { className: null, sectionId: null, subject: null }),
          ...(filterName === 'className' && { sectionId: null, subject: null }),
          ...(filterName === 'sectionId' && { subject: null }),
        };
        set({ filters: newFilters });
  
        // ---- TEMPORARY CHANGE: Decouple subsequent actions ----
        // We will call these from the component after the filter state has settled.
        // get()._updateFilterOptions();
        // get().loadLessonPlans();
        console.log('[setFilter] Filters state updated. Options and plans will be loaded separately.');
      },
  

    loadLessonPlans: async () => {
      const { teacherInfo, filters } = get();
      if (!teacherInfo) {
        // set({ error: "Teacher info not loaded. Cannot load lesson plans."}); // Avoid setting error if it's just initial load
        console.warn("Teacher info not loaded. Skipping loadLessonPlans.");
        return;
      }
      set({ isLoadingLessonPlans: true, error: null });

      const queries: string[] = [Query.equal('teacherId', teacherInfo.id)];
      if (filters.facultyId) queries.push(Query.equal('facultyId', filters.facultyId));
      if (filters.className) queries.push(Query.equal('className', filters.className));
      if (filters.sectionId) queries.push(Query.equal('sectionId', filters.sectionId));
      if (filters.subject) queries.push(Query.equal('subject', filters.subject));
      if (filters.status) queries.push(Query.equal('status', filters.status));
      if (filters.searchText) {
        queries.push(Query.search('title', filters.searchText));
      }
      queries.push(Query.orderDesc('lessonDateAD'));

      try {
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          LESSON_PLANS_COLLECTION_ID,
          queries
        );
        set({ lessonPlans: response.documents as LessonPlan[], isLoadingLessonPlans: false });
      } catch (err: any) {
        console.error('Error loading lesson plans:', err);
        set({ error: err.message || 'Failed to load lesson plans', isLoadingLessonPlans: false });
      }
    },

    openDrawer: (mode, lessonPlan) => {
      set({
        isDrawerOpen: true,
        drawerMode: mode,
        selectedLessonPlan: mode === 'add' ? null : lessonPlan || null,
        error: null,
      });
    },
    closeDrawer: () => set({ isDrawerOpen: false, selectedLessonPlan: null }),

    openDeleteModal: (lessonPlanId) => set({ isDeleteModalOpen: true, lessonPlanToDeleteId: lessonPlanId }),
    closeDeleteModal: () => set({ isDeleteModalOpen: false, lessonPlanToDeleteId: null }),

    confirmDeleteLessonPlan: async () => {
      const { lessonPlanToDeleteId } = get();
      if (!lessonPlanToDeleteId) return;
      set({ isSubmitting: true });
      try {
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          LESSON_PLANS_COLLECTION_ID,
          lessonPlanToDeleteId
        );
        set(state => ({
          lessonPlans: state.lessonPlans.filter(lp => lp.$id !== lessonPlanToDeleteId),
          isDeleteModalOpen: false,
          lessonPlanToDeleteId: null,
          isSubmitting: false,
        }));
      } catch (err: any) {
        console.error('Error deleting lesson plan:', err);
        set({ error: err.message || 'Failed to delete', isSubmitting: false });
      }
    },

    submitLessonPlan: async (formData) => {
        const { drawerMode, selectedLessonPlan, teacherInfo } = get();
        if (!teacherInfo) {
            set({ error: "User not identified." });
            return false;
        }
        set({ isSubmitting: true, error: null });

        const parsedData: Omit<LessonPlan, keyof Models.Document | '$permissions'> = { // Assuming Models.Document is imported or use any
            teacherId: teacherInfo.id,
            facultyId: formData.facultyId,
            className: formData.className,
            sectionId: formData.sectionId,
            subject: formData.subject,
            title: formData.title,
            description: formData.description,
            lessonDateBS: formData.lessonDateBS,
            lessonDateAD: formData.lessonDateAD,
            estimatedPeriods: Number(formData.estimatedPeriods),
            learningObjectives: formData.learningObjectives.split(',').map(s => s.trim()).filter(s => s),
            topicsCovered: formData.topicsCovered.split(',').map(s => s.trim()).filter(s => s),
            teachingActivities: formData.teachingActivities.split(',').map(s => s.trim()).filter(s => s),
            resourcesNeeded: formData.resourcesNeeded.split(',').map(s => s.trim()).filter(s => s),
            assessmentMethods: formData.assessmentMethods.split(',').map(s => s.trim()).filter(s => s),
            homeworkAssignment: formData.homeworkAssignment,
            status: formData.status,
            actualPeriodsTaken: formData.actualPeriodsTaken ? Number(formData.actualPeriodsTaken) : undefined,
            completionDateAD: formData.completionDateAD || undefined,
            teacherReflection: formData.teacherReflection,
        };
        
        const permissions = [
            `read("user:${teacherInfo.id}")`, // Use string format if ID is not from 'appwrite'
            `update("user:${teacherInfo.id}")`,
            `delete("user:${teacherInfo.id}")`,
        ];

        try {
            let docToUpdateOrAdd;
            if (drawerMode === 'add') {
                docToUpdateOrAdd = await databases.createDocument(
                    APPWRITE_DATABASE_ID,
                    LESSON_PLANS_COLLECTION_ID,
                    ID.unique(),
                    parsedData,
                    permissions // Pass permissions array
                );
                set(state => ({ lessonPlans: [docToUpdateOrAdd as LessonPlan, ...state.lessonPlans] }));
            } else if (drawerMode === 'edit' && selectedLessonPlan?.$id) {
                docToUpdateOrAdd = await databases.updateDocument(
                    APPWRITE_DATABASE_ID,
                    LESSON_PLANS_COLLECTION_ID,
                    selectedLessonPlan.$id,
                    parsedData
                    // Permissions are usually not updated unless specifically needed
                );
                set(state => ({
                    lessonPlans: state.lessonPlans.map(lp => lp.$id === (docToUpdateOrAdd as LessonPlan).$id ? docToUpdateOrAdd as LessonPlan : lp),
                }));
            }
            set({ isSubmitting: false, isDrawerOpen: false, selectedLessonPlan: null });
            return true;
        } catch (err: any) {
            console.error('Error submitting lesson plan:', err);
            set({ error: err.message || 'Submission failed', isSubmitting: false });
            return false;
        }
    },

  })), { name: "lessonPlanStore" }
);