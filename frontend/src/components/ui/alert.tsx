import React from 'react';

export interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'warning' | 'success' | 'info';
  className?: string;
  title?: string;
}

export interface AlertTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Alert component for displaying important messages
 */
export const Alert: React.FC<AlertProps> = ({ 
  children, 
  variant = 'default',
  className = '',
  title
}) => {
  const baseClasses = 'relative w-full rounded-lg border p-4';
  
  const variantClasses = {
    default: 'bg-gray-50 border-gray-200 text-gray-900',
    destructive: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };

  const iconClasses = {
    default: '🔔',
    destructive: '⚠️',
    warning: '⚠️',
    success: '✅',
    info: 'ℹ️',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${className}
  `.trim();

  return (
    <div className={classes} role="alert">
      <div className="flex">
        <div className="flex-shrink-0 mr-3">
          <span className="text-lg">{iconClasses[variant]}</span>
        </div>
        <div className="flex-1">
          {title && (
            <h5 className="font-medium mb-1">
              {title}
            </h5>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Alert title component
 */
export const AlertTitle: React.FC<AlertTitleProps> = ({ children, className = '' }) => {
  return (
    <h5 className={`font-medium mb-1 ${className}`}>
      {children}
    </h5>
  );
};

/**
 * Alert description component
 */
export const AlertDescription: React.FC<AlertDescriptionProps> = ({ children, className = '' }) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
};
