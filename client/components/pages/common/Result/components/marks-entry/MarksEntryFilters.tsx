// src/components/marks-entry/MarksEntryFilters.tsx
import React, { useEffect, useState } from 'react';
import CustomSelect, { SelectOption } from '../../../../common/CustomSelect';
import { Exam, SectionDocument } from '../../types/appwrite.types';
import { databases, Query, APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID } from '~/utils/appwrite';

interface MarksEntryFiltersProps {
  selectedExam: Exam | null;
  onFilterChange: (filters: { classId: string | null; sectionId: string | null; subjectName: string | null }) => void;
  currentFilters: { classId: string | null; sectionId: string | null; subjectName: string | null };
}

const MarksEntryFilters: React.FC<MarksEntryFiltersProps> = ({ selectedExam, onFilterChange, currentFilters }) => {
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<SelectOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  // Populate class options when exam changes
  useEffect(() => {
    if (selectedExam) {
      const classes = selectedExam.class.map(c => ({ id: c, name: c }));
      setClassOptions(classes);
      if (currentFilters.classId && !selectedExam.class.includes(currentFilters.classId)) {
        // Pass the current subjectName when resetting class/section
        onFilterChange({ classId: null, sectionId: null, subjectName: currentFilters.subjectName });
      }
    } else {
      setClassOptions([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, onFilterChange, currentFilters.classId, currentFilters.subjectName]); // currentFilters.classId and subjectName for stable reset logic

  // Populate section options when exam and selected class change
  useEffect(() => {
    if (selectedExam && currentFilters.classId) {
      setIsLoadingSections(true);
      setSectionOptions([]);

      const fetchSections = async () => {
        try {
          const sectionQueries: string[] = [
            Query.equal('class', currentFilters.classId!),
            Query.limit(100)
          ];

          if (selectedExam.section && selectedExam.section.length > 0) {
            sectionQueries.push(Query.equal('$id', selectedExam.section));
          }

          const response = await databases.listDocuments<SectionDocument>(
            APPWRITE_DATABASE_ID,
            SECTIONS_COLLECTION_ID,
            sectionQueries
          );
          const sections = response.documents.map(s => ({ id: s.$id, name: s.name }));
          setSectionOptions(sections);

          if (currentFilters.sectionId && !sections.some(s => s.id === currentFilters.sectionId)) {
            // Pass the current subjectName and classId when resetting section
            onFilterChange({ classId: currentFilters.classId, sectionId: null, subjectName: currentFilters.subjectName });
          }

        } catch (error) {
          console.error("Failed to fetch sections:", error);
          setSectionOptions([]);
        } finally {
          setIsLoadingSections(false);
        }
      };
      fetchSections();
    } else {
      setSectionOptions([]);
      if (isLoadingSections) setIsLoadingSections(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, currentFilters.classId, onFilterChange, currentFilters.subjectName, currentFilters.sectionId]); // Added relevant parts of currentFilters for stable reset

  // Populate subject options when exam changes
  useEffect(() => {
    if (selectedExam) {
      const subjects = selectedExam.subjectDetails.map(s => ({ id: s.name, name: s.name }));
      setSubjectOptions(subjects);
       if (currentFilters.subjectName && !selectedExam.subjectDetails.some(s => s.name === currentFilters.subjectName)) {
        // Pass the current classId and sectionId when resetting subject
        onFilterChange({ classId: currentFilters.classId, sectionId: currentFilters.sectionId, subjectName: null });
      }
    } else {
      setSubjectOptions([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, onFilterChange, currentFilters.classId, currentFilters.sectionId, currentFilters.subjectName]); // Added relevant parts of currentFilters for stable reset


  const handleClassChange = (classId: string | null) => {
    onFilterChange({ classId, sectionId: null, subjectName: currentFilters.subjectName });
  };

  const handleSectionChange = (sectionId: string | null) => {
    // When section changes, classId and subjectName should remain
    onFilterChange({ classId: currentFilters.classId, sectionId, subjectName: currentFilters.subjectName });
  };

  const handleSubjectChange = (subjectName: string | null) => {
    // When subject changes, classId and sectionId should remain
    onFilterChange({ classId: currentFilters.classId, sectionId: currentFilters.sectionId, subjectName });
  };

  if (!selectedExam) return null;

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3 text-gray-700">Filter Students for '{selectedExam.title}'</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CustomSelect
          label="Class"
          options={classOptions}
          value={currentFilters.classId}
          onChange={handleClassChange}
          placeholder="Select Class"
          disabled={!selectedExam || classOptions.length === 0}
        />
        <CustomSelect
          label="Section"
          options={sectionOptions}
          value={currentFilters.sectionId}
          onChange={handleSectionChange}
          placeholder={isLoadingSections ? "Loading Sections..." : (sectionOptions.length === 0 && currentFilters.classId ? "No sections found" : "Select Section")}
          disabled={!currentFilters.classId || isLoadingSections || (sectionOptions.length === 0 && !!currentFilters.classId)}
        />
        <CustomSelect
          label="Subject"
          options={subjectOptions}
          value={currentFilters.subjectName}
          onChange={handleSubjectChange}
          placeholder="Select Subject"
          disabled={!selectedExam || subjectOptions.length === 0}
        />
      </div>
    </div>
  );
};

export default MarksEntryFilters;