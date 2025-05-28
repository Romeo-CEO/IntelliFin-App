'use client';

import React, { useState } from 'react';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Simple date range picker component
 * Note: This is a basic implementation. For production, consider using a library like react-day-picker
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date range',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(value || { from: undefined, to: undefined });

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString();
  };

  const formatRange = (range: DateRange) => {
    if (!range.from && !range.to) return placeholder;
    if (range.from && !range.to) return `From ${formatDate(range.from)}`;
    if (!range.from && range.to) return `To ${formatDate(range.to)}`;
    return `${formatDate(range.from)} - ${formatDate(range.to)}`;
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    const newRange = { ...tempRange, from: date };
    setTempRange(newRange);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    const newRange = { ...tempRange, to: date };
    setTempRange(newRange);
  };

  const handleApply = () => {
    onChange?.(tempRange);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempRange(value || { from: undefined, to: undefined });
    setIsOpen(false);
  };

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        className={`
          flex h-10 w-full items-center justify-between rounded-md border border-gray-300
          bg-white px-3 py-2 text-sm placeholder:text-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={!value?.from && !value?.to ? 'text-gray-500' : ''}>
          {formatRange(value || { from: undefined, to: undefined })}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full z-50 mt-1 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={formatDateForInput(tempRange.from)}
                onChange={handleFromDateChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={formatDateForInput(tempRange.to)}
                onChange={handleToDateChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export alias for compatibility
export const DatePickerWithRange = DateRangePicker;
