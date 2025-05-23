// src/pages/admin/RoutineManagementPage.tsx
import React, { useEffect } from 'react';
import { useRoutineStore } from '~/store/routineStore';
import CustomSelect from '../../../common/CustomSelect'; // Adjust path
import SearchBar from '../../../common/SearchBar';     // Adjust path
import { Drawer } from '../../../../common/Drawer';         // Adjust path
import Popover from '../../../common/PopoverRed';       // Adjust path
import RoutineCard from './RoutineCard';
import { Button, Spinner } from '@heroui/react'; // Assuming Button, Spinner from HeroUI
import { PlusIcon } from '@heroicons/react/24/solid';

const RoutineManagementPage: React.FC = () => {
  const {
    fetchInitialData,
    isLoading,
    filteredRoutines,
    facultyOptions,
    classOptionsFilter,
    selectedFacultyFilter,
    selectedClassFilter,
    searchTerm,
    setFacultyFilter,
    setClassFilter,
    setSearchTerm,
    isDrawerOpen,
    drawerMode,
    openDrawer,
    closeDrawer,
    saveRoutine,
    isFormLoading,
    isDeleteDialogOpen,
    routineToDelete,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDeleteRoutine,
    isDeleting,
  } = useRoutineStore();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Routine Management</h1>
        <p className="text-sm text-gray-500">Manage school timetables and routines for sections.</p>
      </header>

      {/* Filters and Actions */}
      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <CustomSelect
            label="Filter by Faculty"
            options={facultyOptions}
            value={selectedFacultyFilter}
            onChange={setFacultyFilter}
            placeholder="All Faculties"
            allowClear
          />
          <CustomSelect
            label="Filter by Class"
            options={classOptionsFilter}
            value={selectedClassFilter}
            onChange={setClassFilter}
            placeholder="All Classes"
            disabled={!facultyOptions.length} // Or enable with all classes if desired
            allowClear
          />
          <div className="lg:col-span-1">
            <label htmlFor="search-routine" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <SearchBar
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Search by section, faculty, subject..."
              className="w-full"
            />
          </div>
         
        </div>
      </div>

      {/* Routines Grid / List */}
      {isLoading && !filteredRoutines.length ? (
        <div className="flex justify-center items-center h-64">
          <Spinner label="Loading routines..." color="primary" labelColor="primary" />
        </div>
      ) : filteredRoutines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoutines.map((routine) => (
            <RoutineCard
              key={routine.$id}
              routine={routine}
             
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <img src="/no-data.svg" alt="No routines found" className="mx-auto h-40 mb-4" /> {/* Add a relevant SVG */}
          <p className="text-gray-500">
            {searchTerm || selectedClassFilter || selectedFacultyFilter ? "No routines match your filters." : "No routines found. Get started by adding one!"}
          </p>
        </div>
      )}

    </div>
  );
};

export default RoutineManagementPage;