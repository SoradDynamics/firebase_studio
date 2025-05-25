// src/pages/admin/AdminReviewManagementPage.tsx
import React, { useEffect, useMemo, useCallback } from 'react';

import AdminReviewForm, { reviewTypeOptions as adminReviewTypeOptions, reviewRatingOptions as adminReviewRatingOptions } from './AdminReviewForm';



import { useAdminReviewStore, AdminReviewWithDetails } from '~/store/adminReviewStore';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import SearchBar from '../../../common/SearchBar';
import ActionButton from '../../../../common/ActionButton';
import { Drawer } from '../../../../common/Drawer';
import Popover from '../../components/common/Popover';
import {
  PencilIcon, TrashIcon, PlusIcon, UserCircleIcon, AcademicCapIcon, BuildingLibraryIcon,
  ClipboardDocumentListIcon, AdjustmentsHorizontalIcon, MagnifyingGlassIcon, UsersIcon, EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader, Divider, Spinner, Button, Listbox, ListboxItem, ScrollShadow } from '@heroui/react'; // Added Listbox for students
import NepaliDate from 'nepali-date-converter';
import { StudentWithDetails } from 'types/review';



const formatADtoBSDateString = (adDateString: string): string => {
    if (!adDateString) return 'N/A';
    try {
      const adDate = new Date(adDateString);
      if (isNaN(adDate.getTime())) {
          console.warn("formatADtoBSDateString: Invalid AD date input:", adDateString);
          return 'Invalid Date';
      }
      const bsDate = new NepaliDate(adDate);
      return `${bsDate.getYear()}-${String(bsDate.getMonth() + 1).padStart(2, '0')}-${String(bsDate.getDate()).padStart(2, '0')} BS`;
    } catch (e) {
      console.error("Error converting AD to BS for display:", e, "Input:", adDateString);
      return adDateString.split('T')[0] + ' (AD - Conv. Error)';
    }
};

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

