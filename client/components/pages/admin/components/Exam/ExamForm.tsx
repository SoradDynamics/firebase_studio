// src/pages/Exam/ExamForm.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Button, Select, SelectItem, Checkbox, Input, Textarea } from '@heroui/react'; // Assuming Input, Textarea, Checkbox are available
import { Drawer } from '../../../../common/Drawer'; // Adjust path as needed
import CheckboxSelect from '../common/CheckboxSelect'; // Adjust path as needed
import useExamStore from '~/store/examStore';
import { Exam, Faculty, Section, SubjectDetail as AppwriteSubjectDetail } from 'types/models'; // Import new types
import { PencilIcon, TrashIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

import NepaliDate from 'nepali-date-converter';

// Helper to convert AD Date string (ISO) to BS Date string (YYYY-MM-DD)
const adToBsString = (adDateString: string | null): string => {
    if (!adDateString) return '';
    try {
        const adDate = new Date(adDateString);
        if (isNaN(adDate.getTime())) return '';
        const bsDate = new NepaliDate(adDate);
        return `${bsDate.getYear()}-${String(bsDate.getMonth() + 1).padStart(2, '0')}-${String(bsDate.getDate()).padStart(2, '0')}`;
    } catch (error) {
        console.error("Error converting AD to BS:", error);
        return '';
    }
};

// Helper to convert BS Date string (YYYY-MM-DD) to AD Date object
const bsStringToAdDate = (bsDateString: string | null): Date | null => {
    if (!bsDateString) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bsDateString)) {
        console.warn("Invalid BS date format (YYYY-MM-DD expected):", bsDateString);
        return null;
    }
    try {
        const [yearStr, monthStr, dayStr] = bsDateString.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 32) {
             console.warn("Invalid BS date values:", bsDateString); return null;
        }
        const npDate = new NepaliDate(year, month - 1, day);
        const adDate = npDate.toJsDate();
        if (isNaN(adDate.getTime())) {
            console.warn("Invalid BS date (conversion to AD failed):", bsDateString); return null;
        }
        return adDate;
    } catch (error) {
        console.error("Unexpected error during BS to AD conversion:", error); return null;
    }
};

// Interface for form state of subject details
interface FormSubjectEntry extends AppwriteSubjectDetail {
    tempId: string; // For UI list key and editing
    bsDate: string; // For UI date input
}

interface ExamFormProps {
    isOpen: boolean;
    onClose: () => void;
    examToEdit: Exam | null;
    faculties: Faculty[];
    sections: Section[];
}

const ALL_OPTION_ID = '__all__';

