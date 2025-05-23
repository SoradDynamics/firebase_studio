// src/stores/routineStore.ts
import { create } from 'zustand';
import {
  databases,
  APPWRITE_DATABASE_ID,
  FACULTIES_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
  TEACHERS_COLLECTION_ID,
  ROUTINE_COLLECTION_ID,
  Query,
  iD,
} from '~/utils/appwrite';
import {
  RoutineDocument,
  DisplayRoutine,
  FacultyDoc,
  SectionDoc,
  TeacherDoc,
  SelectOption,
  RoutineFormData,
  RoutineDescItem,
  PeriodItem, 
  BreakItem,  
} from 'types/routine'; 
import { nanoid } from 'nanoid';
import { Models } from 'appwrite';

interface RoutineState {
  // Data
  faculties: FacultyDoc[];
  sections: SectionDoc[];
  teachers: TeacherDoc[];
  routines: RoutineDocument[]; 

  // Select options
  facultyOptions: SelectOption[];
  classOptionsFilter: SelectOption[];
  classOptionsForm: SelectOption[]; 
  sectionOptionsForm: SelectOption[];
  subjectOptionsForm: SelectOption[];
  teacherOptions: SelectOption[];

  // UI State
  filteredRoutines: DisplayRoutine[];
  isLoading: boolean;
  isFormLoading: boolean;
  isDrawerOpen: boolean;
  drawerMode: 'add' | 'edit';
  currentRoutineForEdit: RoutineDocument | null;
  routineFormData: RoutineFormData;

  // Filters
  selectedFacultyFilter: string | null;
  selectedClassFilter: string | null;
  searchTerm: string;

  // Delete confirmation
  isDeleteDialogOpen: boolean;
  routineToDelete: DisplayRoutine | null;
  isDeleting: boolean;

  // Actions
  fetchInitialData: () => Promise<void>;
  fetchFaculties: () => Promise<void>;
  fetchSections: () => Promise<void>;
  fetchTeachers: () => Promise<void>;
  fetchRoutines: () => Promise<void>;

  setFacultyFilter: (facultyId: string | null) => void;
  setClassFilter: (className: string | null) => void;
  setSearchTerm: (term: string) => void;
  applyFiltersAndSearch: () => void;

  openDrawer: (mode: 'add' | 'edit', routine?: RoutineDocument) => void;
  closeDrawer: () => void;
  updateFormField: <K extends keyof RoutineFormData>(field: K, value: RoutineFormData[K]) => void;
  addDescItem: (type: 'period' | 'break') => void;
  updateDescItem: (index: number, item: RoutineDescItem) => void;
  removeDescItem: (index: number) => void;
  moveDescItem: (index: number, direction: 'up' | 'down') => void;
  
  loadSubjectsForForm: (sectionId: string | null) => void;
  loadClassesForForm: (facultyId: string | null) => void;
  loadSectionsForForm: (facultyId: string | null, className: string | null) => Promise<void>;

  saveRoutine: () => Promise<void>;

  openDeleteDialog: (routine: DisplayRoutine) => void;
  closeDeleteDialog: () => void;
  confirmDeleteRoutine: () => Promise<void>;

  _enrichRoutines: (routines: RoutineDocument[]) => DisplayRoutine[];
}

const initialFormData: RoutineFormData = {
  facultyId: null,
  classId: null,
  sectionId: null,
  desc: [],
};

// Type for items stored in Appwrite's 'desc' array (objects without client-id)
type AppwriteDescStorableItem = Omit<PeriodItem, 'id'> | Omit<BreakItem, 'id'>;


