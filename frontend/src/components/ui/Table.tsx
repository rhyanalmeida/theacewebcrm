import React from 'react';
import { cn } from '@/utils/cn';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  sortField?: keyof T;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: keyof T) => void;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  emptyMessage?: string;
}

function Table<T extends { id: string }>({
  data,
  columns,
  loading = false,
  sortField,
  sortDirection = 'asc',
  onSort,
  onRowClick,
  className,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  const handleSort = (field: keyof T) => {
    if (onSort) {
      onSort(field);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-1"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100',
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="flex flex-col">
                        <ChevronUpIcon 
                          className={cn(
                            'h-3 w-3',
                            sortField === column.key && sortDirection === 'asc'
                              ? 'text-blue-600' 
                              : 'text-gray-400'
                          )} 
                        />
                        <ChevronDownIcon 
                          className={cn(
                            'h-3 w-3 -mt-1',
                            sortField === column.key && sortDirection === 'desc'
                              ? 'text-blue-600' 
                              : 'text-gray-400'
                          )} 
                        />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                        column.className
                      )}
                    >
                      {column.render 
                        ? column.render(row[column.key], row, index)
                        : String(row[column.key] || '-')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { Table, type TableColumn, type TableProps };