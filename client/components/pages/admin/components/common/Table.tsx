import React, { useMemo, Key, useCallback } from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { Spinner } from "@heroui/react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  headerClassName?: string;
  cellClassName?: string;
  minWidth?: string;
}

type DataItem = Record<string, any>;

export interface TableProps<T extends DataItem> {
  columns: ColumnDef<T>[];
  data: T[];
  getRowKey: (item: T) => Key;
  isLoading?: boolean;
  emptyContent?: React.ReactNode;
  renderCell: (item: T, columnKey: string) => React.ReactNode;
  selectionMode?: 'single' | 'multiple' | 'none';
  selectedKeys?: Set<Key>;
  onSelectionChange?: (keys: Set<Key>) => void;
  maxHeight?: string;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string | ((item: T, isSelected: boolean) => string);
  cellClassName?: string;
  headerCellClassName?: string;
    onRowClick?: (item: T) => void; // Add the onRowClick prop
}

export const Table = <T extends DataItem>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  emptyContent = "No data available.",
  renderCell,
  selectionMode = 'none',
  selectedKeys = new Set(),
  onSelectionChange,
  maxHeight,
  className = '',
  tableClassName = 'min-w-full border-collapse text-gray-800',
  headerClassName = 'bg-gray-100 border-b-2 border-gray-300',
  bodyClassName = 'bg-white',
  rowClassName,
  cellClassName = 'px-4 py-2 text-sm text-gray-700 whitespace-nowrap',
  headerCellClassName = 'px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide',
    onRowClick, // Destructure onRowClick from props
}: TableProps<T>) => {
  const handleRowClickInternal = useCallback((item: T) => {
    if (onRowClick) {
      onRowClick(item); // Call the provided onRowClick
    }
      if (selectionMode === 'none' || !onSelectionChange) return;
      const key = getRowKey(item);
      const newSelectedKeys = new Set(selectedKeys);

      if (selectionMode === 'single') {
          newSelectedKeys.clear();
          newSelectedKeys.add(key);
      } else {
          newSelectedKeys.has(key) ? newSelectedKeys.delete(key) : newSelectedKeys.add(key);
      }
      onSelectionChange(newSelectedKeys);
  }, [onRowClick, selectionMode, selectedKeys, onSelectionChange, getRowKey]);

  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  };

  const TableContent = useMemo(() => (
    <table className={`${tableClassName} w-full`}> 
      <thead className={`sticky top-0 z-10 ${headerClassName}`}> 
        <tr>
          {columns.map((col) => (
            <th key={col.key} className={`${headerCellClassName} ${getAlignmentClass(col.align)} ${col.headerClassName || ''}`}
              style={{ minWidth: col.minWidth }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className={bodyClassName}>
        {isLoading ? (
          <tr>
            <td colSpan={columns.length} className="h-40 text-center">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <Spinner size="md" />
                <span>Loading data...</span>
              </div>
            </td>
          </tr>
        ) : data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="h-40 text-center text-gray-500">{emptyContent}</td>
          </tr>
        ) : (
          data.map((item) => {
            const key = getRowKey(item);
            const isSelected = selectedKeys.has(key);
            const dynamicRowClassName = typeof rowClassName === 'function' ? rowClassName(item, isSelected) : rowClassName;

            return (
              <tr key={key} onClick={() => handleRowClickInternal(item)} className={
                `cursor-pointer transition-colors duration-200 borde border-gray-300
                ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-200'}
                ${dynamicRowClassName || ''}`
              }>
                {columns.map((col) => (
                  <td key={`${key}-${col.key}`} className={`${cellClassName} ${getAlignmentClass(col.align)} ${col.cellClassName || ''}`}
                    style={{ minWidth: col.minWidth }}>
                    {renderCell(item, col.key)}
                  </td>
                ))}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  ), [columns, data, getRowKey, isLoading, emptyContent, renderCell, selectionMode, selectedKeys, tableClassName, headerClassName, bodyClassName, rowClassName, cellClassName, headerCellClassName, handleRowClickInternal, getAlignmentClass]);

  const useVerticalScroll = !!maxHeight;

  return (
    <div className={`overflow-hidden ${className}`}>
      {useVerticalScroll ? (
        <PerfectScrollbar style={{ maxHeight }} className="relative">
          {TableContent}
        </PerfectScrollbar>
      ) : (
        <div className="overflow-x-auto">
          {TableContent}
        </div>
      )}
    </div>
  );
};

export default Table;