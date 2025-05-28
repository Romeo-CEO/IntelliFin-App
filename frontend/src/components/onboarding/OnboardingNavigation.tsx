'use client';

import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

export function OnboardingNavigation() {
  const {
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    isStepValid,
    isComplete,
    submitOnboarding,
    isSubmitting,
  } = useOnboarding();

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const canProceed = isStepValid(currentStep);

  const handleNext = () => {
    if (isLastStep && isComplete) {
      submitOnboarding();
    } else if (canProceed) {
      nextStep();
    }
  };

  const getNextButtonText = () => {
    if (isLastStep) {
      return isSubmitting ? 'Creating Organization...' : 'Complete Setup';
    }
    return 'Continue';
  };

  const getNextButtonIcon = () => {
    if (isLastStep) {
      return isSubmitting ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div className="flex items-center justify-between">
      {/* Previous Button */}
      <button
        type="button"
        onClick={previousStep}
        disabled={isFirstStep || isSubmitting}
        className={`
          inline-flex items-center px-6 py-3 border border-neutral-300 text-sm font-medium rounded-lg
          transition-colors duration-200
          ${
            isFirstStep || isSubmitting
              ? 'text-neutral-400 bg-neutral-100 cursor-not-allowed'
              : 'text-neutral-700 bg-white hover:bg-neutral-50 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }
        `}
      >
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Previous
      </button>

      {/* Step Indicator */}
      <div className="flex items-center space-x-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isValid = isStepValid(stepNumber);

          return (
            <div
              key={stepNumber}
              className={`
                w-3 h-3 rounded-full transition-colors duration-200
                ${
                  isActive
                    ? 'bg-blue-600'
                    : isCompleted
                    ? isValid
                      ? 'bg-green-500'
                      : 'bg-red-500'
                    : 'bg-neutral-300'
                }
              `}
            />
          );
        })}
      </div>

      {/* Next/Complete Button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!canProceed || isSubmitting}
        className={`
          inline-flex items-center px-6 py-3 text-sm font-medium rounded-lg
          transition-colors duration-200
          ${
            !canProceed || isSubmitting
              ? 'text-neutral-400 bg-neutral-200 cursor-not-allowed'
              : isLastStep
              ? 'text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              : 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }
        `}
      >
        {getNextButtonText()}
        <span className="ml-2">{getNextButtonIcon()}</span>
      </button>
    </div>
  );
}
