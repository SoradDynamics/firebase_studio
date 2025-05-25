// src/pages/StudentMyReviewsPage.tsx (NEW FILE)
import React, { useEffect } from 'react';
import { useStudentSelfReviewStore, ReviewWithDetails } from '~/store/studentSelfReviewStore';
import { Card, CardBody, CardHeader, Divider, Spinner } from '@heroui/react';
import { UserCircleIcon, ClipboardDocumentListIcon, CalendarDaysIcon, ChatBubbleLeftEllipsisIcon, StarIcon, BuildingLibraryIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
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

const StudentMyReviewsPage: React.FC = () => {
  const { isLoading, error, studentProfile, reviews, actions } = useStudentSelfReviewStore();

  useEffect(() => {
    actions.fetchStudentReviews();
  }, [actions]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center items-center bg-gray-100 p-4">
        <Spinner label="Loading your reviews..." color="primary" size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col justify-center items-center bg-gray-100 p-4 text-center">
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="bg-red-100 text-red-700 p-4">
                <h1 className="text-xl font-semibold">Error</h1>
            </CardHeader>
            <CardBody className="p-6">
                <p className="text-gray-700">{error}</p>
            </CardBody>
        </Card>
      </div>
    );
  }

  if (!studentProfile) {
    // This case should ideally be covered by the error state if profile isn't found
    return (
        <div className="flex min-h-screen flex-col justify-center items-center bg-gray-100 p-4 text-center">
             <p className="text-lg text-gray-600">Student profile not loaded. Please try again later.</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl space-y-6 sm:space-y-8">
        <header className="mb-6 sm:mb-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200 text-center">
          <UserCircleIcon className="w-20 h-20 mx-auto text-indigo-500 mb-3" />
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">
            My Performance Reviews
          </h1>
          <p className="text-lg text-slate-600 mt-1">Hello, {studentProfile.name}!</p>
        </header>

        {reviews.length === 0 && (
          <Card className="shadow-lg border border-gray-200 rounded-xl overflow-hidden">
            <CardBody className="p-8 text-center">
              <ClipboardDocumentListIcon className="w-24 h-24 mx-auto text-gray-300 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700">No Reviews Found</h2>
              <p className="text-gray-500 mt-2">
                There are currently no performance reviews available for you.
                Please check back later or contact your class teacher if you expect to see reviews.
              </p>
            </CardBody>
          </Card>
        )}

        {reviews.length > 0 && (
          <div className="space-y-5">
            {reviews.map((review: ReviewWithDetails) => (
              <Card key={review.$id} className="shadow-lg border border-gray-200 rounded-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                <CardHeader className="bg-slate-50 p-4 sm:p-5 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-slate-700 capitalize flex items-center">
                    <StarIcon className="w-6 h-6 mr-2.5 text-amber-500 flex-shrink-0" />
                    {reviewTypeOptions.find(opt => opt.id === review.type)?.name || review.type} Review
                  </h2>
                </CardHeader>
                <CardBody className="p-4 sm:p-6 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p className="flex items-center text-slate-600">
                      <CalendarDaysIcon className="w-5 h-5 mr-2 text-indigo-500 flex-shrink-0" />
                      <span className="font-medium mr-1">Date:</span> {formatADtoBSDateString(review.reviewDate)}
                    </p>
                    <p className="flex items-center text-slate-600">
                      <UserCircleIcon className="w-5 h-5 mr-2 text-teal-500 flex-shrink-0" />
                      <span className="font-medium mr-1">By Teacher:</span> {review.teacherName || 'N/A'}
                    </p>
                    {review.rating && (
                      <p className="flex items-center text-slate-600 sm:col-span-2">
                        <StarIcon className="w-5 h-5 mr-2 text-yellow-500 flex-shrink-0" />
                        <span className="font-medium mr-1">Overall Rating:</span> 
                        <span className="font-semibold text-indigo-700">{reviewRatingOptions.find(opt => opt.id === review.rating)?.name || review.rating}</span>
                      </p>
                    )}
                     <p className="flex items-center text-slate-600">
                        <AcademicCapIcon className="w-5 h-5 mr-2 text-purple-500 flex-shrink-0" />
                        <span className="font-medium mr-1">Section at time of review:</span> {review.sectionName || 'N/A'}
                    </p>
                  </div>
                  
                  <Divider className="my-3" />
                  
                  <div>
                    <h3 className="text-md font-semibold text-slate-700 mb-1.5 flex items-center">
                        <ChatBubbleLeftEllipsisIcon className="w-5 h-5 mr-2 text-sky-500 flex-shrink-0" />
                        Teacher's Comments:
                    </h3>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-200 whitespace-pre-wrap">
                      {review.description}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
         <footer className="text-center mt-10 py-4 text-sm text-slate-500">
            School Management System © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};

export default StudentMyReviewsPage;