// src/features/student-results/utils/resultCalculations.ts
import { SubjectDetail, GpaInfo, MarkEntryDocumentForResults, ProcessedSubjectResult, ExamResultSummary } from 'types/studentResult.types';

export const calculateGradeAndPoint = (percent: number | null | undefined): GpaInfo => {
  if (percent === null || percent === undefined || isNaN(percent) || percent < 0) return { grade: "N/A", point: 0.0 };
  if (percent > 90) return { grade: "A+", point: 4.0 };
  if (percent > 80) return { grade: "A", point: 3.6 };
  if (percent > 70) return { grade: "B+", point: 3.2 };
  if (percent > 60) return { grade: "B", point: 2.8 };
  if (percent > 50) return { grade: "C+", point: 2.4 };
  if (percent > 40) return { grade: "C", point: 2.0 };
  if (percent >= 35) return { grade: "D", point: 1.6 };
  return { grade: "NG", point: 0.0 };
};

export const parseStudentSubjectDetails = (jsonString: string): SubjectDetail[] => {
  try {
    const items = JSON.parse(jsonString);
    if (!Array.isArray(items)) return [];
    return items.map((item: any) => ({
      name: String(item.name), // Ensure string
      date: String(item.date), // Ensure string
      theoryFM: Number(item.theoryFM),
      theoryPM: Number(item.theoryPM),
      hasPractical: !!item.hasPractical,
      practicalFM: item.hasPractical && item.practicalFM != null ? Number(item.practicalFM) : null,
      practicalPM: item.hasPractical && item.practicalPM != null ? Number(item.practicalPM) : null,
    }));
  } catch (error) {
    console.error('Error parsing subject details:', error);
    return [];
  }
};

