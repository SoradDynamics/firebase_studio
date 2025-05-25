import React, { useMemo } from 'react';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect'; // Ensure path is correct
import SearchBar from '../../../common/SearchBar'; // Ensure path is correct
import { useStudentViewStore } from '~/store/studentLesson';
import { Button } from '@heroui/react';

const StudentLessonPlanFilters: React.FC = () => {
  const { 
    currentFilters, 
    setFilter, 
    clearFilters, 
    availableSubjects, 
    availableTeachers,
    isLoadingLessonPlans 
} = useStudentViewStore();

  const subjectOptions: SelectOption[] = useMemo(() => 
    availableSubjects.map(s => ({ id: s, name: s })),
    [availableSubjects]
  );

  const teacherOptions: SelectOption[] = useMemo(() => 
    availableTeachers.map(t => ({ id: t.id, name: t.name })),
    [availableTeachers]
  );

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
        <CustomSelect
          label="Subject"
          options={subjectOptions}
          value={currentFilters.subject || null}
          onChange={(val) => setFilter('subject', val)}
          placeholder="All Subjects"
          disabled={isLoadingLessonPlans || subjectOptions.length === 0}
          allowClear={true}
        />
        <CustomSelect
          label="Teacher"
          options={teacherOptions}
          value={currentFilters.teacherId || null}
          onChange={(val) => setFilter('teacherId', val)}
          placeholder="All Teachers"
          disabled={isLoadingLessonPlans || teacherOptions.length === 0}
          allowClear={true}
        />
        <SearchBar
          placeholder="Search by title..."
          value={currentFilters.searchText || ''}
          onValueChange={(val) => setFilter('searchText', val)}
          className="sm:col-span-2 md:col-span-1" // Adjust spanning
        />
         <Button
            color="default"
            variant="ghost"
            onClick={clearFilters}
            className="h-10 mt-auto" // Align button
            isDisabled={isLoadingLessonPlans}
            >
            Clear Filters
        </Button>
      </div>
    </div>
  );
};

export default StudentLessonPlanFilters;