import React from 'react';
import { Drawer } from '../../../../common/Drawer';
import { AdminLessonPlanView, AdminStudentReviewView, useAdminLessonPlanStore } from '~/store/adminLessonPlanStore';
import { StarRating } from '../../../../common/StarRating';
import { Chip, Badge, Spinner, Button } from '@heroui/react';
import { UserCircleIcon, CalendarDaysIcon, BookOpenIcon, BuildingLibraryIcon, InformationCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface AdminLessonPlanDetailModalProps {
  plan: AdminLessonPlanView | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors: Record<string, "success" | "warning" | "primary" | "default" | "danger"> = { /* ... */ };

const DetailItem: React.FC<{ label: string; value?: string | number | string[] | null; children?: React.ReactNode; className?: string }> = ({ label, value, children, className="" }) => {
    if (!children && (value === null || value === undefined || (Array.isArray(value) && value.length === 0) || String(value).trim() === "")) return null;
    return (
      <div className={`mb-3 ${className}`}>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        {children ? (
            <div className="text-sm text-gray-800 mt-0.5">{children}</div>
        ) : Array.isArray(value) ? (
          <ul className="list-disc list-inside pl-1 text-sm text-gray-800">
            {value.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-gray-800">{String(value)}</p>
        )}
      </div>
    );
};


const AdminLessonPlanDetailModal: React.FC<AdminLessonPlanDetailModalProps> = ({ plan, isOpen, onClose }) => {
  const { studentReviewsForSelectedPlan, isLoadingStudentReviews } = useAdminLessonPlanStore();

  if (!plan) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Lesson Plan Details: ${plan.title}`} size="xl">
      <Drawer.Body className="space-y-6">
        {/* Basic Info Section */}
        <section>
            <div className="flex justify-between items-center mb-3">
                 <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                 <div>
                    {plan.status && <Chip color={statusColors[plan.status] || "default"} size="sm" variant="flat" className="mr-2">{plan.status.replace('-', ' ')}</Chip>}
                    {plan.isPublic ? <Badge color="success" variant="flat" size="sm" startContent={<EyeIcon className="h-4"/>}>Public</Badge> : <Badge color="default" variant="flat" size="sm" startContent={<EyeSlashIcon className="h-4"/>}>Private</Badge>}
                 </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                <DetailItem label="Title" value={plan.title} className="lg:col-span-2"/>
                <DetailItem label="Teacher"><UserCircleIcon className="h-4 w-4 inline mr-1 text-gray-500"/>{plan.teacherName}</DetailItem>
                <DetailItem label="Subject"><BookOpenIcon className="h-4 w-4 inline mr-1 text-gray-500"/>{plan.subject}</DetailItem>
                <DetailItem label="Faculty"><BuildingLibraryIcon className="h-4 w-4 inline mr-1 text-gray-500"/>{plan.facultyName}</DetailItem>
                <DetailItem label="Class" value={plan.class} />
                <DetailItem label="Section" value={plan.sectionName} />
                <DetailItem label="Lesson Date (BS)"><CalendarDaysIcon className="h-4 w-4 inline mr-1 text-gray-500"/>{plan.lessonDateBS}</DetailItem>
                <DetailItem label="Estimated Periods" value={plan.estimatedPeriods} />
                <DetailItem label="Actual Periods Taken" value={plan.actualPeriodsTaken} />
                 {plan.overallClassRating !== undefined && plan.overallClassRating > 0 && (
                    <DetailItem label="Overall Class Rating">
                        <StarRating rating={plan.overallClassRating} max={5} size={18} color="#22c55e" readOnly />
                    </DetailItem>
                 )}
            </div>
            <DetailItem label="Description" value={plan.description} className="mt-3"/>
        </section>

        {/* Pedagogical Details */}
        <section className="pt-4 border-t">
             <h3 className="text-lg font-semibold text-gray-800 mb-3">Pedagogical Details</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0">
                <DetailItem label="Learning Objectives" value={plan.learningObjectives} />
                <DetailItem label="Teaching Materials" value={plan.teachingMaterials} />
                <DetailItem label="Assessment Methods" value={plan.assessmentMethods} />
             </div>
             <DetailItem label="Teacher's Reflection" value={plan.teacherReflection} className="mt-3 md:col-span-3"/>
        </section>

        {/* Student Reviews Section */}
        <section className="pt-4 border-t">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Student Reviews</h3>
          {isLoadingStudentReviews && <div className="flex justify-center py-4"><Spinner label="Loading reviews..." /></div>}
          {!isLoadingStudentReviews && studentReviewsForSelectedPlan.length === 0 && (
            <div className="flex items-center text-gray-500 bg-gray-50 p-3 rounded-md">
                <InformationCircleIcon className="h-5 w-5 mr-2 text-gray-400"/>
                No student reviews recorded for this lesson plan.
            </div>
          )}
          {!isLoadingStudentReviews && studentReviewsForSelectedPlan.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2"> {/* Scrollable reviews */}
              {studentReviewsForSelectedPlan.map(review => (
                <div key={review.$id} className="p-3 border rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium text-gray-700 text-sm">{review.studentName}</p>
                    <StarRating rating={review.rating} max={5} size={16} readOnly />
                  </div>
                  <p className="text-xs text-gray-600 italic">"{review.comment}"</p>
                  <p className="text-xxs text-gray-400 mt-1">
                    Reviewed by: {plan.teacherName} on {new Date(review.$createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </Drawer.Body>
      <Drawer.Footer>
        <Button color="default" variant="flat" onClick={onClose}>Close</Button>
      </Drawer.Footer>
    </Drawer>
  );
};

export default AdminLessonPlanDetailModal;