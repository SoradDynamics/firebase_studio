


import React, { useEffect, useState, useMemo } from 'react';
import { Autocomplete, AutocompleteItem, Button, Chip, Badge } from '@heroui/react';
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon, PlusCircleIcon, EyeIcon, EyeSlashIcon  } from '@heroicons/react/24/outline';
import { LessonPlan, useLessonPlanStore, StudentReview, Student } from '~/store/lessonPlanStore';
import ActionButton from '../../../../common/ActionButton';
// You'll need StudentReviewForm and StudentReviewItem components
// For now, let's just list student reviews.
// import StudentReviewForm from './StudentReviewForm';
// import StudentReviewItem from './StudentReviewItem';
import CustomSelect from '../../../common/CustomSelect'; // If needed for student selection
import { Textarea, Input } from '@heroui/react'; // For quick review form
import { StarRating } from 'components/common/StarRating';




interface LessonPlanDetailViewProps {
  plan: LessonPlan;
  onBack: () => void;
  onEdit: (plan: LessonPlan) => void;
  onDeleteRequest: (planId: string) => void;
}

const statusColors: Record<string, "success" | "warning" | "primary" | "default"> = {
    planned: "primary",
    completed: "success",
    "partially-completed": "warning",
};

const LessonPlanDetailView: React.FC<LessonPlanDetailViewProps> = ({ plan, onBack, onEdit, onDeleteRequest }) => {
  const {
    assignedContexts,
    studentReviews, fetchStudentReviews, isLoadingStudentReviews,
    studentsForReview, fetchStudentsForSection, isLoadingStudentsForReview,
    addStudentReview, isSubmittingStudentReview, deleteStudentReview, setError,
    teacherProfile,
    updateLessonPlan, // For toggling isPublic
    isSubmittingLessonPlan, // To disable button during general submission
    selectLessonPlan, // To update the view with the latest plan after toggle
  } = useLessonPlanStore();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewData, setNewReviewData] = useState({ studentId: '', rating: 0, comment: '' });
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  
  useEffect(() => {
    if (plan.$id && plan.sectionId && plan.facultyId && plan.class) {
      fetchStudentReviews(plan.$id);
      fetchStudentsForSection(plan.sectionId, plan.facultyId, plan.class);
    }
  }, [plan, fetchStudentReviews, fetchStudentsForSection]); // plan as dependency will re-trigger if its content changes

  const context = assignedContexts.find(c => 
    c.facultyId === plan.facultyId && 
    c.class === plan.class && 
    c.sectionId === plan.sectionId && 
    c.subject === plan.subject
  );

  const handleTogglePublicStatus = async () => {
    setIsTogglingPublic(true);
    const currentPlan = get().selectedLessonPlan; // Get current selected plan from store
    if (!currentPlan) {
        setIsTogglingPublic(false);
        return;
    }
    const success = await updateLessonPlan(currentPlan.$id, { isPublic: !currentPlan.isPublic });
    if (success) {
        // Refetch the updated lesson plan to refresh the view
        try {
            const updatedPlanDoc = await databases.getDocument(APPWRITE_DATABASE_ID, LESSON_PLAN_COLLECTION_ID, currentPlan.$id);
            selectLessonPlan(updatedPlanDoc as LessonPlan); // Update the store's selectedLessonPlan
        } catch (fetchError) {
            console.error("Error refetching updated lesson plan:", fetchError);
            setError("Failed to refresh lesson plan details after toggle.");
        }
    }
    setIsTogglingPublic(false);
  };

  const handleAddReview = async () => {
    if (!newReviewData.studentId || !newReviewData.comment) {
        setError("Please select a student and add a comment for the review.");
        return;
    }
    if (newReviewData.rating < 1 || newReviewData.rating > 5) {
        setError("Please provide a rating between 1 and 5 stars.");
        return;
    }
    const success = await addStudentReview({
        lessonPlanId: plan.$id,
        studentId: newReviewData.studentId,
        rating: newReviewData.rating,
        comment: newReviewData.comment,
    });
    if(success) {
        setNewReviewData({ studentId: '', rating: 0, comment: '' });
        setShowReviewForm(false);
    }
  };

  const studentOptions = useMemo(() => 
    studentsForReview.map(s => ({ id: s.$id, name: s.name })),
    [studentsForReview]
  );

  const DetailItem: React.FC<{ label: string; value?: string | number | string[] | null; children?: React.ReactNode }> = ({ label, value, children }) => {
    if (!children && (value === null || value === undefined || (Array.isArray(value) && value.length === 0))) return null;
    return (
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {children ? (
            <div className="text-gray-700 mt-0.5">{children}</div>
        ) : Array.isArray(value) ? (
          <ul className="list-disc list-inside pl-1 text-gray-700">
            {value.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        ) : (
          <p className="text-gray-700">{String(value)}</p>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <Button variant="light" onClick={onBack} startContent={<ArrowLeftIcon className="h-5 w-5" />}>
          Back to List
        </Button>
        <div className="flex items-center gap-2">
            {plan.isPublic ? (
                <Badge color="success" variant="flat" size="sm" className="flex items-center">
                    <EyeIcon className="h-4 w-4 mr-1" /> Public
                </Badge>
            ) : (
                <Badge color="default" variant="flat" size="sm" className="flex items-center">
                    <EyeSlashIcon className="h-4 w-4 mr-1" /> Private
                </Badge>
            )}
            <ActionButton 
                icon={plan.isPublic ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                onClick={handleTogglePublicStatus}
                color={plan.isPublic ? "orange" : "green"}
                buttonText={plan.isPublic ? "Make Private" : "Make Public"}
                isIconOnly={true}
                isDisabled={isTogglingPublic || isSubmittingLessonPlan}
            />
            <ActionButton icon={<PencilSquareIcon className="h-5 w-5" />} onClick={() => onEdit(plan)} color="orange" isDisabled={isTogglingPublic} />
            <ActionButton icon={<TrashIcon className="h-5 w-5" />} onClick={() => onDeleteRequest(plan.$id)} color="red" isDisabled={isTogglingPublic}/>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-1">{plan.title}</h2>
      <div className="flex items-center gap-4 mb-4">
        <Chip color={statusColors[plan.status] || "default"} size="md" variant="flat">
            {plan.status.replace('-', ' ')}
        </Chip>
        <p className="text-sm text-gray-600">
            {context ? `${context.facultyName} - ${context.class} - ${context.sectionName}` : 'Context N/A'} | Subject: {plan.subject}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        <DetailItem label="Lesson Date (B.S.)" value={plan.lessonDateBS} />
        <DetailItem label="Estimated Periods" value={plan.estimatedPeriods} />
        <DetailItem label="Actual Periods Taken" value={plan.actualPeriodsTaken} />
        <DetailItem label="Overall Class Rating">
            {plan.overallClassRating && plan.overallClassRating > 0 ? (
                <StarRating rating={plan.overallClassRating} max={5} size={20} color="#22c55e" />
            ) : (<span className="text-gray-400 italic">Not yet rated</span>)}
        </DetailItem>
        <div className="md:col-span-2 mt-2"><DetailItem label="Description" value={plan.description} /></div>
        <DetailItem label="Learning Objectives" value={plan.learningObjectives} />
        <DetailItem label="Teaching Materials" value={plan.teachingMaterials} />
        <DetailItem label="Assessment Methods" value={plan.assessmentMethods} />
        <div className="md:col-span-2"><DetailItem label="Teacher's Reflection" value={plan.teacherReflection} /></div>
      </div>

      <div className="mt-8 pt-6 border-t">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700">Student Reviews</h3>
            {plan.isPublic && (
                <Button 
                    color="primary" variant="ghost" size="sm"
                    onClick={() => {
                        setShowReviewForm(!showReviewForm);
                        if (showReviewForm) setNewReviewData({ studentId: '', rating: 0, comment: '' });
                    }}
                    startContent={<PlusCircleIcon className="h-5 w-5" />}
                    disabled={isSubmittingStudentReview}
                >
                    {showReviewForm ? 'Cancel Review' : 'Add Student Review'}
                </Button>
            )}
        </div>

        {!plan.isPublic && (
            <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
                This lesson plan is private. Make it public (using the <EyeIcon className="inline h-4 w-4"/> button above) to add student reviews.
            </p>
        )}
        {plan.isPublic && showReviewForm && (
            <div className="p-4 border rounded-md bg-gray-50 mb-6 space-y-4">
                <CustomSelect 
                    label="Select Student" options={studentOptions} value={newReviewData.studentId}
                    onChange={(val) => setNewReviewData(prev => ({...prev, studentId: val || ''}))}
                    placeholder={isLoadingStudentsForReview ? "Loading students..." : "Choose a student"}
                    disabled={isLoadingStudentsForReview || studentOptions.length === 0} allowClear={true}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating*</label>
                    <StarRating
                        rating={newReviewData.rating}
                        onRatingChange={(newRating) => setNewReviewData(prev => ({ ...prev, rating: newRating }))}
                        max={5} size={24}
                    />
                </div>
                <Textarea 
                    label="Comment*" placeholder="Enter your comments..." value={newReviewData.comment}
                    onChange={(e) => setNewReviewData(prev => ({...prev, comment: e.target.value}))}
                    minRows={2} isRequired
                />
                <Button color="success" onClick={handleAddReview} isLoading={isSubmittingStudentReview} disabled={isSubmittingStudentReview}>
                    Submit Review
                </Button>
            </div>
        )}
        {isLoadingStudentReviews && <p>Loading student reviews...</p>}
        {!isLoadingStudentReviews && studentReviews.length === 0 && (
            <p className="text-gray-500">
                {plan.isPublic ? "No student reviews yet for this lesson." : ""}
            </p>
        )}
        {!isLoadingStudentReviews && studentReviews.length > 0 && (
          <div className="space-y-3">
            {studentReviews.map(review => (
              <div key={review.$id} className="p-3 border rounded-md bg-white shadow-sm">
                <div className="flex justify-between items-center">
                    <p className="font-semibold">{review.studentName || 'Student...'}</p>
                    <StarRating rating={review.rating} max={5} size={18} /> 
                </div>
                 <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                <p className="text-xs text-gray-400 mt-1 flex justify-between items-center">
                    <span>Reviewed on: {new Date(review.$createdAt || Date.now()).toLocaleDateString()}</span>
                    {(review as any).teacherId === teacherProfile?.id && (
                        <ActionButton 
                            icon={<TrashIcon className="h-4 w-4"/>} 
                            onClick={() => deleteStudentReview(review.$id)} color="red" isIconOnly={true}
                        />
                    )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonPlanDetailView;