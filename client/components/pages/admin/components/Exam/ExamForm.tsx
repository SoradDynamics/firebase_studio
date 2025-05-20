// src/components/ExamForm.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Button, Select, SelectItem } from '@heroui/react';
import { Drawer } from '../../../../common/Drawer';
import CheckboxSelect from '../common/CheckboxSelect';
import useExamStore from '~/store/examStore';
import { Exam, Faculty, Section } from 'types/models';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Import the converter
import NepaliDate from 'nepali-date-converter';

interface ExamFormProps {
    isOpen: boolean;
    onClose: () => void;
    examToEdit: Exam | null;
    faculties: Faculty[];
    sections: Section[];
}

// Use a unique ID for the "All" option within the CheckboxSelect component
const ALL_OPTION_ID = '__all__';

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
        const month = parseInt(monthStr, 10); // 1-indexed month from input
        const day = parseInt(dayStr, 10);

        if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 32) {
             console.warn("Invalid BS date values (year, month, or day range):", bsDateString);
             return null;
        }

        let npDate;
        try {
             npDate = new NepaliDate(year, month - 1, day); // Month is 0-indexed in constructor
        } catch (npError) {
             console.warn("NepaliDate constructor failed for:", bsDateString, npError);
             return null;
        }

        const adDate = npDate.toJsDate();

        if (isNaN(adDate.getTime())) {
             console.warn("Invalid BS date (conversion to AD failed):", bsDateString);
            return null;
        }

        return adDate;

    } catch (error) {
        console.error("Unexpected error during BS to AD conversion for:", bsDateString, error);
        return null;
    }
};


