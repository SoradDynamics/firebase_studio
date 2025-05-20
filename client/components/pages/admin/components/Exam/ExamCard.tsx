// src/components/ExamCard.tsx
import React, { useMemo } from 'react';
import { Exam } from 'types/models'; // Import updated Exam type
import ActionButton from '../../../../common/ActionButton';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Import the converter
import NepaliDate from 'nepali-date-converter';

// Helper to convert AD Date string (ISO) to formatted BS Date string
const formatAdToBsDate = (adDateString: string | null): string => {
    if (!adDateString) return 'N/A';
    try {
        const adDate = new Date(adDateString);
        if (isNaN(adDate.getTime())) return 'Invalid Date';

        const bsDate = new NepaliDate(adDate);
        // Format example: 2080/11/25 BS
        return `${bsDate.getYear()}/${String(bsDate.getMonth() + 1).padStart(2, '0')}/${String(bsDate.getDate()).padStart(2, '0')} BS`;
    } catch (error) {
        console.error("Error formatting AD to BS:", error);
        return 'Error Date';
    }
};


interface ExamCardProps {
    exam: Exam; // Use the updated Exam type
    onEdit: (exam: Exam) => void;
    onDelete: (examId: string) => void;
    showActions?: boolean;
}

const ExamCard: React.FC<ExamCardProps> = ({ exam, onEdit, onDelete, showActions = true }) => {

     // Parse subjectDates strings into objects for easier rendering/status check
     const parsedSubjectDates = useMemo(() => {
         if (!exam.subjectDates) return [];
         return exam.subjectDates.map(itemString => {
             const parts = itemString.split('|');
             if (parts.length !== 2) {
                 console.warn("Invalid subject date string format:", itemString);
                 return null; // Indicate invalid entry
             }
             const [subject, adIsoString] = parts;
             try {
                  const adDate = new Date(adIsoString);
                  if (isNaN(adDate.getTime())) {
                       console.warn("Invalid AD date string in subject date:", adIsoString);
                       return null;
                  }
                 return { subject: subject.trim(), adDate, adIsoString, bsDate: formatAdToBsDate(adIsoString) }; // Trim subject name just in case
             } catch (error) {
                  console.warn("Error parsing subject date string:", error);
                 return null;
             }
         }).filter(item => item !== null) as { subject: string, adDate: Date, adIsoString: string, bsDate: string }[]; // Filter out nulls and assert type
    }, [exam.subjectDates]); // Recalculate when subjectDates array changes


     // Determine exam status (Upcoming or Expired) based on ALL subject dates
     const examStatus = useMemo(() => {
        if (!parsedSubjectDates || parsedSubjectDates.length === 0) {
            return { text: 'Dates TBD', colorClass: 'text-gray-500' };
        }
        try {
            const todayAd = new Date();
            // Set both dates to midnight for accurate day-based comparison
            todayAd.setHours(0, 0, 0, 0);

            // Check if *any* subject date is today or in the future
            const isUpcoming = parsedSubjectDates.some(item => item.adDate >= todayAd);

            if (isUpcoming) {
                return { text: 'Upcoming', colorClass: 'text-green-600 font-semibold' };
            } else {
                // If no date is today or future, all dates must be in the past
                return { text: 'Expired', colorClass: 'text-red-600 font-semibold' };
            }
        } catch (error) {
             console.error("Error determining exam status from subject dates:", error);
             return { text: 'Status Error', colorClass: 'text-gray-500' };
        }
     }, [parsedSubjectDates]); // Recalculate when parsedSubjectDates changes


    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-semibold text-gray-800">{exam.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">Type: <span className="font-medium">{exam.type || 'N/A'}</span></p>
                     {/* Display Exam Status */}
                     <p className={`text-sm mt-1 ${examStatus.colorClass}`}>{examStatus.text}</p>
                </div>
                {/* Conditionally render actions */}
                {showActions && (
                    <div className="flex space-x-2 shrink-0">
                        <ActionButton
                            icon={<PencilIcon className="h-4 w-4" />}
                            color="blue"
                            onClick={() => onEdit(exam)}
                            isIconOnly={true}
                        />
                        <ActionButton
                            icon={<TrashIcon className="h-4 w-4" />}
                            color="red"
                            onClick={() => onDelete(exam.$id)}
                            isIconOnly={true}
                        />
                    </div>
                )}
            </div>

             {/* --- Display Subject Dates --- */}
            <div className="mb-4 text-gray-700">
                <p className="font-medium mb-1">Subjects & Dates:</p>
                {parsedSubjectDates.length === 0 ? (
                     <p className="text-sm text-gray-600">No subjects added.</p>
                ) : (
                     <ul className="text-sm text-gray-600 list-disc list-inside pl-4 space-y-0.5">
                         {parsedSubjectDates
                             .sort((a, b) => a.adDate.getTime() - b.adDate.getTime()) // Sort by date
                             .map((item, index) => (
                                 // Use a unique key for each item
                                 <li key={`${item.subject}-${item.adIsoString}-${index}`}>
                                     <span className="font-semibold">{item.subject}:</span> {item.bsDate}
                                 </li>
                             ))}
                     </ul>
                )}
            </div>


            <div className="mb-4 text-gray-700">
                <p className="font-medium mb-1">Description:</p>
                <p className="text-sm whitespace-pre-wrap">{exam.desc || 'No description provided.'}</p>
            </div>

             {/* ... existing display for Faculties, Classes, Sections ... */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                    <p className="font-medium">Faculties:</p>
                    <p className="text-gray-600">{exam.faculty && exam.faculty.length > 0 ? exam.faculty.join(', ') : 'All Faculties'}</p>
                </div>
                <div>
                    <p className="font-medium">Classes:</p>
                    <p className="text-gray-600">{exam.class && exam.class.length > 0 ? exam.class.join(', ') : 'All Classes'}</p>
                </div>
                <div>
                    <p className="font-medium">Sections:</p>
                    <p className="text-gray-600">{exam.section && exam.section.length > 0 ? exam.section.join(', ') : 'All Sections'}</p>
                </div>
            </div>
        </div>
    );
};

export default ExamCard;