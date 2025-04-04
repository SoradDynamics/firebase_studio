// ~/store/absentStore.ts
import { create } from "zustand";
import { Student, StudentUpdateData } from "./studentStore";

interface AbsentState {
    markAbsent: (
        studentId: string,
        date: string,
        studentData: Student[],
        updateStudentData: (studentDocId: string, dataToUpdate: StudentUpdateData) => Promise<Student | undefined> // Update here to match studentStore
    ) => Promise<void>;
}

export const useAbsentStore = create<AbsentState>((set, get) => ({
    markAbsent: async (studentId: string, date: string, studentData: Student[], updateStudentData: (studentDocId: string, dataToUpdate: StudentUpdateData) => Promise<Student | undefined>) => {
        try {
            const student = studentData.find((s) => s.$id === studentId);

            if (student) {
                const absentArray = student.absent || [];

                if (!absentArray.includes(date)) {
                    absentArray.push(date);
                    await updateStudentData(studentId, { absent: absentArray });
                    console.log(`Marked student ${studentId} absent on ${date}`);

                } else {
                    console.log(`Student ${studentId} already marked absent on ${date}.`);
                }
            } else {
                console.warn(`Student with ID ${studentId} not found.`);
            }
        } catch (error) {
            console.error("Error marking student absent:", error);
        }
    },
}));