// ~/Attendance/Details.tsx
import React, { useState, useEffect } from "react";
import { useStudentStore, Student, StudentUpdateData } from "~/store/studentStore";
import { useFacultyStore } from "~/store/facultyStore";
import { Button } from "@heroui/react";
import Popover from "../common/Popover";
import { useAbsentStore } from "~/store/absentStore"; // Import the new store

interface DetailsProps {
    studentIds: string[];
    onBack?: () => void;
}

const Details: React.FC<DetailsProps> = ({ studentIds, onBack }) => {
    const { studentData, updateStudentData } = useStudentStore();
    const { facultyData } = useFacultyStore();
    const [selectedStudentDetails, setSelectedStudentDetails] = useState<
        { name: string; faculty: string; class: string; section: string; id: string }[]
    >([]);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // Add saving state
    const [saveError, setSaveError] = useState<string | null>(null);
    const { markAbsent } = useAbsentStore(); // Use the new store

    useEffect(() => {
        const details = studentData
            .filter((student) => studentIds.includes(student.$id))
            .map((student) => {
                const faculty = facultyData.find((f) => f.$id === student.facultyId);
                return {
                    name: student.name,
                    faculty: faculty ? faculty.name : "N/A",
                    class: student.class,
                    section: student.section,
                    id: student.$id,
                };
            });
        setSelectedStudentDetails(details);
    }, [studentIds, studentData, facultyData]);

    const handleSave = async () => {
        setIsPopoverOpen(true);
    };
    const confirmSaveAttendance = async () => {
        setIsSaving(true);
        setSaveError(null);

        try {
            const today = new Date().toISOString().slice(0, 10);

            for (const studentDetail of selectedStudentDetails) {
                try {
                    // Call the function, remove the type error.
                    // await markAbsent(studentDetail.id, today, studentData, updateStudentData);
                     const student = studentData.find((s) => s.$id === studentDetail.id);
                    if(student){
                        if(!student.absent?.includes(today)){
                             await updateStudentData(studentDetail.id, {
                                absent: [...(student.absent || []), today],
                            });
                        }
                    }
                   
                } catch (markAbsentError: any) {
                    console.error(`Error marking student ${studentDetail.name} absent:`, markAbsentError);
                    setSaveError(`Failed to mark student ${studentDetail.name} absent: ${markAbsentError.message}`);
                }
            }

            if (!saveError) {
                console.log("Attendance saved successfully!");
                // --- Notification System (Placeholder) ---
            }

        } catch (error: any) {
            console.error("Error saving attendance:", error);
            setSaveError(error.message || "An error occurred while saving attendance.");
        } finally {
            setIsSaving(false);
            setIsPopoverOpen(false);
        }
    };

    return (
        <div className="px-6 pt-3 rounded-md flex flex-col h-full">
            {onBack && (
                <div className="mb-6">
                    <Button onPress={onBack} color="secondary" variant="flat">
                        Back to List
                    </Button>
                </div>
            )}

            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 pb-2">
                Attendance Details
            </h2>

            {selectedStudentDetails.length > 0 ? (
                <ul className="list-disc list-inside pl-5">
                    {selectedStudentDetails.map((student, index) => (
                        <li key={index} className="text-gray-700 mb-2">
                            {student.name} - Faculty: {student.faculty}, Class: {student.class}, Section: {student.section}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-600 italic">No students selected.</p>
            )}

            <div className="mt-auto">
                <Button color="primary" onPress={handleSave} isDisabled={isSaving}>
                    Save Attendance
                </Button>
            </div>
            <Popover
                isOpen={isPopoverOpen}
                onClose={() => setIsPopoverOpen(false)}
                onConfirm={confirmSaveAttendance}
                title="Confirm Save"
                content={
                    <>
                        Are you sure you want to mark the selected students as absent for today?
                        {saveError && <p className="text-red-500 mt-2">{saveError}</p>}
                    </>
                }
                isConfirmLoading={isSaving}
            />
        </div>
    );
};

export default Details;