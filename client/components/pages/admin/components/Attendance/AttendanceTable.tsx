// ~/Attendance/AttendanceTable.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useStudentStore, Student } from "~/store/studentStore";
import { useFacultyStore } from "~/store/facultyStore";
import { Checkbox } from "@heroui/react";
import Table, { ColumnDef } from "../common/Table";

interface AttendanceTableProps {
    studentData: Student[];
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
    const [localSelectedStudents, setLocalSelectedStudents] = useState<string[]>(selectedStudents);

    const columns: ColumnDef<Student>[] = useMemo(() => [
        {
            key: 'checkbox',
            label: '',
            align: 'center',
            minWidth: '50px',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
        },
        { key: 'name', label: 'Name' },
        { key: 'class', label: 'Class' },
        { key: 'section', label: 'Section' },
        {
            key: 'faculty',
            label: 'Faculty',
            minWidth: '150px',
        },
    ], []);

    const handleCheckboxChange = (studentId: string, isChecked: boolean) => {
        let newSelectedStudents: string[];

        if (isChecked) {
            newSelectedStudents = [...localSelectedStudents, studentId];
        } else {
            newSelectedStudents = localSelectedStudents.filter((id) => id !== studentId);
        }

        setLocalSelectedStudents(newSelectedStudents);
        onStudentsSelect(newSelectedStudents);
    };

    const handleRowClick = useCallback((student: Student) => {
        const isCurrentlySelected = localSelectedStudents.includes(student.$id);
        handleCheckboxChange(student.$id, !isCurrentlySelected); // Toggle selection
    }, [localSelectedStudents, handleCheckboxChange]);

    const renderCell = useCallback((student: Student, columnKey: string): React.ReactNode => {
        const today = new Date().toISOString().slice(0, 10);
        switch (columnKey) {
            case 'checkbox':
                return (
                    <Checkbox
                        isSelected={localSelectedStudents.includes(student.$id)}
                        onChange={(e) => handleCheckboxChange(student.$id, e.target.checked)}
                        size="sm"
                    />
                );
            case 'name':
                return <span className="font-medium text-gray-900">{student.name}</span>;
            case 'class':
                return student.class || <span className="text-gray-400 italic">N/A</span>;
            case 'section':
                return student.section || <span className="text-gray-400 italic">N/A</span>;
            case 'faculty':
                const faculty = facultyData.find((f) => f.$id === student.facultyId);
                return faculty ? faculty.name : <span className="text-gray-400 italic">N/A</span>;
            default:
                return null;
        }
    }, [facultyData, localSelectedStudents, handleCheckboxChange]);

    useEffect(() => {
        setLocalSelectedStudents(selectedStudents);
    }, [selectedStudents]);

    const isInitialLoad = useRef(true); // Use useRef to track initial load

    useEffect(() => {
        if (isInitialLoad.current) {
            // Automatically check rows based on absent data
            const today = new Date().toISOString().slice(0, 10);
            const initiallySelected = studentData
                .filter((student) => student.absent?.includes(today))
                .map((student) => student.$id);
            setLocalSelectedStudents(initiallySelected);
            onStudentsSelect(initiallySelected); // Update parent component with initial selections
            isInitialLoad.current = false; // Set the flag to false after initial load
        }
    }, [studentData, onStudentsSelect]);

    return (
        <div className="mt-4">
            <Table<Student>
                columns={columns}
                data={studentData}
                getRowKey={(student) => student.$id}
                isLoading={isLoading}
                emptyContent={isLoading ? "Loading..." : "No students found."}
                renderCell={renderCell}
                selectionMode="none"
                className="border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                tableClassName="min-w-full divide-y divide-gray-300"
                headerClassName="bg-gray-50 sticky top-0 z-10"
                rowClassName={(item, isSelected) => `hover:bg-gray-50 cursor-pointer`}
                onRowClick={handleRowClick}
            />
        </div>
    );
};

export default AttendanceTable;