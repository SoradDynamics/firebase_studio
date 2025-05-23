// src/stores/assignClassTeacherStore.ts
import { create } from 'zustand';
import {
  databases,
  Query,
  APPWRITE_DATABASE_ID,
  SECTIONS_COLLECTION_ID,
  FACULTIES_COLLECTION_ID,
} from '~/utils/appwrite';

import { Faculty, Teacher, Section, EnrichedSection, SelectOption } from 'types';

let Resolved_TEACHERS_COLLECTION_ID: string;
if (import.meta.env.VITE_APPWRITE_TEACHER_COLLECTION_ID) {
  Resolved_TEACHERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TEACHER_COLLECTION_ID;
} else {
  console.error(
    "CRITICAL: VITE_APPWRITE_TEACHER_COLLECTION_ID is not defined in your .env file. Assign Class Teacher functionality will be impaired."
  );
  Resolved_TEACHERS_COLLECTION_ID = "MISSING_TEACHER_COLLECTION_ID";
}

interface AssignClassTeacherState {
  sections: EnrichedSection[];
  allFaculties: Faculty[]; // Store all faculties to derive class options
  allTeachers: Teacher[];
  
  filteredSections: EnrichedSection[];
  
  facultyOptions: SelectOption[];
  classOptions: SelectOption[]; // Will be dynamic
  teacherOptions: SelectOption[];

  selectedFacultyDocId: string | null;
  selectedClass: string | null;
  searchTerm: string;

  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;

  fetchInitialData: () => Promise<void>;
  setFacultyFilter: (facultyDocId: string | null) => void;
  setClassFilter: (className: string | null) => void;
  setSearchTerm: (term: string) => void;
  updateClassTeacher: (sectionDocId: string, teacherCustomId: string | null) => Promise<boolean>;
  _applyFilters: () => void;
  _updateClassOptions: () => void; // Helper to update class options
}

