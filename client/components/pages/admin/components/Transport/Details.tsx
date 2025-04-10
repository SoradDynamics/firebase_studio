// src/Transport/Details.tsx
import React from "react";
import { Button } from "@heroui/react";
import { Driver } from 'types'; // Import Driver type
import { MapPinIcon, ClockIcon, CalendarDaysIcon, IdentificationIcon, EnvelopeIcon, MapIcon, TagIcon } from '@heroicons/react/24/outline'; // Import icons for better visuals

interface DetailsProps {
  driver: Driver | null; // Changed prop name and type
  onBack?: () => void; // Optional back function for mobile
}

// Helper function to format date/time (adjust format as needed)
const formatDateTime = (isoString: string | undefined | null): string => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper component for rendering detail items consistently
const DetailItem: React.FC<{ icon?: React.ReactNode; label: string; value: React.ReactNode | string | number | null | undefined }> = ({ icon, label, value }) => {
  const displayValue = value !== null && value !== undefined && value !== '' ? value : <span className="text-gray-500 italic">N/A</span>;
  return (
    <div className="flex items-start space-x-2 py-2">
      {icon && <div className="flex-shrink-0 w-5 h-5 text-gray-500 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <dt className="text-sm font-medium text-gray-600">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 break-words">{displayValue}</dd>
      </div>
    </div>
  );
};


const Details: React.FC<DetailsProps> = ({ driver, onBack }) => {
  // If no driver is selected, render a placeholder message or null
  if (!driver) {
    // This part is usually handled by the parent component (Transport.tsx),
    // but adding a fallback here can be helpful.
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-gray-500 italic">No driver selected.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col h-full space-y-6 bg-gray-100 rounded-xl shadow-sm">
      {/* Mobile Back Button & Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800 leading-tight">
          Driver Details
        </h2>
        {onBack && (
          <Button onPress={onBack} color="secondary" variant="flat" size="sm">
            Back to List
          </Button>
        )}
      </div>

      {/* Main Driver Info Section */}
      <div className="space-y-3">
         <h3 className="text-lg font-medium text-gray-700 mb-2 border-b border-gray-100 pb-1">
            {driver.driverName}
         </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <DetailItem icon={<MapIcon className="w-5 h-5" />} label="Route" value={driver.route} />
          <DetailItem icon={<EnvelopeIcon className="w-5 h-5" />} label="Email" value={driver.email} />
          {/* <DetailItem icon={<TagIcon className="w-5 h-5" />} label="Assigned Driver ID" value={driver.driverId} /> */}
        </dl>
      </div>

      {/* Location Info Section (Conditional) */}
      {(driver.latitude || driver.longitude || driver.timestamp) && (
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-base font-medium text-gray-700 mb-2">Location Information</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <DetailItem
              icon={<MapPinIcon className="w-5 h-5" />}
              label="Last Known Coordinates"
              value={driver.latitude && driver.longitude ? `${driver.latitude}, ${driver.longitude}` : undefined}
            />
            <DetailItem
              icon={<ClockIcon className="w-5 h-5" />}
              label="Location Timestamp"
              value={formatDateTime(driver.timestamp)}
             />
          </dl>
        </div>
      )}

      {/* Metadata Section */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-700 mb-2">System Information</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <DetailItem icon={<CalendarDaysIcon className="w-5 h-5" />} label="Record Created" value={formatDateTime(driver.$createdAt)} />
          <DetailItem icon={<ClockIcon className="w-5 h-5" />} label="Record Last Updated" value={formatDateTime(driver.$updatedAt)} />
          {/* <DetailItem icon={<IdentificationIcon className="w-5 h-5" />} label="Document ID" value={driver.$id} /> */}
          {/* You might conditionally show $id or make it less prominent if not needed by regular users */}
        </dl>
      </div>

    </div>
  );
};

export default Details;