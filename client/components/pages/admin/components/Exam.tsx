// src/pages/ExamManagementPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import useExamStore from '~/store/examStore';
import ExamCard from './Exam/ExamCard';
import ExamForm from './Exam/ExamForm';
import Popover from './common/Popover'; // Assuming popover is at root
import SearchBar from './common/SearchBar'; // Assuming SearchBar is in src/components
import { Button, Spinner, Select, SelectItem } from '@heroui/react'; // Assuming components from heroui/react
import { PlusIcon } from '@heroicons/react/20/solid';
import { Exam } from 'types/models';

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
        setError // Get setError from store to clear messages
    } = useExamStore();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [examToEdit, setExamToEdit] = useState<Exam | null>(null);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [examToDeleteId, setExamToDeleteId] = useState<string | null>(null);

    // --- Fetch initial data ---
    useEffect(() => {
        // Fetch lookup data and exams when the page mounts
        fetchFaculties();
        fetchSections();
        fetchExams();
    }, [fetchFaculties, fetchSections, fetchExams]); // Dependencies ensure effect runs if these functions change (unlikely with Zustand)

     // --- Memoized Filter Options ---
     const facultyFilterOptions: FilterOption[] = useMemo(() => {
         // Add the "All Faculties" option first
         const options: FilterOption[] = [{ value: 'all', label: 'All Faculties' }];
         // Add faculties fetched from the store
         faculties.forEach(f => options.push({ value: f.$id, label: f.name })); // Use Appwrite ID for value, name for label
         return options;
     }, [faculties]);

     const classFilterOptions: FilterOption[] = useMemo(() => {
        // Get unique class names from all faculties and sections
         const classes = new Set<string>();
        faculties.forEach(f => f.classes.forEach(c => classes.add(c)));
        sections.forEach(s => classes.add(s.class)); // Also get classes from sections

         // Add the "All Classes" option first
         const options: FilterOption[] = [{ value: 'all', label: 'All Classes' }];
         // Add unique class names
         Array.from(classes).filter(c => c).forEach(c => options.push({ value: c, label: c }));
         return options;
     }, [faculties, sections]);


    // --- Client-side Filtering and Searching ---
    const filteredExams = useMemo(() => {
        let filtered = exams;

        // 1. Filter by Faculty ID (map ID back to name for comparison with exam data)
        if (filterFacultyId && filterFacultyId !== 'all') { // Don't filter if 'all' is selected
            // Find the selected faculty's name based on ID
             const selectedFaculty = faculties.find(f => f.$id === filterFacultyId);
             if (selectedFaculty) {
                 filtered = filtered.filter(exam =>
                     // Check if the exam's faculty array contains the selected faculty's name
                     exam.faculty && exam.faculty.includes(selectedFaculty.name)
                 );
             } else {
                 // Handle case where faculty might not be found (shouldn't happen if data is consistent)
                 filtered = [];
             }
        }

        // 2. Filter by Class Name
        if (filterClass && filterClass !== 'all') { // Don't filter if 'all' is selected
            filtered = filtered.filter(exam =>
                 // Check if the exam's class array contains the selected class name
                exam.class && exam.class.includes(filterClass)
            );
        }

        // 3. Filter by Search Term (case-insensitive on title or description)
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(exam =>
                exam.title.toLowerCase().includes(lowerSearchTerm) ||
                exam.desc.toLowerCase().includes(lowerSearchTerm)
            );
        }

        return filtered;
    }, [exams, filterFacultyId, filterClass, searchTerm, faculties]); // Add faculties to dependencies

    // --- Drawer Handlers ---
    const handleAddExam = () => {
        setExamToEdit(null);
        setIsDrawerOpen(true);
         setError(null); // Clear any previous errors
    };

    const handleEditExam = (exam: Exam) => {
        setExamToEdit(exam);
        setIsDrawerOpen(true);
         setError(null); // Clear any previous errors
    };

    const handleDrawerClose = () => {
        setIsDrawerOpen(false);
        setExamToEdit(null); // Clear examToEdit state
        setError(null); // Clear any errors
    };

    // --- Delete Handlers (Popover) ---
    const handleDeleteClick = (examId: string) => {
        setExamToDeleteId(examId);
        setIsDeleteDialogOpen(true);
         setError(null); // Clear any previous errors
    };

    const handleConfirmDelete = async () => {
        if (examToDeleteId) {
            try {
                 // The store action handles the actual deletion and state update
                await deleteExam(examToDeleteId);
                setIsDeleteDialogOpen(false); // Close popover on success
                setExamToDeleteId(null);
            } catch (err) {
                 // Error message is already set by the store action
                // Popover remains open showing the error (or handle error display elsewhere)
                console.error("Failed to delete exam:", err);
            }
        }
    };

    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setExamToDeleteId(null);
        setError(null); // Clear any errors
    };

     // --- Render Loading/Error states ---
     if (loading && exams.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" /> Loading exams...
            </div>
        );
     }

    // Only show global error if not handling a specific action like saving/deleting
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

            {/* Header with Add Button and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <Button
                    color="primary" // Use 'primary' if available, otherwise 'blue' or similar
                    onPress={handleAddExam}
                    startContent={<PlusIcon className="h-5 w-5" />}
                    isDisabled={loading || deleting} // Prevent adding while loading or deleting
                 >
                    Add New Exam
                </Button>

                {/* Filter and Search */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    {/* Faculty Filter */}
                    <Select
                        placeholder="Filter by Faculty"
                        // selectedKeys expects a Set or Array of strings.
                        // If filterFacultyId is null (meaning 'All'), we represent that by selecting the 'all' item value.
                        selectedKeys={filterFacultyId ? new Set([filterFacultyId]) : new Set(['all'])}
                        onSelectionChange={(keys) => {
                            const key = Array.from(keys)[0] as string | undefined;
                            // Set filterFacultyId to null if 'all' is selected, otherwise use the key
                            setFilterFacultyId(key === 'all' ? null : key || null);
                        }}
                         className="w-full sm:max-w-[200px]"
                         size="sm"
                         variant="faded"
                         items={facultyFilterOptions} // Pass the data array here
                         isDisabled={loading} // Disable filters while initial data loads
                    >
                         {/* SelectItem as a render function */}
                         {(item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>}
                    </Select>

                     {/* Class Filter */}
                    <Select
                        placeholder="Filter by Class"
                         selectedKeys={filterClass ? new Set([filterClass]) : new Set(['all'])}
                        onSelectionChange={(keys) => {
                             const key = Array.from(keys)[0] as string | undefined;
                             setFilterClass(key === 'all' ? null : key || null);
                        }}
                         className="w-full sm:max-w-[200px]"
                         size="sm"
                         variant="faded"
                         items={classFilterOptions} // Pass the data array here
                         isDisabled={loading} // Disable filters while initial data loads
                    >
                         {/* SelectItem as a render function */}
                         {(item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>}
                    </Select>

                    {/* Search Bar */}
                    <SearchBar
                        placeholder="Search by title or description"
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        className="w-full sm:max-w-[300px]"
                         inputClassName="h-10" // Adjust height to match Select
                         startIconClassName="mt-1" // Adjust icon alignment if needed
                        //  disabled={loading} // Disable search while loading
                    />
                </div>
            </div>

            {/* Exam List */}
            {loading && exams.length === 0 ? ( // Show spinner over existing list if refreshing
                 <div className="relative min-h-[200px] flex justify-center items-center">
                     <Spinner size="lg"/> Loading exams...
                 </div>
            ) : filteredExams.length === 0 ? (
                <div className="text-center text-gray-500 p-16 text-xl rounded-md border-2 border-dashed border-gray-300 bg-white">
                    {loading ? "Loading exams..." : "No exams found matching your search criteria."}
                </div>
            ) : (
                // Add a loading overlay if just the exams list is reloading after add/edit/delete
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {filteredExams.map((exam) => (
                        <ExamCard
                            key={exam.$id}
                            exam={exam}
                            onEdit={handleEditExam}
                            onDelete={handleDeleteClick}
                        />
                    ))}
                     {loading && (
                        <div className="absolute inset-0 flex justify-center items-center bg-gray-200 bg-opacity-60 z-10">
                             <Spinner size="lg"/> Updating list...
                        </div>
                     )}
                </div>
            )}

            {/* Add/Edit Drawer */}
            <ExamForm
                isOpen={isDrawerOpen}
                onClose={handleDrawerClose}
                examToEdit={examToEdit}
                faculties={faculties}
                sections={sections}
            />

            {/* Delete Confirmation Popover */}
            <Popover
                isOpen={isDeleteDialogOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Exam"
                content={
                    // Show delete error message in popover content if present
                    <div>
                        <p>Are you sure you want to delete this exam? This action cannot be undone.</p>
                        {error && deleting === false && ( // Show error if deletion failed
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