const useAssignClassTeacherStore = create<AssignClassTeacherState>((set, get) => ({
  sections: [],
  allFaculties: [],
  allTeachers: [],
  filteredSections: [],
  facultyOptions: [],
  classOptions: [], // Initialize as empty, will be populated
  teacherOptions: [],
  selectedFacultyDocId: null,
  selectedClass: null,
  searchTerm: '',
  isLoading: false,
  isUpdating: false,
  error: null,

  fetchInitialData: async () => {
    // ... (initialization checks - same as before)
    if (Resolved_TEACHERS_COLLECTION_ID === "MISSING_TEACHER_COLLECTION_ID") {
        set({ error: 'Teacher Collection ID is not configured. Please check environment variables.', isLoading: false });
        return;
    }
    set({ isLoading: true, error: null });

    try {
      const [sectionsRes, facultiesRes, teachersRes] = await Promise.all([
        databases.listDocuments(APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID, [Query.limit(500)]),
        databases.listDocuments(APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, [Query.limit(100)]),
        databases.listDocuments(APPWRITE_DATABASE_ID, Resolved_TEACHERS_COLLECTION_ID, [Query.limit(200)])
      ]);

      const facultiesData = facultiesRes.documents as unknown as Faculty[];
      const teachers = teachersRes.documents as unknown as Teacher[];
      const sectionsData = sectionsRes.documents as unknown as Section[];

      const facultyMap = new Map(facultiesData.map(f => [f.$id, f.name]));
      const teacherMap = new Map(teachers.map(t => [t.id, t.name]));

      const enrichedSections: EnrichedSection[] = sectionsData.map(section => ({
        ...section,
        facultyName: facultyMap.get(section.facultyId) || 'N/A (Faculty Not Found)',
        classTeacherName: section.class_teacher ? (teacherMap.get(section.class_teacher) || 'Unknown Teacher') : undefined,
      }));

      const facultyOptions: SelectOption[] = facultiesData.map(f => ({ id: f.$id, name: f.name }));
      const teacherOptions: SelectOption[] = teachers.map(t => ({ id: t.id, name: t.name }));

      set({
        sections: enrichedSections,
        allFaculties: facultiesData, // Store all faculties
        allTeachers: teachers,
        facultyOptions,
        teacherOptions,
        isLoading: false,
      });
      get()._updateClassOptions(); // Initial population of class options (all classes)
      get()._applyFilters();

    } catch (err: any) {
      // ... (error handling - same as before)
      console.error("Error fetching initial data:", err);
      let errorMessage = 'Failed to load data. ';
      if (err.message) {
        errorMessage += `Details: ${err.message}`;
      } else if (typeof err === 'string') {
        errorMessage += err;
      }
      if (err.message && err.message.includes('Collection with ID')) {
        errorMessage += " Please verify all VITE_APPWRITE_..._COLLECTION_ID variables in your .env file are correct.";
      }
      set({ error: errorMessage, isLoading: false });
    }
  },

  _updateClassOptions: () => {
    const { allFaculties, selectedFacultyDocId, sections } = get();
    let newClassOptions: SelectOption[] = [];

    if (selectedFacultyDocId) {
      const selectedFaculty = allFaculties.find(f => f.$id === selectedFacultyDocId);
      if (selectedFaculty && Array.isArray(selectedFaculty.classes)) {
        newClassOptions = selectedFaculty.classes.sort().map(c => ({ id: c, name: c }));
      } else {
        // Fallback: If selected faculty has no classes listed, or classes is not an array
        // show classes present in sections belonging to this faculty
        const classesInFacultySections = new Set<string>();
        sections
            .filter(s => s.facultyId === selectedFacultyDocId && s.class)
            .forEach(s => classesInFacultySections.add(s.class));
        newClassOptions = Array.from(classesInFacultySections).sort().map(c => ({ id: c, name: c }));
      }
    } else {
      // No faculty selected, show all unique classes from all faculties or all sections
      const allClasses = new Set<string>();
      allFaculties.forEach(f => {
        if (Array.isArray(f.classes)) {
            f.classes.forEach(c => allClasses.add(c))
        }
      });
      // If faculties don't have comprehensive class lists, augment with classes from sections
      if (allClasses.size === 0) { // Or some other threshold if faculties might have partial lists
         sections.forEach(s => { if(s.class) allClasses.add(s.class) });
      }
      newClassOptions = Array.from(allClasses).sort().map(c => ({ id: c, name: c }));
    }
    set({ classOptions: newClassOptions });
  },

  setFacultyFilter: (facultyDocId) => {
    const currentSelectedClass = get().selectedClass;
    set({ selectedFacultyDocId: facultyDocId, error: null });
    get()._updateClassOptions(); // Update class options based on new faculty

    // Check if the currently selected class is still valid for the new faculty/options
    const newClassOptions = get().classOptions;
    if (currentSelectedClass && !newClassOptions.find(opt => opt.id === currentSelectedClass)) {
      set({ selectedClass: null }); // Reset class filter if it's no longer valid
    }
    get()._applyFilters();
  },

  setClassFilter: (className) => {
    set({ selectedClass: className, error: null });
    get()._applyFilters();
  },

  setSearchTerm: (term) => {
    // ... (same as before)
    set({ searchTerm: term, error: null });
    get()._applyFilters();
  },

  _applyFilters: () => {
    // ... (same as before)
    const { sections, selectedFacultyDocId, selectedClass, searchTerm } = get();
    let filtered = [...sections]; 

    if (selectedFacultyDocId) {
      filtered = filtered.filter(s => s.facultyId === selectedFacultyDocId);
    }
    if (selectedClass) {
      filtered = filtered.filter(s => s.class === selectedClass);
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(lowerSearchTerm) ||
        s.class.toLowerCase().includes(lowerSearchTerm) ||
        (s.facultyName && s.facultyName.toLowerCase().includes(lowerSearchTerm)) ||
        (s.classTeacherName && s.classTeacherName.toLowerCase().includes(lowerSearchTerm)) ||
        (Array.isArray(s.subjects) && s.subjects.some(sub => sub.toLowerCase().includes(lowerSearchTerm)))
      );
    }
    set({ filteredSections: filtered });
  },

  updateClassTeacher: async (sectionDocId: string, teacherCustomId: string | null) => {
    // ... (same as before)
    set({ isUpdating: true, error: null });
    try {
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        SECTIONS_COLLECTION_ID,
        sectionDocId, 
        { class_teacher: teacherCustomId }
      );
      
      const currentSections = get().sections;
      const teacherMap = new Map(get().allTeachers.map(t => [t.id, t.name]));

      const updatedSections = currentSections.map(s => {
        if (s.$id === sectionDocId) {
          return {
            ...s,
            class_teacher: teacherCustomId,
            classTeacherName: teacherCustomId ? (teacherMap.get(teacherCustomId) || 'Unknown Teacher') : undefined,
          };
        }
        return s;
      });

      set({ sections: updatedSections, isUpdating: false });
      get()._applyFilters(); 
      return true;
    } catch (err: any) {
      console.error("Error updating class teacher:", err);
      let errorMessage = 'Failed to update class teacher. ';
      if (err.message) {
        errorMessage += `Details: ${err.message}`;
      } else if (typeof err === 'string') {
        errorMessage += err;
      }
      set({ error: errorMessage, isUpdating: false });
      return false;
    }
  },
}));

export default useAssignClassTeacherStore;