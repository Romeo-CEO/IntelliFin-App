import React from 'react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

/**
 * Reusable error message component
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Error',
  message,
  onRetry,
  compact = false,
  className = '',
  actions = [],
}) => {
  if (compact) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="text-red-600 text-sm mb-2">{message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-blue-600 hover:text-blue-700 underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="mx-auto h-12 w-12 text-red-400 mb-4">
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        {message}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>
        )}

        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              action.variant === 'primary'
                ? 'border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};
