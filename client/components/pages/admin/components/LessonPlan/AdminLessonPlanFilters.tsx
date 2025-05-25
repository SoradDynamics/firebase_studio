import React, { useMemo } from 'react';
import { useAdminLessonPlanStore } from '~/store/adminLessonPlanStore';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import SearchBar from '../../../common/SearchBar';
import { Button } from '@heroui/react';

const AdminLessonPlanFilters: React.FC = () => {
  const {
    currentFilters, setFilter, clearFilters,
    allTeachers, allFaculties, allSections, allClasses, allSubjects,
    isLoadingFilterData, isLoadingLessonPlans,
  } = useAdminLessonPlanStore();

  const facultyOptions: SelectOption[] = useMemo(() => 
    allFaculties.map(f => ({ id: f.$id, name: f.name })), 
    [allFaculties]
  );

  const classOptions: SelectOption[] = useMemo(() => {
    if (currentFilters.facultyId) {
      const selectedFaculty = allFaculties.find(f => f.$id === currentFilters.facultyId);
      return selectedFaculty?.classes?.map(c => ({ id: c, name: c })).sort((a,b) => a.name.localeCompare(b.name)) || [];
    }
    return allClasses.map(c => ({ id: c, name: c }));
  }, [allClasses, allFaculties, currentFilters.facultyId]);

  const sectionOptions: SelectOption[] = useMemo(() => {
    let filteredSections = allSections;
    if (currentFilters.facultyId) {
      filteredSections = filteredSections.filter(s => s.facultyId === currentFilters.facultyId);
    }
    if (currentFilters.class) {
      filteredSections = filteredSections.filter(s => s.class === currentFilters.class);
    }
    return filteredSections.map(s => ({ id: s.$id, name: s.name })).sort((a,b) => a.name.localeCompare(b.name));
  }, [allSections, currentFilters.facultyId, currentFilters.class]);

  const subjectOptions: SelectOption[] = useMemo(() => 
    allSubjects.map(s => ({ id: s, name: s })), 
    [allSubjects]
  );

  const teacherOptions: SelectOption[] = useMemo(() => 
    allTeachers.map(t => ({ id: t.$id, name: t.name })), 
    [allTeachers]
  );

  const statusOptions: SelectOption[] = [
    { id: 'planned', name: 'Planned' },
    { id: 'completed', name: 'Completed' },
    { id: 'partially-completed', name: 'Partially Completed' },
  ];
  const publicOptions: SelectOption[] = [
    { id: 'true', name: 'Public' },
    { id: 'false', name: 'Private' },
  ];

  const isLoading = isLoadingFilterData || isLoadingLessonPlans;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        <CustomSelect label="Faculty" options={facultyOptions} value={currentFilters.facultyId} 
                      onChange={(val) => setFilter('facultyId', val)} placeholder="All Faculties" disabled={isLoading} allowClear />
        <CustomSelect label="Class" options={classOptions} value={currentFilters.class} 
                      onChange={(val) => setFilter('class', val)} placeholder="All Classes" disabled={isLoading || !currentFilters.facultyId && classOptions.length > 20} allowClear /> {/* Disable if too many without faculty */}
        <CustomSelect label="Section" options={sectionOptions} value={currentFilters.sectionId} 
                      onChange={(val) => setFilter('sectionId', val)} placeholder="All Sections" disabled={isLoading || (!currentFilters.class && sectionOptions.length > 20)} allowClear />
        <CustomSelect label="Subject" options={subjectOptions} value={currentFilters.subject} 
                      onChange={(val) => setFilter('subject', val)} placeholder="All Subjects" disabled={isLoading} allowClear />
        <CustomSelect label="Teacher" options={teacherOptions} value={currentFilters.teacherId} 
                      onChange={(val) => setFilter('teacherId', val)} placeholder="All Teachers" disabled={isLoading} allowClear />
        <CustomSelect label="Status" options={statusOptions} value={currentFilters.status} 
                      onChange={(val) => setFilter('status', val)} placeholder="Any Status" disabled={isLoading} allowClear />
        <CustomSelect label="Visibility" options={publicOptions} value={currentFilters.isPublic === null ? null : String(currentFilters.isPublic)} 
                      onChange={(val) => setFilter('isPublic', val === null ? null : val === 'true')} placeholder="Any Visibility" disabled={isLoading} allowClear />
        <SearchBar placeholder="Search by title..." value={currentFilters.searchText || ''} 
                   onValueChange={(val) => setFilter('searchText', val)} className="md:col-span-2 lg:col-span-1" />
        <Button color="default" variant="ghost" onClick={clearFilters} className="h-10" disabled={isLoading}>
            Clear All Filters
        </Button>
      </div>
    </div>
  );
};
export default AdminLessonPlanFilters;