const AdminReviewManagementPage: React.FC = () => {
  const {
    faculties, selectedFacultyId, classesForFaculty, selectedClass, sectionsForClass, selectedSectionId,
    studentSearchTerm, students, selectedStudent, reviews,
    isLoadingFilters, isLoadingStudents, isLoadingReviews,
    isDrawerOpen, drawerMode, 
    isDeletePopoverOpen, isDeletingReview,
    filterError, studentError, reviewError,
    actions,
  } = useAdminReviewStore();

  useEffect(() => {
    actions.initializeAdminPage();
    // Do not fetch students here initially
  }, [actions]);

  const facultyOptions: SelectOption[] = useMemo(() => 
    faculties.map(f => ({ id: f.$id, name: f.name })), [faculties]);
  
  const classOptions: SelectOption[] = useMemo(() => 
    classesForFaculty.map(c => ({ id: c, name: c })), [classesForFaculty]);

  const sectionOptions: SelectOption[] = useMemo(() => 
    sectionsForClass.map(s => ({ id: s.$id, name: s.name })), [sectionsForClass]);

  const debouncedStudentFetchOnSearch = useCallback(
    debounce(() => {
        // This check ensures we only fetch if there's a reason to (filter or search term)
        const state = useAdminReviewStore.getState();
        if (state.studentSearchTerm.trim() !== '' || state.selectedFacultyId || state.selectedClass || state.selectedSectionId) {
            actions.fetchStudents();
        } else {
            // If all are empty, clear student list explicitly
            useAdminReviewStore.setState({ students: [], selectedStudent: null, reviews: [] });
        }
    }, 500),
    [actions]
  );

  const handleStudentSearchInputChange = (value: string) => {
    actions.setStudentSearchTerm(value);
    debouncedStudentFetchOnSearch(); // Trigger debounced search/filter
  };

  // Explicit search button handler
  const handleExplicitSearchAndFilter = () => {
    actions.fetchStudents(); 
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 to-neutral-200 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <header className="mb-6 sm:mb-8 p-6 bg-white rounded-xl shadow-xl border border-gray-200">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight flex items-center">
            <AdjustmentsHorizontalIcon className="w-10 h-10 mr-3 text-indigo-600" />
            Administrator Review Management
          </h1>
          <p className="text-slate-600 mt-2">Oversee and manage all student performance reviews across the institution.</p>
        </header>

        <Card className="shadow-xl border border-gray-200 rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-100 p-4 sm:p-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-slate-700">Filter Students</h2>
          </CardHeader>
          <CardBody className="p-4 sm:p-6 space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 items-end">
            <CustomSelect
              label="Faculty"
              options={facultyOptions}
              value={selectedFacultyId}
              onChange={(id) => actions.selectFaculty(id)}
              placeholder="All Faculties"
              disabled={isLoadingFilters}
              allowClear
            />
            <CustomSelect
              label="Class"
              options={classOptions}
              value={selectedClass}
              onChange={(name) => actions.selectClass(name)}
              placeholder={selectedFacultyId ? "All Classes" : "Select Faculty First"}
              disabled={isLoadingFilters || !selectedFacultyId || (selectedFacultyId && classesForFaculty.length === 0 && !isLoadingFilters)}
              allowClear
            />
            <CustomSelect
              label="Section"
              options={sectionOptions}
              value={selectedSectionId}
              onChange={(id) => actions.selectSection(id)}
              placeholder={selectedClass ? "All Sections" : "Select Class First"}
              disabled={isLoadingFilters || !selectedClass || (selectedClass && sectionsForClass.length === 0 && !isLoadingFilters)}
              allowClear
            />
            <div className="flex flex-col sm:flex-row gap-2 items-end pt-2 sm:pt-0 md:col-span-2 lg:col-span-1 lg:justify-self-end">
                <SearchBar
                    placeholder="Search student name..."
                    value={studentSearchTerm}
                    onValueChange={handleStudentSearchInputChange}
                    className="flex-grow w-full sm:w-auto"
                />
                <Button 
                    color="primary" 
                    onPress={handleExplicitSearchAndFilter} 
                    isLoading={isLoadingStudents && (studentSearchTerm !== '' || !!selectedFacultyId || !!selectedClass || !!selectedSectionId)}
                    startContent={<MagnifyingGlassIcon className="w-5"/>}
                    className="w-full sm:w-auto shadow-md"
                >
                    Search/Filter
                </Button>
            </div>
            {filterError && <p className="text-sm text-red-500 md:col-span-full">{filterError}</p>}
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <Card className="lg:col-span-1 shadow-xl border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-100 p-4 sm:p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-slate-700 flex items-center">
                <UsersIcon className="w-6 h-6 mr-2 text-sky-600"/> Students
              </h2>
            </CardHeader>
            <CardBody className="p-0">
              {isLoadingStudents && <div className="p-6 text-center"><Spinner label="Loading students..." /></div>}
              {studentError && <p className="p-6 text-sm text-red-500 text-center">{studentError}</p>}
              
              {!isLoadingStudents && !studentError && students.length === 0 && (
                <div className="p-6 text-sm text-gray-500 text-center min-h-[200px] flex flex-col justify-center items-center">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-400 mb-2"/>
                  <p className="font-medium">No students to display.</p>
                  <p>Please use the filters or search bar above to find students.</p>
                </div>
              )}

              {!isLoadingStudents && !studentError && students.length > 0 && (
                <ScrollShadow hideScrollBar className="max-h-[calc(100vh-450px)] sm:max-h-[500px] lg:max-h-[600px] p-2">
                  <Listbox
                    aria-label="Student list"
                    variant="flat"
                    disallowEmptySelection
                    selectionMode="single"
                    selectedKeys={selectedStudent ? [selectedStudent.$id] : []}
                    onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0] as string;
                        const student = students.find(s => s.$id === key);
                        actions.selectStudent(student || null);
                    }}
                    items={students} // Pass items directly to Listbox for better handling by HeroUI
                  >
                    {(student: StudentWithDetails) => ( // Render function for items
                      <ListboxItem 
                        key={student.$id} 
                        textValue={student.name}
                        className={`hover:bg-indigo-50 data-[selected=true]:bg-indigo-100 data-[selected=true]:text-indigo-700 data-[selected=true]:font-semibold`}
                      >
                        <div className="flex flex-col">
                          <span>{student.name}</span>
                          <span className="text-xs text-gray-500">
                            {student.class} - {student.sectionName }

                          </span>
                        </div>
                      </ListboxItem>
                    )}
                  </Listbox>
                </ScrollShadow>
              )}
            </CardBody>
          </Card>

          <Card className="lg:col-span-2 shadow-xl border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-100 p-4 sm:p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-700 flex items-center">
                <ClipboardDocumentListIcon className="w-6 h-6 mr-2 text-blue-600" />
                Reviews {selectedStudent ? `for ${selectedStudent.name}` : '(Select a Student)'}
              </h2>
              {selectedStudent && (
                <Button
                  color="primary"
                  variant="solid"
                  startContent={<PlusIcon className="w-5 h-5" />}
                  onPress={() => actions.openReviewDrawer('add')}
                  className="w-full sm:w-auto mt-2 sm:mt-0 shadow-md"
                  isDisabled={!selectedStudent}
                >
                  Add Review
                </Button>
              )}
            </CardHeader>
            <CardBody className="p-4 sm:p-6">
              {!selectedStudent && (
                <div className="text-center py-10 px-6 bg-gray-50 rounded-lg min-h-[300px] flex flex-col justify-center items-center">
                    <EyeIcon className="w-16 h-16 mx-auto text-gray-300" />
                    <p className="mt-4 text-lg font-medium text-gray-600">Select a Student</p>
                    <p className="text-sm text-gray-500 mt-1">Choose a student from the list to view or manage their reviews.</p>
                </div>
              )}
              {selectedStudent && isLoadingReviews && <div className="text-center py-10"><Spinner label="Loading reviews..." /></div>}
              {selectedStudent && reviewError && <p className="p-6 text-sm text-red-500 text-center">{reviewError}</p>}
              {selectedStudent && !isLoadingReviews && !reviewError && reviews.length === 0 && (
                <div className="text-center py-10 px-6 bg-gray-50 rounded-lg min-h-[300px] flex flex-col justify-center items-center">
                    <ClipboardDocumentListIcon className="w-16 h-16 mx-auto text-gray-300" />
                    <p className="mt-4 text-lg font-medium text-gray-600">No Reviews Found</p>
                    <p className="text-sm text-gray-500 mt-1">No reviews yet for {selectedStudent.name}.</p>
                </div>
              )}
              {selectedStudent && !isLoadingReviews && !reviewError && reviews.length > 0 && (
                <div className="space-y-4 sm:space-y-5">
                  {reviews.map((review: AdminReviewWithDetails) => (
                    <Card key={review.$id} shadow="md" className="bg-white border border-gray-200 rounded-lg">
                      <CardHeader className="p-3 sm:p-4 flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-semibold text-md sm:text-lg text-slate-800">{adminReviewTypeOptions.find(opt => opt.id === review.type)?.name || review.type}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Date: <span className="font-medium">{formatADtoBSDateString(review.reviewDate)}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            By: <span className="font-medium">{review.teacherName || review.teacherId}</span>
                          </p>
                          {review.rating && <p className="text-xs text-slate-500 capitalize">Rating: <span className="font-medium text-indigo-600">{adminReviewRatingOptions.find(opt => opt.id === review.rating)?.name || review.rating}</span></p>}
                        </div>
                        <div className="flex space-x-1.5 sm:space-x-2 flex-shrink-0">
                          <ActionButton icon={<PencilIcon className="w-4 h-4" />} onClick={() => actions.openReviewDrawer('edit', review)} color="orange" isIconOnly={true} />
                          <ActionButton icon={<TrashIcon className="w-4 h-4" />} onClick={() => actions.openDeletePopover(review)} color="red" isIconOnly={true}/>
                        </div>
                      </CardHeader>
                      <Divider />
                      <CardBody className="p-3 sm:p-4">
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{review.description}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Drawer isOpen={isDrawerOpen} onClose={actions.closeReviewDrawer} size="lg" position="right">
        <Drawer.Header>
          {drawerMode === 'add' ? `Add New Review for ${selectedStudent?.name || 'Student'}` : `Edit Review for ${selectedStudent?.name || 'Student'}`}
        </Drawer.Header>
        <Drawer.Body>
          {/* Only render form if student is selected (or if adding, context is set by then) */}
          {(selectedStudent || drawerMode === 'add') && <AdminReviewForm />} 
        </Drawer.Body>
      </Drawer>

      <Popover
        isOpen={isDeletePopoverOpen}
        onClose={actions.closeDeletePopover}
        onConfirm={actions.confirmDeleteReview}
        title="Confirm Deletion"
        content="Are you sure you want to permanently delete this review? This action cannot be undone."
        isConfirmLoading={isDeletingReview}
      />
      <footer className="text-center mt-10 py-4 text-sm text-slate-500">
        Admin Panel © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default AdminReviewManagementPage;