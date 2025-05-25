// src/pages/TeacherMarksEntryPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { databases, Query, ID, APPWRITE_DATABASE_ID, EXAMS_COLLECTION_ID, STUDENTS_COLLECTION_ID, SECTIONS_COLLECTION_ID } from '~/utils/appwrite';
import { Exam, ExamDocument, StudentDocument, MarkEntryDocument, StudentForMarksTable, SectionDocument, SubjectDetail, FacultyDocument } from '../types/appwrite.types';
import { parseSubjectDetails } from '../utils/helpers';
import ExamCard from '../components/marks-entry/ExamCard';
import MarksEntryFilters from '../components/marks-entry/MarksEntryFilters';
import MarksEntryTable from '../components/marks-entry/MarksEntryTable';
import SearchBar from '../../../common/SearchBar';
import { Spinner, Button } from '@heroui/react'; // Added Button
import { ArrowLeftIcon } from '@heroicons/react/24/outline'; // Added Back Icon

const MARKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MARKS_COLLECTION_ID || "YOUR_DEFAULT_MARKS_COLLECTION_ID_IF_ENV_FAILS";
const FACULTY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID || "YOUR_FACULTY_COLLECTION_ID"; // <<< ADD THIS

const TeacherMarksEntryPage: React.FC = () => {
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [examEntryPercentages, setExamEntryPercentages] = useState<Record<string, number | null>>({});
  const [facultyMap, setFacultyMap] = useState<Record<string, string>>({}); // <<< ADD THIS
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [currentFilters, setCurrentFilters] = useState<{ classId: string | null; sectionId: string | null; subjectName: string | null }>({
    classId: null,
    sectionId: null,
    subjectName: null,
  });
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null);

  const [studentsForTable, setStudentsForTable] = useState<StudentForMarksTable[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  const showSnackbar = useCallback((message: string, variant: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`${variant.toUpperCase()}: ${message}`);
    // alert(`${variant.toUpperCase()}: ${message}`);
  }, []);

    // Fetch Faculty Names (Helper Function)
    const fetchFacultyNames = async (facultyIds: string[]): Promise<Record<string, string>> => {
        if (!FACULTY_COLLECTION_ID || facultyIds.length === 0) return {};
        try {
            const uniqueIds = [...new Set(facultyIds)];
            const response = await databases.listDocuments<FacultyDocument>(
                APPWRITE_DATABASE_ID,
                FACULTY_COLLECTION_ID,
                [Query.equal('$id', uniqueIds), Query.limit(uniqueIds.length)]
            );
            return response.documents.reduce((acc, faculty) => {
                acc[faculty.$id] = faculty.name;
                return acc;
            }, {} as Record<string, string>);
        } catch (error) {
            console.error("Failed to fetch faculty names:", error);
            showSnackbar("Could not load faculty details.", "warning");
            return {};
        }
    };


  useEffect(() => {
    const fetchExamsAndFaculties = async () => {
      setIsLoadingExams(true);
      setFacultyMap({}); // Reset map
      try {
        const response = await databases.listDocuments<ExamDocument>(
          APPWRITE_DATABASE_ID,
          EXAMS_COLLECTION_ID,
          [Query.orderDesc('$createdAt'), Query.limit(100)]
        );
        const parsedExams = response.documents.map(doc => ({
          ...doc,
          subjectDetails: parseSubjectDetails(doc.subjectDetails_json),
        }));
        setAllExams(parsedExams);
        setFilteredExams(parsedExams);

        // --- Fetch Faculty Names ---
        const allFacultyIds = parsedExams.flatMap(exam => exam.faculty);
        if (allFacultyIds.length > 0) {
            const names = await fetchFacultyNames(allFacultyIds);
            setFacultyMap(names);
        }
        // --- End Fetch Faculty Names ---

      } catch (error) {
        console.error("Failed to fetch exams:", error);
        showSnackbar("Failed to load exams.", "error");
      } finally {
        setIsLoadingExams(false);
      }
    };
    fetchExamsAndFaculties();
  }, [showSnackbar]);

  // ... (useEffect for section name - KEEP AS IS) ...
  useEffect(() => {
    if (currentFilters.sectionId && selectedExam && currentFilters.classId) {
      const findSectionName = async () => {
        try {
          const sectionDoc = await databases.getDocument<SectionDocument>(
            APPWRITE_DATABASE_ID,
            SECTIONS_COLLECTION_ID,
            currentFilters.sectionId!
          );
          setSelectedSectionName(sectionDoc.name);
        } catch (error) {
          console.error("Could not fetch selected section details to get name:", error);
          setSelectedSectionName(null);
          showSnackbar("Error: Could not retrieve section details.", "error");
        }
      };
      findSectionName();
    } else {
      setSelectedSectionName(null);
    }
  }, [currentFilters.sectionId, selectedExam, currentFilters.classId, showSnackbar]);


  // ... (useEffect for percentage calculation - KEEP AS IS or review later) ...
  useEffect(() => {
      const calculatePercentages = async () => {
          if (!MARKS_COLLECTION_ID || MARKS_COLLECTION_ID === "YOUR_DEFAULT_MARKS_COLLECTION_ID_IF_ENV_FAILS") {
              filteredExams.forEach(exam => {
                  setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: -2 }));
              });
              return;
          }
          for (const exam of filteredExams) {
              if (examEntryPercentages[exam.$id] !== undefined) continue; // Check only if not set
              setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: null })); // Set to calculating
              try {
                  let totalEligibleStudentsCount = 0;
                  if (exam.class.length > 0) {
                      const studentCountQueries: string[] = [Query.equal('class', exam.class)];
                      if (exam.section.length > 0) studentCountQueries.push(Query.equal('$id', exam.section)); // Query by section ID
                      const studentCountResponse = await databases.listDocuments(
                          APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID, [...studentCountQueries, Query.limit(1)]
                      );
                      totalEligibleStudentsCount = studentCountResponse.total;
                  }
                  if (totalEligibleStudentsCount === 0 || exam.subjectDetails.length === 0) {
                      setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: -1 })); continue;
                  }
                  const totalPossibleEntries = totalEligibleStudentsCount * exam.subjectDetails.length;
                  const marksResponse = await databases.listDocuments(
                      APPWRITE_DATABASE_ID, MARKS_COLLECTION_ID, [Query.equal('examId', exam.$id), Query.limit(1)]
                  );
                  const actualEntriesCount = marksResponse.total;
                  const percentage = totalPossibleEntries > 0 ? (actualEntriesCount / totalPossibleEntries) * 100 : 0;
                  setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: Math.min(100, Math.round(percentage)) }));
              } catch (error: any) {
                  console.error(`Failed to calculate percentage for exam ${exam.title}:`, error.message);
                  setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: -2 }));
              }
          }
      };
      if (filteredExams.length > 0 && Object.keys(examEntryPercentages).length < filteredExams.length) {
        calculatePercentages();
      }
  }, [filteredExams, examEntryPercentages]); // Rerun if filtered exams change or percentages are incomplete


  // ... (useEffect for search - KEEP AS IS) ...
   useEffect(() => {
    if (!searchTerm) {
      setFilteredExams(allExams);
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase();
      setFilteredExams(
        allExams.filter(exam =>
          exam.title.toLowerCase().includes(lowerSearchTerm) ||
          exam.type.toLowerCase().includes(lowerSearchTerm)
        )
      );
    }
  }, [searchTerm, allExams]);

  const handleExamSelect = useCallback((exam: Exam) => {
    setSelectedExam(exam);
    setCurrentFilters({ classId: null, sectionId: null, subjectName: null });
    setSelectedSectionName(null);
    setStudentsForTable([]);
  }, []);

  // <<< ADD THIS >>>
  const handleGoBack = () => {
      setSelectedExam(null);
      // Optional: Reset filters/table if needed, but selecting an exam already does this.
  };

  // ... (useEffect for fetchStudentsAndMarks - KEEP AS IS, but verify 'section' query) ...
  // Make sure your 'section' query in fetchStudentsAndMarks uses the correct field.
  // If `coll-student.section` stores the ID, you need `Query.equal('section', currentFilters.sectionId)`.
  // If it stores the NAME, you need `Query.equal('section', selectedSectionName)`.
  // The current code uses `selectedSectionName`, ensure this matches your DB schema.
  useEffect(() => {
    const fetchStudentsAndMarks = async () => {
      if (!selectedExam || !currentFilters.classId || !currentFilters.sectionId || !selectedSectionName || !currentFilters.subjectName) {
        setStudentsForTable([]);
        return;
      }
      setIsLoadingStudents(true);
      try {
        const studentQueries = [
          Query.equal('class', currentFilters.classId),
          Query.equal('section', currentFilters.sectionId), // <<< VERIFY THIS: Use ID now?
          Query.limit(200)
        ];
        // NOTE: If your student collection stores section NAME, you MUST use selectedSectionName.
        // If it stores section ID (recommended), use currentFilters.sectionId.
        // Let's assume it stores ID for better practice:
        // const studentQueries = [
        //   Query.equal('class', currentFilters.classId),
        //   Query.equal('section', currentFilters.sectionId), // Using ID
        //   Query.limit(200)
        // ];

        const studentResponse = await databases.listDocuments<StudentDocument>(
          APPWRITE_DATABASE_ID,
          STUDENTS_COLLECTION_ID,
          studentQueries
        );
        const students = studentResponse.documents;

        if (students.length === 0) {
          showSnackbar(`No students found for Class: ${currentFilters.classId}, Section: ${selectedSectionName}.`, "info");
          setStudentsForTable([]);
        } else {
            const studentIds = students.map(s => s.$id);
            const marksResponse = await databases.listDocuments<MarkEntryDocument>(
              APPWRITE_DATABASE_ID,
              MARKS_COLLECTION_ID,
              [
                Query.equal('examId', selectedExam.$id),
                Query.equal('subjectName', currentFilters.subjectName),
                Query.equal('studentId', studentIds),
                Query.limit(students.length)
              ]
            );
            const marksMap = new Map(marksResponse.documents.map(m => [m.studentId, m]));
            const tableData: StudentForMarksTable[] = students.map(student => {
              const markEntry = marksMap.get(student.$id);
              return {
                ...student,
                theoryMarksInput: markEntry?.theoryMarksObtained?.toString() ?? '',
                practicalMarksInput: markEntry?.practicalMarksObtained?.toString() ?? '',
                isAbsentInput: markEntry?.isAbsent ?? false,
                existingMarkEntryId: markEntry?.$id,
                isModified: false,
              };
            });
            setStudentsForTable(tableData);
        }
      } catch (error) {
        console.error("Failed to fetch students or marks:", error);
        showSnackbar("Failed to load student data. Check console for details.", "error");
        setStudentsForTable([]);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    if (MARKS_COLLECTION_ID && MARKS_COLLECTION_ID !== "YOUR_DEFAULT_MARKS_COLLECTION_ID_IF_ENV_FAILS") {
        fetchStudentsAndMarks();
    } else if (selectedExam && currentFilters.classId && currentFilters.sectionId && currentFilters.subjectName) {
        showSnackbar("Marks collection not configured. Cannot fetch or save marks.", "error");
        setIsLoadingStudents(false);
    }
  }, [selectedExam, currentFilters, selectedSectionName, showSnackbar]); // Added sectionId


  // ... (handleMarksChange, handleAbsenceChange, selectedSubjectDetails, handleSaveChanges, handleCancelChanges, hasUnsavedChanges - KEEP AS IS) ...
  const handleMarksChange = useCallback((studentId: string, field: 'theory' | 'practical', value: string) => {
    setStudentsForTable(prev =>
      prev.map(s =>
        s.$id === studentId
          ? { ...s, [`${field}MarksInput`]: value, isModified: true }
          : s
      )
    );
  }, []);

  const handleAbsenceChange = useCallback((studentId: string, isAbsent: boolean) => {
    setStudentsForTable(prev =>
      prev.map(s =>
        s.$id === studentId
          ? {
              ...s,
              isAbsentInput: isAbsent,
              theoryMarksInput: isAbsent ? '' : s.theoryMarksInput,
              practicalMarksInput: isAbsent ? '' : s.practicalMarksInput,
              isModified: true,
            }
          : s
      )
    );
  }, []);

  const selectedSubjectDetails = useMemo(() => {
    if (!selectedExam || !currentFilters.subjectName) return undefined;
    return selectedExam.subjectDetails.find(sd => sd.name === currentFilters.subjectName);
  }, [selectedExam, currentFilters.subjectName]);

  const handleSaveChanges = async () => {
    if (!selectedExam || !currentFilters.classId || !currentFilters.sectionId || !currentFilters.subjectName || !selectedSubjectDetails) {
      showSnackbar("Missing filter selections or subject details.", "warning"); return;
    }
    if (!MARKS_COLLECTION_ID || MARKS_COLLECTION_ID === "YOUR_DEFAULT_MARKS_COLLECTION_ID_IF_ENV_FAILS") {
      showSnackbar("Marks Collection ID not configured.", "error"); return;
    }
    setIsSavingMarks(true);
    const modifiedStudents = studentsForTable.filter(s => s.isModified);
    if (modifiedStudents.length === 0) {
      showSnackbar("No changes to save.", "info"); setIsSavingMarks(false); return;
    }
    const teacherUserId = "teacher_placeholder_id"; // TODO: Get current user ID
    const promises = modifiedStudents.map(student => {
      const theoryFM = Number(selectedSubjectDetails.theoryFM);
      const practicalFM = selectedSubjectDetails.hasPractical ? Number(selectedSubjectDetails.practicalFM) : null;
      const theoryMarks = student.isAbsentInput ? null : (student.theoryMarksInput.trim() !== '' ? parseFloat(student.theoryMarksInput) : null);
      const practicalMarks = (selectedSubjectDetails.hasPractical && !student.isAbsentInput && student.practicalMarksInput.trim() !== '')
        ? parseFloat(student.practicalMarksInput) : null;
      let validationError = null;
      if (!student.isAbsentInput) {
        if (theoryMarks !== null && (isNaN(theoryMarks) || theoryMarks < 0 || theoryMarks > theoryFM)) {
          validationError = `Invalid theory for ${student.name}: 0-${theoryFM}. Got: ${student.theoryMarksInput}`;
        }
        if (selectedSubjectDetails.hasPractical && practicalMarks !== null && practicalFM !== null && (isNaN(practicalMarks) || practicalMarks < 0 || practicalMarks > practicalFM)) {
          validationError = `Invalid practical for ${student.name}: 0-${practicalFM}. Got: ${student.practicalMarksInput}`;
        }
      }
      if (validationError) throw new Error(validationError);
      const data: Omit<MarkEntryDocument, '$id' | '$collectionId' | '$databaseId'> = {
        examId: selectedExam.$id, studentId: student.$id, classId: currentFilters.classId!,
        sectionId: currentFilters.sectionId!, subjectName: currentFilters.subjectName!,
        theoryMarksObtained: theoryMarks, practicalMarksObtained: practicalMarks,
        isAbsent: student.isAbsentInput, updatedBy: teacherUserId, lastUpdatedAt: new Date().toISOString(),
      };
      return student.existingMarkEntryId
        ? databases.updateDocument(APPWRITE_DATABASE_ID, MARKS_COLLECTION_ID, student.existingMarkEntryId, data)
        : databases.createDocument(APPWRITE_DATABASE_ID, MARKS_COLLECTION_ID, ID.unique(), data);
    });
    try {
      const results = await Promise.all(promises);
      showSnackbar("Marks saved successfully!", "success");
      setStudentsForTable(prev => prev.map(s => {
        if (!s.isModified) return s;
        const savedStudentIndex = modifiedStudents.findIndex(ms => ms.$id === s.$id);
        if (savedStudentIndex > -1) {
          const savedDoc = results[savedStudentIndex] as MarkEntryDocument | undefined;
          return { ...s, isModified: false, existingMarkEntryId: s.existingMarkEntryId || savedDoc?.$id };
        }
        return s;
      }));
      setExamEntryPercentages(prev => ({ ...prev, [selectedExam.$id]: undefined })); // Force recalc
    } catch (error: any) {
      console.error("Failed to save marks:", error);
      showSnackbar(`Error: ${error.message || 'Check entries.'}`, "error");
    } finally {
      setIsSavingMarks(false);
    }
  };

  const handleCancelChanges = useCallback(() => {
    if (selectedExam && currentFilters.classId && currentFilters.sectionId && currentFilters.subjectName) {
        const originalFilters = { ...currentFilters };
        const originalSectionName = selectedSectionName;
        // Trigger a re-fetch by temporarily changing and reverting a filter dependency
        setCurrentFilters(prev => ({ ...prev, subjectName: "___temp___" }));
        setTimeout(() => {
             setCurrentFilters(originalFilters);
             setSelectedSectionName(originalSectionName); // Ensure section name is also reset if needed
        }, 0);
    } else {
      setStudentsForTable([]);
    }
    showSnackbar("Changes cancelled.", "info");
  }, [selectedExam, currentFilters, selectedSectionName, showSnackbar]); // Added sectionId


  const hasUnsavedChanges = useMemo(() => studentsForTable.some(s => s.isModified), [studentsForTable]);


  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center mb-6">
        {selectedExam && (
            <Button
                variant="light"
                color="primary"
                className="mr-4 p-2 rounded-full hover:bg-indigo-100"
                onPress={handleGoBack}
                aria-label="Go back to exams"
            >
                <ArrowLeftIcon className="h-6 w-6 text-indigo-600" />
            </Button>
        )}
        <h1 className="text-2xl font-bold text-gray-800">
            {selectedExam ? `Marks Entry: ${selectedExam.title}` : 'Select Exam for Marks Entry'}
        </h1>
      </div>

      {/* --- Conditional Rendering --- */}

      {!selectedExam ? (
        // <<< EXAM CARD VIEW >>>
        <>
            <div className="mb-6">
                <SearchBar placeholder="Search exams by title or type..." value={searchTerm} onValueChange={setSearchTerm} className="max-w-lg" />
            </div>
            {isLoadingExams ? (
                <div className="flex justify-center items-center h-48"><Spinner label="Loading Exams..." size="lg" /></div>
            ) : filteredExams.length === 0 ? (
                <p className="text-center text-gray-500 py-10 text-lg">
                    {allExams.length === 0 ? "No exams have been added yet." : "No exams match your search."}
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {filteredExams.map(exam => (
                    <ExamCard
                        key={exam.$id}
                        exam={exam}
                        entryPercentage={examEntryPercentages[exam.$id]}
                        onSelect={() => handleExamSelect(exam)}
                        isSelected={false} // Selection is handled by view change
                        facultyNames={exam.faculty.map(id => facultyMap[id] || id).filter(Boolean)}
                    />
                ))}
                </div>
            )}
        </>
      ) : (
        // <<< FILTER & TABLE VIEW >>>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <MarksEntryFilters
                selectedExam={selectedExam}
                onFilterChange={setCurrentFilters}
                currentFilters={currentFilters}
            />

            {currentFilters.classId && currentFilters.sectionId && selectedSectionName && currentFilters.subjectName ? (
                isLoadingStudents ? (
                    <div className="flex justify-center items-center h-64 mt-4"><Spinner label="Loading Students..." /></div>
                ) : (
                    <MarksEntryTable
                        students={studentsForTable}
                        subjectDetails={selectedSubjectDetails}
                        onMarksChange={handleMarksChange}
                        onAbsenceChange={handleAbsenceChange}
                        onSaveChanges={handleSaveChanges}
                        onCancelChanges={handleCancelChanges}
                        isSaving={isSavingMarks}
                        hasChanges={hasUnsavedChanges}
                    />
                )
            ) : currentFilters.classId && currentFilters.sectionId && !selectedSectionName && !isLoadingStudents ? (
                <p className="text-center text-gray-500 mt-8">Verifying section...</p>
            ) : (
                <p className="text-center text-gray-500 mt-8 p-6 bg-indigo-50 rounded-md border border-indigo-100">
                    Please select a Class, Section, and Subject above to view students and enter marks.
                </p>
            )}
        </div>
      )}
      {/* --- End Conditional Rendering --- */}

    </div>
  );
};

export default TeacherMarksEntryPage;