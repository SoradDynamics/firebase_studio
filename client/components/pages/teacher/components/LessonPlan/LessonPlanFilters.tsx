import React, { useMemo } from 'react';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import SearchBar from '../../../common/SearchBar'; // Assuming path
import { useLessonPlanStore, getUniqueFilterOptions, TeacherContext } from '~/store/lessonPlanStore';
import { Button } from '@heroui/react';

const LessonPlanFilters: React.FC = () => {
  const { assignedContexts, currentFilters, setFilter, clearFilters, isLoadingContexts } = useLessonPlanStore();

  const facultyOptions = useMemo(() => getUniqueFilterOptions(assignedContexts, 'facultyId'), [assignedContexts]);
  const classOptions = useMemo(() => getUniqueFilterOptions(assignedContexts, 'class', { facultyId: currentFilters.facultyId }), [assignedContexts, currentFilters.facultyId]);
  const sectionOptions = useMemo(() => getUniqueFilterOptions(assignedContexts, 'sectionId', { facultyId: currentFilters.facultyId, class: currentFilters.class }), [assignedContexts, currentFilters.facultyId, currentFilters.class]);
  const subjectOptions = useMemo(() => getUniqueFilterOptions(assignedContexts, 'subject', { facultyId: currentFilters.facultyId, class: currentFilters.class, sectionId: currentFilters.sectionId }), [assignedContexts, currentFilters.facultyId, currentFilters.class, currentFilters.sectionId]);

  const statusOptions: SelectOption[] = [
    { id: 'planned', name: 'Planned' },
    { id: 'completed', name: 'Completed' },
    { id: 'partially-completed', name: 'Partially Completed' },
  ];

  const handleFilterChange = (filterName: keyof typeof currentFilters, value: string | null) => {
    setFilter(filterName, value);
    // Reset dependent filters
    if (filterName === 'facultyId') {
        setFilter('class', null);
        setFilter('sectionId', null);
        setFilter('subject', null);
    } else if (filterName === 'class') {
        setFilter('sectionId', null);
        setFilter('subject', null);
    } else if (filterName === 'sectionId') {
        setFilter('subject', null);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        <CustomSelect
          label="Faculty"
          options={facultyOptions}
          value={currentFilters.facultyId || null}
          onChange={(val) => handleFilterChange('facultyId', val)}
          placeholder="All Faculties"
          disabled={isLoadingContexts || facultyOptions.length === 0}
        />
        <CustomSelect
          label="Class"
          options={classOptions}
          value={currentFilters.class || null}
          onChange={(val) => handleFilterChange('class', val)}
          placeholder="All Classes"
          disabled={isLoadingContexts || !currentFilters.facultyId || classOptions.length === 0}
        />
        <CustomSelect
          label="Section"
          options={sectionOptions}
          value={currentFilters.sectionId || null}
          onChange={(val) => handleFilterChange('sectionId', val)}
          placeholder="All Sections"
          disabled={isLoadingContexts || !currentFilters.class || sectionOptions.length === 0}
        />
        <CustomSelect
          label="Subject"
          options={subjectOptions}
          value={currentFilters.subject || null}
          onChange={(val) => handleFilterChange('subject', val)}
          placeholder="All Subjects"
          disabled={isLoadingContexts || !currentFilters.sectionId || subjectOptions.length === 0}
        />
        <CustomSelect
          label="Status"
          options={statusOptions}
          value={currentFilters.status || null}
          onChange={(val) => handleFilterChange('status', val)}
          placeholder="Any Status"
        />
        <SearchBar
          placeholder="Search by title..."
          value={currentFilters.searchText || ''}
          onValueChange={(val) => handleFilterChange('searchText', val)}
          className="md:col-span-2 lg:col-span-1"
        />
         <Button
            color="default"
            variant="ghost"
            onClick={clearFilters}
            className="h-10"
            >
            Clear Filters
        </Button>
      </div>
    </div>
  );
};

export default LessonPlanFilters;