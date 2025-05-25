// src/components/student-review/ReviewForm.tsx
import React, { useState, useEffect } from 'react';
import { useReviewStore } from '~/store/reviewStore';
import CustomSelect, { SelectOption } from '../../common/CustomSelect';
import { Button, Input, Textarea } from '@heroui/react';
import NepaliDate from 'nepali-date-converter'; // Import NepaliDate

export const reviewTypeOptions: SelectOption[] = [
  // ... (options remain the same)
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
  // ... (options remain the same)
  { id: 'excellent', name: 'Excellent' },
  { id: 'very_good', name: 'Very Good' },
  { id: 'good', name: 'Good' },
  { id: 'satisfactory', name: 'Satisfactory' },
  { id: 'needs_improvement', name: 'Needs Improvement' },
  { id: 'unsatisfactory', name: 'Unsatisfactory' },
];

// Helper to convert AD (YYYY-MM-DD string or Date object) to BS (YYYY-MM-DD string)
const convertADtoBS = (adDateInput: string | Date): string => {
  try {
    const adDate = typeof adDateInput === 'string' ? new Date(adDateInput) : adDateInput;
    if (isNaN(adDate.getTime())) return ''; // Invalid AD date
    const bsDate = new NepaliDate(adDate);
    return `${bsDate.getYear()}-${String(bsDate.getMonth() + 1).padStart(2, '0')}-${String(bsDate.getDate()).padStart(2, '0')}`;
  } catch (e) {
    console.error("AD to BS Conversion Error:", e);
    return ''; // Return empty or a default/error string
  }
};

// Helper to convert BS (YYYY-MM-DD string) to AD (YYYY-MM-DD string)
const convertBStoAD = (bsDateInput: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bsDateInput)) return ''; // Basic format check
  try {
    const [year, month, day] = bsDateInput.split('-').map(Number);
    const bsDate = new NepaliDate(year, month - 1, day); // NepaliDate month is 0-indexed
    const adDate = bsDate.toJsDate();
    return `${adDate.getFullYear()}-${String(adDate.getMonth() + 1).padStart(2, '0')}-${String(adDate.getDate()).padStart(2, '0')}`;
  } catch (e) {
    console.error("BS to AD Conversion Error:", e);
    return ''; // Return empty or a default/error string
  }
};


const ReviewForm: React.FC = () => {
  const { drawerMode, reviewToEdit, isSubmittingReview, submitReviewError, actions } = useReviewStore();
  
  const [type, setType] = useState<string | null>(reviewTypeOptions[0]?.id.toString() || null);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<string | null>(null);
  // reviewDateInBS stores the date string as displayed/inputted by the user in BS format
  const [reviewDateInBS, setReviewDateInBS] = useState<string>(convertADtoBS(new Date())); // Default to today in BS
  const [dateError, setDateError] = useState<string>('');


  useEffect(() => {
    setDateError(''); // Clear date error on mode change
    if (drawerMode === 'edit' && reviewToEdit) {
      setType(reviewToEdit.type);
      setDescription(reviewToEdit.description);
      setRating(reviewToEdit.rating || null);
      // reviewToEdit.reviewDate is in AD from DB, convert to BS for display
      setReviewDateInBS(convertADtoBS(reviewToEdit.reviewDate));
      // academicYear removed
    } else {
      // Reset for 'add' mode
      setType(reviewTypeOptions[0]?.id.toString() || null);
      setDescription('');
      setRating(null);
      setReviewDateInBS(convertADtoBS(new Date())); // Today's date in BS
    }
  }, [drawerMode, reviewToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');
    actions.clearErrors(); // Clear previous store errors

    if (!type || !description) {
      alert("Review Type and Description are required.");
      return;
    }

    // Validate and convert BS date to AD for submission
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDateInBS)) {
        setDateError('Review Date must be in YYYY-MM-DD BS format.');
        return;
    }
    const reviewDateInAD = convertBStoAD(reviewDateInBS);
    if (!reviewDateInAD) {
        setDateError('Invalid BS Date. Please check the year, month, and day.');
        return;
    }

    const success = await actions.submitReview({
      type,
      description,
      rating: rating || undefined,
      reviewDate: reviewDateInAD, // Submit AD date
      // academicYear removed
    });

    if (success && drawerMode === 'add') {
      // Optionally reset form fields further if needed, though store closure handles much of it
      setReviewDateInBS(convertADtoBS(new Date())); // Reset date to today BS
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      <div>
        <CustomSelect
          label="Review Type *"
          options={reviewTypeOptions}
          value={type}
          onChange={(selectedId) => setType(selectedId)}
          placeholder="Select review type"
          disabled={isSubmittingReview}
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <Textarea
          id="description"
          value={description}
          onValueChange={setDescription}
          placeholder="Detailed review comments"
          rows={4}
          disabled={isSubmittingReview}
          className="w-full"
          // You might need isInvalid and errorMessage props if Textarea supports them for validation
        />
      </div>
      <div>
        <CustomSelect
          label="Overall Rating (Optional)"
          options={reviewRatingOptions}
          value={rating}
          onChange={(selectedId) => setRating(selectedId)}
          placeholder="Select rating"
          allowClear={true}
          disabled={isSubmittingReview}
        />
      </div>
      <div>
        <label htmlFor="reviewDateInBS" className="block text-sm font-medium text-gray-700 mb-1">Review Date (BS - YYYY-MM-DD) *</label>
        <Input
          id="reviewDateInBS"
          type="text" // Keep as text to allow manual BS date input
          value={reviewDateInBS}
          onValueChange={(val) => {
            setReviewDateInBS(val);
            if (dateError) setDateError(''); // Clear error on change
          }}
          placeholder="e.g., 2081-01-15"
          disabled={isSubmittingReview}
          className="w-full max-w-[250px]"
          isInvalid={!!dateError} // Show error state if Input supports it
          // errorMessage={dateError} // Show error message if Input supports it
        />
        {dateError && <p className="text-xs text-red-600 mt-1">{dateError}</p>}
      </div>
      
      {/* Academic Year field removed */}

      {submitReviewError && <p className="text-sm text-red-600 mt-2">{submitReviewError}</p>}
      <div className="flex justify-end space-x-3 pt-3">
        <Button type="button" color="default" variant="flat" onPress={actions.closeDrawer} disabled={isSubmittingReview}>
          Cancel
        </Button>
        <Button type="submit" color="primary" isLoading={isSubmittingReview} disabled={isSubmittingReview}>
          {drawerMode === 'add' ? 'Add Review' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

export default ReviewForm;