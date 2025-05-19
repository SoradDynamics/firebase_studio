// src/features/fee-config/components/FeeCard.tsx
import React from 'react';
import ActionButton from '../../../../common/ActionButton';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import type { ClassFeeDisplayInfo, ProcessedFeeConfig, FeeItem } from 'types/fee-config'; // Updated import
import { Card, CardHeader, CardBody, CardFooter, Divider, Chip } from '@heroui/react';

interface FeeCardProps {
  classFeeInfo: ClassFeeDisplayInfo; // Renamed prop and updated type
  onEdit: (config: ProcessedFeeConfig & { facultyName: string }) => void;
}

const FeeCard: React.FC<FeeCardProps> = ({ classFeeInfo, onEdit }) => {
  // Destructure directly from classFeeInfo
  const { className, facultyName, facultyId, processedFeeConfig } = classFeeInfo;
  const fees: FeeItem[] = processedFeeConfig?.fees || [];

  const handleEditClick = () => {
    // Prepare the config to pass to the drawer
    // If no existing config for this class, create a shell for a new one
    const configForDrawer: ProcessedFeeConfig & { facultyName: string } = {
        $id: processedFeeConfig?.$id, // Will be undefined if no config exists yet
        facultyId: facultyId,
        className: className,         // Pass the specific class name
        fees: processedFeeConfig?.fees || [], // Will be an empty array if no config exists
        facultyName: facultyName,
    };
    onEdit(configForDrawer);
  };

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-gray-800">
      <CardHeader className="flex justify-between items-start p-4">
        <div>
          {/* Display className (e.g., "Class 10") prominently */}
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{className}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Faculty: {facultyName}</p>
        </div>
        <ActionButton
          icon={<PencilSquareIcon className="w-5 h-5" />}
          onClick={handleEditClick}
          color="blue"
          isIconOnly
        />
      </CardHeader>
      <Divider />
      <CardBody className="p-4">
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Fee Structure:</h4>
        {fees.length > 0 ? (
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {fees.map((fee) => ( // fee.id should be unique from parseFeeDesc or local additions
              <li key={fee.id} className="flex justify-between">
                <span>{fee.title}:</span>
                <span className="font-semibold">
                  {fee.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} {/* Adjust currency as needed */}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No fees configured for this class yet.</p>
        )}
      </CardBody>
      {fees.length > 0 && (
        <>
          <Divider />
          <CardFooter className="p-4">
            <Chip color="success" size="sm" variant="flat">
                Total Fees: {fees.reduce((sum, fee) => sum + fee.amount, 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
            </Chip>
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default FeeCard;