'use client';

import React from 'react';

import { useOnboarding } from '../../contexts/OnboardingContext';

export function OnboardingProgress() {
  const { currentStep, totalSteps, isStepValid } = useOnboarding();

  const steps = [
    {
      number: 1,
      title: 'Business Info',
      description: 'Basic business details',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path
            fillRule="evenodd"
            d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      number: 2,
      title: 'Contact Details',
      description: 'Location and contact info',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      number: 3,
      title: 'Banking Info',
      description: 'Banking details (optional)',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
          <path d="M6 6a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V6z" />
        </svg>
      ),
    },
    {
      number: 4,
      title: 'Branding',
      description: 'Colors and preferences',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) {
      return isStepValid(stepNumber) ? 'completed' : 'error';
    } else if (stepNumber === currentStep) {
      return 'current';
    } else {
      return 'upcoming';
    }
  };

  const getStepClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          container: 'text-green-600',
          circle: 'bg-green-600 text-white border-green-600',
          connector: 'bg-green-600',
        };
      case 'error':
        return {
          container: 'text-red-600',
          circle: 'bg-red-600 text-white border-red-600',
          connector: 'bg-red-600',
        };
      case 'current':
        return {
          container: 'text-blue-600',
          circle: 'bg-blue-600 text-white border-blue-600',
          connector: 'bg-neutral-300',
        };
      case 'upcoming':
        return {
          container: 'text-neutral-500',
          circle: 'bg-white text-neutral-500 border-neutral-300',
          connector: 'bg-neutral-300',
        };
      default:
        return {
          container: 'text-neutral-500',
          circle: 'bg-white text-neutral-500 border-neutral-300',
          connector: 'bg-neutral-300',
        };
    }
  };

  return (
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => {
            const status = getStepStatus(step.number);
            const classes = getStepClasses(status);
            const isLast = stepIdx === steps.length - 1;

            return (
              <li key={step.number} className="relative flex-1">
                <div className="flex items-center">
                  {/* Step Circle */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-200
                        ${classes.circle}
                      `}
                    >
                      {status === 'completed' ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : status === 'error' ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        step.icon
                      )}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className={`ml-4 min-w-0 flex-1 ${classes.container}`}>
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-neutral-500">
                      {step.description}
                    </div>
                  </div>

                  {/* Connector Line */}
                  {!isLast && (
                    <div className="flex-1 ml-4">
                      <div
                        className={`h-0.5 transition-colors duration-200 ${classes.connector}`}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-sm text-neutral-600 mb-2">
          <span>Progress</span>
          <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
