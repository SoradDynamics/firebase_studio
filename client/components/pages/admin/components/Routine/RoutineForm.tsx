// src/components/routine/RoutineForm.tsx
import React, { useEffect } from 'react';
import { useRoutineStore } from '~/store/routineStore';
import CustomSelect from '../../../common/CustomSelect'; // Adjust path
import ActionButton from '../../../../common/ActionButton'; // Adjust path
import { Button, Input, Textarea } from '@heroui/react'; // Assuming Input & Textarea from HeroUI
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { RoutineDescItem, PeriodItem, BreakItem } from 'types/routine';

interface RoutineFormProps {
    // Props managed by store: drawerMode, routineFormData, form options
}

const RoutineForm: React.FC<RoutineFormProps> = () => {
  const {
    drawerMode,
    routineFormData,
    updateFormField,
    facultyOptions,
    classOptionsForm,
    sectionOptionsForm,
    subjectOptionsForm,
    teacherOptions,
    addDescItem,
    updateDescItem,
    removeDescItem,
    moveDescItem,
    isFormLoading,
    loadSubjectsForForm, // to reload if section is changed in edit, though it's disabled
    loadClassesForForm,
    loadSectionsForForm,
  } = useRoutineStore();

  const isEditMode = drawerMode === 'edit';

  // Effect to load initial options if needed (though mostly handled by updateFormField)
  useEffect(() => {
    if (isEditMode && routineFormData.facultyId) {
      loadClassesForForm(routineFormData.facultyId);
    }
    if (isEditMode && routineFormData.facultyId && routineFormData.classId) {
      loadSectionsForForm(routineFormData.facultyId, routineFormData.classId);
    }
    if (isEditMode && routineFormData.sectionId) {
      loadSubjectsForForm(routineFormData.sectionId);
    }
  }, [isEditMode, routineFormData.facultyId, routineFormData.classId, routineFormData.sectionId, loadClassesForForm, loadSectionsForForm, loadSubjectsForForm]);


  const handleDescItemChange = (index: number, field: keyof (PeriodItem | BreakItem), value: any) => {
    const item = { ...routineFormData.desc[index], [field]: value };
    updateDescItem(index, item);
  };

  return (
    <div className="space-y-6 p-1">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
        <CustomSelect
          label="Faculty"
          options={facultyOptions}
          value={routineFormData.facultyId}
          onChange={(id) => updateFormField('facultyId', id)}
          placeholder="Select Faculty"
          disabled={isEditMode || isFormLoading}
        />
        <CustomSelect
          label="Class"
          options={classOptionsForm}
          value={routineFormData.classId}
          onChange={(id) => updateFormField('classId', id)}
          placeholder="Select Class"
          disabled={isEditMode || isFormLoading || !routineFormData.facultyId}
        />
        <CustomSelect
          label="Section"
          options={sectionOptionsForm}
          value={routineFormData.sectionId}
          onChange={(id) => updateFormField('sectionId', id)}
          placeholder="Select Section"
          disabled={isEditMode || isFormLoading || !routineFormData.classId}
        />
      </div>

      <h3 className="text-lg font-medium leading-6 text-gray-900 mt-6 mb-3">Periods & Breaks</h3>
      <div className="space-y-4">
        {routineFormData.desc.map((item, index) => (
          <div key={item.id} className="p-4 border border-gray-300 rounded-md shadow-sm bg-gray-50/50">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-gray-700 capitalize">
                {index + 1}. {item.type}
              </span>
              <div className="flex items-center space-x-1">
                <ActionButton
                  icon={<ArrowUpIcon className="h-4 w-4" />}
                  onClick={() => moveDescItem(index, 'up')}
                  color="orange"
                  isIconOnly
                  // disabled={index === 0 || isFormLoading}
                />
                <ActionButton
                  icon={<ArrowDownIcon className="h-4 w-4" />}
                  onClick={() => moveDescItem(index, 'down')}
                  color="orange"
                  isIconOnly
                  // disabled={index === routineFormData.desc.length - 1 || isFormLoading}
                />
                <ActionButton
                  icon={<TrashIcon className="h-4 w-4" />}
                  onClick={() => removeDescItem(index)}
                  color="red"
                  isIconOnly
                  // disabled={isFormLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="time"
                label="From Time"
                value={item.fromTime}
                onValueChange={(val) => handleDescItemChange(index, 'fromTime', val)}
                // disabled={isFormLoading}
                className="w-full"
                labelPlacement="outside"
                placeholder="HH:MM"
              />
              <Input
                type="time"
                label="To Time"
                value={item.toTime}
                onValueChange={(val) => handleDescItemChange(index, 'toTime', val)}
                // disabled={isFormLoading}
                className="w-full"
                labelPlacement="outside"
                placeholder="HH:MM"
              />
            </div>

            {item.type === 'period' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <CustomSelect
                  label="Subject"
                  options={subjectOptionsForm}
                  value={(item as PeriodItem).subject}
                  onChange={(id) => handleDescItemChange(index, 'subject', id)}
                  placeholder="Select Subject"
                  disabled={isFormLoading || !routineFormData.sectionId || subjectOptionsForm.length === 0}
                />
                <CustomSelect
                  label="Teacher"
                  options={teacherOptions}
                  value={(item as PeriodItem).teacherId}
                  onChange={(id) => handleDescItemChange(index, 'teacherId', id)}
                  placeholder="Select Teacher"
                  disabled={isFormLoading}
                />
              </div>
            )}
            {item.type === 'break' && (
              <div className="mt-4">
                <Input
                  label="Break Name"
                  value={(item as BreakItem).name}
                  onValueChange={(val) => handleDescItemChange(index, 'name', val)}
                  placeholder="e.g., Lunch Break"
                  // disabled={isFormLoading}
                  className="w-full"
                  labelPlacement="outside"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex space-x-2 mt-6">
        <Button
          color="primary"
          variant="ghost"
          onClick={() => addDescItem('period')}
          startContent={<PlusIcon className="h-5 w-5" />}
          // disabled={isFormLoading || !routineFormData.sectionId}
        >
          Add Period
        </Button>
        <Button
          color="secondary"
          variant="ghost"
          onClick={() => addDescItem('break')}
          startContent={<PlusIcon className="h-5 w-5" />}
          // disabled={isFormLoading || !routineFormData.sectionId}
        >
          Add Break
        </Button>
      </div>
    </div>
  );
};

export default RoutineForm;