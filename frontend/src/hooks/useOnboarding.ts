'use client';

import { useState, useCallback } from 'react';

// Business type options for Zambian businesses
export const BUSINESS_TYPE_OPTIONS = [
  { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'LIMITED_LIABILITY_COMPANY', label: 'Limited Liability Company' },
  { value: 'PUBLIC_LIMITED_COMPANY', label: 'Public Limited Company' },
  { value: 'COOPERATIVE', label: 'Cooperative' },
  { value: 'NGO', label: 'Non-Governmental Organization' },
  { value: 'TRUST', label: 'Trust' },
  { value: 'BRANCH_OFFICE', label: 'Branch Office' },
  { value: 'REPRESENTATIVE_OFFICE', label: 'Representative Office' },
];

// Industry options for Zambian businesses
export const INDUSTRY_OPTIONS = [
  { value: 'AGRICULTURE', label: 'Agriculture, Forestry and Fishing' },
  { value: 'MINING', label: 'Mining and Quarrying' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'WHOLESALE_RETAIL', label: 'Wholesale and Retail Trade' },
  { value: 'TRANSPORT_LOGISTICS', label: 'Transportation and Storage' },
  { value: 'ACCOMMODATION_FOOD', label: 'Accommodation and Food Service' },
  { value: 'INFORMATION_COMMUNICATION', label: 'Information and Communication' },
  { value: 'FINANCIAL_INSURANCE', label: 'Financial and Insurance Activities' },
  { value: 'REAL_ESTATE', label: 'Real Estate Activities' },
  { value: 'PROFESSIONAL_SERVICES', label: 'Professional, Scientific and Technical Activities' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'HEALTH_SOCIAL', label: 'Human Health and Social Work' },
  { value: 'ARTS_ENTERTAINMENT', label: 'Arts, Entertainment and Recreation' },
  { value: 'OTHER_SERVICES', label: 'Other Service Activities' },
];

// Zambian cities
export const ZAMBIAN_CITIES = [
  'Lusaka',
  'Kitwe',
  'Ndola',
  'Kabwe',
  'Chingola',
  'Mufulira',
  'Luanshya',
  'Livingstone',
  'Kasama',
  'Chipata',
  'Solwezi',
  'Mansa',
  'Mongu',
  'Choma',
  'Mazabuka',
  'Kafue',
  'Chililabombwe',
  'Kalulushi',
  'Kapiri Mposhi',
  'Mpika',
];

interface ZraTinValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  message: string;
}

interface UseOnboardingHookReturn {
  // Options
  businessTypeOptions: typeof BUSINESS_TYPE_OPTIONS;
  industryOptions: typeof INDUSTRY_OPTIONS;
  zambianCities: typeof ZAMBIAN_CITIES;

  // ZRA TIN validation
  validateZraTin: (tin: string) => Promise<ZraTinValidationResult>;
  isValidatingTin: boolean;

  // Formatting utilities
  formatZraTin: (tin: string) => string;
  formatPhoneNumber: (phone: string) => string;

  // Validation utilities
  validateEmail: (email: string) => boolean;
  validateUrl: (url: string) => boolean;
  validatePhoneNumber: (phone: string) => boolean;
}

export function useOnboarding(): UseOnboardingHookReturn {
  const [isValidatingTin, setIsValidatingTin] = useState(false);

  // ZRA TIN validation
  const validateZraTin = useCallback(async (tin: string): Promise<ZraTinValidationResult> => {
    if (!tin) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'ZRA TIN is required',
      };
    }

    const cleanTin = tin.replace(/[\s-]/g, '');

    // Basic format validation
    if (!/^\d{10}$/.test(cleanTin)) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'ZRA TIN must be exactly 10 digits',
      };
    }

    // Check if it's a company TIN (starts with 4-6)
    const firstDigit = parseInt(cleanTin.charAt(0));
    if (firstDigit < 4 || firstDigit > 6) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'ZRA TIN must be a valid company Tax Identification Number (starts with 4-6)',
      };
    }

    setIsValidatingTin(true);

    try {
      // Import service dynamically to avoid SSR issues
      const { OnboardingService } = await import('../services/onboarding.service');
      const result = await OnboardingService.validateZraTin(cleanTin);
      return result;
    } catch (error) {
      console.error('ZRA TIN validation error:', error);
      return {
        isValid: true, // Assume valid if we can't check
        isAvailable: true,
        message: 'Unable to verify availability, but format is valid',
      };
    } finally {
      setIsValidatingTin(false);
    }
  }, []);

  // Formatting utilities
  const formatZraTin = useCallback((tin: string): string => {
    if (!tin) return '';
    const cleanTin = tin.replace(/[\s-]/g, '');
    if (cleanTin.length === 10) {
      return `${cleanTin.substring(0, 3)}-${cleanTin.substring(3, 6)}-${cleanTin.substring(6)}`;
    }
    return tin;
  }, []);

  const formatPhoneNumber = useCallback((phone: string): string => {
    if (!phone) return '';

    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Handle Zambian phone numbers
    if (digits.startsWith('260')) {
      // International format
      return `+${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
    } else if (digits.startsWith('0')) {
      // Local format
      return `${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`;
    } else if (digits.length === 9) {
      // Mobile without leading 0
      return `0${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
    }

    return phone;
  }, []);

  // Validation utilities
  const validateEmail = useCallback((email: string): boolean => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validateUrl = useCallback((url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  const validatePhoneNumber = useCallback((phone: string): boolean => {
    if (!phone) return true; // Optional field

    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Zambian phone number patterns
    // Mobile: 09X XXX XXXX (10 digits starting with 09)
    // Landline: 021X XXX XXX (9-10 digits)
    // International: +260 9X XXX XXXX

    if (digits.startsWith('260')) {
      // International format: +260 9X XXX XXXX
      return digits.length === 12 && digits.charAt(3) === '9';
    } else if (digits.startsWith('09')) {
      // Local mobile: 09X XXX XXXX
      return digits.length === 10;
    } else if (digits.startsWith('021')) {
      // Landline: 021X XXX XXX
      return digits.length >= 9 && digits.length <= 10;
    } else if (digits.length === 9 && digits.charAt(0) === '9') {
      // Mobile without leading 0: 9X XXX XXXX
      return true;
    }

    return false;
  }, []);

  return {
    businessTypeOptions: BUSINESS_TYPE_OPTIONS,
    industryOptions: INDUSTRY_OPTIONS,
    zambianCities: ZAMBIAN_CITIES,
    validateZraTin,
    isValidatingTin,
    formatZraTin,
    formatPhoneNumber,
    validateEmail,
    validateUrl,
    validatePhoneNumber,
  };
}
