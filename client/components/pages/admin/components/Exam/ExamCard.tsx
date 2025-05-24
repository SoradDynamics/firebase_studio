// src/pages/Exam/ExamCard.tsx (or its correct path)
import React, { useMemo } from 'react';
import { Exam, SubjectDetail } from 'types/models';
import ActionButton from '../../../../common/ActionButton'; // Adjust path as needed
import { PencilIcon, TrashIcon, CalendarDaysIcon, ClipboardDocumentListIcon, DocumentTextIcon, AcademicCapIcon, UsersIcon, IdentificationIcon } from '@heroicons/react/24/outline'; // Added more icons
import NepaliDate from 'nepali-date-converter';

const formatAdToBsDate = (adDateString: string | null): string => {
    if (!adDateString) return 'N/A';
    try {
        const adDate = new Date(adDateString);
        if (isNaN(adDate.getTime())) return 'Invalid Date';
        const bsDate = new NepaliDate(adDate);
        return `${bsDate.getYear()}/${String(bsDate.getMonth() + 1).padStart(2, '0')}/${String(bsDate.getDate()).padStart(2, '0')} BS`;
    } catch (error) {
        console.error("Error formatting AD to BS:", error);
        return 'Error Date';
    }
};

interface DetailRowProps {
    icon: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
    className?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, className }) => (
    <div className={`flex items-start space-x-2 text-sm ${className}`}>
        <span className="text-indigo-600 mt-0.5">{icon}</span>
        <span className="font-medium text-gray-700">{label}:</span>
        <span className="text-gray-600 flex-1">{value}</span>
    </div>
);


interface ExamCardProps {
    exam: Exam;
    onEdit: (exam: Exam) => void;
    onDelete: (examId: string) => void;
    showActions?: boolean;
}

const ExamCard: React.FC<ExamCardProps> = ({ exam, onEdit, onDelete, showActions = true }) => {

    const parsedSubjectDetails = useMemo(() => {
        if (!exam.subjectDetails) return [];
        return exam.subjectDetails
            .map(detail => {
                try {
                    const adDate = new Date(detail.date);
                    if (isNaN(adDate.getTime())) return null;
                    return { ...detail, adDate, bsDate: formatAdToBsDate(detail.date) };
                } catch { return null; }
            })
            .filter(item => item !== null) as (SubjectDetail & { adDate: Date, bsDate: string })[];
    }, [exam.subjectDetails]);

    const examStatus = useMemo(() => {
        if (!parsedSubjectDetails || parsedSubjectDetails.length === 0) {
            return { text: 'Dates TBD', colorClass: 'text-gray-500 bg-gray-100', icon: <CalendarDaysIcon className="h-4 w-4 mr-1 inline"/> };
        }
        const todayAd = new Date(); todayAd.setHours(0, 0, 0, 0);
        const isUpcoming = parsedSubjectDetails.some(item => item.adDate >= todayAd);
        if (isUpcoming) {
            return { text: 'Upcoming', colorClass: 'text-green-700 bg-green-100', icon: <CalendarDaysIcon className="h-4 w-4 mr-1 inline"/> };
        } else {
            return { text: 'Expired', colorClass: 'text-red-700 bg-red-100', icon: <CalendarDaysIcon className="h-4 w-4 mr-1 inline"/> };
        }
    }, [parsedSubjectDetails]);

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-indigo-100 transition-shadow duration-300">
            {/* Header */}
            <div className="bg-indigo-50 p-4 sm:p-5 border-b border-indigo-200">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-indigo-700">{exam.title}</h3>
                    {showActions && (
                        <div className="flex space-x-1.5 shrink-0">
                            <ActionButton icon={<PencilIcon className="h-4 w-4 " />} color="blue" onClick={() => onEdit(exam)} isIconOnly={true} tooltip="Edit Exam"/>
                            <ActionButton icon={<TrashIcon className="h-4 w-4 " />} color="red" onClick={() => onDelete(exam.$id)} isIconOnly={true} tooltip="Delete Exam"/>
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-4 mt-2">
                    <p className="text-xs sm:text-sm text-indigo-600">
                        <DocumentTextIcon className="h-4 w-4 mr-1 inline-block align-middle" />
                        Type: <span className="font-medium">{exam.type || 'N/A'}</span>
                    </p>
                    <span className={`px-2 py-0.5 text-xs sm:text-sm rounded-full font-medium ${examStatus.colorClass}`}>
                        {examStatus.icon} {examStatus.text}
                    </span>
                </div>
            </div>

            {/* Body Content */}
            <div className="p-4 sm:p-5 space-y-4">
                {/* Description */}
                {exam.desc && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                            <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-indigo-500" />
                            Description
                        </h4>
                        <p className="text-sm text-gray-600 ml-7 whitespace-pre-wrap leading-relaxed">{exam.desc}</p>
                    </div>
                )}

                {/* Subjects Section */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <AcademicCapIcon className="h-5 w-5 mr-2 text-indigo-500" />
                        Subjects & Marks
                    </h4>
                    {parsedSubjectDetails.length === 0 ? (
                        <p className="text-sm text-gray-500 ml-7">No subjects assigned to this exam.</p>
                    ) : (
                        <div className="space-y-3 ml-2 sm:ml-0">
                            {parsedSubjectDetails
                                .sort((a, b) => a.adDate.getTime() - b.adDate.getTime()) // Sort by date
                                .map((subject, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <p className="text-base font-semibold text-indigo-700">
                                            {subject.name}</p>
                                        <p className="text-small font-medium text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                                            <CalendarDaysIcon className="h-3.5 w-3.5 mr-1 inline"/>{subject.bsDate}
                                        </p>
                                    </div>
                                    <div className="flex gap-x-4 gap-y-1 text-xs">
                                        <div>
                                            <span className="font-medium text-gray-700">Theory:</span>
                                            <span className="text-gray-600 ml-1">
                                                FM: <span className="font-semibold">{subject.theoryFM}</span>,
                                                PM: <span className="font-semibold">{subject.theoryPM}</span>
                                            </span>
                                        </div>
                                        {subject.hasPractical && (
                                            <div>
                                                <span className="font-medium text-gray-700">Practical:</span>
                                                <span className="text-gray-600 ml-1">
                                                    FM: <span className="font-semibold">{subject.practicalFM || 'N/A'}</span>,
                                                    PM: <span className="font-semibold">{subject.practicalPM || 'N/A'}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Targeting Info */}
                {(exam.faculty?.length > 0 || exam.class?.length > 0 || exam.section?.length > 0) && (
                    <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <UsersIcon className="h-5 w-5 mr-2 text-indigo-500" />
                            Target Audience
                        </h4>
                        <div className="space-y-1.5 ml-7">
                            <DetailRow
                                icon={<IdentificationIcon className="h-4 w-4" />}
                                label="Faculties"
                                value={exam.faculty && exam.faculty.length > 0 ? exam.faculty.join(', ') : <span className="italic text-gray-500">All Faculties</span>}
                            />
                            <DetailRow
                                icon={<UsersIcon className="h-4 w-4" />}
                                label="Classes"
                                value={exam.class && exam.class.length > 0 ? exam.class.join(', ') : <span className="italic text-gray-500">All Classes</span>}
                            />
                            <DetailRow
                                icon={<IdentificationIcon className="h-4 w-4" />} // Could use a different icon for sections if available
                                label="Sections"
                                value={exam.section && exam.section.length > 0 ? exam.section.join(', ') : <span className="italic text-gray-500">All Sections</span>}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamCard;