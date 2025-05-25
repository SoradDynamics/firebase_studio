// src/components/admin/AdminReviewForm.tsx
import React, { useState, useEffect } from 'react';
import { useAdminReviewStore } from '~/store/adminReviewStore';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect'; // Ensure this path is correct
import { Button, Input, Textarea } from '@heroui/react';
import NepaliDate from 'nepali-date-converter';
// No need to import TeacherDocument or fetch all teachers if we use a text input

// IMPORT or DEFINE these options HERE or import from a shared file
// Assuming they are exported from where they were first defined (e.g., teacher's ReviewForm or a shared util)
// For example, if they are in '../student-review/ReviewForm':
// import { reviewTypeOptions, reviewRatingOptions } from '../student-review/ReviewForm';

// OR define them directly if not shared:
export const reviewTypeOptions: SelectOption[] = [
  { id: 'hygiene', name: 'Hygiene' },
  { id: 'discipline', name: 'Discipline' },
  { id: 'academic_performance', name: 'Academic Performance' },
  { id: 'class_participation', name: 'Class Participation' },
  { id: 'behavior', name: 'Behavior' },
  { id: 'responsibility', name: 'Responsibility' },
  { id: 'social_skills', name: 'Social Skills' },
  { id: 'homework_completion', name: 'Homework Completion' },
  { id: 'punctuality', name: 'Punctuality' },
  { id: 'other', name: 'Other' },
];

export const reviewRatingOptions: SelectOption[] = [
  { id: 'excellent', name: 'Excellent' },
  { id: 'very_good', name: 'Very Good' },
  { id: 'good', name: 'Good' },
  { id: 'satisfactory', name: 'Satisfactory' },
  { id: 'needs_improvement', name: 'Needs Improvement' },
  { id: 'unsatisfactory', name: 'Unsatisfactory' },
];


// Date conversion helpers (ensure these are defined or imported)
const convertADtoBS = (adDateInput: string | Date): string => {
    try {
      const adDate = typeof adDateInput === 'string' ? new Date(adDateInput) : adDateInput;
      if (isNaN(adDate.getTime())) return '';
      const bsDate = new NepaliDate(adDate);
      return `${bsDate.getYear()}-${String(bsDate.getMonth() + 1).padStart(2, '0')}-${String(bsDate.getDate()).padStart(2, '0')}`;
    } catch (e) { console.error("AD to BS Error:", e); return ''; }
  };
  
const convertBStoAD = (bsDateInput: string): string => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bsDateInput)) return '';
    try {
      const [year, month, day] = bsDateInput.split('-').map(Number);
      const bsDate = new NepaliDate(year, month - 1, day); // NepaliDate month is 0-indexed
      const adDate = bsDate.toJsDate();
      return `${adDate.getFullYear()}-${String(adDate.getMonth() + 1).padStart(2, '0')}-${String(adDate.getDate()).padStart(2, '0')}`;
    } catch (e) { console.error("BS to AD Error:", e); return ''; }
  };

