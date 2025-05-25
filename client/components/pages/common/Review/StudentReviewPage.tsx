// src/pages/StudentReviewPage.tsx

import NepaliDate from 'nepali-date-converter';

import { Autocomplete, AutocompleteItem, Card, CardBody, CardHeader, Divider, Spinner, Button, Input } from "@heroui/react"; // Added Input

import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  UserCircleIcon,
  BuildingOffice2Icon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon, // For Autocomplete
  ExclamationTriangleIcon, // For error messages
} from '@heroicons/react/24/outline';


import React, { useEffect, useMemo, useCallback } from 'react';
import StudentAutocomplete from '../StudentAutoComplete'; // Import the new component
import { useReviewStore } from '~/store/reviewStore';
import SearchBar from '../../common/SearchBar'; // Ensure this path is correct
import CustomSelect, { SelectOption } from '../../common/CustomSelect';
import ActionButton from '../../../common/ActionButton'; // Ensure this path is correct
import { Drawer } from '../../../common/Drawer'; // Ensure this path is correct
import Popover from '../../../common/Popover'; // Ensure this path is correct
import ReviewForm, { reviewRatingOptions, reviewTypeOptions } from './ReviewForm';
import { StudentWithDetails } from 'types/review';




// Helper to convert AD (YYYY-MM-DD string from DB) to displayable BS string
const formatADtoBSDateString = (adDateString: string): string => {
  if (!adDateString) return 'N/A';
  try {
    // Appwrite dates can be full ISO strings, new Date() handles this
    const adDate = new Date(adDateString);
    if (isNaN(adDate.getTime())) {
        console.warn("formatADtoBSDateString: Invalid AD date input:", adDateString);
        return 'Invalid Date';
    }
    const bsDate = new NepaliDate(adDate);
    return `${bsDate.getYear()}-${String(bsDate.getMonth() + 1).padStart(2, '0')}-${String(bsDate.getDate()).padStart(2, '0')} BS`;
  } catch (e) {
    console.error("Error converting AD to BS for display:", e, "Input:", adDateString);
    return adDateString.split('T')[0] + ' (AD - Conv. Error)'; // Fallback to AD date part
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

const StudentReviewPage: React.FC = () => {
  const {
    isInitializing,
    isClassTeacher,
    classTeacherInfo,
    error: storeError,
    studentSearchTerm,
    searchedStudents,
    isLoadingStudents,
    selectedStudent,
    reviews,
    isLoadingReviews,
    isDrawerOpen,
    drawerMode,
    isDeletePopoverOpen,
    isDeletingReview,
    actions,
  } = useReviewStore();

  useEffect(() => {
    actions.checkAuthAndLoadTeacherInfo();
  }, [actions]); // actions is stable

  const debouncedSearchStudents = useCallback(
    debounce(() => {
      const currentTerm = useReviewStore.getState().studentSearchTerm;
      if (currentTerm.trim().length > 0) {
        actions.searchStudents();
      } else {
        useReviewStore.setState({ searchedStudents: [] });
      }
    }, 400),
    [actions] // actions is stable
  );

  const studentItems = useMemo(() => {
    return searchedStudents.map(student => ({
      key: student.$id,
      label: student.name,
      description: `${student.class || 'N/A'} - ${student.sectionName || 'Sec ?'} | Faculty: ${student.facultyName || 'N/A'}`,
      value: student, // Keep the full student object for easier access if needed
    }));
  }, [searchedStudents]);


  const handleStudentInputChange = (value: string) => {
    actions.setStudentSearchTerm(value);
    if (value.trim() === '') {
        actions.selectStudent(null);
        useReviewStore.setState({ searchedStudents: [] });
    } else {
        debouncedSearchStudents();
    }
  };

  const handleStudentSelectionChange = (key: React.Key | null) => {
    if (key) {
      const student = useReviewStore.getState().searchedStudents.find(s => s.$id === key);
      actions.selectStudent(student || null);
    } else {
      actions.selectStudent(null);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col justify-center items-center bg-gray-100 p-4">
        <Spinner label="Initializing App..." color="primary" labelColor="primary" size="lg" />
        <p className="text-gray-600 mt-2">Please wait a moment.</p>
      </div>
    );
  }

  if (!isClassTeacher) {
    return (
      <div className="flex min-h-screen flex-col justify-center items-center bg-gray-100 p-4 text-center">
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="bg-red-500 text-white p-4">
                <h1 className="text-xl font-semibold flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 mr-2" />
                    Access Denied
                </h1>
            </CardHeader>
            <CardBody className="p-6">
                <p className="text-gray-700 text-lg">{storeError || "You do not have permission to access this page."}</p>
                {classTeacherInfo === null && !storeError && (
                    <p className="text-sm text-gray-500 mt-4">
                        Ensure you are logged in with an account that is registered as a teacher and assigned as a class teacher to one or more sections.
                    </p>
                )}
                 <Button color="primary" variant="ghost" className="mt-6" onPress={() => window.location.href = '/'}>
                    Go to Homepage
                </Button>
            </CardBody>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <header className="mb-6 sm:mb-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">Student Performance Reviews</h1>
          {classTeacherInfo && (
            <div className="mt-3 text-sm sm:text-md text-slate-600 space-y-1.5">
                <p className="flex items-center">
                  <UserCircleIcon className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" />
                  Logged in as: <span className="font-semibold ml-1">{classTeacherInfo.name}</span>
                </p>
                {classTeacherInfo.managedFaculties && classTeacherInfo.managedFaculties.length > 0 && (
                  <p className="flex items-center">
                      <BuildingOffice2Icon className="w-5 h-5 mr-2 text-teal-600 flex-shrink-0" />
                      Managing Faculty: <span className="font-semibold ml-1">{classTeacherInfo.managedFaculties.map(f => f.name).join(', ')}</span>
                  </p>
                )}
                {classTeacherInfo.managedSections && classTeacherInfo.managedSections.length > 0 && (
                  <p className="flex items-center">
                      <AcademicCapIcon className="w-5 h-5 mr-2 text-purple-600 flex-shrink-0" />
                      Class Teacher for: <span className="font-semibold ml-1">{classTeacherInfo.managedSections.map(s => `${s.className}-${s.name}`).join(', ')}</span>
                  </p>
                )}
            </div>
          )}
        </header>

        <Card className="shadow-lg border border-gray-200 rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50 p-4 sm:p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-slate-700">Search and Select Student</h2>
          </CardHeader>
          <CardBody className="p-4 sm:p-6 space-y-4">
              <Autocomplete
                items={studentItems}
                label="Student Name"
                placeholder="Type student's name to search..."
                variant="bordered"
                className="w-full"
                selectedKey={selectedStudent ? selectedStudent.$id : null}
                onSelectionChange={handleStudentSelectionChange}
                inputValue={studentSearchTerm}
                onInputChange={handleStudentInputChange}
                startContent={<MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />}
                isLoading={isLoadingStudents}
                loadingContent={<Spinner size="sm" label="Searching..." />}
                allowsCustomValue={false}
                aria-label="Search and select student"
              >
                {(item) => (
                  <AutocompleteItem key={item.key} textValue={item.label}>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{item.label}</span>
                      <span className="text-xs text-slate-500">{item.description}</span>
                    </div>
                  </AutocompleteItem>
                )}
              </Autocomplete>
              
              {storeError && studentSearchTerm && !isLoadingStudents && (
                   <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-start">
                      <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 text-red-500" />
                      <div>
                        <span className="font-medium">Search Error:</span> {storeError}
                        <p className="text-xs mt-0.5">Please ensure Appwrite is configured correctly and student data is accessible.</p>
                      </div>
                  </div>
              )}
               {studentSearchTerm && studentItems.length === 0 && !isLoadingStudents && !storeError && (
                  <p className="text-sm text-orange-600 mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      No students found matching "{studentSearchTerm}" in your assigned sections.
                  </p>
              )}

              {selectedStudent && (
              <Card className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm" shadow="none">
                  <CardHeader className="pb-1 pt-3 px-4">
                      <h3 className="text-lg font-semibold text-indigo-700 flex items-center">
                          <UserCircleIcon className="w-6 h-6 mr-2.5 flex-shrink-0" />
                          Selected Student Profile
                      </h3>
                  </CardHeader>
                  <CardBody className="text-sm text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2 pb-3 px-4">
                      <p><strong className="font-medium text-slate-600">Name:</strong> {selectedStudent.name}</p>
                      <p><strong className="font-medium text-slate-600">Class:</strong> {selectedStudent.class || 'N/A'}</p>
                      <p><strong className="font-medium text-slate-600">Section:</strong> {selectedStudent.sectionName || selectedStudent.section || 'N/A'}</p>
                      <p><strong className="font-medium text-slate-600">Faculty:</strong> {selectedStudent.facultyName || 'N/A'}</p>
                      {selectedStudent.id && <p><strong className="font-medium text-slate-600">Custom ID:</strong> {selectedStudent.id}</p>}
                      <p><strong className="font-medium text-slate-600">Appwrite ID:</strong> <span className="text-xs">{selectedStudent.$id}</span></p>
                  </CardBody>
              </Card>
              )}
          </CardBody>
        </Card>

        {selectedStudent && (
          <Card className="shadow-lg border border-gray-200 rounded-xl overflow-hidden">
              <CardHeader className="bg-slate-50 p-4 sm:p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-700 flex items-center">
                      <ClipboardDocumentListIcon className="w-6 h-6 mr-2.5 text-blue-600 flex-shrink-0" />
                      Reviews for {selectedStudent.name}
                  </h2>
                  <Button 
                      color="primary" 
                      variant="solid"
                      startContent={<PlusIcon className="w-5 h-5" />}
                      onPress={() => actions.openDrawer('add')}
                      className="w-full sm:w-auto mt-2 sm:mt-0 shadow-md hover:shadow-lg transition-shadow"
                  >
                      Add New Review
                  </Button>
              </CardHeader>
              <CardBody className="p-4 sm:p-6">
                  {isLoadingReviews && <div className="text-center py-10"><Spinner label="Loading reviews..." size="lg" /></div>}
                  {!isLoadingReviews && reviews.length === 0 && (
                      <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                        <ClipboardDocumentListIcon className="w-16 h-16 mx-auto text-gray-300" />
                        <p className="mt-4 text-lg font-medium text-gray-600">No Reviews Yet</p>
                        <p className="text-sm text-gray-500 mt-1">Be the first to add a review for {selectedStudent.name}.</p>
                      </div>
                  )}
                  {!isLoadingReviews && reviews.length > 0 && (
                      <div className="space-y-4 sm:space-y-5">
                      {reviews.map((review: ReviewDocument) => ( // Explicitly type review
                          <Card key={review.$id} shadow="md" className="bg-white border border-gray-200 rounded-lg hover:shadow-xl transition-all duration-300 ease-in-out">
                              <CardHeader className="p-3 sm:p-4 flex justify-between items-start gap-2">
                                  <div>
                                      <h3 className="font-semibold text-md sm:text-lg text-slate-800">{reviewTypeOptions.find(opt => opt.id === review.type)?.name || review.type}</h3>
                                      <p className="text-xs text-slate-500 mt-0.5">
                                          Reviewed on: <span className="font-medium">{formatADtoBSDateString(review.reviewDate)}</span>
                                          {/* Academic Year removed */}
                                      </p>
                                      {review.rating && <p className="text-xs text-slate-500 capitalize">Overall: <span className="font-medium text-indigo-600">{reviewRatingOptions.find(opt => opt.id === review.rating)?.name || review.rating}</span></p>}
                                  </div>
                                  <div className="flex space-x-1.5 sm:space-x-2 flex-shrink-0">
                                      <ActionButton
                                          icon={<PencilIcon className="w-4 h-4 sm:w-4.5" />}
                                          onClick={() => actions.openDrawer('edit', review)}
                                          color="orange"
                                          isIconOnly={true}
                                      />
                                      <ActionButton
                                          icon={<TrashIcon className="w-4 h-4 sm:w-4.5" />}
                                          onClick={() => actions.openDeletePopover(review)}
                                          color="red"
                                          isIconOnly={true}
                                      />
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
        )}
        {!selectedStudent && (
            <div className="text-center py-10 px-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-gray-300" />
                <p className="mt-4 text-xl font-semibold text-gray-700">Select a Student</p>
                <p className="text-sm text-gray-500 mt-1">Search for a student above to view or add reviews.</p>
            </div>
        )}
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={actions.closeDrawer}
        size="md"
        position="right"
      >
        <Drawer.Header>
          {drawerMode === 'add' ? 'Add New Review' : `Edit Review: ${selectedStudent?.name || 'Student'}`}
        </Drawer.Header>
        <Drawer.Body>
          <ReviewForm />
        </Drawer.Body>
      </Drawer>

      <Popover
        isOpen={isDeletePopoverOpen}
        onClose={actions.closeDeletePopover}
        onConfirm={actions.confirmDeleteReview}
        title="Confirm Deletion"
        content={`Are you sure you want to delete this review? This action cannot be undone and the review will be permanently removed.`}
        isConfirmLoading={isDeletingReview}
      />

      <footer className="text-center mt-10 py-4 text-sm text-slate-500">
        School Management System © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default StudentReviewPage;