interface FormSubjectDate {
    tempId: string;
    subject: string;
    bsDate: string;
    adIsoString: string;
}


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

    const [formSubjectDates, setFormSubjectDates] = useState<FormSubjectDate[]>([]);
    const [currentSubject, setCurrentSubject] = useState('');
    const [currentBsDate, setCurrentBsDate] = useState('');
    const [editingSubjectTempId, setEditingSubjectTempId] = useState<string | null>(null);


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

                const loadedSubjectDates: FormSubjectDate[] = (examToEdit.subjectDates || []).map((itemString, index) => {
                    const parts = itemString.split('|');
                     if (parts.length !== 2) {
                          console.warn("Skipping invalid subject date string on load:", itemString);
                          return null;
                     }
                    const [subject, adIsoString] = parts;
                    const bsDate = adToBsString(adIsoString);

                     if (!subject || !bsDate || !adIsoString) {
                         console.warn("Skipping incomplete subject date entry on load:", itemString);
                         return null;
                     }

                     return {
                        tempId: `${subject}-${index}-${Math.random().toString(36).substring(7)}`,
                        subject: subject.trim(),
                        bsDate: bsDate,
                        adIsoString: adIsoString,
                     };
                }).filter((item): item is FormSubjectDate => item !== null);

                setFormSubjectDates(loadedSubjectDates);

                setCurrentSubject('');
                setCurrentBsDate('');
                setEditingSubjectTempId(null);


            } else {
                setFormData({
                    title: '',
                    type: '',
                    desc: '',
                    faculty: [],
                    class: [],
                    section: [],
                });
                setFormSubjectDates([]);
                setCurrentSubject('');
                setCurrentBsDate('');
                setEditingSubjectTempId(null);
            }
             setError(null);
        }
    }, [isOpen, examToEdit, setError, sections]);


    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
         setError(null);
    };

     const handleBsDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setCurrentBsDate(value);
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
            class: [], // Reset Class and Section when Faculty changes
            section: [], // Keep sections if they span across faculties? No, depends on faculty & class. Reset sections too.
        }));
        setError(null);
    };


    // --- Memoized Options for Selects ---
    const facultyOptions = useMemo(() => {
        return faculties.map(f => ({ value: f.$id, label: f.name }));
    }, [faculties]);

    const allFacultyNames = useMemo(() => faculties.map(f => f.name), [faculties]);

    const allClassNames = useMemo(() => {
        const classes = new Set<string>();
        faculties.forEach(f => f.classes.forEach(c => classes.add(c)));
         sections.forEach(s => {
             if (s.class && !classes.has(s.class)) {
                 classes.add(s.class);
             }
         });
        return Array.from(classes).filter(c => c);
    }, [faculties, sections]);

     const allSectionOptionsWithClass = useMemo(() => {
         return sections.map(s => ({
            id: s.name,
            name: `${s.name} (${s.class})`,
            facultyId: s.facultyId,
            className: s.class,
         }));
     }, [sections]);

    const allSubjectNames = useMemo(() => {
         const subjects = new Set<string>();
         sections.forEach(s => s.subjects.forEach(sub => subjects.add(sub)));
         return Array.from(subjects).filter(s => s);
     }, [sections]);

    // Filter subject options based on already added subjects
    const subjectSelectOptions = useMemo(() => {
         const addedSubjectNames = new Set(formSubjectDates.map(item => item.subject));
         return allSubjectNames
             .filter(name => !addedSubjectNames.has(name)) // Filter out subjects already added
             .map(name => ({ value: name, label: name }));
    }, [allSubjectNames, formSubjectDates]); // Recalculate when added subjects change or all subjects change


     // --- Filtered Options based on formData state (for Class and Section) ---
    const selectedFacultyName = formData.faculty.length > 0 ? formData.faculty[0] : null;
    const selectedFaculty = selectedFacultyName ? faculties.find(f => f.name === selectedFacultyName) : null;
    const selectedFacultyId = selectedFaculty ? selectedFaculty.$id : null;

    const filteredClassOptions = useMemo(() => {
        let relevantClasses = new Set<string>();
        if (selectedFaculty) {
            selectedFaculty.classes.forEach(c => c && relevantClasses.add(c));
            sections.forEach(s => {
                if (s.class && s.facultyId === selectedFacultyId) {
                    relevantClasses.add(s.class);
                }
            });
        } else { return []; }
         return Array.from(relevantClasses).sort().map(c => ({ id: c, name: c }));
    }, [selectedFaculty, selectedFacultyId, sections]);

    const filteredSectionOptions = useMemo(() => {
        let relevantSections = allSectionOptionsWithClass;
        if (selectedFacultyId) { relevantSections = relevantSections.filter(s => s.facultyId === selectedFacultyId); } else { return []; }
        const selectedClasses = formData.class.filter(name => name !== ALL_OPTION_ID);
        if (selectedClasses.length > 0) { relevantSections = relevantSections.filter(s => s.className && selectedClasses.includes(s.className)); }
        else if (formData.class.includes(ALL_OPTION_ID)){ /* Keep filtered by faculty */ } else { return []; }
         return relevantSections;
    }, [selectedFacultyId, formData.class, allSectionOptionsWithClass]);


    // --- Disabled State Logic ---
    const isClassDisabled = !examToEdit && selectedFaculty === null;
    const isSectionDisabled = !examToEdit && (selectedFaculty === null || formData.class.length === 0 || formData.class.includes(ALL_OPTION_ID));
    const isSubjectDatesSectionDisabled = !examToEdit && selectedFaculty === null;


    // --- Handlers for Subject Date Management ---

    const handleAddSubjectDate = () => {
        if (!currentSubject || !currentBsDate) {
            setError('Subject and Date are required to add/save a subject date.');
            return;
        }
         if (!/^\d{4}-\d{2}-\d{2}$/.test(currentBsDate)) {
             setError('Invalid BS date format. Use YYYY-MM-DD.');
             return;
         }

         const adDate = bsStringToAdDate(currentBsDate);
         if (!adDate) {
             setError('Invalid BS date provided or conversion failed. Please check the date.');
             return;
         }
         const adIsoString = adDate.toISOString();

         // Check if subject is already added (prevent duplicates for same subject, exclude the one being edited)
         if (formSubjectDates.some(item => item.subject === currentSubject.trim() && item.tempId !== editingSubjectTempId)) {
              setError(`Subject "${currentSubject.trim()}" already added.`);
              return;
         }


        if (editingSubjectTempId !== null) {
            // Editing existing subject date
             setFormSubjectDates(formSubjectDates.map(item =>
                item.tempId === editingSubjectTempId
                    ? { ...item, subject: currentSubject.trim(), bsDate: currentBsDate, adIsoString }
                    : item
            ));
            setEditingSubjectTempId(null); // Exit editing mode
        } else {
            // Adding new subject date
            const newSubjectDate: FormSubjectDate = {
                tempId: `${currentSubject.trim()}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                subject: currentSubject.trim(),
                bsDate: currentBsDate,
                adIsoString,
            };
            setFormSubjectDates([...formSubjectDates, newSubjectDate]);
        }

        // Clear inputs after adding/editing
        setCurrentSubject('');
        setCurrentBsDate('');
        setError(null);
    };

    const handleEditSubjectDate = (tempId: string) => {
        if (editingSubjectTempId !== null && editingSubjectTempId !== tempId) {
             setError("Finish editing the current subject date before editing another.");
             return;
        }
        const subjectToEdit = formSubjectDates.find(item => item.tempId === tempId);
        if (subjectToEdit) {
            setCurrentSubject(subjectToEdit.subject);
            setCurrentBsDate(subjectToEdit.bsDate);
            setEditingSubjectTempId(tempId);
             setError(null);
        }
    };

    const handleDeleteSubjectDate = (tempId: string) => {
         if (editingSubjectTempId === tempId) {
             setError("Cannot delete the subject date currently being edited. Save or cancel first.");
             return;
         }
         setFormSubjectDates(formSubjectDates.filter(item => item.tempId !== tempId));
         setError(null);
    };

     const handleCancelEditSubjectDate = () => {
         setCurrentSubject('');
         setCurrentBsDate('');
         setEditingSubjectTempId(null);
          setError(null);
     };


    // --- Modified handleSubmit ---
        // --- Modified handleSubmit ---
        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
             setError(null);
    
            // Basic validation
            if (!formData.title || !formData.type || !formData.desc) {
                setError("Title, Type, and Description are required.");
                return;
            }
             if (!selectedFacultyName && !examToEdit) {
                setError("Please select a Faculty.");
                return;
             }
             // ** Classes Required Validation **
             if (!isClassDisabled && formData.class.length === 0) {
                 setError("At least one Class must be selected.");
                 return;
             }
             // ** End Classes Required Validation **
    
             if (formSubjectDates.length === 0) {
                  setError("At least one Subject with date is required.");
                  return;
             }
             if (editingSubjectTempId !== null) {
                 setError("Please finish editing the current subject date before saving.");
                 return;
             }
    
    
            const subjectDatesAttribute: string[] = formSubjectDates.map(item => {
                 return `${item.subject.trim()}|${item.adIsoString}`;
            });
    
            const dataToSave = {
                 title: formData.title,
                 type: formData.type,
                 desc: formData.desc,
                 faculty: formData.faculty,
                 class: [] as string[],
                 section: [] as string[],
                 subjectDates: subjectDatesAttribute,
            };
    
            // --- Class and Section expansion logic (Keep as before) ---
            // **DO NOT re-declare useMemo here.**
            // **Use the allUniqueClassNames memo declared at the top level.**
    
    
            const finalSelectedFacultyNames = dataToSave.faculty;
            const finalSelectedFacultyIds = faculties
                 .filter(f => finalSelectedFacultyNames.includes(f.name))
                 .map(f => f.$id);
    
             // Class expansion...
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
                       // **Reference the top-level allClassNames memo**
                       allUniqueClassNames.forEach(c => relevantClasses.add(c)); // If no faculty, 'All' classes means all classes
                  }
                  dataToSave.class = Array.from(relevantClasses);
             } else { dataToSave.class = formData.class.filter(name => name !== ALL_OPTION_ID); }
    
             // Section expansion...
             const finalSelectedClassNames = dataToSave.class;
             // Make sure 'sections' variable here refers to the prop/top-level state
             if (formData.class.includes(ALL_OPTION_ID)) {
                let relevantSections = new Set<string>();
                if (finalSelectedFacultyNames.length > 0) {
                     sections
                        .filter(s => s.name && s.facultyId && finalSelectedFacultyIds.includes(s.facultyId))
                        .forEach(s => relevantSections.add(s.name));
                } else {
                     sections.forEach(s => s.name && relevantSections.add(s.name));
                }
                dataToSave.section = Array.from(relevantSections);
             } else if (formData.section.includes(ALL_OPTION_ID)) {
                 let relevantSections = new Set<string>();
                 if (finalSelectedFacultyNames.length > 0 && finalSelectedClassNames.length > 0) {
                     sections
                         .filter(s => s.name && s.facultyId && finalSelectedFacultyIds.includes(s.facultyId)
                              && s.class && finalSelectedClassNames.includes(s.class))
                         .forEach(s => relevantSections.add(s.name));
                 } else {
                      sections.forEach(s => s.name && relevantSections.add(s.name));
                 }
                 dataToSave.section = Array.from(relevantSections);
             } else {
                 dataToSave.section = formData.section.filter(name => name !== ALL_OPTION_ID);
             }
             // --- End Class and Section expansion logic ---
    
    
            try {
                if (examToEdit) {
                     await updateExam(examToEdit.$id, dataToSave);
                } else {
                     await addExam(dataToSave);
                }
                onClose();
            } catch (err) {
                // Error is already set by the store action
            }
        };
    
        // ... rest of the component code ...
    const selectedFacultyIdForSelect = selectedFaculty ? selectedFaculty.$id : null;


    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={examToEdit ? 'Edit Exam' : 'Add New Exam'}
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <Drawer.Body className="pb-0">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* --- Existing fields: title, type, desc --- */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1"> Title <span className="text-red-500">*</span> </label>
                            <input type="text" id="title" name="title" value={formData.title} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required disabled={saving} />
                        </div>
                         <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1"> Exam Type <span className="text-red-500">*</span> </label>
                            <input type="text" id="type" name="type" value={formData.type} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., Midterm, Final, Quiz" required disabled={saving} />
                        </div>
                         <div className="sm:col-span-2">
                            <label htmlFor="desc" className="block text-sm font-medium text-gray-700 mb-1"> Description <span className="text-red-500">*</span> </label>
                             <textarea
                                id="desc" name="desc" rows={3} value={formData.desc} onChange={handleTextChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="Enter description (max 1000 characters)"
                                required disabled={saving}
                                maxLength={1000} // ** Max Length added **
                            />
                        </div>

                        {/* --- Faculty (Single Select) --- */}
                        <div>
                             <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-1"> Faculty <span className="text-red-500">*</span> </label>
                            <Select
                                placeholder="Select a faculty"
                                selectedKeys={selectedFacultyIdForSelect ? new Set([selectedFacultyIdForSelect]) : new Set([])}
                                onSelectionChange={handleFacultyChange}
                                className="w-full" size="md" variant="faded" items={facultyOptions} disabled={saving} selectionMode="single" required={!examToEdit}
                            >
                                {(item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>}
                            </Select>
                        </div>

                        {/* --- Classes (Multi-Select Checkbox) --- */}
                        <div>
                            <CheckboxSelect
                                label="Classes" options={filteredClassOptions} selectedValues={formData.class} onValueChange={handleMultiSelectChange('class')} placeholder="Select classes"
                                disabled={isClassDisabled || saving} hasAllOption={!isClassDisabled}
                            />
                            {/* ** Classes Required Indicator ** */}
                            {!isClassDisabled && formData.class.length === 0 && (
                                 <p className="mt-1 text-sm text-red-500">At least one class is required.</p>
                            )}
                             {/* ** End Classes Required Indicator ** */}
                        </div>

                        {/* --- Sections (Multi-Select Checkbox) --- */}
                        <div>
                            <CheckboxSelect
                                label="Sections" options={filteredSectionOptions} selectedValues={formData.section} onValueChange={handleMultiSelectChange('section')} placeholder="Select sections"
                                disabled={isSectionDisabled || saving} hasAllOption={!isSectionDisabled}
                            />
                        </div>
                    </div>

                    {/* --- NEW Section for Subject Dates --- */}
                    <div className={`mt-6 p-4 border rounded-md bg-gray-50 ${isSubjectDatesSectionDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
                        <h4 className="text-md font-semibold text-gray-800 mb-4">Subject Dates</h4>

                        {/* Input row for adding/editing a subject date */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 items-end">
                            {/* Subject Select */}
                            <div className="sm:col-span-1">
                                 <label htmlFor="subject-select" className="block text-sm font-medium text-gray-700 mb-1"> Subject <span className="text-red-500">*</span> </label>
                                <Select
                                    id="subject-select" placeholder="Select Subject"
                                    selectedKeys={currentSubject ? new Set([currentSubject]) : new Set([])}
                                    onSelectionChange={(keys) => { const key = Array.from(keys)[0] as string | undefined; setCurrentSubject(key || ''); }}
                                    className="w-full" size="md" variant="faded" items={subjectSelectOptions} // Filtered options
                                    isDisabled={saving || isSubjectDatesSectionDisabled || editingSubjectTempId !== null || subjectSelectOptions.length === 0} // Disable if editing another or no options left
                                    selectionMode="single"
                                >
                                    {(item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>}
                                </Select>
                            </div>
                            {/* BS Date Input */}
                            <div className="sm:col-span-1">
                                 <label htmlFor="bs-date-input" className="block text-sm font-medium text-gray-700 mb-1"> Date (BS) <span className="text-red-500">*</span> </label>
                                 <input
                                    type="text" id="bs-date-input" name="bsDate" value={currentBsDate} onChange={handleBsDateInputChange}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    placeholder="YYYY-MM-DD" disabled={saving || isSubjectDatesSectionDisabled}
                                />
                            </div>
                            {/* Add/Edit Button */}
                            <div className="sm:col-span-1">
                                {editingSubjectTempId ? (
                                     <div className="flex gap-2">
                                         <Button
                                            type="button" color="primary" onPress={handleAddSubjectDate}
                                            isDisabled={!currentSubject || !currentBsDate || saving || isSubjectDatesSectionDisabled} className="flex-grow"
                                         > Save Subject </Button>
                                        <Button
                                            type="button" variant="flat" color="default" onPress={handleCancelEditSubjectDate}
                                            isDisabled={saving || isSubjectDatesSectionDisabled}
                                        > Cancel </Button>
                                     </div>

                                ) : (
                                    <Button
                                        type="button" color="secondary"
                                        onPress={handleAddSubjectDate}
                                        isDisabled={!currentSubject || !currentBsDate || saving || isSubjectDatesSectionDisabled || subjectSelectOptions.length === 0} // Disable if no subjects to add
                                        className="w-full"
                                    > Add Subject </Button>
                                )}
                            </div>
                        </div>

                        {/* List of added Subject Dates */}
                        {formSubjectDates.length > 0 && (
                            <div className="mt-4 border-t pt-4 border-gray-200 max-h-40 overflow-y-auto">
                                 <h5 className="text-sm font-medium text-gray-700 mb-2">Added Subjects:</h5>
                                <ul>
                                    {formSubjectDates.map(item => (
                                        <li key={item.tempId} className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm border border-gray-100 mb-2 text-sm">
                                            <span>
                                                <span className="font-semibold">{item.subject}:</span> {item.bsDate} BS
                                            </span>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button" size="sm" variant="flat" isIconOnly onPress={() => handleEditSubjectDate(item.tempId)}
                                                    isDisabled={saving || isSubjectDatesSectionDisabled || editingSubjectTempId !== null}
                                                > <PencilIcon className="h-4 w-4 text-blue-600" /> </Button>
                                                <Button
                                                    type="button" size="sm" variant="flat" isIconOnly onPress={() => handleDeleteSubjectDate(item.tempId)}
                                                    isDisabled={saving || isSubjectDatesSectionDisabled || editingSubjectTempId !== null}
                                                > <TrashIcon className="h-4 w-4 text-red-600" /> </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {isSubjectDatesSectionDisabled && (
                            <p className="text-sm text-gray-500 mt-2 text-center">Select a Faculty to add Subject Dates.</p>
                        )}

                    </div>
                    {/* --- END NEW Section --- */}


                    {error && (
                        <p className="mt-4 text-sm text-red-600">{error}</p>
                    )}

                </Drawer.Body>
                <Drawer.Footer>
                    <Button variant="flat" color="default" onPress={onClose} isDisabled={saving} > Cancel </Button>
                    <Button
                        type="submit" color="primary" isLoading={saving}
                        isDisabled={saving || editingSubjectTempId !== null || formSubjectDates.length === 0}
                    > {examToEdit ? 'Save Changes' : 'Add Exam'} </Button>
                </Drawer.Footer>
            </form>
        </Drawer>
    );
};

export default ExamForm;