const AdminReviewForm: React.FC = () => {
  const { drawerMode, reviewToEdit, isSubmittingReview, submitReviewError, actions, selectedStudent, adminEmail } = useAdminReviewStore();
  
  const [type, setType] = useState<string | null>(reviewTypeOptions[0]?.id.toString() || null);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<string | null>(null);
  const [reviewDateInBS, setReviewDateInBS] = useState<string>(convertADtoBS(new Date()));
  const [dateError, setDateError] = useState<string>('');
  
  // Optional text input for teacher name/ID, or defaults to "Administrator"
  const [reviewedByTeacherInput, setReviewedByTeacherInput] = useState<string>('');

  useEffect(() => {
    setDateError('');
    // actions.clearAllErrors(); // This might be too aggressive if called on every render inside useEffect

    if (drawerMode === 'edit' && reviewToEdit) {
      setType(reviewToEdit.type);
      setDescription(reviewToEdit.description);
      setRating(reviewToEdit.rating || null);
      setReviewDateInBS(convertADtoBS(reviewToEdit.reviewDate));
      // If editing, show the original teacher. Admin can't change this easily via this form.
      // The teacherId in reviewToEdit is what will be used by the store.
      // We can display it or a resolved name if available (reviewToEdit.teacherName)
      if (reviewToEdit.teacherName && reviewToEdit.teacherName !== 'N/A') {
        setReviewedByTeacherInput(reviewToEdit.teacherName); // Display resolved name
      } else if (reviewToEdit.teacherId && reviewToEdit.teacherId.toUpperCase() !== 'ADMIN') {
        // If it's a specific ID and not just "ADMIN", show the ID
        setReviewedByTeacherInput(reviewToEdit.teacherId);
      } else {
        setReviewedByTeacherInput(''); // Or 'Administrator' if it was an admin review
      }
    } else { // Add mode
      setType(reviewTypeOptions[0]?.id.toString() || null);
      setDescription('');
      setRating(null);
      setReviewDateInBS(convertADtoBS(new Date()));
      setReviewedByTeacherInput(''); // Clear for new review
    }
  }, [drawerMode, reviewToEdit]); // Removed actions from deps to avoid loop if clearAllErrors is called here

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');
    useAdminReviewStore.getState().actions.clearAllErrors(); // Call clear errors from store instance

    if (!type || !description) {
      // Consider using a more integrated error display system than alert
      useAdminReviewStore.setState({ submitReviewError: "Review Type and Description are required." });
      return;
    }
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDateInBS)) {
        setDateError('Review Date must be in YYYY-MM-DD BS format.');
        return;
    }
    const reviewDateInAD = convertBStoAD(reviewDateInBS);
    if (!reviewDateInAD) {
        setDateError('Invalid BS Date. Please check the year, month, and day.');
        return;
    }

    // Determine the teacherId for the review
    let teacherIdForPayload: string;
    if (drawerMode === 'add') {
        // If admin provides a teacher name/ID, use that. Otherwise, mark as Admin.
        // This assumes 'reviewedByTeacherInput' should be a custom teacher 'id' if provided.
        // If it's just a name, you'd need to resolve it to an ID or store the name.
        // For simplicity now: if input is there, it's assumed to be a teacher's custom ID.
        // A more robust solution would be a searchable select for teachers or clear instructions.
        teacherIdForPayload = reviewedByTeacherInput.trim() || `ADMIN:${adminEmail || 'UnknownAdmin'}`;
    } else if (reviewToEdit) {
        teacherIdForPayload = reviewToEdit.teacherId; // Keep original teacher when editing
    } else {
        // Should not happen if drawerMode is correctly 'add' or 'edit'
        useAdminReviewStore.setState({ submitReviewError: "Form mode is unclear."});
        return;
    }


    const success = await actions.submitReview(
        { type, description, rating: rating || undefined, reviewDate: reviewDateInAD },
        teacherIdForPayload // Pass the determined teacherId
    );

    if (success && drawerMode === 'add') {
      // Reset form for next potential 'add'
      setType(reviewTypeOptions[0]?.id.toString() || null);
      setDescription('');
      setRating(null);
      setReviewDateInBS(convertADtoBS(new Date()));
      setReviewedByTeacherInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-1"> {/* Increased space-y */}
        {selectedStudent && <p className="text-sm text-gray-700 mb-4 pb-2 border-b border-gray-200">Review for: <span className="font-semibold text-indigo-600">{selectedStudent.name}</span></p>}
      
      {drawerMode === 'add' && (
        <div>
            <label htmlFor="reviewedByTeacher" className="block text-sm font-medium text-gray-700 mb-1">
                Reviewed By (Optional: Teacher Name or ID)
            </label>
            <Input
                id="reviewedByTeacher"
                value={reviewedByTeacherInput}
                onValueChange={setReviewedByTeacherInput}
                placeholder="Enter Teacher Name/ID, or leave blank for Admin"
                disabled={isSubmittingReview}
                className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">If blank, review will be attributed to Administrator ({adminEmail}).</p>
        </div>
      )}
      {drawerMode === 'edit' && reviewToEdit && (
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Reviewer
            </label>
             <Input
                value={reviewToEdit.teacherName !== 'N/A' && reviewToEdit.teacherName ? reviewToEdit.teacherName : reviewToEdit.teacherId}
                isReadOnly
                className="w-full bg-gray-100"
            />
        </div>
      )}

      <CustomSelect
        label="Review Type *"
        options={reviewTypeOptions} // Ensure this is populated
        value={type}
        onChange={(id) => setType(id)} // CustomSelect expects ID
        placeholder="Select review type"
        disabled={isSubmittingReview}
      />
      <div>
        <label htmlFor="description_admin" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <Textarea
          id="description_admin" // Unique ID if multiple textareas on page
          value={description}
          onValueChange={setDescription}
          placeholder="Detailed review comments..."
          rows={5} // Slightly more rows
          disabled={isSubmittingReview}
          className="w-full"
        />
      </div>
      <CustomSelect
        label="Overall Rating (Optional)"
        options={reviewRatingOptions} // Ensure this is populated
        value={rating}
        onChange={(id) => setRating(id)} // CustomSelect expects ID
        placeholder="Select rating"
        allowClear={true}
        disabled={isSubmittingReview}
      />
      <div>
        <label htmlFor="reviewDateInBS_admin" className="block text-sm font-medium text-gray-700 mb-1">Review Date (BS - YYYY-MM-DD) *</label>
        <Input
          id="reviewDateInBS_admin"
          type="text"
          value={reviewDateInBS}
          onValueChange={(val) => { setReviewDateInBS(val); if (dateError) setDateError(''); }}
          placeholder="e.g., 2081-01-15"
          disabled={isSubmittingReview}
          isInvalid={!!dateError}
          errorMessage={dateError || undefined}
          className="w-full max-w-xs" // Adjusted max-width
        />
        {dateError && <p className="text-xs text-red-600 mt-1">{dateError}</p>}
      </div>
      
      {submitReviewError && <p className="text-sm text-red-600 mt-3 p-2 bg-red-50 rounded-md">{submitReviewError}</p>}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
        <Button type="button" color="default" variant="flat" onPress={actions.closeReviewDrawer} disabled={isSubmittingReview}>
          Cancel
        </Button>
        <Button type="submit" color="primary" isLoading={isSubmittingReview} disabled={isSubmittingReview} className="shadow-md">
          {drawerMode === 'add' ? 'Add Review' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

export default AdminReviewForm;