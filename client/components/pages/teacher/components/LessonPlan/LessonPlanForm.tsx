import React, { useEffect, useState } from 'react';
import { Button, Input, Textarea, Select, SelectItem } from '@heroui/react'; // Using HeroUI select for simplicity here, or replace with CustomSelect logic
import CustomSelect, { SelectOption as CustomSelectOption} from '../../../common/CustomSelect';
import { useLessonPlanStore } from '~/store/lessonPlanStore';
import { LessonPlan, LessonPlanFormData } from 'types/lesson_plan';

// Helper to convert comma-separated string to array and back for form fields
const arrayToString = (arr?: string[]): string => (arr ? arr.join(', ') : '');
const stringToArray = (str: string): string[] => str.split(',').map(s => s.trim()).filter(s => s);

const LessonPlanForm: React.FC = () => {
  const {
    drawerMode,
    selectedLessonPlan,
    submitLessonPlan,
    isSubmitting,
    error,
    filters, // To pre-fill faculty, class, section, subject for 'add' mode
    rawAssignments, // To find names for IDs
  } = useLessonPlanStore(state => ({
    drawerMode: state.drawerMode,
    selectedLessonPlan: state.selectedLessonPlan,
    submitLessonPlan: state.submitLessonPlan,
    isSubmitting: state.isSubmitting,
    error: state.error,
    filters: state.filters,
    rawAssignments: state.rawAssignments,
  }));

  const getInitialAssignmentContext = () => {
    if (drawerMode === 'add') {
        // Try to find a full assignment match for the current filters
        const matchedAssignment = rawAssignments.find(
            a => a.facultyId === filters.facultyId &&
                 a.className === filters.className &&
                 a.sectionId === filters.sectionId &&
                 a.subject === filters.subject
        );
        if (matchedAssignment) return matchedAssignment;

        // Fallback to individual filter values if a full match isn't found
        // (this scenario is less likely if filters are cascading correctly)
        const faculty = rawAssignments.find(a => a.facultyId === filters.facultyId);
        const section = rawAssignments.find(a => a.sectionId === filters.sectionId); // Using ID directly if name not resolved for some reason
        
        return {
            facultyId: filters.facultyId || '',
            facultyName: faculty?.facultyName || filters.facultyId || '',
            className: filters.className || '',
            sectionId: filters.sectionId || '',
            sectionName: section?.sectionName || filters.sectionId || '',
            subject: filters.subject || '',
        };
    }
    if (selectedLessonPlan) {
        const faculty = rawAssignments.find(a => a.facultyId === selectedLessonPlan.facultyId);
        const section = rawAssignments.find(a => a.sectionId === selectedLessonPlan.sectionId);
        return {
            facultyId: selectedLessonPlan.facultyId,
            facultyName: faculty?.facultyName || selectedLessonPlan.facultyId,
            className: selectedLessonPlan.className,
            sectionId: selectedLessonPlan.sectionId,
            sectionName: section?.sectionName || selectedLessonPlan.sectionId,
            subject: selectedLessonPlan.subject,
        };
    }
    return { facultyId: '', facultyName: '', className: '', sectionId: '', sectionName: '', subject: '' };
  };
  
  const initialContext = getInitialAssignmentContext();

  const [formData, setFormData] = useState<LessonPlanFormData>({
    title: '',
    description: '',
    lessonDateBS: '', // YYYY-MM-DD
    lessonDateAD: '', // YYYY-MM-DD for input, converted to ISO for submission
    estimatedPeriods: '',
    learningObjectives: '',
    topicsCovered: '',
    teachingActivities: '',
    resourcesNeeded: '',
    assessmentMethods: '',
    homeworkAssignment: '',
    status: 'Planned',
    actualPeriodsTaken: '',
    completionDateAD: '',
    teacherReflection: '',
    // Context fields
    facultyId: initialContext.facultyId,
    className: initialContext.className,
    sectionId: initialContext.sectionId,
    subject: initialContext.subject,
  });
  
  // Display names for context fields
  const [displayContext, setDisplayContext] = useState({
    facultyName: initialContext.facultyName,
    sectionName: initialContext.sectionName,
  });


  useEffect(() => {
    if (drawerMode === 'edit' && selectedLessonPlan) {
      setFormData({
        title: selectedLessonPlan.title,
        description: selectedLessonPlan.description,
        lessonDateBS: selectedLessonPlan.lessonDateBS,
        lessonDateAD: selectedLessonPlan.lessonDateAD ? new Date(selectedLessonPlan.lessonDateAD).toISOString().split('T')[0] : '',
        estimatedPeriods: String(selectedLessonPlan.estimatedPeriods),
        learningObjectives: arrayToString(selectedLessonPlan.learningObjectives),
        topicsCovered: arrayToString(selectedLessonPlan.topicsCovered),
        teachingActivities: arrayToString(selectedLessonPlan.teachingActivities),
        resourcesNeeded: arrayToString(selectedLessonPlan.resourcesNeeded),
        assessmentMethods: arrayToString(selectedLessonPlan.assessmentMethods),
        homeworkAssignment: selectedLessonPlan.homeworkAssignment || '',
        status: selectedLessonPlan.status,
        actualPeriodsTaken: selectedLessonPlan.actualPeriodsTaken ? String(selectedLessonPlan.actualPeriodsTaken) : '',
        completionDateAD: selectedLessonPlan.completionDateAD ? new Date(selectedLessonPlan.completionDateAD).toISOString().split('T')[0] : '',
        teacherReflection: selectedLessonPlan.teacherReflection || '',
        facultyId: selectedLessonPlan.facultyId,
        className: selectedLessonPlan.className,
        sectionId: selectedLessonPlan.sectionId,
        subject: selectedLessonPlan.subject,
      });
      const faculty = rawAssignments.find(a => a.facultyId === selectedLessonPlan.facultyId);
      const section = rawAssignments.find(a => a.sectionId === selectedLessonPlan.sectionId);
      setDisplayContext({
          facultyName: faculty?.facultyName || selectedLessonPlan.facultyId,
          sectionName: section?.sectionName || selectedLessonPlan.sectionId,
      });

    } else if (drawerMode === 'add') {
      // Pre-fill from filters
      const context = getInitialAssignmentContext();
      setFormData(prev => ({
        ...prev, // keep any manually entered data if re-opening
        title: '', description: '', lessonDateBS: '', lessonDateAD: '', estimatedPeriods: '',
        learningObjectives: '', topicsCovered: '', teachingActivities: '', resourcesNeeded: '', assessmentMethods: '',
        homeworkAssignment: '', status: 'Planned', actualPeriodsTaken: '', completionDateAD: '', teacherReflection: '',
        facultyId: context.facultyId,
        className: context.className,
        sectionId: context.sectionId,
        subject: context.subject,
      }));
      setDisplayContext({
        facultyName: context.facultyName,
        sectionName: context.sectionName,
      });
    }
  }, [drawerMode, selectedLessonPlan, filters, rawAssignments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCustomSelectChange = (name: keyof LessonPlanFormData, value: string | null) => {
     setFormData(prev => ({ ...prev, [name]: value || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.facultyId || !formData.className || !formData.sectionId || !formData.subject) {
        useLessonPlanStore.setState({ error: "Context (Faculty, Class, Section, Subject) must be set. Please select them from filters if adding." });
        return;
    }
    const dataToSubmit: LessonPlanFormData = {
        ...formData,
        lessonDateAD: formData.lessonDateAD ? new Date(formData.lessonDateAD).toISOString() : new Date().toISOString(), // Default to today if empty, ensure ISO
        estimatedPeriods: Number(formData.estimatedPeriods) || 0,
        actualPeriodsTaken: formData.actualPeriodsTaken ? Number(formData.actualPeriodsTaken) : undefined,
        completionDateAD: formData.completionDateAD ? new Date(formData.completionDateAD).toISOString() : undefined,
    };
    await submitLessonPlan(dataToSubmit);
  };
  
  const statusOptions: CustomSelectOption[] = [
    { id: 'Planned', name: 'Planned' },
    { id: 'Completed', name: 'Completed' },
    { id: 'Partially Completed', name: 'Partially Completed' },
    { id: 'Postponed', name: 'Postponed' },
    { id: 'Cancelled', name: 'Cancelled' },
  ];


  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      {/* Display Context Fields (Readonly in form) */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-indigo-50 rounded-md">
        <div><span className="font-semibold">Faculty:</span> {displayContext.facultyName}</div>
        <div><span className="font-semibold">Class:</span> {formData.className}</div>
        <div><span className="font-semibold">Section:</span> {displayContext.sectionName}</div>
        <div><span className="font-semibold">Subject:</span> {formData.subject}</div>
      </div>
      
      <Input
        label="Title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        fullWidth
        isRequired
        variant="bordered"
      />
      <Textarea
        label="Description (What will be taught)"
        name="description"
        value={formData.description}
        onChange={handleChange}
        fullWidth
        isRequired
        variant="bordered"
        minRows={3}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
            label="Lesson Date (BS - YYYY-MM-DD)"
            name="lessonDateBS"
            value={formData.lessonDateBS}
            onChange={handleChange}
            placeholder="e.g., 2080-05-15"
            fullWidth
            isRequired
            variant="bordered"
        />
        <Input
            type="date"
            label="Lesson Date (AD)"
            name="lessonDateAD"
            value={formData.lessonDateAD}
            onChange={handleChange}
            fullWidth
            isRequired
            variant="bordered"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
            type="number"
            label="Estimated Periods"
            name="estimatedPeriods"
            value={String(formData.estimatedPeriods)}
            onChange={handleChange}
            fullWidth
            isRequired
            min="1"
            variant="bordered"
        />
        <CustomSelect
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={(val) => handleCustomSelectChange('status', val)}
            placeholder="Select status"
            // className="w-full" // CustomSelect applies its own width constraints, use wrapper div if needed
        />
      </div>
      
      <Textarea label="Learning Objectives (comma-separated)" name="learningObjectives" value={formData.learningObjectives} onChange={handleChange} fullWidth variant="bordered" />
      <Textarea label="Topics Covered (comma-separated)" name="topicsCovered" value={formData.topicsCovered} onChange={handleChange} fullWidth variant="bordered" />
      <Textarea label="Teaching Activities (comma-separated)" name="teachingActivities" value={formData.teachingActivities} onChange={handleChange} fullWidth variant="bordered" />
      <Textarea label="Resources Needed (comma-separated)" name="resourcesNeeded" value={formData.resourcesNeeded} onChange={handleChange} fullWidth variant="bordered" />
      <Textarea label="Assessment Methods (comma-separated)" name="assessmentMethods" value={formData.assessmentMethods} onChange={handleChange} fullWidth variant="bordered" />
      <Textarea label="Homework Assignment" name="homeworkAssignment" value={formData.homeworkAssignment || ''} onChange={handleChange} fullWidth variant="bordered" />

      {formData.status === 'Completed' || formData.status === 'Partially Completed' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
            <Input
                type="number"
                label="Actual Periods Taken"
                name="actualPeriodsTaken"
                value={String(formData.actualPeriodsTaken || '')}
                onChange={handleChange}
                fullWidth
                min="0"
                variant="bordered"
            />
            <Input
                type="date"
                label="Completion Date (AD)"
                name="completionDateAD"
                value={formData.completionDateAD || ''}
                onChange={handleChange}
                fullWidth
                variant="bordered"
            />
        </div>
      ) : null}
      <Textarea label="Teacher's Reflection/Overall Review" name="teacherReflection" value={formData.teacherReflection || ''} onChange={handleChange} fullWidth variant="bordered" minRows={3}/>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      
      <div className="flex justify-end pt-2">
        <Button type="submit" color="primary" isLoading={isSubmitting} disabled={isSubmitting}>
          {drawerMode === 'add' ? 'Create Lesson Plan' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

export default LessonPlanForm;