export const useRoutineStore = create<RoutineState>((set, get) => ({
  faculties: [],
  sections: [],
  teachers: [],
  routines: [],
  facultyOptions: [],
  classOptionsFilter: [],
  classOptionsForm: [],
  sectionOptionsForm: [],
  subjectOptionsForm: [],
  teacherOptions: [],
  filteredRoutines: [],
  isLoading: false,
  isFormLoading: false,
  isDrawerOpen: false,
  drawerMode: 'add',
  currentRoutineForEdit: null,
  routineFormData: initialFormData,
  selectedFacultyFilter: null,
  selectedClassFilter: null,
  searchTerm: '',
  isDeleteDialogOpen: false,
  routineToDelete: null,
  isDeleting: false,

  fetchInitialData: async () => {
    set({ isLoading: true });
    await get().fetchFaculties();
    await get().fetchSections();
    await get().fetchTeachers();
    await get().fetchRoutines();
    set({ isLoading: false });
  },

  fetchFaculties: async () => {
    try {
      const response = await databases.listDocuments(APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, [Query.limit(100)]);
      const facultiesData = response.documents as FacultyDoc[];
      set({
        faculties: facultiesData,
        facultyOptions: facultiesData.map(f => ({ id: f.$id, name: f.name })),
      });
      const allClasses = new Set<string>();
      facultiesData.forEach(f => f.classes.forEach(c => allClasses.add(c)));
      set({ classOptionsFilter: Array.from(allClasses).map(c => ({ id: c, name: c })) });
    } catch (error) {
      console.error("Error fetching faculties:", error);
    }
  },

  fetchSections: async () => {
    try {
      const response = await databases.listDocuments(APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID, [Query.limit(500)]);
      set({ sections: response.documents as SectionDoc[] });
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  },
  
  fetchTeachers: async () => {
    try {
      const response = await databases.listDocuments(APPWRITE_DATABASE_ID, TEACHERS_COLLECTION_ID, [Query.limit(100)]);
      const teachersData = response.documents as TeacherDoc[];
      set({
        teachers: teachersData,
        teacherOptions: teachersData.map(t => ({ id: t.$id, name: t.name })),
      });
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  },

  fetchRoutines: async () => {
    set({ isLoading: true });
    try {
      const queries: string[] = [Query.orderDesc('$createdAt')];
      const response = await databases.listDocuments(APPWRITE_DATABASE_ID, ROUTINE_COLLECTION_ID, queries);
      
      const parsedRoutines = response.documents.map(doc => {
        // The 'desc' from Appwrite will be an array of JSON strings
        const descStrings = (doc as any).desc as string[] || [];
        let parsedDescItems: RoutineDescItem[] = [];

        try {
          parsedDescItems = descStrings.map((itemStr: string) => {
            const parsedItem = JSON.parse(itemStr) as AppwriteDescStorableItem;
            return {
              ...parsedItem,
              id: nanoid(), // Add client-side ID for React list keys
            };
          });
        } catch (e) {
          console.error("Failed to parse 'desc' item string for routine:", doc.$id, "Raw desc array from DB:", descStrings, e);
          // Fallback to empty array or handle error as appropriate for the specific item
        }
        
        return {
          ...(doc as Models.Document), // Spread the base document properties
          faculty: (doc as any).faculty,
          class: (doc as any).class,
          section: (doc as any).section,
          desc: parsedDescItems, // Now 'desc' is an array of objects with client IDs
        } as RoutineDocument;
      });

      set({ routines: parsedRoutines });
      get().applyFiltersAndSearch();
    } catch (error) {
      console.error("Error fetching routines:", error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  _enrichRoutines: (routinesToEnrich: RoutineDocument[]): DisplayRoutine[] => {
    const { faculties, sections, teachers } = get();
    return routinesToEnrich.map(r => {
      const faculty = faculties.find(f => f.$id === r.faculty);
      const section = sections.find(s => s.$id === r.section);
      return {
        ...r,
        facultyName: faculty?.name || 'N/A',
        sectionName: section?.name || 'N/A',
        descDisplay: r.desc.map(item => {
          if (item.type === 'period') {
            const teacher = teachers.find(t => t.$id === item.teacherId);
            return { ...item, teacherName: teacher?.name || 'N/A' };
          }
          return item; 
        }),
      };
    });
  },

  applyFiltersAndSearch: () => {
    const { routines, selectedFacultyFilter, selectedClassFilter, searchTerm } = get();
    let RDisplayable = get()._enrichRoutines(routines);

    if (selectedFacultyFilter) {
        RDisplayable = RDisplayable.filter(r => r.faculty === selectedFacultyFilter);
    }
    if (selectedClassFilter) {
        RDisplayable = RDisplayable.filter(r => r.class === selectedClassFilter);
    }
    if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        RDisplayable = RDisplayable.filter(r =>
            r.facultyName?.toLowerCase().includes(lowerSearchTerm) ||
            r.sectionName?.toLowerCase().includes(lowerSearchTerm) ||
            r.class.toLowerCase().includes(lowerSearchTerm) ||
            r.descDisplay?.some(d => 
                (d.type === 'period' && (d.subject.toLowerCase().includes(lowerSearchTerm) || d.teacherName?.toLowerCase().includes(lowerSearchTerm))) ||
                (d.type === 'break' && d.name.toLowerCase().includes(lowerSearchTerm))
            )
        );
    }
    set({ filteredRoutines: RDisplayable });
  },

  setFacultyFilter: (facultyId) => {
    set({ selectedFacultyFilter: facultyId });
    const { faculties } = get();
    if (facultyId) {
        const selectedFaculty = faculties.find(f => f.$id === facultyId);
        if (selectedFaculty) {
            set({ classOptionsFilter: selectedFaculty.classes.map(c => ({ id: c, name: c })), selectedClassFilter: null });
        }
    } else { 
        const allClasses = new Set<string>();
        faculties.forEach(f => f.classes.forEach(c => allClasses.add(c)));
        set({ classOptionsFilter: Array.from(allClasses).map(c => ({ id: c, name: c })), selectedClassFilter: null });
    }
    get().applyFiltersAndSearch();
  },
  setClassFilter: (className) => {
    set({ selectedClassFilter: className });
    get().applyFiltersAndSearch();
  },
  setSearchTerm: (term) => {
    set({ searchTerm: term });
    get().applyFiltersAndSearch();
  },

  openDrawer: (mode, routineToEdit) => { 
    set({ drawerMode: mode, isDrawerOpen: true, currentRoutineForEdit: routineToEdit || null, subjectOptionsForm: [] });
    if (mode === 'add') {
      set({ routineFormData: { ...initialFormData, desc: [] } });
      get().loadClassesForForm(null);
      get().loadSectionsForForm(null, null);
    } else if (mode === 'edit' && routineToEdit) {
      set({ 
        routineFormData: {
          facultyId: routineToEdit.faculty,
          classId: routineToEdit.class,
          sectionId: routineToEdit.section,
          desc: JSON.parse(JSON.stringify(routineToEdit.desc)), 
        }
      });
      get().loadClassesForForm(routineToEdit.faculty);
      get().loadSectionsForForm(routineToEdit.faculty, routineToEdit.class);
      get().loadSubjectsForForm(routineToEdit.section);
    }
  },
  closeDrawer: () => set({ isDrawerOpen: false, currentRoutineForEdit: null, routineFormData: initialFormData }),

  updateFormField: (field, value) => {
    set(state => ({ routineFormData: { ...state.routineFormData, [field]: value } }));
    if (field === 'facultyId') {
      get().loadClassesForForm(value as string | null);
      set(state => ({ routineFormData: { ...state.routineFormData, classId: null, sectionId: null, desc: [] }, subjectOptionsForm: []}));
      get().loadSectionsForForm(value as string | null, null);
    }
    if (field === 'classId') {
      get().loadSectionsForForm(get().routineFormData.facultyId, value as string | null);
      set(state => ({ routineFormData: { ...state.routineFormData, sectionId: null, desc: [] }, subjectOptionsForm: []}));
    }
    if (field === 'sectionId') {
      get().loadSubjectsForForm(value as string | null);
    }
  },

  loadClassesForForm: (facultyId) => {
    if (!facultyId) {
      set({ classOptionsForm: [] });
      return;
    }
    const faculty = get().faculties.find(f => f.$id === facultyId);
    set({ classOptionsForm: faculty ? faculty.classes.map(c => ({ id: c, name: c })) : [] });
  },

  loadSectionsForForm: async (facultyId, className) => {
    if (!facultyId || !className) {
      set({ sectionOptionsForm: [] });
      return;
    }
    const allDbSections = get().sections;
    const existingRoutineSectionIds = get().drawerMode === 'add' ? 
        new Set(get().routines.map(r => r.section)) : new Set<string>();

    const filteredSections = allDbSections
      .filter(s => s.facultyId === facultyId && s.class === className)
      .filter(s => {
        if (get().drawerMode === 'edit') {
          return s.$id === get().currentRoutineForEdit?.section || !existingRoutineSectionIds.has(s.$id);
        }
        return !existingRoutineSectionIds.has(s.$id); 
      })
      .map(s => ({ id: s.$id, name: s.name }));
    
    set({ sectionOptionsForm: filteredSections });
  },

  loadSubjectsForForm: (sectionId) => {
    if (!sectionId) {
      set({ subjectOptionsForm: [] });
      return;
    }
    const section = get().sections.find(s => s.$id === sectionId);
    set({ subjectOptionsForm: section ? section.subjects.map(sub => ({ id: sub, name: sub })) : [] });
  },
  
  addDescItem: (type) => {
    const newItem: RoutineDescItem = type === 'period'
      ? { id: nanoid(), type: 'period', fromTime: '', toTime: '', subject: '', teacherId: '' }
      : { id: nanoid(), type: 'break', fromTime: '', toTime: '', name: '' };
    set(state => ({
      routineFormData: {
        ...state.routineFormData,
        desc: [...state.routineFormData.desc, newItem],
      },
    }));
  },
  updateDescItem: (index, item) => {
    set(state => {
      const newDesc = [...state.routineFormData.desc];
      newDesc[index] = item;
      return { routineFormData: { ...state.routineFormData, desc: newDesc } };
    });
  },
  removeDescItem: (index) => {
    set(state => ({
      routineFormData: {
        ...state.routineFormData,
        desc: state.routineFormData.desc.filter((_, i) => i !== index),
      },
    }));
  },
  moveDescItem: (index, direction) => {
    set(state => {
        const newDesc = [...state.routineFormData.desc];
        const item = newDesc[index];
        if (direction === 'up' && index > 0) {
            newDesc.splice(index, 1);
            newDesc.splice(index - 1, 0, item);
        } else if (direction === 'down' && index < newDesc.length - 1) {
            newDesc.splice(index, 1);
            newDesc.splice(index + 1, 0, item);
        }
        return { routineFormData: { ...state.routineFormData, desc: newDesc } };
    });
  },

  saveRoutine: async () => {
    const { drawerMode, routineFormData, currentRoutineForEdit } = get();
    if (!routineFormData.facultyId || !routineFormData.classId || !routineFormData.sectionId) {
      alert("Faculty, Class, and Section are required.");
      return;
    }
    for (const item of routineFormData.desc) {
        if (!item.fromTime || !item.toTime) {
            alert("All periods and breaks must have 'From' and 'To' times.");
            return;
        }
        if (item.type === 'period' && (!item.subject || !item.teacherId)) {
            alert("All periods must have a subject and a teacher.");
            return;
        }
        if (item.type === 'break' && !item.name) {
            alert("All breaks must have a name.");
            return;
        }
    }

    set({ isFormLoading: true });

    // Prepare the desc array for Appwrite:
    // 1. Remove the client-side 'id'
    // 2. JSON.stringify() each item
    const descForAppwrite: string[] = routineFormData.desc.map(item => {
      const { id, ...restOfItem } = item; // Remove client-side 'id'
      const itemString = JSON.stringify(restOfItem);
      if (itemString.length > 1500) { // Check against your Appwrite attribute's size limit
          // This is a client-side check. The server will also reject it.
          console.warn(`Routine item string for subject/break "${(restOfItem as any).subject || (restOfItem as any).name}" exceeds 1500 characters:`, itemString.length, restOfItem);
          // You might want to throw an error or alert the user here to prevent submission
          // For now, we'll let it proceed and Appwrite will likely reject it if too long.
      }
      return itemString;
    });

    const dataToSave = {
      faculty: routineFormData.facultyId,
      class: routineFormData.classId,
      section: routineFormData.sectionId,
      desc: descForAppwrite, // This is now an array of JSON strings
    };

    try {
      if (drawerMode === 'add') {
        const existing = await databases.listDocuments(APPWRITE_DATABASE_ID, ROUTINE_COLLECTION_ID, [
            Query.equal('section', routineFormData.sectionId)
        ]);
        if (existing.total > 0) {
            alert("A routine for this section already exists. Please edit the existing one.");
            set({isFormLoading: false});
            return;
        }
        await databases.createDocument(APPWRITE_DATABASE_ID, ROUTINE_COLLECTION_ID, iD.unique(), dataToSave);
      } else if (drawerMode === 'edit' && currentRoutineForEdit?.$id) {
        await databases.updateDocument(APPWRITE_DATABASE_ID, ROUTINE_COLLECTION_ID, currentRoutineForEdit.$id, dataToSave);
      }
      await get().fetchRoutines(); 
      get().closeDrawer();
    } catch (error) {
      console.error("Error saving routine:", error); // THIS IS WHERE YOU SEE THE ERROR
      alert("Failed to save routine. See console for details.");
    } finally {
      set({ isFormLoading: false });
    }
  },

  openDeleteDialog: (routine) => set({ isDeleteDialogOpen: true, routineToDelete: routine }),
  closeDeleteDialog: () => set({ isDeleteDialogOpen: false, routineToDelete: null, isDeleting: false }),
  confirmDeleteRoutine: async () => {
    const { routineToDelete } = get();
    if (!routineToDelete?.$id) return;
    set({ isDeleting: true });
    try {
      await databases.deleteDocument(APPWRITE_DATABASE_ID, ROUTINE_COLLECTION_ID, routineToDelete.$id);
      await get().fetchRoutines();
      get().closeDeleteDialog();
    } catch (error) {
      console.error("Error deleting routine:", error);
       alert("Failed to delete routine. See console for details.");
    } finally {
      set({ isDeleting: false });
    }
  },
}));