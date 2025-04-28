import React from 'react';
import { Button } from '@heroui/react';
import { ArrowLeftIcon, CalendarDaysIcon, CheckBadgeIcon, ClockIcon, InformationCircleIcon, UserCircleIcon, UsersIcon } from '@heroicons/react/24/outline';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { AppwriteNotification } from 'types/notification';

interface DetailsProps {
  notification: AppwriteNotification | null;
  isMobile: boolean;
  onGoBack: () => void; // Callback to deselect/go back on mobile
}

const Details: React.FC<DetailsProps> = ({ notification, isMobile, onGoBack }) => {

  const formatDate = (dateString: string, includeTime = true) => {
    try {
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
      return new Date(dateString).toLocaleString(undefined, options);
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const renderTarget = (target: string) => {
     const [type, value] = target.split(':');
     switch (type) {
         case 'id': return <span key={target} className="inline-block bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">User ID: {value}</span>;
         case 'role': return <span key={target} className="inline-block bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">Role: {value}</span>;
         case 'class': return <span key={target} className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">Class: {value}</span>;
         case 'faculty': return <span key={target} className="inline-block bg-purple-100 text-purple-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">Faculty: {value}</span>;
         case 'section': return <span key={target} className="inline-block bg-indigo-100 text-indigo-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">Section: {value}</span>;
         default: return <span key={target} className="inline-block bg-gray-100 text-gray-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">{target}</span>;
     }
  }

  if (!notification) {
    // On desktop, the parent handles the "Select a card" message.
    // On mobile, this component might not be rendered at all if nothing is selected.
    // So, returning null here is usually fine.
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-xl shadow-md overflow-hidden">
        {/* Mobile Back Button & Title */}
        {isMobile && (
            <div className="p-3 border-b border-gray-200 flex items-center gap-2 bg-white sticky top-0 z-10">
                <Button
                   isIconOnly
                   variant="light"
                   onPress={onGoBack}
                   aria-label="Go Back"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </Button>
                <h3 className="text-base font-semibold text-gray-800 truncate">
                    Notification Details
                </h3>
            </div>
        )}

        {/* Details Content */}
         <div className="flex-1 overflow-hidden">
             <PerfectScrollbar options={{ suppressScrollX: true }} className="h-full">
                <div className="p-4 md:p-6 space-y-4">
                    {!isMobile && (
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
                             Notification Details
                        </h3>
                    )}

                    {/* Title */}
                    <h4 className="text-xl font-bold text-gray-800">{notification.title}</h4>

                    {/* Message */}
                    <div className="prose prose-sm max-w-none text-gray-700 bg-white p-3 rounded border border-gray-200">
                         <p className='font-semibold mb-2 flex items-center gap-1'><InformationCircleIcon className='w-5 h-5 text-blue-600'/> Message:</p>
                        {notification.msg}
                    </div>

                    {/* Metadata Grid */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                           <UserCircleIcon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                           <span><strong>Sender:</strong> {notification.sender || 'System'}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                            <ClockIcon className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                           <span><strong>Sent:</strong> {formatDate(notification.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                           <CalendarDaysIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                           <span><strong>Valid Until:</strong> {formatDate(notification.valid)}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                           <CheckBadgeIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span className={`${new Date(notification.valid) >= new Date() ? 'text-green-700 font-semibold' : 'text-red-700'}`}>
                                {new Date(notification.valid) >= new Date() ? 'Currently Valid' : 'Expired'}
                            </span>
                        </div>
                    </div>


                    {/* Target Audience */}
                    <div className="bg-white p-3 rounded border border-gray-200">
                         <p className='font-semibold mb-2 flex items-center gap-1 text-sm text-gray-600'><UsersIcon className='w-5 h-5 text-purple-600'/> Targeted To:</p>
                        <div className="flex flex-wrap gap-2">
                            {notification.to.length > 0 ? (
                                notification.to.map(renderTarget)
                            ) : (
                                <span className="text-xs text-gray-500 italic">No specific target (potentially broadcast or error).</span>
                            )}
                        </div>
                    </div>

                    {/* Raw Data (Optional for Debugging) */}
                    {/* <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer">Raw Data</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                            {JSON.stringify(notification, null, 2)}
                        </pre>
                    </details> */}
                </div>
            </PerfectScrollbar>
        </div>
    </div>
  );
};

export default Details;