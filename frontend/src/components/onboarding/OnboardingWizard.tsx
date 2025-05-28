'use client';

import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { BusinessInfoForm } from './BusinessInfoForm';
import { ContactDetailsForm } from './ContactDetailsForm';
import { BankingInfoForm } from './BankingInfoForm';
import { BrandingForm } from './BrandingForm';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingNavigation } from './OnboardingNavigation';

interface OnboardingWizardProps {
  className?: string;
}

export function OnboardingWizard({ className = '' }: OnboardingWizardProps) {
  const {
    currentStep,
    totalSteps,
    isStepValid,
    getStepErrors,
    error,
    isSubmitting,
  } = useOnboarding();

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1:
        return 'Business Information';
      case 2:
        return 'Contact Details';
      case 3:
        return 'Banking Information';
      case 4:
        return 'Branding & Preferences';
      default:
        return 'Setup';
    }
  };

  const getStepDescription = (step: number): string => {
    switch (step) {
      case 1:
        return 'Tell us about your business and provide your ZRA Tax Identification Number';
      case 2:
        return 'Provide your business contact information and location';
      case 3:
        return 'Add your banking details for financial transactions (optional)';
      case 4:
        return 'Customize your brand colors and preferences (optional)';
      default:
        return 'Complete your business setup';
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <BusinessInfoForm />;
      case 2:
        return <ContactDetailsForm />;
      case 3:
        return <BankingInfoForm />;
      case 4:
        return <BrandingForm />;
      default:
        return null;
    }
  };

  const stepErrors = getStepErrors(currentStep);
  const isCurrentStepValid = isStepValid(currentStep);

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
          Welcome to IntelliFin
        </h1>
        <p className="text-lg text-neutral-700">
          Let's set up your business profile to get started
        </p>
      </div>

      {/* Progress Indicator */}
      <OnboardingProgress />

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        {/* Step Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-medium text-neutral-900">
              {getStepTitle(currentStep)}
            </h2>
            <span className="text-sm text-neutral-500">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <p className="text-neutral-600">
            {getStepDescription(currentStep)}
          </p>
        </div>

        {/* Global Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-700 font-medium">Error</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Step Validation Errors */}
        {stepErrors.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center mb-2">
              <svg
                className="w-5 h-5 text-yellow-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-yellow-700 font-medium">
                Please fix the following issues:
              </span>
            </div>
            <ul className="list-disc list-inside text-yellow-600 space-y-1">
              {stepErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderCurrentStep()}
        </div>
      </div>

      {/* Navigation */}
      <OnboardingNavigation />

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Setting up your business...
              </h3>
              <p className="text-neutral-600">
                Please wait while we create your organization profile.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
