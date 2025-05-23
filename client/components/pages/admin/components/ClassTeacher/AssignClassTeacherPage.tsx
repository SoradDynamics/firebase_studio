// src/pages/admin/AssignClassTeacherPage.tsx
import React, { useEffect, useState } from 'react';
import useAssignClassTeacherStore from '~/store/assignClassTeacherStore';
import SectionCard from './SectionCard';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import SearchBar from '../../../common/SearchBar'; // Assuming path
import { Drawer } from '../../../../common/Drawer'; // Assuming path
import { Button } from '@heroui/react'; // For Drawer buttons
import { EnrichedSection } from 'types';
import { toast, Toaster } from 'react-hot-toast'; // For notifications
import { ExclamationTriangleIcon, FunnelIcon, XMarkIcon, InformationCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'; // Added MagnifyingGlassIcon for consistency

const AssignClassTeacherPage: React.FC = () => {
  const {
    fetchInitialData,
    filteredSections,
    sections,
    facultyOptions,
    classOptions, // Dynamically updated by the store
    teacherOptions,
    selectedFacultyDocId, // This is the value for the faculty select
    selectedClass,      // This is the value for the class select
    searchTerm,
    setFacultyFilter,
    setClassFilter,
    setSearchTerm,
    updateClassTeacher,
    isLoading,
    isUpdating,
    error,
  } = useAssignClassTeacherStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<EnrichedSection | null>(null);
  const [selectedTeacherIdInDrawer, setSelectedTeacherIdInDrawer] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true); // Default to true for desktop, can be toggled on mobile

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleOpenDrawer = (sectionItem: EnrichedSection) => {
    setCurrentSection(sectionItem);
    setSelectedTeacherIdInDrawer(sectionItem.class_teacher || null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setCurrentSection(null);
    setSelectedTeacherIdInDrawer(null);
  };

  const handleSaveClassTeacher = async () => {
    if (!currentSection || !currentSection.$id) {
      toast.error("No section selected for update.");
      return;
    }
    
    const success = await updateClassTeacher(currentSection.$id, selectedTeacherIdInDrawer);
    if (success) {
      toast.success(`Class teacher ${selectedTeacherIdInDrawer ? 'updated' : 'unassigned'} successfully for ${currentSection.name}.`);
      handleCloseDrawer();
    } else {
      toast.error(useAssignClassTeacherStore.getState().error || "Failed to update class teacher.");
    }
  };
  
  if (isLoading && sections.length === 0 && !error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
        <p className="ml-4 mt-3 text-lg text-gray-700">Loading sections...</p>
      </div>
    );
  }

  if (error && sections.length === 0) {
    return (
        <div className="flex flex-col justify-center items-center h-screen bg-gray-50 p-6 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 max-w-md mb-6">{error}</p>
            <Button color="primary" onPress={() => { useAssignClassTeacherStore.setState({ error: null }); fetchInitialData(); }} className="mt-6">
                Try Again
            </Button>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
      <Toaster position="top-right" containerClassName="text-sm" />
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Assign Class Teachers</h1>
        <p className="text-gray-600 mt-1">View sections, assign or change class teachers.</p>
      </header>

      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <div className="flex justify-between items-center mb-3 md:hidden"> {/* Mobile filter toggle */}
            <h2 className="text-lg font-semibold text-gray-700">Filters & Search</h2>
            <Button
                variant="light"
                size="sm"
                onPress={() => setShowFilters(!showFilters)}
                startContent={showFilters ? <XMarkIcon className="w-5 h-5" /> : <FunnelIcon className="w-5 h-5" />}
            >
                {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
        </div>
        <div className={`${showFilters ? 'grid' : 'hidden md:grid'} grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-end`}>
          <div>
            <CustomSelect
                label="Filter by Faculty"
                options={facultyOptions}
                value={selectedFacultyDocId} // This should be the faculty's $id
                onChange={setFacultyFilter}
                placeholder="All Faculties"
                allowClear={true}
                className="w-full"
            />
          </div>
          <div>
            <CustomSelect
                label="Filter by Class"
                options={classOptions} // Dynamically updated from store
                value={selectedClass}
                onChange={setClassFilter}
                placeholder={selectedFacultyDocId ? "Select Class" : "All Classes"} // More dynamic placeholder
                allowClear={true}
                className="w-full"
                disabled={classOptions.length === 0 && !!selectedFacultyDocId} // Disable if a faculty is selected but has no classes
            />
          </div>
          <div className="md:col-span-1">
            <label htmlFor="search-sections-input" className="block text-sm font-medium text-gray-700 mb-1">
                Search Sections
            </label>
            <SearchBar
                placeholder="Name, teacher, subject..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="w-full"
                inputClassName="max-w-full"
                // id="search-sections-input" // Add id if label's htmlFor needs it. HeroUI Input might handle this.
            />
          </div>
        </div>
      </div>
      
      {error && sections.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600"/>
                <span>{error}</span>
            </div>
            <button onClick={() => useAssignClassTeacherStore.setState({ error: null })} className="text-red-600 hover:text-red-800">
                <XMarkIcon className="w-5 h-5"/>
            </button>
        </div>
      )}

      {/* Loading indicator specifically for filtering, if main data is already loaded */}
      {isLoading && filteredSections.length === 0 && sections.length > 0 && (
          <div className="text-center py-10 bg-white shadow rounded-lg mt-5">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <p className="text-gray-500 text-md">Applying filters...</p>
          </div>
      )}
      
      {!isLoading && filteredSections.length === 0 && (searchTerm || selectedClass || selectedFacultyDocId) && sections.length > 0 && (
         <div className="text-center py-10 bg-white shadow rounded-lg mt-5">
          <MagnifyingGlassIcon className="mx-auto h-20 w-20 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Sections Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No sections match your current filter or search criteria. Try adjusting them.
          </p>
        </div>
      )}
       {!isLoading && filteredSections.length === 0 && !searchTerm && !selectedClass && !selectedFacultyDocId && sections.length > 0 && (
         <div className="text-center py-10 bg-white shadow rounded-lg mt-5">
          <InformationCircleIcon className="mx-auto h-20 w-20 text-blue-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Sections Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are currently no sections in the system to display.
          </p>
        </div>
      )}


      {filteredSections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {filteredSections.map((section) => (
            <SectionCard
              key={section.$id}
              section={section}
              onChangeTeacher={handleOpenDrawer}
            />
          ))}
        </div>
      )}

      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={`Assign Teacher: ${currentSection?.name || 'Section'}`}
        position="right"
        size="md"
      >
        <Drawer.Body className="flex flex-col space-y-6 pt-6">
          {currentSection && (
            <>
              <div>
                <p className="text-sm text-gray-600 mb-0.5">Section Details:</p>
                <p className="font-medium text-gray-800">{currentSection.name}</p>
                <p className="text-xs text-gray-500">
                  Class: {currentSection.class} • Faculty: {currentSection.facultyName}
                </p>
              </div>
              
              <div className="flex-grow">
                <CustomSelect
                    label="Select Class Teacher"
                    options={teacherOptions}
                    value={selectedTeacherIdInDrawer}
                    onChange={(id) => setSelectedTeacherIdInDrawer(id)}
                    placeholder="Choose a teacher or Unassign"
                    allowClear={true}
                    className="w-full" 
                />
              </div>

              {selectedTeacherIdInDrawer && (
                <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-md border border-blue-200">
                  Selected Teacher: <span className="font-semibold">{teacherOptions.find(t => String(t.id) === String(selectedTeacherIdInDrawer))?.name || 'N/A'}</span>
                </p>
              )}
               {!selectedTeacherIdInDrawer && currentSection.class_teacher && (
                <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md border border-yellow-300">
                  <ExclamationTriangleIcon className="h-5 w-5 inline mr-1.5 -mt-0.5 text-yellow-500" />
                  The current class teacher ({currentSection.classTeacherName}) will be unassigned.
                </p>
              )}
              {!selectedTeacherIdInDrawer && !currentSection.class_teacher && (
                 <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md border border-gray-200">
                    No class teacher is currently assigned.
                </p>
              )}
            </>
          )}
           {!currentSection && (
            <p className="text-gray-500">Loading section details...</p>
           )}
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="flat" color="default" onPress={handleCloseDrawer} disabled={isUpdating}>
            Cancel
          </Button>
          <Button 
            color="primary"
            onPress={handleSaveClassTeacher} 
            isLoading={isUpdating} 
            disabled={isUpdating || !currentSection}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default AssignClassTeacherPage;