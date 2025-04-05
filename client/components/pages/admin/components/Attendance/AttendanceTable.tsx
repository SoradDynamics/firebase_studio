// ~/Attendance/AttendanceTable.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useFacultyStore } from "~/store/facultyStore";
import { Student } from "~/store/studentStore"; // Assuming Student type is exported from studentStore
import { Checkbox } from "@heroui/react";
import Table, { ColumnDef } from "../common/Table"; // Adjust path if needed

interface AttendanceTableProps {
    studentData: Student[]; // Expecting the full Student objects
    isLoading: boolean;
    onStudentsSelect: (studentIds: string[]) => void;
    selectedStudents: string[];
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
    studentData,
    isLoading,
    onStudentsSelect,
    selectedStudents,
}) => {
    const { facultyData } = useFacultyStore();
    // Initialize local state with the prop value, but let effects manage updates primarily
    const [localSelectedStudents, setLocalSelectedStudents] = useState<string[]>(selectedStudents);

    // Define table columns
    const columns: ColumnDef<Student>[] = useMemo(() => [
        {
            key: 'checkbox',
            label: '', // No label needed for checkbox column
            align: 'center',
            minWidth: '50px',
            headerClassName: 'text-center px-3 py-3.5', // Added padding for header
            cellClassName: 'text-center px-3 py-4',   // Added padding for cells
        },
        { key: 'name', label: 'Name', minWidth: '150px', cellClassName: 'px-3 py-4' },
        { key: 'class', label: 'Class', minWidth: '80px', cellClassName: 'px-3 py-4' },
        { key: 'section', label: 'Section', minWidth: '80px', cellClassName: 'px-3 py-4' },
        {
            key: 'faculty',
            label: 'Faculty',
            minWidth: '150px',
            cellClassName: 'px-3 py-4',
        },
    ], []);

    // Memoized handler for checkbox changes
    const handleCheckboxChange = useCallback((studentId: string, isChecked: boolean) => {
        // Update local state based on previous state
        setLocalSelectedStudents(prevSelected => {
            let newSelectedStudents: string[];
            if (isChecked) {
                // Add studentId if it's not already present
                newSelectedStudents = prevSelected.includes(studentId) ? prevSelected : [...prevSelected, studentId];
            } else {
                // Remove studentId
                newSelectedStudents = prevSelected.filter((id) => id !== studentId);
            }
            // Notify parent component about the change
            onStudentsSelect(newSelectedStudents);
            return newSelectedStudents; // Return the new state for setLocalSelectedStudents
        });
    }, [onStudentsSelect]); // Dependency: only the stable callback from the parent

    // Memoized handler for row clicks (toggles selection)
    const handleRowClick = useCallback((student: Student) => {
        const isCurrentlySelected = localSelectedStudents.includes(student.$id);
        handleCheckboxChange(student.$id, !isCurrentlySelected); // Toggle the selection
    }, [localSelectedStudents, handleCheckboxChange]); // Dependencies: local state and the checkbox handler

    // Memoized cell renderer
    const renderCell = useCallback((student: Student, columnKey: string): React.ReactNode => {
        switch (columnKey) {
            case 'checkbox':
                return (
                    <Checkbox
                        // Controlled by local state for immediate UI feedback
                        isSelected={localSelectedStudents.includes(student.$id)}
                        onChange={(e) => handleCheckboxChange(student.$id, e.target.checked)}
                        size="sm"
                        aria-label={`Select student ${student.name}`} // Accessibility improvement
                    />
                );
            case 'name':
                // Use optional chaining for safety, though name should ideally exist
                return <span className="font-medium text-gray-900">{student.name ?? 'N/A'}</span>;
            case 'class':
                return student.class || <span className="text-gray-400 italic">N/A</span>;
            case 'section':
                return student.section || <span className="text-gray-400 italic">N/A</span>;
            case 'faculty':
                // Find faculty name, provide fallback
                const faculty = facultyData.find((f) => f.$id === student.facultyId);
                return faculty ? faculty.name : <span className="text-gray-400 italic">N/A</span>;
            default:
                // Return null or handle unexpected column keys
                return null;
        }
    }, [facultyData, localSelectedStudents, handleCheckboxChange]); // Dependencies: data and handlers used inside

    // Effect to synchronize local state if the parent component forces a change
    useEffect(() => {
        // Simple string comparison for efficiency, good enough for string arrays
        if (JSON.stringify(localSelectedStudents) !== JSON.stringify(selectedStudents)) {
             setLocalSelectedStudents(selectedStudents);
        }
    }, [selectedStudents, localSelectedStudents]); // Re-run if the prop changes

    // Effect to set initial selections based on today's absence data when studentData loads/changes
    useEffect(() => {
        // Ensure studentData is loaded and not empty
        if (studentData && studentData.length > 0) {
            const today = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD

            // Filter students whose 'absent' array includes today's date
            const initiallySelected = studentData
                .filter((student) => Array.isArray(student.absent) && student.absent.includes(today))
                .map((student) => student.$id); // Get only the IDs

            // Only update if the calculated initial selection differs from the current local state
            if (JSON.stringify(initiallySelected) !== JSON.stringify(localSelectedStudents)) {
                setLocalSelectedStudents(initiallySelected);
                onStudentsSelect(initiallySelected); // IMPORTANT: Notify the parent about these initial selections
            }
        }
        // Optional: Handle case where studentData becomes empty - clear selection?
        // else if (studentData && studentData.length === 0 && localSelectedStudents.length > 0) {
        //     setLocalSelectedStudents([]);
        //     onStudentsSelect([]);
        // }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentData, onStudentsSelect]);
    // Dependencies: Run when studentData updates or the callback function changes (should be stable via useCallback in parent)
    // Adding localSelectedStudents dependency (as per linter suggestion for the comparison) should be safe due to the comparison check preventing loops.


    return (
        <div className="mt-4">
            <Table<Student>
                columns={columns}
                data={studentData}
                getRowKey={(student) => student.$id} // Use Appwrite's $id as the unique key
                isLoading={isLoading}
                emptyContent={isLoading ? "Loading students..." : "No students match your search."}
                renderCell={renderCell}
                selectionMode="none" // Selection is handled by the checkbox column and row click
                className="border border-gray-200 rounded-lg shadow-sm overflow-hidden" // Container styling
                tableClassName="min-w-full divide-y divide-gray-300" // Table specific styling
                headerClassName="bg-gray-50 sticky top-0 z-10" // Header styling and behavior
                // Optional: Highlight selected rows visually
                rowClassName={(item) => `transition-colors duration-150 ease-in-out hover:bg-gray-50 cursor-pointer ${localSelectedStudents.includes(item.$id) ? 'bg-primary-50 hover:bg-primary-100' : ''}`}
                onRowClick={handleRowClick} // Enable row click to toggle selection
            />
        </div>
    );
};

export default AttendanceTable;