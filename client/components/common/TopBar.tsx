// components/TopBar.tsx
import React from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { BackIcon } from 'components/icons';

interface TopBarProps {
  title: string;
  onBack: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ title, onBack }) => {
  return (
    <div className="fixed top-0 bg-slate-200 shadow-md py-0.5 rounded-b-xl left-0 w-full z-10 flex items-center justify-start">
      <button onClick={onBack} className=" px-3 py-2 pt-2.5 focus:outline-none"> {/* Added mr-4 for spacing */}
        <BackIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
      </button>
      <h2 className="text-xl font-medium  text-gray-600 flex-1 text-center"> {/* Added flex-1 and text-center */}
        {title}
      </h2>
      <div className="w-10"></div> {/* Spacer to balance the right side, adjust w-10 as needed */}
    </div>
  );
};

export default TopBar;