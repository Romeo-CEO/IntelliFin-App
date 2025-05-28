'use client';

import React from 'react';
import { OnboardingProvider } from '../../../contexts/OnboardingContext';
import { OnboardingWizard } from '../../../components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-neutral-100 py-8 px-4">
        <OnboardingWizard />
      </div>
    </OnboardingProvider>
  );
}
