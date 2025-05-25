// src/features/lesson-planning/components/LessonPlanFilters.tsx
import React, { useEffect } from 'react'; // Import useEffect
import CustomSelect from '../../../common/CustomSelect';
import SearchBar from '../../../common/SearchBar';
import { useLessonPlanStore } from '~/store/lessonPlanStore';

const LessonPlanFilters: React.FC = () => {
  const {
    filters,
    setFilter,
    facultyOptions,
    classOptions,
    sectionOptions,
    subjectOptions,
    statusOptions,
    _updateFilterOptions, // Get this action from the store
    loadLessonPlans,     // Get this action from the store
  } = useLessonPlanStore(state => ({
    filters: state.filters,
    setFilter: state.setFilter,
    facultyOptions: state.facultyOptions,
    classOptions: state.classOptions,
    sectionOptions: state.sectionOptions,
    subjectOptions: state.subjectOptions,
    statusOptions: state.statusOptions,
    _updateFilterOptions: state._updateFilterOptions, // Make sure it's exposed in store type
    loadLessonPlans: state.loadLessonPlans,
  }));

  // This effect will run whenever the 'filters' object changes.
  // This is where we'll now trigger the dependent actions.
  useEffect(() => {
    console.log('[LessonPlanFilters useEffect] Filters changed:', filters);
    _updateFilterOptions(); // Update the dropdown options based on the new filters
    loadLessonPlans();      // Load lesson plans based on the new filters
  }, [filters, _updateFilterOptions, loadLessonPlans]); // Dependencies

  const handleFilterChange = <K extends keyof typeof filters>(
    filterName: K,
    value: (typeof filters)[K]
  ) => {
    console.log(`[LessonPlanFilters handleFilterChange] Setting filter ${String(filterName)} to`, value);
    setFilter(filterName, value);
    // The useEffect above will handle _updateFilterOptions and loadLessonPlans
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
        <CustomSelect
          label="Faculty"
          options={facultyOptions}
          value={filters.facultyId}
          onChange={(id) => handleFilterChange('facultyId', id)}
          placeholder="All Faculties"
        />
        <CustomSelect
          label="Class"
          options={classOptions}
          value={filters.className}
          onChange={(id) => handleFilterChange('className', id)}
          placeholder="All Classes"
          disabled={!filters.facultyId && facultyOptions.length > 0}
        />
        <CustomSelect
          label="Section"
          options={sectionOptions}
          value={filters.sectionId}
          onChange={(id) => handleFilterChange('sectionId', id)}
          placeholder="All Sections"
          disabled={!filters.className && classOptions.length > 0}
        />
        <CustomSelect
          label="Subject"
          options={subjectOptions}
          value={filters.subject}
          onChange={(id) => handleFilterChange('subject', id)}
          placeholder="All Subjects"
          disabled={!filters.sectionId && sectionOptions.length > 0}
        />
        <CustomSelect
          label="Status"
          options={statusOptions}
          value={filters.status}
          onChange={(id) => handleFilterChange('status', id)}
          placeholder="Any Status"
        />
        <div className="lg:col-span-1">
            <label htmlFor="search-lesson-plan" className="block text-sm font-medium text-gray-700 mb-1">Search Title</label>
            <SearchBar
                placeholder="Search by title..."
                value={filters.searchText}
                onValueChange={(text) => handleFilterChange('searchText', text)}
                className="w-full"
            />
        </div>
      </div>
    </div>
  );
};

export default LessonPlanFilters;