const ExamForm: React.FC<ExamFormProps> = ({
    isOpen,
    onClose,
    examToEdit,
    faculties,
    sections,
}) => {
    const { addExam, updateExam, saving, error, setError } = useExamStore();

    const [formData, setFormData] = useState({
        title: '',
        type: '',
        desc: '',
        faculty: [] as string[],
        class: [] as string[],
        section: [] as string[],
    });

    // State for managing subject details in the form
    const [formSubjectDetails, setFormSubjectDetails] = useState<FormSubjectEntry[]>([]);
    
    // State for the current subject being added/edited
    const [currentSubjectName, setCurrentSubjectName] = useState('');
    const [currentBsDate, setCurrentBsDate] = useState('');
    const [currentTheoryFM, setCurrentTheoryFM] = useState('');
    const [currentTheoryPM, setCurrentTheoryPM] = useState('');
    const [currentHasPractical, setCurrentHasPractical] = useState(false);
    const [currentPracticalFM, setCurrentPracticalFM] = useState('');
    const [currentPracticalPM, setCurrentPracticalPM] = useState('');
    const [editingSubjectTempId, setEditingSubjectTempId] = useState<string | null>(null);

    const resetCurrentSubjectFields = () => {
        setCurrentSubjectName('');
        setCurrentBsDate('');
        setCurrentTheoryFM('');
        setCurrentTheoryPM('');
        setCurrentHasPractical(false);
        setCurrentPracticalFM('');
        setCurrentPracticalPM('');
        setEditingSubjectTempId(null);
        setError(null); // Clear subject-specific errors
    };

    useEffect(() => {
        if (isOpen) {
            if (examToEdit) {
                setFormData({
                    title: examToEdit.title,
                    type: examToEdit.type,
                    desc: examToEdit.desc,
                    faculty: examToEdit.faculty || [],
                    class: examToEdit.class || [],
                    section: examToEdit.section || [],
                });

                const loadedSubjectDetails: FormSubjectEntry[] = (examToEdit.subjectDetails || []).map((sd, index) => ({
                    ...sd,
                    tempId: `${sd.name}-${index}-${Date.now()}`,
                    bsDate: adToBsString(sd.date),
                    // Ensure numeric fields are strings for input, or handle their type properly if AppwriteSubjectDetail has them as numbers
                    theoryFM: String(sd.theoryFM),
                    theoryPM: String(sd.theoryPM),
                    hasPractical: sd.hasPractical,
                    practicalFM: sd.hasPractical && sd.practicalFM ? String(sd.practicalFM) : '',
                    practicalPM: sd.hasPractical && sd.practicalPM ? String(sd.practicalPM) : '',
                }));
                setFormSubjectDetails(loadedSubjectDetails);
            } else {
                setFormData({ title: '', type: '', desc: '', faculty: [], class: [], section: [] });
                setFormSubjectDetails([]);
            }
            resetCurrentSubjectFields();
            setError(null); // Clear general form error
        }
    }, [isOpen, examToEdit, setError]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null);
    };
    
    const handleNumericInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) { // Allow only digits
            setter(value);
        }
        setError(null);
    };


    const handleMultiSelectChange = (name: keyof Pick<typeof formData, 'class' | 'section'>) => (values: string[]) => {
        setFormData((prev) => ({ ...prev, [name]: values }));
        setError(null);
    };

    const handleFacultyChange = (keys: Set<string>) => {
        const selectedKey = Array.from(keys)[0];
        const selectedFaculty = faculties.find(f => f.$id === selectedKey);
        setFormData((prev) => ({
            ...prev,
            faculty: selectedFaculty ? [selectedFaculty.name] : [],
            class: [], 
            section: [],
        }));
        setError(null);
    };

    const facultyOptions = useMemo(() => faculties.map(f => ({ value: f.$id, label: f.name })), [faculties]);
    
    const allUniqueClassNames = useMemo(() => { // Renamed from allClassNames for clarity in handleSubmit
        const classes = new Set<string>();
        faculties.forEach(f => f.classes.forEach(c => classes.add(c)));
        sections.forEach(s => { if (s.class && !classes.has(s.class)) classes.add(s.class); });
        return Array.from(classes).filter(c => c);
    }, [faculties, sections]);

    const allSectionOptionsWithClass = useMemo(() => sections.map(s => ({
        id: s.name, name: `${s.name} (${s.class})`, facultyId: s.facultyId, className: s.class,
    })), [sections]);

    const allSubjectNamesFromSections = useMemo(() => {
        const subjects = new Set<string>();
        sections.forEach(s => s.subjects.forEach(sub => subjects.add(sub)));
        return Array.from(subjects).filter(s => s).sort();
    }, [sections]);

    const subjectSelectOptions = useMemo(() => {
        const addedSubjectNames = new Set(formSubjectDetails.map(item => item.name));
        return allSubjectNamesFromSections
            .filter(name => !addedSubjectNames.has(name) || (editingSubjectTempId && formSubjectDetails.find(s => s.tempId === editingSubjectTempId)?.name === name))
            .map(name => ({ value: name, label: name }));
    }, [allSubjectNamesFromSections, formSubjectDetails, editingSubjectTempId]);

    const selectedFacultyName = formData.faculty.length > 0 ? formData.faculty[0] : null;
    const selectedFaculty = selectedFacultyName ? faculties.find(f => f.name === selectedFacultyName) : null;
    const selectedFacultyId = selectedFaculty ? selectedFaculty.$id : null;

    const filteredClassOptions = useMemo(() => {
        if (!selectedFaculty) return [];
        let relevantClasses = new Set<string>();
        selectedFaculty.classes.forEach(c => c && relevantClasses.add(c));
        sections.forEach(s => { if (s.class && s.facultyId === selectedFacultyId) relevantClasses.add(s.class); });
        return Array.from(relevantClasses).sort().map(c => ({ id: c, name: c }));
    }, [selectedFaculty, selectedFacultyId, sections]);

    const filteredSectionOptions = useMemo(() => {
        if (!selectedFacultyId) return [];
        let relevantSections = allSectionOptionsWithClass.filter(s => s.facultyId === selectedFacultyId);
        const selectedClasses = formData.class.filter(name => name !== ALL_OPTION_ID);
        if (selectedClasses.length > 0) {
            relevantSections = relevantSections.filter(s => s.className && selectedClasses.includes(s.className));
        } else if (!formData.class.includes(ALL_OPTION_ID) && formData.class.length > 0) { // Specific classes selected, but none match
            return [];
        } // If 'All Classes' is selected or no class filter, use faculty-filtered sections
        return relevantSections;
    }, [selectedFacultyId, formData.class, allSectionOptionsWithClass]);

    const isClassDisabled = !examToEdit && !selectedFaculty;
    const isSectionDisabled = !examToEdit && (!selectedFaculty || formData.class.length === 0); // Simpler: disable if no specific classes chosen
    const isSubjectDetailsSectionDisabled = !examToEdit && !selectedFaculty;


    const handleAddOrUpdateSubjectDetail = () => {
        setError(null);
        if (!currentSubjectName || !currentBsDate || !currentTheoryFM || !currentTheoryPM) {
            setError('Subject, Date, Theory FM, and Theory PM are required.');
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(currentBsDate)) {
            setError('Invalid BS date format. Use YYYY-MM-DD.');
            return;
        }
        const adDate = bsStringToAdDate(currentBsDate);
        if (!adDate) {
            setError('Invalid BS date. Please check the date.');
            return;
        }

        const theoryFM = parseInt(currentTheoryFM, 10);
        const theoryPM = parseInt(currentTheoryPM, 10);

        if (isNaN(theoryFM) || isNaN(theoryPM) || theoryFM <= 0 || theoryPM <= 0) {
            setError('Theory FM and PM must be positive numbers.');
            return;
        }
        if (theoryPM > theoryFM) {
            setError('Theory Pass Marks cannot be greater than Theory Full Marks.');
            return;
        }

        let practicalFM: number | null = null;
        let practicalPM: number | null = null;

        if (currentHasPractical) {
            if (!currentPracticalFM || !currentPracticalPM) {
                setError('Practical FM and PM are required if "Has Practical" is checked.');
                return;
            }
            practicalFM = parseInt(currentPracticalFM, 10);
            practicalPM = parseInt(currentPracticalPM, 10);
            if (isNaN(practicalFM) || isNaN(practicalPM) || practicalFM <= 0 || practicalPM <= 0) {
                setError('Practical FM and PM must be positive numbers.');
                return;
            }
            if (practicalPM > practicalFM) {
                setError('Practical Pass Marks cannot be greater than Practical Full Marks.');
                return;
            }
        }

        // Check for duplicate subject name (excluding the one being edited)
        if (formSubjectDetails.some(sd => sd.name === currentSubjectName && sd.tempId !== editingSubjectTempId)) {
            setError(`Subject "${currentSubjectName}" has already been added.`);
            return;
        }

        const subjectEntry: FormSubjectEntry = {
            tempId: editingSubjectTempId || `${currentSubjectName}-${Date.now()}`,
            name: currentSubjectName,
            date: adDate.toISOString(),
            bsDate: currentBsDate,
            theoryFM,
            theoryPM,
            hasPractical: currentHasPractical,
            practicalFM: currentHasPractical ? practicalFM : undefined, // Store as undefined if not applicable
            practicalPM: currentHasPractical ? practicalPM : undefined,
        };

        if (editingSubjectTempId) {
            setFormSubjectDetails(formSubjectDetails.map(sd => sd.tempId === editingSubjectTempId ? subjectEntry : sd));
        } else {
            setFormSubjectDetails([...formSubjectDetails, subjectEntry]);
        }
        resetCurrentSubjectFields();
    };

    const handleEditSubjectDetail = (tempId: string) => {
        if (editingSubjectTempId && editingSubjectTempId !== tempId) {
            setError("Please save or cancel the current subject editing first.");
            return;
        }
        const subjectToEdit = formSubjectDetails.find(sd => sd.tempId === tempId);
        if (subjectToEdit) {
            setCurrentSubjectName(subjectToEdit.name);
            setCurrentBsDate(subjectToEdit.bsDate);
            setCurrentTheoryFM(String(subjectToEdit.theoryFM));
            setCurrentTheoryPM(String(subjectToEdit.theoryPM));
            setCurrentHasPractical(subjectToEdit.hasPractical);
            setCurrentPracticalFM(subjectToEdit.hasPractical && subjectToEdit.practicalFM ? String(subjectToEdit.practicalFM) : '');
            setCurrentPracticalPM(subjectToEdit.hasPractical && subjectToEdit.practicalPM ? String(subjectToEdit.practicalPM) : '');
            setEditingSubjectTempId(tempId);
            setError(null);
        }
    };

    const handleDeleteSubjectDetail = (tempId: string) => {
        if (editingSubjectTempId === tempId) {
             setError("Cannot delete subject currently being edited. Cancel edit first.");
             return;
        }
        setFormSubjectDetails(formSubjectDetails.filter(sd => sd.tempId !== tempId));
        setError(null);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.title || !formData.type || !formData.desc) {
            setError("Title, Type, and Description are required."); return;
        }
        if (!selectedFacultyName && !examToEdit) {
            setError("Please select a Faculty."); return;
        }
        if (!isClassDisabled && formData.class.length === 0) {
            setError("At least one Class must be selected."); return;
        }
        if (formSubjectDetails.length === 0) {
            setError("At least one Subject with details is required."); return;
        }
        if (editingSubjectTempId) {
            setError("Please finish editing the current subject detail before saving the exam."); return;
        }

        const finalSubjectDetails: AppwriteSubjectDetail[] = formSubjectDetails.map(fsd => {
            // Remove form-specific fields (tempId, bsDate)
            const { tempId, bsDate, ...appwriteDetail } = fsd;
            return {
                ...appwriteDetail,
                practicalFM: appwriteDetail.hasPractical ? appwriteDetail.practicalFM : null,
                practicalPM: appwriteDetail.hasPractical ? appwriteDetail.practicalPM : null,
            };
        });

        const dataToSave: Omit<Exam, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'> = {
            title: formData.title,
            type: formData.type,
            desc: formData.desc,
            faculty: formData.faculty,
            class: [] as string[], 
            section: [] as string[],
            subjectDetails: finalSubjectDetails,
        };
        
        // Class and Section expansion logic (copied and adapted from original)
        const finalSelectedFacultyNames = dataToSave.faculty;
        const finalSelectedFacultyIds = faculties
             .filter(f => finalSelectedFacultyNames.includes(f.name))
             .map(f => f.$id);

        if (formData.class.includes(ALL_OPTION_ID)) {
              let relevantClasses = new Set<string>();
              if (finalSelectedFacultyNames.length > 0) {
                 faculties
                    .filter(f => finalSelectedFacultyNames.includes(f.name))
                    .forEach(f => f.classes.forEach(c => c && relevantClasses.add(c)));
                 sections
                    .filter(s => s.class && s.facultyId && finalSelectedFacultyIds.includes(s.facultyId))
                     .forEach(s => relevantClasses.add(s.class));
              } else {
                   allUniqueClassNames.forEach(c => relevantClasses.add(c));
              }
              dataToSave.class = Array.from(relevantClasses);
         } else { dataToSave.class = formData.class.filter(name => name !== ALL_OPTION_ID); }

         const finalSelectedClassNames = dataToSave.class;
         if (formData.class.includes(ALL_OPTION_ID) && formData.section.includes(ALL_OPTION_ID)) { // All classes -> All sections of those classes/faculty
            let relevantSections = new Set<string>();
            if (finalSelectedFacultyNames.length > 0) {
                 sections
                    .filter(s => s.name && s.facultyId && finalSelectedFacultyIds.includes(s.facultyId) && s.class && finalSelectedClassNames.includes(s.class))
                    .forEach(s => relevantSections.add(s.name));
            } else { // All classes, no faculty -> all sections of all those classes
                 sections
                    .filter(s => s.name && s.class && finalSelectedClassNames.includes(s.class))
                    .forEach(s => relevantSections.add(s.name));
            }
            dataToSave.section = Array.from(relevantSections);
         } else if (formData.section.includes(ALL_OPTION_ID)) {
             let relevantSections = new Set<string>();
             sections
                 .filter(s => s.name && s.facultyId && finalSelectedFacultyIds.includes(s.facultyId)
                          && s.class && finalSelectedClassNames.includes(s.class))
                 .forEach(s => relevantSections.add(s.name));
             dataToSave.section = Array.from(relevantSections);
         } else {
             dataToSave.section = formData.section.filter(name => name !== ALL_OPTION_ID);
         }

        try {
            if (examToEdit) {
                await updateExam(examToEdit.$id, dataToSave);
            } else {
                await addExam(dataToSave as any); // Cast to any if store expects specific Exam type without $id for add
            }
            onClose();
        } catch (err) {
            // Error is set by store
            console.error("Error saving exam:", err);
        }
    };
    
    const selectedFacultyIdForSelect = selectedFaculty ? selectedFaculty.$id : null;

    return (
        <Drawer isOpen={isOpen} onClose={onClose} size="xl" title={examToEdit ? 'Edit Exam' : 'Add New Exam'}>
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <Drawer.Body className="pb-0 space-y-6">
                    {/* Exam Details */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1"> Title <span className="text-red-500">*</span></label>
                            <Input type="text" id="title" name="title" value={formData.title} onChange={handleTextChange} required disabled={saving} />
                        </div>
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1"> Exam Type <span className="text-red-500">*</span></label>
                            <Input type="text" id="type" name="type" value={formData.type} onChange={handleTextChange} placeholder="e.g., Midterm, Final" required disabled={saving} />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="desc" className="block text-sm font-medium text-gray-700 mb-1"> Description <span className="text-red-500">*</span></label>
                            <Textarea id="desc" name="desc" rows={3} value={formData.desc} onChange={handleTextChange} placeholder="Max 1000 characters" required disabled={saving} maxLength={1000} />
                        </div>
                        <div>
                            <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-1"> Faculty <span className="text-red-500">*</span></label>
                            <Select placeholder="Select faculty" selectedKeys={selectedFacultyIdForSelect ? new Set([selectedFacultyIdForSelect]) : new Set()} onSelectionChange={handleFacultyChange} items={facultyOptions} disabled={saving || !!examToEdit} selectionMode="single" required={!examToEdit}>
                                {(item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>}
                            </Select>
                        </div>
                        <div>
                            <CheckboxSelect label="Classes" options={filteredClassOptions} selectedValues={formData.class} onValueChange={handleMultiSelectChange('class')} placeholder="Select classes" disabled={isClassDisabled || saving || !!examToEdit} hasAllOption={!isClassDisabled}/>
                            {!isClassDisabled && formData.class.length === 0 && <p className="mt-1 text-xs text-red-500">Class is required.</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <CheckboxSelect label="Sections" options={filteredSectionOptions} selectedValues={formData.section} onValueChange={handleMultiSelectChange('section')} placeholder="Select sections" disabled={isSectionDisabled || saving || !!examToEdit} hasAllOption={!isSectionDisabled} />
                        </div>
                    </div>

                    {/* Subject Details Section */}
                    <div className={`p-4 border rounded-md bg-gray-50 space-y-4 ${isSubjectDetailsSectionDisabled && !examToEdit ? 'opacity-60 pointer-events-none' : ''}`}>
                        <h4 className="text-md font-semibold text-gray-800">Subject Details & Marks</h4>
                        
                        {/* Inputs for current subject */}
                        <div className="p-3 border rounded bg-white shadow-sm space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-start">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Subject <span className="text-red-500">*</span></label>
                                    <Select placeholder="Select Subject" 
                                        selectedKeys={currentSubjectName ? new Set([currentSubjectName]) : new Set()}
                                        onSelectionChange={(keys) => setCurrentSubjectName(Array.from(keys)[0] as string || '')}
                                        items={subjectSelectOptions}
                                        isDisabled={saving || (isSubjectDetailsSectionDisabled && !examToEdit) || (editingSubjectTempId !== null && subjectSelectOptions.every(opt => opt.value !== currentSubjectName))}
                                        size="sm"
                                    >
                                      {(item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>}
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Exam Date (BS) <span className="text-red-500">*</span></label>
                                    <Input type="text" value={currentBsDate} onChange={(e) => setCurrentBsDate(e.target.value)} placeholder="YYYY-MM-DD" size="sm" disabled={saving || (isSubjectDetailsSectionDisabled && !examToEdit)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-start">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Theory FM <span className="text-red-500">*</span></label>
                                    <Input type="text" inputMode="numeric" value={currentTheoryFM} onChange={handleNumericInputChange(setCurrentTheoryFM)} placeholder="e.g., 100" size="sm" disabled={saving || (isSubjectDetailsSectionDisabled && !examToEdit)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Theory PM <span className="text-red-500">*</span></label>
                                    <Input type="text" inputMode="numeric" value={currentTheoryPM} onChange={handleNumericInputChange(setCurrentTheoryPM)} placeholder="e.g., 40" size="sm" disabled={saving || (isSubjectDetailsSectionDisabled && !examToEdit)} />
                                </div>
                                <div className="col-span-1 sm:col-span-2 md:col-span-1 flex items-end pt-4"> {/* Adjusted for alignment */}
                                     <Checkbox isSelected={currentHasPractical} onValueChange={setCurrentHasPractical} disabled={saving || (isSubjectDetailsSectionDisabled && !examToEdit)}>
                                        Has Practical?
                                    </Checkbox>
                                </div>
                            </div>
                            {currentHasPractical && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-start border-t border-dashed pt-3 mt-2">
                                    <div className="md:col-start-1"> {/* Align with Theory FM */}
                                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Practical FM <span className="text-red-500">*</span></label>
                                        <Input type="text" inputMode="numeric" value={currentPracticalFM} onChange={handleNumericInputChange(setCurrentPracticalFM)} placeholder="e.g., 25" size="sm" disabled={saving || (isSubjectDetailsSectionDisabled && !examToEdit)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Practical PM <span className="text-red-500">*</span></label>
                                        <Input type="text" inputMode="numeric" value={currentPracticalPM} onChange={handleNumericInputChange(setCurrentPracticalPM)} placeholder="e.g., 10" size="sm" disabled={saving || (isSubjectDetailsSectionDisabled && !examToEdit)} />
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-2">
                                {editingSubjectTempId && (
                                    <Button type="button" variant="flat" color="default" onPress={resetCurrentSubjectFields} isDisabled={saving} size="sm" startContent={<ArrowPathIcon className="h-4 w-4"/>}>
                                        Cancel Edit
                                    </Button>
                                )}
                                <Button 
                                    type="button" 
                                    color={editingSubjectTempId ? "primary" : "secondary"}
                                    onPress={handleAddOrUpdateSubjectDetail} 
                                    isDisabled={saving || (isSubjectDetailsSectionDisabled && !examToEdit) || (!currentSubjectName && !editingSubjectTempId) || (subjectSelectOptions.length === 0 && !editingSubjectTempId)}
                                    size="sm"
                                    startContent={editingSubjectTempId ? null : <PlusIcon className="h-4 w-4"/>}
                                >
                                    {editingSubjectTempId ? 'Update Subject' : 'Add Subject'}
                                </Button>
                            </div>
                        </div>
                        
                        {/* List of added subjects */}
                        {formSubjectDetails.length > 0 && (
                            <div className="mt-4 border-t pt-3 border-gray-200 max-h-60 overflow-y-auto space-y-2">
                                <h5 className="text-sm font-medium text-gray-700 mb-1">Added Subjects:</h5>
                                {formSubjectDetails.map(sd => (
                                    <div key={sd.tempId} className="bg-white p-2.5 rounded-md shadow-sm border text-xs">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="font-semibold text-sm">{sd.name}</span> - {sd.bsDate} BS
                                            </div>
                                            <div className="flex gap-1">
                                                <Button type="button" size="sm" variant="light" isIconOnly onPress={() => handleEditSubjectDetail(sd.tempId)} isDisabled={saving || (editingSubjectTempId !== null && editingSubjectTempId !== sd.tempId)}><PencilIcon className="h-4 w-4 text-blue-600"/></Button>
                                                <Button type="button" size="sm" variant="light" isIconOnly onPress={() => handleDeleteSubjectDetail(sd.tempId)} isDisabled={saving || editingSubjectTempId === sd.tempId}><TrashIcon className="h-4 w-4 text-red-600"/></Button>
                                            </div>
                                        </div>
                                        <div className="mt-1.5 text-gray-600">
                                            Theory: FM {sd.theoryFM}, PM {sd.theoryPM}
                                            {sd.hasPractical && ` | Practical: FM ${sd.practicalFM || 'N/A'}, PM ${sd.practicalPM || 'N/A'}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {(isSubjectDetailsSectionDisabled && !examToEdit) && (
                            <p className="text-xs text-gray-500 mt-2 text-center">Select a Faculty to add Subject Details.</p>
                        )}
                    </div>

                    {error && <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                </Drawer.Body>
                <Drawer.Footer>
                    <Button variant="flat" color="default" onPress={onClose} isDisabled={saving}>Cancel</Button>
                    <Button type="submit" color="primary" isLoading={saving} isDisabled={saving || !!editingSubjectTempId || formSubjectDetails.length === 0}>
                        {examToEdit ? 'Save Changes' : 'Add Exam'}
                    </Button>
                </Drawer.Footer>
            </form>
        </Drawer>
    );
};

export default ExamForm;