export const processExamResultsForStudent = (
  subjectDetailsList: SubjectDetail[],
  marksEntries: MarkEntryDocumentForResults[],
  isGpaMode: boolean
): { processedSubjects: ProcessedSubjectResult[], summary: ExamResultSummary } => {
  let overallExamPassed = true;
  const processedSubjects: ProcessedSubjectResult[] = [];
  let totalExamGpaPointsSum = 0;
  let numSubjectsCountedForExamGpa = 0;
  let grandTotalMarksObtained = 0;
  let grandTotalFullMarks = 0;

  for (const sd of subjectDetailsList) {
    const markEntry = marksEntries.find(me => me.subjectName === sd.name);
    const theoryFM = Number(sd.theoryFM);
    const theoryPM = Number(sd.theoryPM);
    const hasPractical = sd.hasPractical;
    const practicalFM = hasPractical && sd.practicalFM != null ? Number(sd.practicalFM) : null;
    const practicalPM = hasPractical && sd.practicalPM != null ? Number(sd.practicalPM) : null;

    const theoryMarks = markEntry && !markEntry.isAbsent ? markEntry.theoryMarksObtained : null;
    const practicalMarks = hasPractical && markEntry && !markEntry.isAbsent ? markEntry.practicalMarksObtained : null;
    // Consider absent if specifically marked, or if no marks exist for this subject AT ALL when other subjects might have marks.
    // A more robust 'isAbsent' might come directly from the markEntry. If no markEntry, it's more complex.
    // For now, if markEntry exists, use its isAbsent. If not, assume marks not entered rather than absent, unless all marks are missing.
    const isAbsent = markEntry?.isAbsent ?? false; // Default to false if no markEntry, refine if needed

    const subjectResult: ProcessedSubjectResult = {
      subjectName: sd.name,
      theoryFM, theoryPM, practicalFM, practicalPM, hasPractical,
      theoryMarksObtained: theoryMarks, practicalMarksObtained: practicalMarks, isAbsent,
      subjectFullMarks: theoryFM + (hasPractical && practicalFM ? practicalFM : 0),
    };

    if (isAbsent) {
      if (isGpaMode) {
        subjectResult.theoryGpa = { grade: "ABS", point: 0 }; // Specific ABS grade
        if (hasPractical) subjectResult.practicalGpa = { grade: "ABS", point: 0 };
        subjectResult.subjectAverageGpaPoint = 0;
        subjectResult.subjectOverallLetterGrade = "ABS";
        subjectResult.subjectGpaStatus = 'Absent';
      } else {
        subjectResult.subjectTotalMarksObtained = null; // Use null for "not entered" vs 0 for "zero marks"
        subjectResult.subjectMarksStatus = 'Absent';
      }
      overallExamPassed = false; // Absence in one subject means overall fail or needs special consideration
    } else {
      if (isGpaMode) {
        const theoryPercent = theoryFM > 0 && theoryMarks !== null ? (theoryMarks / theoryFM) * 100 : null;
        subjectResult.theoryPercentage = theoryPercent;
        subjectResult.theoryGpa = calculateGradeAndPoint(theoryPercent);

        let subjectComponentGpaPointsSum = subjectResult.theoryGpa.point;
        let gpaComponentCount = 1;
        let subjectFailedAnyComponent = subjectResult.theoryGpa.grade === "NG";

        if (hasPractical) {
          const practicalPercent = practicalFM && practicalFM > 0 && practicalMarks !== null ? (practicalMarks / practicalFM) * 100 : null;
          subjectResult.practicalPercentage = practicalPercent;
          subjectResult.practicalGpa = calculateGradeAndPoint(practicalPercent);
          if (subjectResult.practicalGpa) {
            subjectComponentGpaPointsSum += subjectResult.practicalGpa.point;
            gpaComponentCount++;
            if (subjectResult.practicalGpa.grade === "NG") {
              subjectFailedAnyComponent = true;
            }
          } else { // Practical marks not entered or invalid
             subjectResult.practicalGpa = { grade: "N/A", point: 0.0}; // Or handle as NG if required
          }
        }
        
        subjectResult.subjectAverageGpaPoint = gpaComponentCount > 0 ? subjectComponentGpaPointsSum / gpaComponentCount : 0;
        
        const averagePointPercentageEquivalent = subjectResult.subjectAverageGpaPoint != null
            ? (subjectResult.subjectAverageGpaPoint / 4.0) * 100
            : null;
        const overallSubjectGradeInfo = calculateGradeAndPoint(averagePointPercentageEquivalent);
        subjectResult.subjectOverallLetterGrade = overallSubjectGradeInfo.grade;

        if (subjectFailedAnyComponent || subjectResult.subjectOverallLetterGrade === "NG") {
          subjectResult.subjectGpaStatus = 'NG'; // Use NG for subject failure
          overallExamPassed = false;
        } else {
          subjectResult.subjectGpaStatus = 'Passed'; // Passed this subject
        }
        
        // Only add to exam GPA sum if subject is not NG/Failed/Absent
        if (subjectResult.subjectGpaStatus === 'Passed') {
            totalExamGpaPointsSum += subjectResult.subjectAverageGpaPoint;
            numSubjectsCountedForExamGpa++;
        }


      } else { // Marks Mode
        let currentSubjectPassed = true;
        if (theoryMarks === null || theoryMarks < theoryPM) currentSubjectPassed = false;
        if (hasPractical && practicalPM !== null && (practicalMarks === null || practicalMarks < practicalPM)) currentSubjectPassed = false;
        
        subjectResult.subjectTotalMarksObtained = (theoryMarks ?? 0) + (practicalMarks ?? 0);
        subjectResult.subjectMarksStatus = currentSubjectPassed ? 'Passed' : 'Failed';
        if (!currentSubjectPassed) overallExamPassed = false;

        grandTotalMarksObtained += subjectResult.subjectTotalMarksObtained;
        grandTotalFullMarks += subjectResult.subjectFullMarks;
      }
    }
    processedSubjects.push(subjectResult);
  }

  const summary: ExamResultSummary = {
    examId: marksEntries[0]?.examId || subjectDetailsList[0]?.name || "unknown_exam",
    isGpa: isGpaMode,
    overallResultStatus: 'Awaited', // Default to Awaited
  };
  
  if (subjectDetailsList.length === 0) {
      summary.overallResultStatus = 'Awaited'; // No subjects, so awaited
  } else if (processedSubjects.every(s => s.isAbsent)) {
      summary.overallResultStatus = 'Failed'; // All absent is a fail
  } else if (processedSubjects.some(s => s.isAbsent && s.subjectGpaStatus === 'Absent' || s.subjectMarksStatus === 'Absent')) {
      // If any subject is 'Absent', the overall might be 'Failed' or specific status.
      // For now, if any absent, consider failed unless other rules apply.
      // This needs business logic for "promoted" if some subjects are absent.
      overallExamPassed = false; 
  }


  if (isGpaMode) {
    summary.finalGpa = numSubjectsCountedForExamGpa > 0 ? parseFloat((totalExamGpaPointsSum / numSubjectsCountedForExamGpa).toFixed(2)) : 0;
    if (numSubjectsCountedForExamGpa === 0 && subjectDetailsList.length > 0 && !processedSubjects.every(s => s.isAbsent)) {
        // All subjects might be NG, or marks not entered.
        summary.overallResultStatus = 'Failed'; // Or Awaited if marks not entered
    } else if (overallExamPassed && numSubjectsCountedForExamGpa > 0) {
        summary.overallResultStatus = 'Passed';
    } else if (!overallExamPassed && subjectDetailsList.length > 0) {
        summary.overallResultStatus = 'Failed';
    }
    // Refine Failed if GPA is too low even if individual subjects passed
    if (summary.overallResultStatus === 'Passed' && summary.finalGpa < 1.6) { // Min pass GPA for exam
        summary.overallResultStatus = 'Failed';
    }

  } else { // Marks mode
    summary.grandTotalMarks = grandTotalMarksObtained;
    summary.totalFullMarks = grandTotalFullMarks;
    summary.totalPercentage = grandTotalFullMarks > 0 ? parseFloat(((grandTotalMarksObtained / grandTotalFullMarks) * 100).toFixed(2)) : 0;
    if (subjectDetailsList.length > 0) { // Only determine pass/fail if there are subjects
        summary.overallResultStatus = overallExamPassed ? 'Passed' : 'Failed';
    }
  }
  
  // Check if all marks are null and not absent, then it's awaited.
  const allMarksNullAndNotAbsent = processedSubjects.length > 0 && 
                                 processedSubjects.every(ps => 
                                     !ps.isAbsent && 
                                     ps.theoryMarksObtained === null && 
                                     (!ps.hasPractical || ps.practicalMarksObtained === null)
                                 );
  if (allMarksNullAndNotAbsent) {
    summary.overallResultStatus = 'Awaited';
  }


  return { processedSubjects, summary };
};