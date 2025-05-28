'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useOnboarding as useOnboardingHook } from '../../hooks/useOnboarding';

export function BusinessInfoForm() {
  const { data, updateBusinessInfo } = useOnboarding();
  const { 
    businessTypeOptions, 
    industryOptions, 
    validateZraTin, 
    isValidatingTin,
    formatZraTin 
  } = useOnboardingHook();

  const [tinValidation, setTinValidation] = useState<{
    isValid: boolean;
    isAvailable: boolean;
    message: string;
  } | null>(null);
  const [tinError, setTinError] = useState<string>('');

  const { businessInfo } = data;

  // Validate ZRA TIN when it changes
  useEffect(() => {
    const validateTin = async () => {
      if (businessInfo.zraTin && businessInfo.zraTin.length >= 10) {
        try {
          const result = await validateZraTin(businessInfo.zraTin);
          setTinValidation(result);
          if (!result.isValid || !result.isAvailable) {
            setTinError(result.message);
          } else {
            setTinError('');
          }
        } catch (error) {
          setTinError('Failed to validate ZRA TIN');
        }
      } else {
        setTinValidation(null);
        setTinError('');
      }
    };

    const timeoutId = setTimeout(validateTin, 500); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [businessInfo.zraTin, validateZraTin]);

  const handleInputChange = (field: string, value: string) => {
    updateBusinessInfo({ [field]: value });
  };

  const handleTinChange = (value: string) => {
    // Remove any non-digit characters and limit to 10 digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 10);
    updateBusinessInfo({ zraTin: cleanValue });
  };

  return (
    <div className="space-y-6">
      {/* Business Name */}
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-neutral-700 mb-2">
          Business Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="businessName"
          data-testid="business-name"
          value={businessInfo.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter your business name"
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          required
        />
        <p className="mt-1 text-sm text-neutral-500">
          Enter the official name of your business as registered with PACRA
        </p>
      </div>

      {/* Business Type */}
      <div>
        <label htmlFor="businessType" className="block text-sm font-medium text-neutral-700 mb-2">
          Business Type <span className="text-red-500">*</span>
        </label>
        <select
          id="businessType"
          data-testid="business-type"
          value={businessInfo.businessType}
          onChange={(e) => handleInputChange('businessType', e.target.value)}
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          required
        >
          <option value="">Select business type</option>
          {businessTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-neutral-500">
          Choose the legal structure of your business
        </p>
      </div>

      {/* ZRA TIN */}
      <div>
        <label htmlFor="zraTin" className="block text-sm font-medium text-neutral-700 mb-2">
          ZRA Tax Identification Number (TIN) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            id="zraTin"
            data-testid="zra-tin"
            value={businessInfo.zraTin}
            onChange={(e) => handleTinChange(e.target.value)}
            placeholder="Enter 10-digit ZRA TIN"
            className={`
              w-full px-4 py-3 border rounded-lg transition-colors pr-10
              ${
                tinError
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : tinValidation?.isValid && tinValidation?.isAvailable
                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                  : 'border-neutral-300 focus:ring-blue-500 focus:border-blue-500'
              }
            `}
            maxLength={10}
            required
          />
          
          {/* Validation Icon */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isValidatingTin ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            ) : tinValidation?.isValid && tinValidation?.isAvailable ? (
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : tinError ? (
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : null}
          </div>
        </div>
        
        {/* TIN Validation Message */}
        {tinError && (
          <p className="mt-1 text-sm text-red-600">{tinError}</p>
        )}
        {tinValidation?.isValid && tinValidation?.isAvailable && (
          <p className="mt-1 text-sm text-green-600">{tinValidation.message}</p>
        )}
        
        <p className="mt-1 text-sm text-neutral-500">
          Your 10-digit Tax Identification Number from ZRA. Company TINs start with 4, 5, or 6.
          {businessInfo.zraTin && (
            <span className="block mt-1 font-mono text-blue-600">
              Formatted: {formatZraTin(businessInfo.zraTin)}
            </span>
          )}
        </p>
      </div>

      {/* Industry */}
      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-neutral-700 mb-2">
          Industry Sector
        </label>
        <select
          id="industry"
          data-testid="industry"
          value={businessInfo.industry || ''}
          onChange={(e) => handleInputChange('industry', e.target.value)}
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          <option value="">Select industry (optional)</option>
          {industryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-neutral-500">
          Choose the primary industry your business operates in
        </p>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-1">Need Help?</h4>
            <p className="text-sm text-blue-700">
              If you don't have a ZRA TIN yet, you can register for one at the{' '}
              <a
                href="https://www.zra.org.zm"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-800"
              >
                ZRA website
              </a>
              . For business registration, visit{' '}
              <a
                href="https://www.pacra.org.zm"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-800"
              >
                PACRA
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
