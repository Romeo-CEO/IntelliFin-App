import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
  children: React.ReactNode;
}

/**
 * Label component for form inputs
 */
export const Label: React.FC<LabelProps> = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`
          text-sm font-medium leading-none peer-disabled:cursor-not-allowed 
          peer-disabled:opacity-70 text-gray-700
          ${className}
        `}
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = 'Label';
