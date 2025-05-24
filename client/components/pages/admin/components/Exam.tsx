// src/pages/ExamManagementPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import useExamStore from '~/store/examStore';
import ExamCard from './Exam/ExamCard';
import ExamForm from './Exam/ExamForm';
import Popover from './common/Popover'; 
import SearchBar from '../../common/SearchBar'; 
import { Button, Spinner, Select, SelectItem } from '@heroui/react'; 
import { PlusIcon } from '@heroicons/react/20/solid';
import { Exam } from 'types/models'; // << ENSURE Exam type is imported

// ... (rest of the ExamManagementPage.tsx code remains the same as you provided)
// The logic within this page (filtering, searching, drawer handling)
// primarily operates on the top-level Exam properties or delegates
// exam-specific data handling to ExamForm and ExamCard.
// So, as long as the Exam type is consistent, it should work.
// No direct changes related to subject FM/PM are needed here,
// as those details are handled by ExamForm (input) and ExamCard (display).

interface FilterOption {
    value: string;
    label: string;
}

const ExamManagementPage: React.FC = () => {
    const {
        exams,
        faculties,
        sections,
        loading,
        saving,
        deleting,
        error,
        fetchExams,
        fetchFaculties,
        fetchSections,
        deleteExam,
        filterFacultyId,
        setFilterFacultyId,
        filterClass,
        setFilterClass,
        searchTerm,
        setSearchTerm,
        setError 
    } = useExamStore();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [examToEdit, setExamToEdit] = useState<Exam | null>(null);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [examToDeleteId, setExamToDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchFaculties();
        fetchSections();
        fetchExams();
    }, [fetchFaculties, fetchSections, fetchExams]); 

     const facultyFilterOptions: FilterOption[] = useMemo(() => {
         const options: FilterOption[] = [{ value: 'all', label: 'All Faculties' }];
         faculties.forEach(f => options.push({ value: f.$id, label: f.name })); 
         return options;
     }, [faculties]);

     const classFilterOptions: FilterOption[] = useMemo(() => {
        const classes = new Set<string>();
        faculties.forEach(f => f.classes.forEach(c => classes.add(c)));
        sections.forEach(s => classes.add(s.class)); 

         const options: FilterOption[] = [{ value: 'all', label: 'All Classes' }];
         Array.from(classes).filter(c => c).forEach(c => options.push({ value: c, label: c }));
         return options;
     }, [faculties, sections]);


    const filteredExams = useMemo(() => {
        let filtered = exams;

        if (filterFacultyId && filterFacultyId !== 'all') { 
             const selectedFaculty = faculties.find(f => f.$id === filterFacultyId);
             if (selectedFaculty) {
                 filtered = filtered.filter(exam =>
                     exam.faculty && exam.faculty.includes(selectedFaculty.name)
                 );
             } else {
                 filtered = [];
             }
        }

        if (filterClass && filterClass !== 'all') { 
            filtered = filtered.filter(exam =>
                exam.class && exam.class.includes(filterClass)
            );
        }

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(exam =>
                exam.title.toLowerCase().includes(lowerSearchTerm) ||
                (exam.desc && exam.desc.toLowerCase().includes(lowerSearchTerm)) // Ensure desc exists
            );
        }
        return filtered;
    }, [exams, filterFacultyId, filterClass, searchTerm, faculties]); 

    const handleAddExam = () => {
        setExamToEdit(null);
        setIsDrawerOpen(true);
         setError(null); 
    };

    const handleEditExam = (exam: Exam) => {
        setExamToEdit(exam);
        setIsDrawerOpen(true);
         setError(null); 
    };

    const handleDrawerClose = () => {
        setIsDrawerOpen(false);
        setExamToEdit(null); 
        setError(null); 
    };

    const handleDeleteClick = (examId: string) => {
        setExamToDeleteId(examId);
        setIsDeleteDialogOpen(true);
         setError(null); 
    };

    const handleConfirmDelete = async () => {
        if (examToDeleteId) {
            try {
                await deleteExam(examToDeleteId);
                setIsDeleteDialogOpen(false); 
                setExamToDeleteId(null);
            } catch (err) {
                console.error("Failed to delete exam:", err);
            }
        }
    };

    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setExamToDeleteId(null);
        setError(null); 
    };

     if (loading && exams.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" /> Loading exams...
            </div>
        );
     }

    if (error && !saving && !deleting && !isDrawerOpen && !isDeleteDialogOpen) {
        return (
             <div className="p-6 text-red-600 bg-red-100 rounded-md">
                Error: {error}
             </div>
        );
    }

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage Exams</h1>
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <Button
                    color="primary"
                    onPress={handleAddExam}
                    startContent={<PlusIcon className="h-5 w-5" />}
                    isDisabled={loading || deleting}
                 > Add New Exam </Button>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    <Select
                        placeholder="Filter by Faculty"
                        selectedKeys={filterFacultyId ? new Set([filterFacultyId]) : new Set(['all'])}
                        onSelectionChange={(keys) => {
                            const key = Array.from(keys)[0] as string | undefined;
                            setFilterFacultyId(key === 'all' ? null : key || null);
                        }}
                         className="w-full sm:max-w-[200px]"
                         size="sm" variant="faded" items={facultyFilterOptions} isDisabled={loading}
                    >
                         {(item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>}
                    </Select>
                    <Select
                        placeholder="Filter by Class"
                         selectedKeys={filterClass ? new Set([filterClass]) : new Set(['all'])}
                        onSelectionChange={(keys) => {
                             const key = Array.from(keys)[0] as string | undefined;
                             setFilterClass(key === 'all' ? null : key || null);
                        }}
                         className="w-full sm:max-w-[200px]"
                         size="sm" variant="faded" items={classFilterOptions} isDisabled={loading}
                    >
                         {(item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>}
                    </Select>
                    <SearchBar
                        placeholder="Search by title or description"
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        className="w-full sm:max-w-[300px]"
                         inputClassName="h-10" 
                         startIconClassName="mt-1"
                    />
                </div>
            </div>

            {loading && exams.length === 0 ? (
                 <div className="relative min-h-[200px] flex justify-center items-center">
                     <Spinner size="lg"/> Loading exams...
                 </div>
            ) : filteredExams.length === 0 ? (
                <div className="text-center text-gray-500 p-16 text-xl rounded-md border-2 border-dashed border-gray-300 bg-white">
                    {loading ? "Loading exams..." : "No exams found."}
                </div>
            ) : (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {filteredExams.map((exam) => (
                        <ExamCard key={exam.$id} exam={exam} onEdit={handleEditExam} onDelete={handleDeleteClick} />
                    ))}
                     {loading && (
                        <div className="absolute inset-0 flex justify-center items-center bg-gray-200 bg-opacity-60 z-10">
                             <Spinner size="lg"/> Updating list...
                        </div>
                     )}
                </div>
            )}

            <ExamForm isOpen={isDrawerOpen} onClose={handleDrawerClose} examToEdit={examToEdit} faculties={faculties} sections={sections} />

            <Popover isOpen={isDeleteDialogOpen} onClose={handleCancelDelete} onConfirm={handleConfirmDelete} title="Delete Exam"
                content={
                    <div>
                        <p>Are you sure you want to delete this exam? This action cannot be undone.</p>
                        {error && deleting === false && ( 
                            <p className="mt-2 text-sm text-red-600">Error: {error}</p>
                        )}
                    </div>
                }
                isConfirmLoading={deleting}
            />
        </div>
    );
};

export default ExamManagementPage;