// src/components/common/PageHeader.tsx
import React from 'react';

interface PageHeaderProps {
  title: string;
  actionButton?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, actionButton }) => {
  return (
    <div className="mb-6 md:flex md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl font-medium leading-tight text-gray-900 sm:text-3xl sm:tracking-tight">
          {title}
        </h2>
      </div>
      {actionButton && <div className="mt-4 flex md:ml-4 md:mt-0">{actionButton}</div>}
    </div>
  );
};

export default PageHeader;