import React from 'react';

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableRowProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableCellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Table component
 */
export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
        {children}
      </table>
    </div>
  );
};

/**
 * Table header component
 */
export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-gray-50 ${className}`}>
      {children}
    </thead>
  );
};

/**
 * Table body component
 */
export const TableBody: React.FC<TableBodyProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`bg-white divide-y divide-gray-200 ${className}`}>
      {children}
    </tbody>
  );
};

/**
 * Table row component
 */
export const TableRow: React.FC<TableRowProps> = ({ children, className = '' }) => {
  return (
    <tr className={`hover:bg-gray-50 ${className}`}>
      {children}
    </tr>
  );
};

/**
 * Table head cell component
 */
export const TableHead: React.FC<TableHeadProps> = ({ children, className = '' }) => {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
};

/**
 * Table cell component
 */
export const TableCell: React.FC<TableCellProps> = ({ children, className = '' }) => {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}>
      {children}
    </td>
  );
};
