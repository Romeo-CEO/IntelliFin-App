'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types for onboarding data
export interface BusinessInfo {
  name: string;
  businessType: string;
  zraTin: string;
  industry?: string;
}

export interface ContactDetails {
  address?: string;
  city?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface BankingInfo {
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
}

export interface BrandingInfo {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
}

export interface OnboardingData {
  businessInfo: BusinessInfo;
  contactDetails: ContactDetails;
  bankingInfo: BankingInfo;
  brandingInfo: BrandingInfo;
}

export interface OnboardingContextType {
  // Data
  data: OnboardingData;

  // Current step
  currentStep: number;
  totalSteps: number;

  // Step management
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;

  // Data management
  updateBusinessInfo: (info: Partial<BusinessInfo>) => void;
  updateContactDetails: (details: Partial<ContactDetails>) => void;
  updateBankingInfo: (info: Partial<BankingInfo>) => void;
  updateBrandingInfo: (info: Partial<BrandingInfo>) => void;

  // Validation
  isStepValid: (step: number) => boolean;
  getStepErrors: (step: number) => string[];

  // Completion
  isComplete: boolean;
  submitOnboarding: () => Promise<void>;

  // State
  isSubmitting: boolean;
  error: string | null;

  // Reset
  reset: () => void;
}

const initialData: OnboardingData = {
  businessInfo: {
    name: '',
    businessType: '',
    zraTin: '',
    industry: '',
  },
  contactDetails: {
    address: '',
    city: '',
    country: 'Zambia',
    phone: '',
    email: '',
    website: '',
  },
  bankingInfo: {
    bankName: '',
    bankAccountNumber: '',
    bankBranch: '',
  },
  brandingInfo: {
    primaryColor: '#005FAD',
    secondaryColor: '#00A99D',
    logo: '',
  },
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 4; // Business Info, Contact Details, Banking Info, Branding

  // Step management
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  // Data management
  const updateBusinessInfo = useCallback((info: Partial<BusinessInfo>) => {
    setData(prev => ({
      ...prev,
      businessInfo: { ...prev.businessInfo, ...info },
    }));
    setError(null);
  }, []);

  const updateContactDetails = useCallback((details: Partial<ContactDetails>) => {
    setData(prev => ({
      ...prev,
      contactDetails: { ...prev.contactDetails, ...details },
    }));
    setError(null);
  }, []);

  const updateBankingInfo = useCallback((info: Partial<BankingInfo>) => {
    setData(prev => ({
      ...prev,
      bankingInfo: { ...prev.bankingInfo, ...info },
    }));
    setError(null);
  }, []);

  const updateBrandingInfo = useCallback((info: Partial<BrandingInfo>) => {
    setData(prev => ({
      ...prev,
      brandingInfo: { ...prev.brandingInfo, ...info },
    }));
    setError(null);
  }, []);

  // Validation
  const isStepValid = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // Business Info
        return !!(
          data.businessInfo.name.trim() &&
          data.businessInfo.businessType &&
          data.businessInfo.zraTin.trim()
        );
      case 2: // Contact Details
        return !!(data.contactDetails.country);
      case 3: // Banking Info (optional)
        return true;
      case 4: // Branding (optional)
        return true;
      default:
        return false;
    }
  }, [data]);

  const getStepErrors = useCallback((step: number): string[] => {
    const errors: string[] = [];

    switch (step) {
      case 1: // Business Info
        if (!data.businessInfo.name.trim()) {
          errors.push('Business name is required');
        }
        if (!data.businessInfo.businessType) {
          errors.push('Business type is required');
        }
        if (!data.businessInfo.zraTin.trim()) {
          errors.push('ZRA TIN is required');
        } else if (!/^\d{10}$/.test(data.businessInfo.zraTin.replace(/[\s-]/g, ''))) {
          errors.push('ZRA TIN must be 10 digits');
        }
        break;
      case 2: // Contact Details
        if (!data.contactDetails.country) {
          errors.push('Country is required');
        }
        if (data.contactDetails.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactDetails.email)) {
          errors.push('Invalid email format');
        }
        if (data.contactDetails.website && !/^https?:\/\/.+/.test(data.contactDetails.website)) {
          errors.push('Website must be a valid URL');
        }
        break;
    }

    return errors;
  }, [data]);

  // Completion check
  const isComplete = isStepValid(1) && isStepValid(2);

  // Submit onboarding
  const submitOnboarding = useCallback(async () => {
    if (!isComplete) {
      setError('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Import the service dynamically to avoid SSR issues
      const { OnboardingService } = await import('../services/onboarding.service');

      // Prepare data for API
      const organizationData = {
        name: data.businessInfo.name,
        businessType: data.businessInfo.businessType,
        zraTin: data.businessInfo.zraTin.replace(/[\s-]/g, ''),
        industry: data.businessInfo.industry,
        address: data.contactDetails.address,
        city: data.contactDetails.city,
        country: data.contactDetails.country,
        phone: data.contactDetails.phone,
        email: data.contactDetails.email,
        website: data.contactDetails.website,
        bankName: data.bankingInfo.bankName,
        bankAccountNumber: data.bankingInfo.bankAccountNumber,
        bankBranch: data.bankingInfo.bankBranch,
        primaryColor: data.brandingInfo.primaryColor,
        secondaryColor: data.brandingInfo.secondaryColor,
      };

      // Complete onboarding through service
      const result = await OnboardingService.completeOnboarding(organizationData);

      // Redirect to dashboard
      window.location.href = result.redirectUrl;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isComplete]);

  // Reset
  const reset = useCallback(() => {
    setData(initialData);
    setCurrentStep(1);
    setIsSubmitting(false);
    setError(null);
  }, []);

  const value: OnboardingContextType = {
    data,
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    goToStep,
    updateBusinessInfo,
    updateContactDetails,
    updateBankingInfo,
    updateBrandingInfo,
    isStepValid,
    getStepErrors,
    isComplete,
    submitOnboarding,
    isSubmitting,
    error,
    reset,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
