// src/common/ResponsiveTable.tsx
import React from 'react';

export interface ColumnDefinition<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, rowIndex: number) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  isNumeric?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: ColumnDefinition<T>[];
  data: T[];
  isLoading?: boolean;
  loadingMessage?: string;
  emptyStateMessage?: string;
  emptyStateIcon?: React.ReactNode;
  tableClassName?: string;
  headerRowClassName?: string;
  bodyRowClassName?: (row: T, rowIndex: number) => string;
  ariaLabel: string;
}

const ResponsiveTable = <T extends object>({
  columns,
  data,
  isLoading = false,
  loadingMessage = "Loading data...",
  emptyStateMessage = "No data available.",
  emptyStateIcon,
  tableClassName = "min-w-full",
  headerRowClassName = "bg-gray-100 dark:bg-gray-800",
  bodyRowClassName,
  ariaLabel,
}: ResponsiveTableProps<T>) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{loadingMessage}</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
        {emptyStateIcon && <div className="mb-3">{emptyStateIcon}</div>}
        <span>{emptyStateMessage}</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
      <table className={tableClassName} aria-label={ariaLabel}>
        <thead className={headerRowClassName}>
          <tr className="border-b border-gray-300 dark:border-gray-700">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-3 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider ${col.headerClassName || ''} ${col.isNumeric ? 'text-right' : 'text-left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900">
          {data.map((row, rowIndex) => (
            <tr
              key={`row-${rowIndex}-${(row as any).subjectName}`} // Use a more unique key if possible
              className={`border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800
                ${bodyRowClassName ? bodyRowClassName(row, rowIndex) : (rowIndex % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-850')}
              `}
            >
              {columns.map((col) => (
                <td
                  key={`${col.key}-cell-${rowIndex}`}
                  className={`px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 ${col.cellClassName || ''} ${col.isNumeric ? 'text-right' : 'text-left'}`}
                >
                  {col.cell(row, rowIndex)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResponsiveTable;