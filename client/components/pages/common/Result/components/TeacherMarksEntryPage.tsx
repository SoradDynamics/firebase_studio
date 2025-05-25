// src/pages/TeacherMarksEntryPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  databases,
  Query,
  ID,
  APPWRITE_DATABASE_ID,
  EXAMS_COLLECTION_ID,
  STUDENTS_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
} from '~/utils/appwrite';
import { useAuthStore } from '~/utils/authStore';
import { createNotificationEntry, getTomorrowDateString, NotificationData } from '~/utils/notification';
import Popover from '../../../../common/Popover'; // Ensure path is correct

import { Exam, ExamDocument, StudentDocument, MarkEntryDocument, StudentForMarksTable, SectionDocument, SubjectDetail, FacultyDocument } from '../types/appwrite.types';
import { parseSubjectDetails } from '../utils/helpers';
import ExamCard from '../components/marks-entry/ExamCard';
import MarksEntryFilters from '../components/marks-entry/MarksEntryFilters';
import MarksEntryTable from '../components/marks-entry/MarksEntryTable';
import SearchBar from '../../../common/SearchBar'; // Ensure path is correct
import { Spinner, Button, Chip } from '@heroui/react';
import { ArrowLeftIcon, CheckCircleIcon, InformationCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const MARKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MARKS_COLLECTION_ID || "YOUR_DEFAULT_MARKS_COLLECTION_ID_IF_ENV_FAILS";
const FACULTY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID || "YOUR_FACULTY_COLLECTION_ID";

const TeacherMarksEntryPage: React.FC = () => {
  const { user, label, fetchUser, isLoading: isLoadingAuth } = useAuthStore();

  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [examEntryPercentages, setExamEntryPercentages] = useState<Record<string, number | null>>({});
  const [facultyMap, setFacultyMap] = useState<Record<string, string>>({});
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [currentFilters, setCurrentFilters] = useState<{ classId: string | null; sectionId: string | null; subjectName: string | null }>({
    classId: null,
    sectionId: null, // This stores the section ID from coll-section
    subjectName: null,
  });
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null); // This will store the fetched section name

  const [studentsForTable, setStudentsForTable] = useState<StudentForMarksTable[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  const [isPublishPopoverOpen, setIsPublishPopoverOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishIsGpa, setPublishIsGpa] = useState(false);

  const [initialAuthAttempted, setInitialAuthAttempted] = useState(false);

  const showSnackbar = useCallback((message: string, variant: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`[${variant.toUpperCase()}] Snackbar: ${message}`);
  }, []);

  useEffect(() => {
    fetchUser().finally(() => {
      setInitialAuthAttempted(true);
    });
  }, [fetchUser]);

  const fetchFacultyNames = useCallback(async (facultyIds: string[]): Promise<Record<string, string>> => {
    if (!FACULTY_COLLECTION_ID || facultyIds.length === 0) return {};
    try {
        const uniqueIds = [...new Set(facultyIds)];
        const response = await databases.listDocuments<FacultyDocument>(
            APPWRITE_DATABASE_ID,
            FACULTY_COLLECTION_ID,
            [Query.equal('$id', uniqueIds), Query.limit(Math.min(uniqueIds.length, 100))]
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
  }, [showSnackbar]);

  useEffect(() => {
    const fetchExamsAndFaculties = async () => {
      setIsLoadingExams(true);
      setFacultyMap({});
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

        const allFacultyIds = parsedExams.flatMap(exam => exam.faculty).filter(id => id);
        if (allFacultyIds.length > 0) {
            const names = await fetchFacultyNames(allFacultyIds);
            setFacultyMap(names);
        }
      } catch (error) {
        console.error("Failed to fetch exams:", error);
        showSnackbar("Failed to load exams.", "error");
      } finally {
        setIsLoadingExams(false);
      }
    };
    if (initialAuthAttempted) {
        fetchExamsAndFaculties();
    }
  }, [fetchFacultyNames, showSnackbar, initialAuthAttempted]);

  // Effect to get selected section NAME based on selected section ID
  useEffect(() => {
    if (currentFilters.sectionId && selectedExam && currentFilters.classId) {
      setSelectedSectionName(null); // Reset while fetching
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
          setSelectedSectionName(null); // Keep it null on error
          showSnackbar("Error: Could not retrieve section details.", "error");
        }
      };
      findSectionName();
    } else {
      setSelectedSectionName(null); // Clear if sectionId or other dependencies are missing
    }
  }, [currentFilters.sectionId, selectedExam, currentFilters.classId, showSnackbar]);

  useEffect(() => {
      const calculatePercentages = async () => {
          // ... (percentage calculation logic - unchanged)
            if (!MARKS_COLLECTION_ID || MARKS_COLLECTION_ID === "YOUR_DEFAULT_MARKS_COLLECTION_ID_IF_ENV_FAILS") {
                filteredExams.forEach(exam => {
                    setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: -2 }));
                });
                return;
            }
            for (const exam of filteredExams) {
                if (examEntryPercentages[exam.$id] !== undefined && examEntryPercentages[exam.$id] !== null) continue;
                 setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: null }));

                try {
                    let totalEligibleStudents = 0;
                    if (exam.class.length > 0) {
                         const studentCountQueries: string[] = [Query.equal('class', exam.class)];
                          if (exam.section && exam.section.length > 0) {
                            studentCountQueries.push(Query.equal('section', exam.section)); // This queries coll-student.section by name if exam.section stores names
                          }
                         const studentCountResponse = await databases.listDocuments(
                             APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID, [...studentCountQueries, Query.limit(1), Query.select(["$id"])]
                         );
                         totalEligibleStudents = studentCountResponse.total;
                    }

                    if (totalEligibleStudents === 0 || exam.subjectDetails.length === 0) {
                        setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: -1 }));
                        continue;
                    }

                    const totalPossibleMarksDocuments = totalEligibleStudents * exam.subjectDetails.length;
                    const marksResponse = await databases.listDocuments(
                        APPWRITE_DATABASE_ID, MARKS_COLLECTION_ID,
                        [Query.equal('examId', exam.$id), Query.limit(1), Query.select(["$id"])]
                    );
                    const actualMarksDocuments = marksResponse.total;
                    const percentage = totalPossibleMarksDocuments > 0
                        ? (actualMarksDocuments / totalPossibleMarksDocuments) * 100
                        : 0;
                    setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: Math.min(100, Math.round(percentage)) }));
                } catch (error: any) {
                    console.error(`Failed to calculate percentage for exam ${exam.title}:`, error.message);
                    setExamEntryPercentages(prev => ({ ...prev, [exam.$id]: -2 }));
                }
            }
      };
      if (filteredExams.length > 0 && MARKS_COLLECTION_ID && MARKS_COLLECTION_ID !== "YOUR_DEFAULT_MARKS_COLLECTION_ID_IF_ENV_FAILS") {
        calculatePercentages();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExams]);

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
    setPublishIsGpa(exam.isGpa || false);
    setCurrentFilters({ classId: null, sectionId: null, subjectName: null });
    setSelectedSectionName(null); // Reset section name
    setStudentsForTable([]);
  }, []);

  const handleGoBack = () => {
      setSelectedExam(null);
  };

  // Effect to fetch students and marks for the table
  useEffect(() => {
    const fetchStudentsAndMarks = async () => {
      // GUARD: Ensure all necessary filters, including the fetched sectionName, are available
      if (!selectedExam || !currentFilters.classId || !currentFilters.sectionId || !selectedSectionName || !currentFilters.subjectName) {
        setStudentsForTable([]);
        return;
      }
      setIsLoadingStudents(true);
      try {
        // CORRECTED QUERY: Use selectedSectionName for 'section' field
        // as coll-student.section stores section name.
        // currentFilters.classId stores class name, which is correct for coll-student.class.
        const studentQueries = [
          Query.equal('class', currentFilters.classId),        // Class name matches coll-student.class
          Query.equal('section', selectedSectionName),         // Section name matches coll-student.section
          Query.limit(200)
        ];

        const studentResponse = await databases.listDocuments<StudentDocument>(
          APPWRITE_DATABASE_ID,
          STUDENTS_COLLECTION_ID,
          studentQueries
        );
        const students = studentResponse.documents;

        if (students.length === 0) {
          // selectedSectionName will be available here due to the guard condition above
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
        // This condition might be hit if selectedSectionName is not yet ready
        if (!selectedSectionName && currentFilters.sectionId) {
            // Waiting for section name to be fetched, do nothing here, spinner is handled by isLoadingStudents or parent
        } else {
            showSnackbar("Marks collection not configured. Cannot fetch or save marks.", "error");
            setIsLoadingStudents(false);
        }
    }
  // DEPENDENCIES: Added selectedSectionName.
  // This effect now runs when selectedSectionName changes (i.e., after it's fetched).
  }, [selectedExam, currentFilters.classId, currentFilters.sectionId, selectedSectionName, currentFilters.subjectName, showSnackbar]);


  const handleMarksChange = useCallback((studentId: string, field: 'theory' | 'practical', value: string) => {
    // ... (unchanged)
    setStudentsForTable(prev =>
      prev.map(s =>
        s.$id === studentId
          ? { ...s, [`${field}MarksInput`]: value, isModified: true }
          : s
      )
    );
  }, []);

  const handleAbsenceChange = useCallback((studentId: string, isAbsent: boolean) => {
    // ... (unchanged)
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
    // ... (unchanged)
    if (!selectedExam || !currentFilters.subjectName) return undefined;
    return selectedExam.subjectDetails.find(sd => sd.name === currentFilters.subjectName);
  }, [selectedExam, currentFilters.subjectName]);

  const handleSaveChanges = async () => {
    // ... (unchanged)
    if (!selectedExam || !currentFilters.classId || !currentFilters.sectionId || !selectedSectionName || !currentFilters.subjectName || !selectedSubjectDetails) {
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
    
    const teacherUserId = user?.$id || "unknown_teacher";

    const promises = modifiedStudents.map(student => {
      const theoryFM = Number(selectedSubjectDetails.theoryFM);
      const practicalFM = selectedSubjectDetails.hasPractical ? Number(selectedSubjectDetails.practicalFM) : null;
      const theoryMarks = student.isAbsentInput ? null : (student.theoryMarksInput.trim() !== '' ? parseFloat(student.theoryMarksInput) : null);
      const practicalMarks = (selectedSubjectDetails.hasPractical && !student.isAbsentInput && student.practicalMarksInput.trim() !== '')
        ? parseFloat(student.practicalMarksInput) : null;
      
      let validationError = null;
      if (!student.isAbsentInput) {
        if (theoryMarks !== null && (isNaN(theoryMarks) || theoryMarks < 0 || theoryMarks > theoryFM)) {
          validationError = `Invalid theory marks for ${student.name}. Expected 0-${theoryFM}, got: ${student.theoryMarksInput}.`;
        }
        if (selectedSubjectDetails.hasPractical && practicalFM !== null && practicalMarks !== null && (isNaN(practicalMarks) || practicalMarks < 0 || practicalMarks > practicalFM)) {
          validationError = `Invalid practical marks for ${student.name}. Expected 0-${practicalFM}, got: ${student.practicalMarksInput}.`;
        }
      }
      if (validationError) {
        throw new Error(validationError);
      }

      const data: Omit<MarkEntryDocument, '$id' | '$collectionId' | '$databaseId'> = {
        examId: selectedExam.$id, studentId: student.$id, classId: currentFilters.classId!,
        sectionId: currentFilters.sectionId!, // Store section ID in marks document for consistency
        subjectName: currentFilters.subjectName!,
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
          const savedDoc = results[savedStudentIndex] as MarkEntryDocument;
          return { ...s, isModified: false, existingMarkEntryId: s.existingMarkEntryId || savedDoc?.$id };
        }
        return s;
      }));
      setExamEntryPercentages(prev => ({ ...prev, [selectedExam.$id]: undefined }));
    } catch (error: any) {
      console.error("Failed to save marks:", error);
      showSnackbar(`Error saving marks: ${error.message || 'Please check your entries and try again.'}`, "error");
    } finally {
      setIsSavingMarks(false);
    }
  };

  const handleCancelChanges = useCallback(() => {
    // ... (unchanged)
    if (selectedExam && currentFilters.classId && currentFilters.sectionId && currentFilters.subjectName) {
        const originalFilters = { ...currentFilters };
        const originalSectionName = selectedSectionName; // Preserve original section name
        setCurrentFilters(prev => ({ ...prev, subjectName: "___temp_reset_trigger___" }));
        setTimeout(() => {
             setCurrentFilters(originalFilters);
             setSelectedSectionName(originalSectionName); // Explicitly restore if needed by fetch logic
        }, 0);
    }
    showSnackbar("Changes cancelled.", "info");
  }, [selectedExam, currentFilters, selectedSectionName]); // Added selectedSectionName

  const hasUnsavedChanges = useMemo(() => studentsForTable.some(s => s.isModified), [studentsForTable]);

  const handleOpenPublishPopover = () => {
    // ... (unchanged)
    if (selectedExam) {
      setPublishIsGpa(selectedExam.isGpa || false);
      setIsPublishPopoverOpen(true);
    }
  };

  const handleConfirmPublish = async () => {
    // ... (unchanged)
    if (!selectedExam || !user) {
      showSnackbar("No exam selected or user not identified.", "error");
      return;
    }
    if (label !== 'admin') {
      showSnackbar("You do not have permission to publish results.", "error");
      return;
    }

    setIsPublishing(true);
    try {
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        EXAMS_COLLECTION_ID,
        selectedExam.$id,
        { isPublished: true, isGpa: publishIsGpa }
      );

      const senderEmail = user.email || 'system@yourdomain.com';
      const notificationPayload: NotificationData = {
        title: `Result Published: ${selectedExam.title}`,
        msg: `Results for exam "${selectedExam.title}" (Type: ${selectedExam.type}) have been published. Results are displayed ${publishIsGpa ? 'using the GPA system' : 'as direct marks'}. Students can now view their marks.`,
        to: ['role:student'],
        valid: getTomorrowDateString(),
        sender: senderEmail,
      };
      await createNotificationEntry(notificationPayload);

      const updatedExamData = { ...selectedExam, isPublished: true, isGpa: publishIsGpa };
      setSelectedExam(updatedExamData);
      setAllExams(prevExams => prevExams.map(ex => ex.$id === selectedExam.$id ? updatedExamData : ex));
      setFilteredExams(prevExams => prevExams.map(ex => ex.$id === selectedExam.$id ? updatedExamData : ex));

      showSnackbar("Results published successfully and notification sent!", "success");
    } catch (error: any) {
      console.error("Failed to publish results:", error);
      showSnackbar(`Error publishing results: ${error.message || 'Please try again.'}`, "error");
    } finally {
      setIsPublishing(false);
      setIsPublishPopoverOpen(false);
    }
  };

  const isPageLoading = !initialAuthAttempted || isLoadingExams;
  const showStudentFilterPrompt = !currentFilters.classId || !currentFilters.sectionId || !currentFilters.subjectName || (!isLoadingStudents && !selectedSectionName && !!currentFilters.sectionId);


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

      {!selectedExam ? (
        <>
            <div className="mb-6">
                <SearchBar placeholder="Search exams by title or type..." value={searchTerm} onValueChange={setSearchTerm} className="max-w-lg" />
            </div>
            {isPageLoading ? (
                <div className="flex justify-center items-center h-48"><Spinner label="Loading Data..." size="lg" /></div>
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
                        isSelected={false}
                        facultyNames={exam.faculty.map(id => facultyMap[id] || id).filter(Boolean)}
                    />
                ))}
                </div>
            )}
        </>
      ) : (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            {label === 'admin' && (
              // ... (Admin Publish Controls - unchanged)
              <div className="mb-6 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-md font-semibold text-indigo-700 flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 mr-2 text-indigo-600" />
                      Admin Controls: Result Publication
                    </h3>
                    {selectedExam.isPublished ? (
                      <p className="text-sm text-green-700 mt-1 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 mr-1 text-green-500" />
                        Results are <strong>Published</strong> ({selectedExam.isGpa ? 'GPA System' : 'Direct Marks'}).
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-700 mt-1 flex items-center">
                        <InformationCircleIcon className="h-5 w-5 mr-1 text-yellow-500" />
                        Results are <strong>Not Published</strong> yet.
                      </p>
                    )}
                  </div>
                  {!selectedExam.isPublished && (
                    <Button 
                      color="primary" 
                      onPress={handleOpenPublishPopover}
                      className="w-full sm:w-auto"
                    >
                      Publish Result
                    </Button>
                  )}
                </div>
              </div>
            )}

            <MarksEntryFilters
                selectedExam={selectedExam}
                onFilterChange={setCurrentFilters}
                currentFilters={currentFilters}
            />

            {showStudentFilterPrompt ? (
                 <p className="text-center text-gray-500 mt-8 p-6 bg-indigo-50 rounded-md border border-indigo-100">
                    {currentFilters.sectionId && !selectedSectionName && !isLoadingStudents ? "Verifying section details..." : "Please select a Class, Section, and Subject above to view students and enter marks."}
                </p>
            ) : isLoadingStudents ? (
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
            )}
        </div>
      )}

      {selectedExam && (
        // ... (Popover for Confirming Publication - unchanged)
        <Popover
          isOpen={isPublishPopoverOpen}
          onClose={() => setIsPublishPopoverOpen(false)}
          onConfirm={handleConfirmPublish}
          title={<span className="flex items-center"><ShieldCheckIcon className="h-5 w-5 mr-2 text-indigo-600"/>Confirm Result Publication</span>}
          isConfirmLoading={isPublishing}
          content={
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You are about to publish the results for <strong>{selectedExam.title}</strong>.
                Once published, students will be able to see their marks. This action also sends a notification.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result Display Format:</label>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-100">
                    <input
                      type="radio"
                      name="gpaChoice"
                      value="direct"
                      checked={!publishIsGpa}
                      onChange={() => setPublishIsGpa(false)}
                      className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      disabled={isPublishing}
                    />
                    <span className="text-sm text-gray-700">Direct Marks</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-100">
                    <input
                      type="radio"
                      name="gpaChoice"
                      value="gpa"
                      checked={publishIsGpa}
                      onChange={() => setPublishIsGpa(true)}
                      className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      disabled={isPublishing}
                    />
                    <span className="text-sm text-gray-700">GPA System</span>
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                The chosen display format ({publishIsGpa ? 'GPA System' : 'Direct Marks'}) will be saved for this exam.
              </p>
            </div>
          }
        />
      )}
    </div>
  );
};

export default TeacherMarksEntryPage;