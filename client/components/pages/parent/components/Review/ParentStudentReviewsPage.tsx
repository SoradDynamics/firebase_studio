// src/pages/parent/ParentStudentReviewsPage.tsx (NEW FILE, adjust path as needed)
import React, { useEffect } from 'react';
import SelectStudentComponent from '../Select/SelectStudent'; // Adjust path
import DisplayStudentComponent from '../Select/DisplayStudentRecords'; // Adjust path
import { useSelectedStudent } from '../../contexts/SelectedStudentContext'; // Adjust path
import { useParentStudentReviewStore, ReviewWithDetails } from '~/store/parentStudentReviewStore'; // Adjust path
import { Card, CardBody, CardHeader, Divider, Spinner } from '@heroui/react';
import { ClipboardDocumentListIcon, StarIcon, CalendarDaysIcon, UserCircleIcon as TeacherIcon, AcademicCapIcon as SectionIcon, ChatBubbleLeftEllipsisIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import NepaliDate from 'nepali-date-converter';
import { reviewRatingOptions, reviewTypeOptions } from '../../../common/Review/ReviewForm'; // Re-use options for display

// Helper to convert AD (YYYY-MM-DD string from DB) to displayable BS string
const formatADtoBSDateString = (adDateString: string): string => {
  if (!adDateString) return 'N/A';
  try {
    const adDate = new Date(adDateString);
    if (isNaN(adDate.getTime())) return 'Invalid Date';
    const bsDate = new NepaliDate(adDate);
    return `${bsDate.getYear()}-${String(bsDate.getMonth() + 1).padStart(2, '0')}-${String(bsDate.getDate()).padStart(2, '0')} BS`;
  } catch (e) {
    return adDateString.split('T')[0] + ' (AD - Conv. Error)';
  }
};

const ParentStudentReviewsPage: React.FC = () => {
  const { selectedStudentId } = useSelectedStudent(); // From your context
  const { isLoadingReviews, reviewsError, reviewsForSelectedStudent, actions: reviewActions } = useParentStudentReviewStore();

  useEffect(() => {
    if (selectedStudentId) {
      reviewActions.fetchReviewsForStudent(selectedStudentId);
    } else {
      reviewActions.clearReviews(); // Clear reviews if no student is selected
    }
  }, [selectedStudentId, reviewActions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-5xl space-y-6 sm:space-y-8">
        <header className="mb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">
            Student Performance Reviews
          </h1>
          <p className="text-lg text-slate-600 mt-1">View reviews for your child.</p>
        </header>

        {/* Student Selection Component */}
        <SelectStudentComponent label="Viewing Reviews For:" placeholder="Select your child..." />

        {/* Display Selected Student's Basic Info (Optional Here if too much, but good for context) */}
        {selectedStudentId && (
          <div className="mt-0 mb-6"> {/* Reduced top margin as it's part of flow */}
            <DisplayStudentComponent /> 
          </div>
        )}
        
        {/* Reviews Section */}
        {selectedStudentId && (
          <Card className="shadow-xl border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50 p-4 sm:p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-slate-700 flex items-center">
                <ClipboardDocumentListIcon className="w-6 h-6 mr-2.5 text-indigo-600 flex-shrink-0" />
                Review Details
              </h2>
            </CardHeader>
            <CardBody className="p-4 sm:p-6">
              {isLoadingReviews && (
                <div className="text-center py-10">
                  <Spinner label="Loading reviews..." size="lg" color="primary" />
                </div>
              )}
              {!isLoadingReviews && reviewsError && (
                <div className="p-6 border border-red-300 bg-red-50 rounded-lg text-red-700 text-center">
                  <p className="font-semibold">Error loading reviews:</p>
                  <p className="text-sm">{reviewsError}</p>
                </div>
              )}
              {!isLoadingReviews && !reviewsError && reviewsForSelectedStudent.length === 0 && (
                <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                  <ClipboardDocumentListIcon className="w-16 h-16 mx-auto text-gray-300" />
                  <p className="mt-4 text-lg font-medium text-gray-600">No Reviews Found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    There are currently no performance reviews available for the selected student.
                  </p>
                </div>
              )}
              {!isLoadingReviews && !reviewsError && reviewsForSelectedStudent.length > 0 && (
                <div className="space-y-5">
                  {reviewsForSelectedStudent.map((review: ReviewWithDetails) => (
                    <Card key={review.$id} className="shadow-lg bg-white border border-gray-200 rounded-lg hover:shadow-xl transition-shadow duration-300">
                      <CardHeader className="p-3 sm:p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-md sm:text-lg text-slate-800 capitalize flex items-center">
                           <StarIcon className="w-5 h-5 mr-2 text-amber-500 flex-shrink-0"/>
                           {reviewTypeOptions.find(opt => opt.id === review.type)?.name || review.type}
                        </h3>
                      </CardHeader>
                      <CardBody className="p-3 sm:p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <p className="flex items-center text-slate-600">
                                <CalendarDaysIcon className="w-5 h-5 mr-2 text-indigo-500 flex-shrink-0" />
                                <span className="font-medium mr-1">Date:</span> {formatADtoBSDateString(review.reviewDate)}
                            </p>
                            <p className="flex items-center text-slate-600">
                                <TeacherIcon className="w-5 h-5 mr-2 text-teal-500 flex-shrink-0" />
                                <span className="font-medium mr-1">Teacher:</span> {review.teacherName || 'N/A'}
                            </p>
                             <p className="flex items-center text-slate-600">
                                <SectionIcon className="w-5 h-5 mr-2 text-purple-500 flex-shrink-0" />
                                <span className="font-medium mr-1">Section (at review):</span> {review.sectionName || 'N/A'}
                            </p>
                            {review.rating && (
                            <p className="flex items-center text-slate-600">
                                <StarIcon className="w-5 h-5 mr-2 text-yellow-500 flex-shrink-0" />
                                <span className="font-medium mr-1">Rating:</span> 
                                <span className="font-semibold text-indigo-700">{reviewRatingOptions.find(opt => opt.id === review.rating)?.name || review.rating}</span>
                            </p>
                            )}
                        </div>
                        <Divider className="my-2 md:my-3"/>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-1 flex items-center">
                                <ChatBubbleLeftEllipsisIcon className="w-5 h-5 mr-1.5 text-sky-600 flex-shrink-0" />
                                Comments:
                            </h4>
                            <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-200 whitespace-pre-wrap">
                                {review.description}
                            </p>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}
        {!selectedStudentId && (
             <div className="text-center py-10 px-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <UserCircleIcon className="w-16 h-16 mx-auto text-gray-300" /> {/* Changed icon for variety */}
                <p className="mt-4 text-xl font-semibold text-gray-700">Select Your Child</p>
                <p className="text-sm text-gray-500 mt-1">Please select your child from the dropdown above to view their reviews.</p>
            </div>
        )}
         <footer className="text-center mt-10 py-4 text-sm text-slate-500">
            School Management System © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};

export default ParentStudentReviewsPage;