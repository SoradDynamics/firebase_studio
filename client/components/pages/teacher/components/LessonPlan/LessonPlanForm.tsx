
import { StarRating } from '../../../../common/StarRating'; // Ensure path is correct

import React, { useState, useEffect, useMemo } from 'react';
import { Input, Textarea, Button } from '@heroui/react';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import { Drawer } from '../../../../common/Drawer';
import { useLessonPlanStore, LessonPlan, LessonPlanFormData, getUniqueFilterOptions, TeacherContext } from '~/store/lessonPlanStore';



interface LessonPlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  lessonPlanToEdit?: LessonPlan | null;
}

const LessonPlanForm: React.FC<LessonPlanFormProps> = ({ isOpen, onClose, lessonPlanToEdit }) => {
  const { addLessonPlan, updateLessonPlan, isSubmittingLessonPlan, assignedContexts, setError } = useLessonPlanStore();
  
  const initialFormData: LessonPlanFormData = {
    title: '',
    description: '',
    facultyId: '',
    class: '',
    sectionId: '',
    subject: '',
    lessonDateBS: '',
    estimatedPeriods: 1,
    status: 'planned',
    learningObjectives: [],
    teachingMaterials: [],
    assessmentMethods: [],
    teacherReflection: '',
    actualPeriodsTaken: undefined,
    overallClassRating: 0,
    isPublic: false, // Default to private
  };
  const [formData, setFormData] = useState<LessonPlanFormData>(initialFormData);

  const [formContext, setFormContext] = useState({
    facultyId: lessonPlanToEdit?.facultyId || null,
    class: lessonPlanToEdit?.class || null,
    sectionId: lessonPlanToEdit?.sectionId || null,
  });

  useEffect(() => {
    if (isOpen) { // Only update form data when drawer opens
        if (lessonPlanToEdit) {
        setFormData({
            title: lessonPlanToEdit.title,
            description: lessonPlanToEdit.description,
            facultyId: lessonPlanToEdit.facultyId,
            class: lessonPlanToEdit.class,
            sectionId: lessonPlanToEdit.sectionId,
            subject: lessonPlanToEdit.subject,
            lessonDateBS: lessonPlanToEdit.lessonDateBS,
            estimatedPeriods: lessonPlanToEdit.estimatedPeriods,
            status: lessonPlanToEdit.status,
            learningObjectives: lessonPlanToEdit.learningObjectives || [],
            teachingMaterials: lessonPlanToEdit.teachingMaterials || [],
            assessmentMethods: lessonPlanToEdit.assessmentMethods || [],
            teacherReflection: lessonPlanToEdit.teacherReflection || '',
            actualPeriodsTaken: lessonPlanToEdit.actualPeriodsTaken,
            overallClassRating: lessonPlanToEdit.overallClassRating || 0,
            isPublic: lessonPlanToEdit.isPublic || false,
        });
        setFormContext({
            facultyId: lessonPlanToEdit.facultyId,
            class: lessonPlanToEdit.class,
            sectionId: lessonPlanToEdit.sectionId,
        });
        } else {
        setFormData(initialFormData); // Reset to initial on add
        setFormContext({ facultyId: null, class: null, sectionId: null });
        }
    }
  }, [lessonPlanToEdit, isOpen]);

  const facultyOptions = useMemo(() => getUniqueFilterOptions(assignedContexts, 'facultyId'), [assignedContexts]);
  const classOptions = useMemo(() => getUniqueFilterOptions(assignedContexts, 'class', { facultyId: formContext.facultyId }), [assignedContexts, formContext.facultyId]);
  const sectionOptions = useMemo(() => getUniqueFilterOptions(assignedContexts, 'sectionId', { facultyId: formContext.facultyId, class: formContext.class }), [assignedContexts, formContext.facultyId, formContext.class]);
  const subjectOptions = useMemo(() => getUniqueFilterOptions(assignedContexts, 'subject', { facultyId: formContext.facultyId, class: formContext.class, sectionId: formContext.sectionId }), [assignedContexts, formContext.facultyId, formContext.class, formContext.sectionId]);

  const statusOptions: SelectOption[] = [
    { id: 'planned', name: 'Planned' },
    { id: 'completed', name: 'Completed' },
    { id: 'partially-completed', name: 'Partially Completed' },
  ];
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'estimatedPeriods' || name === 'actualPeriodsTaken' ? (value === '' ? undefined : Number(value)) : value }));
  };

  const handleSelectChange = (name: keyof LessonPlanFormData | keyof typeof formContext, value: string | null) => {
    if (name === 'facultyId' || name === 'class' || name === 'sectionId') {
        const newFormContext = { ...formContext, [name]: value };
        if (name === 'facultyId') {
            newFormContext.class = null; newFormContext.sectionId = null;
            setFormData(prev => ({...prev, class: '', sectionId: '', subject: ''}));
        } else if (name === 'class') {
            newFormContext.sectionId = null;
            setFormData(prev => ({...prev, sectionId: '', subject: ''}));
        } else if (name === 'sectionId') {
             setFormData(prev => ({...prev, subject: ''}));
        }
        setFormContext(newFormContext);
        setFormData(prev => ({ ...prev, [name]: value || '' }));

    } else if (name === 'subject' || name === 'status') {
        setFormData(prev => ({ ...prev, [name]: value || '' }));
    }
  };

  const handleArrayChange = (name: 'learningObjectives' | 'teachingMaterials' | 'assessmentMethods', value: string) => {
    setFormData(prev => ({ ...prev, [name]: value.split('\n').filter(s => s.trim() !== '') }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.facultyId || !formData.class || !formData.sectionId || !formData.subject) {
        setError("Faculty, Class, Section, and Subject are required.");
        return;
    }
    if (!formData.title || !formData.description || !formData.lessonDateBS) {
        setError("Title, Description and Lesson Date are required.");
        return;
    }

    let success = false;
    if (lessonPlanToEdit?.$id) {
      success = await updateLessonPlan(lessonPlanToEdit.$id, formData);
    } else {
      success = await addLessonPlan(formData);
    }
    if (success) {
      onClose(); 
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={lessonPlanToEdit ? 'Edit Lesson Plan' : 'Add New Lesson Plan'} size="lg">
      <form onSubmit={handleSubmit}>
        <Drawer.Body className="space-y-4">
          {/* Faculty, Class, Section, Subject Selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomSelect
              label="Faculty*" options={facultyOptions} value={formContext.facultyId}
              onChange={(val) => handleSelectChange('facultyId', val)} placeholder="Select Faculty"
              disabled={facultyOptions.length === 0}
            />
            <CustomSelect
              label="Class*" options={classOptions} value={formContext.class}
              onChange={(val) => handleSelectChange('class', val)} placeholder="Select Class"
              disabled={!formContext.facultyId || classOptions.length === 0}
            />
            <CustomSelect
              label="Section*" options={sectionOptions} value={formContext.sectionId}
              onChange={(val) => handleSelectChange('sectionId', val)} placeholder="Select Section"
              disabled={!formContext.class || sectionOptions.length === 0}
            />
            <CustomSelect
              label="Subject*" options={subjectOptions} value={formData.subject}
              onChange={(val) => handleSelectChange('subject', val as string)} placeholder="Select Subject"
              disabled={!formContext.sectionId || subjectOptions.length === 0}
            />
          </div>

          {/* Title, Description, Date, Periods, Status */}
          <Input name="title" label="Title*" value={formData.title} onChange={handleChange} placeholder="Enter lesson title" isRequired />
          <Textarea name="description" label="Description*" value={formData.description} onChange={handleChange} placeholder="Detailed lesson plan activities, content, etc." minRows={3} isRequired />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input name="lessonDateBS" label="Lesson Date (BS)*" type="text" value={formData.lessonDateBS} onChange={handleChange} placeholder="YYYY-MM-DD" isRequired 
                description="Enter date in Bikram Sambat format (e.g., 2080-05-15)"
            />
            <Input name="estimatedPeriods" label="Estimated Periods*" type="number" value={String(formData.estimatedPeriods)} onChange={handleChange} min="1" isRequired />
            <CustomSelect
              label="Status*" options={statusOptions} value={formData.status}
              onChange={(val) => handleSelectChange('status', val as 'planned' | 'completed' | 'partially-completed')}
            />
          </div>

          {/* Is Public Toggle */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-gray-700">Make Lesson Plan Public?</span>
            <label htmlFor="isPublicToggle" className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  id="isPublicToggle" 
                  className="sr-only" 
                  checked={formData.isPublic || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.isPublic ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isPublic ? 'translate-x-full' : ''}`}></div>
              </div>
              <span className="ml-3 text-sm text-gray-600">{formData.isPublic ? 'Public' : 'Private'}</span>
            </label>
          </div>
          {formData.isPublic && (
            <p className="text-xs text-indigo-600 -mt-2 mb-2">
              When public, you can add student reviews. Students might also see this plan.
            </p>
          )}
          
          {/* Learning Objectives, Teaching Materials, Assessment Methods */}
          <Textarea name="learningObjectives" label="Learning Objectives" value={formData.learningObjectives?.join('\n') || ''} onChange={e => handleArrayChange('learningObjectives', e.target.value)} placeholder="Enter one objective per line" minRows={2} />
          <Textarea name="teachingMaterials" label="Teaching Materials / Resources" value={formData.teachingMaterials?.join('\n') || ''} onChange={e => handleArrayChange('teachingMaterials', e.target.value)} placeholder="Enter one item per line" minRows={2} />
          <Textarea name="assessmentMethods" label="Assessment Methods" value={formData.assessmentMethods?.join('\n') || ''} onChange={e => handleArrayChange('assessmentMethods', e.target.value)} placeholder="Enter one method per line" minRows={2} />
          
          <hr className="my-4" />
          <h3 className="text-md font-semibold text-gray-700">Post-Lesson Details</h3>
          
          <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Overall Class Rating</label>
              <StarRating
                  rating={formData.overallClassRating || 0}
                  onRatingChange={(newRating) => setFormData(prev => ({ ...prev, overallClassRating: newRating }))}
                  max={5} size={24} color="#22c55e" hoverColor="#86efac"
              />
          </div>
          <Input name="actualPeriodsTaken" label="Actual Periods Taken" type="number" value={formData.actualPeriodsTaken === undefined ? '' : String(formData.actualPeriodsTaken)} onChange={handleChange} min="0" />
          <Textarea name="teacherReflection" label="Teacher's Reflection / Overall Review" value={formData.teacherReflection || ''} onChange={handleChange} placeholder="How did the lesson go? What worked, what didn't?" minRows={2} />
        </Drawer.Body>
        <Drawer.Footer>
          <Button type="button" color="default" variant="ghost" onClick={onClose} disabled={isSubmittingLessonPlan}>Cancel</Button>
          <Button type="submit" color="primary" isLoading={isSubmittingLessonPlan} disabled={isSubmittingLessonPlan}>
            {lessonPlanToEdit ? 'Save Changes' : 'Create Lesson Plan'}
          </Button>
        </Drawer.Footer>
      </form>
    </Drawer>
  );
};

export default LessonPlanForm;