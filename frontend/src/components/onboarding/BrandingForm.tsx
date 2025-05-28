'use client';

import React, { useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

// Predefined color schemes inspired by IntelliFin design
const COLOR_SCHEMES = [
  {
    name: 'IntelliFin Blue',
    primary: '#005FAD',
    secondary: '#00A99D',
    description: 'Professional and trustworthy',
  },
  {
    name: 'Forest Green',
    primary: '#2E8B57',
    secondary: '#87CEEB',
    description: 'Growth and prosperity',
  },
  {
    name: 'Sunset Orange',
    primary: '#FF6B35',
    secondary: '#FFB81C',
    description: 'Energetic and optimistic',
  },
  {
    name: 'Royal Purple',
    primary: '#6B46C1',
    secondary: '#A78BFA',
    description: 'Premium and sophisticated',
  },
  {
    name: 'Crimson Red',
    primary: '#DC143C',
    secondary: '#FFA500',
    description: 'Bold and confident',
  },
  {
    name: 'Teal',
    primary: '#008080',
    secondary: '#20B2AA',
    description: 'Modern and fresh',
  },
];

export function BrandingForm() {
  const { data, updateBrandingInfo } = useOnboarding();
  const { brandingInfo } = data;
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);

  const handleColorSchemeSelect = (scheme: typeof COLOR_SCHEMES[0]) => {
    updateBrandingInfo({
      primaryColor: scheme.primary,
      secondaryColor: scheme.secondary,
    });
    setSelectedScheme(scheme.name);
  };

  const handleCustomColorChange = (field: 'primaryColor' | 'secondaryColor', value: string) => {
    updateBrandingInfo({ [field]: value });
    setSelectedScheme(null); // Clear selected scheme when custom colors are used
  };

  const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  };

  return (
    <div className="space-y-6">
      {/* Optional Notice */}
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
            <h4 className="text-sm font-medium text-blue-800 mb-1">Customize Your Brand</h4>
            <p className="text-sm text-blue-700">
              Choose colors that represent your business. These will be used in your invoices, 
              reports, and throughout the IntelliFin interface. You can change these anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Predefined Color Schemes */}
      <div>
        <h3 className="text-lg font-medium text-neutral-900 mb-4">Choose a Color Scheme</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {COLOR_SCHEMES.map((scheme) => {
            const isSelected = selectedScheme === scheme.name || 
              (brandingInfo.primaryColor === scheme.primary && brandingInfo.secondaryColor === scheme.secondary);
            
            return (
              <button
                key={scheme.name}
                type="button"
                onClick={() => handleColorSchemeSelect(scheme)}
                className={`
                  p-4 border-2 rounded-lg text-left transition-all duration-200 hover:shadow-md
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }
                `}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: scheme.primary }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: scheme.secondary }}
                  />
                </div>
                <h4 className="font-medium text-neutral-900">{scheme.name}</h4>
                <p className="text-sm text-neutral-600">{scheme.description}</p>
                {isSelected && (
                  <div className="mt-2 flex items-center text-blue-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium">Selected</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Colors */}
      <div>
        <h3 className="text-lg font-medium text-neutral-900 mb-4">Or Choose Custom Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Color */}
          <div>
            <label htmlFor="primaryColor" className="block text-sm font-medium text-neutral-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                id="primaryColor"
                data-testid="primary-color"
                value={brandingInfo.primaryColor || '#005FAD'}
                onChange={(e) => handleCustomColorChange('primaryColor', e.target.value)}
                className="w-12 h-12 border border-neutral-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={brandingInfo.primaryColor || '#005FAD'}
                onChange={(e) => handleCustomColorChange('primaryColor', e.target.value)}
                placeholder="#005FAD"
                className={`
                  flex-1 px-4 py-3 border rounded-lg transition-colors font-mono text-sm
                  ${
                    isValidHexColor(brandingInfo.primaryColor || '#005FAD')
                      ? 'border-neutral-300 focus:ring-blue-500 focus:border-blue-500'
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  }
                `}
              />
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Used for buttons, headers, and primary elements
            </p>
          </div>

          {/* Secondary Color */}
          <div>
            <label htmlFor="secondaryColor" className="block text-sm font-medium text-neutral-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                id="secondaryColor"
                data-testid="secondary-color"
                value={brandingInfo.secondaryColor || '#00A99D'}
                onChange={(e) => handleCustomColorChange('secondaryColor', e.target.value)}
                className="w-12 h-12 border border-neutral-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={brandingInfo.secondaryColor || '#00A99D'}
                onChange={(e) => handleCustomColorChange('secondaryColor', e.target.value)}
                placeholder="#00A99D"
                className={`
                  flex-1 px-4 py-3 border rounded-lg transition-colors font-mono text-sm
                  ${
                    isValidHexColor(brandingInfo.secondaryColor || '#00A99D')
                      ? 'border-neutral-300 focus:ring-blue-500 focus:border-blue-500'
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  }
                `}
              />
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Used for accents, highlights, and secondary elements
            </p>
          </div>
        </div>
      </div>

      {/* Color Preview */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-neutral-800 mb-4">Preview</h4>
        
        {/* Sample Invoice Header */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <div
            className="px-6 py-4 text-white"
            style={{ backgroundColor: brandingInfo.primaryColor || '#005FAD' }}
          >
            <h3 className="text-lg font-semibold">{data.businessInfo.name || 'Your Business Name'}</h3>
            <p className="text-sm opacity-90">Invoice #INV-001</p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-neutral-600">Total Amount:</span>
              <span className="text-2xl font-bold text-neutral-900">ZMW 1,500.00</span>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: brandingInfo.secondaryColor || '#00A99D' }}
            >
              Pay Now
            </button>
          </div>
        </div>

        {/* Sample Dashboard Widget */}
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-neutral-900">Monthly Revenue</h4>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: brandingInfo.primaryColor || '#005FAD' }}
            />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">ZMW 45,230</div>
          <div className="flex items-center text-sm">
            <span
              className="text-sm font-medium"
              style={{ color: brandingInfo.secondaryColor || '#00A99D' }}
            >
              +12.5%
            </span>
            <span className="text-neutral-500 ml-1">from last month</span>
          </div>
        </div>
      </div>

      {/* Color Guidelines */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-yellow-800 mb-1">Color Guidelines</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Choose colors that reflect your brand and industry</li>
              <li>• Ensure good contrast for readability</li>
              <li>• Consider how colors will look in print (invoices, reports)</li>
              <li>• Test colors with your target audience if possible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
