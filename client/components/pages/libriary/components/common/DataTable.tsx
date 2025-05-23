// src/components/common/DataTable.tsx
import React from 'react';

export interface ColumnDef<T> {
  accessorKey: keyof T | string; // Allow string for custom accessors or nested paths
  header: string;
  cell?: (row: T) => React.ReactNode; // Custom cell renderer
  size?: number; // For column width (flex-basis percentage)
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyStateMessage?: string;
}

const DataTable = <T extends { $id?: string }>({
  columns,
  data,
  isLoading = false,
  emptyStateMessage = "No data available.",
}: DataTableProps<T>) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (data.length === 0 && !isLoading) {
    return (
      <div className="text-center py-10 text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-2 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
        {emptyStateMessage}
      </div>
    );
  }

  return (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={String(col.accessorKey)}
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      style={col.size ? { flexBasis: `${col.size}%` } : {}}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.map((row, rowIndex) => (
                  <tr key={row.$id || `row-${rowIndex}`} className="hover:bg-gray-50 transition-colors">
                    {columns.map((col) => (
                      <td
                        key={`${String(col.accessorKey)}-${row.$id || rowIndex}`}
                        className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-700 sm:pl-6"
                      >
                        {col.cell
                          ? col.cell(row)
                          : String(row[col.accessorKey as keyof T] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;