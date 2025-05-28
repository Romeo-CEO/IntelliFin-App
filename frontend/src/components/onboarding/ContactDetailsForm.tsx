'use client';

import React, { useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useOnboarding as useOnboardingHook } from '../../hooks/useOnboarding';

export function ContactDetailsForm() {
  const { data, updateContactDetails } = useOnboarding();
  const { 
    zambianCities, 
    validateEmail, 
    validateUrl, 
    validatePhoneNumber,
    formatPhoneNumber 
  } = useOnboardingHook();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { contactDetails } = data;

  const handleInputChange = (field: string, value: string) => {
    updateContactDetails({ [field]: value });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhoneChange = (value: string) => {
    // Allow only digits, spaces, hyphens, plus signs, and parentheses
    const cleanValue = value.replace(/[^\d\s\-\+\(\)]/g, '');
    updateContactDetails({ phone: cleanValue });
    
    // Validate phone number
    if (cleanValue && !validatePhoneNumber(cleanValue)) {
      setErrors(prev => ({ 
        ...prev, 
        phone: 'Please enter a valid Zambian phone number' 
      }));
    } else {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleEmailChange = (value: string) => {
    updateContactDetails({ email: value });
    
    // Validate email
    if (value && !validateEmail(value)) {
      setErrors(prev => ({ 
        ...prev, 
        email: 'Please enter a valid email address' 
      }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handleWebsiteChange = (value: string) => {
    updateContactDetails({ website: value });
    
    // Validate URL
    if (value && !validateUrl(value)) {
      setErrors(prev => ({ 
        ...prev, 
        website: 'Please enter a valid URL (e.g., https://example.com)' 
      }));
    } else {
      setErrors(prev => ({ ...prev, website: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Business Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-2">
          Business Address
        </label>
        <textarea
          id="address"
          data-testid="address"
          value={contactDetails.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Enter your business address"
          rows={3}
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
        />
        <p className="mt-1 text-sm text-neutral-500">
          Physical address where your business is located
        </p>
      </div>

      {/* City and Country */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* City */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-2">
            City
          </label>
          <div className="relative">
            <input
              type="text"
              id="city"
              data-testid="city"
              value={contactDetails.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="Select or enter city"
              list="zambian-cities"
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <datalist id="zambian-cities">
              {zambianCities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            City where your business is located
          </p>
        </div>

        {/* Country */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-neutral-700 mb-2">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            id="country"
            data-testid="country"
            value={contactDetails.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
          >
            <option value="Zambia">Zambia</option>
            <option value="Other">Other</option>
          </select>
          <p className="mt-1 text-sm text-neutral-500">
            Country where your business operates
          </p>
        </div>
      </div>

      {/* Phone and Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            data-testid="phone"
            value={contactDetails.phone || ''}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="+260 977 123 456"
            className={`
              w-full px-4 py-3 border rounded-lg transition-colors
              ${
                errors.phone
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-neutral-300 focus:ring-blue-500 focus:border-blue-500'
              }
            `}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
          {contactDetails.phone && !errors.phone && (
            <p className="mt-1 text-sm text-green-600 font-mono">
              Formatted: {formatPhoneNumber(contactDetails.phone)}
            </p>
          )}
          <p className="mt-1 text-sm text-neutral-500">
            Business phone number for customer contact
          </p>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            data-testid="email"
            value={contactDetails.email || ''}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="info@yourbusiness.co.zm"
            className={`
              w-full px-4 py-3 border rounded-lg transition-colors
              ${
                errors.email
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-neutral-300 focus:ring-blue-500 focus:border-blue-500'
              }
            `}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
          <p className="mt-1 text-sm text-neutral-500">
            Business email for customer communication and invoices
          </p>
        </div>
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className="block text-sm font-medium text-neutral-700 mb-2">
          Website
        </label>
        <input
          type="url"
          id="website"
          data-testid="website"
          value={contactDetails.website || ''}
          onChange={(e) => handleWebsiteChange(e.target.value)}
          placeholder="https://www.yourbusiness.co.zm"
          className={`
            w-full px-4 py-3 border rounded-lg transition-colors
            ${
              errors.website
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-neutral-300 focus:ring-blue-500 focus:border-blue-500'
            }
          `}
        />
        {errors.website && (
          <p className="mt-1 text-sm text-red-600">{errors.website}</p>
        )}
        <p className="mt-1 text-sm text-neutral-500">
          Your business website URL (optional)
        </p>
      </div>

      {/* Contact Information Preview */}
      {(contactDetails.address || contactDetails.city || contactDetails.phone || contactDetails.email) && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-neutral-800 mb-3">Contact Information Preview</h4>
          <div className="space-y-2 text-sm text-neutral-600">
            {contactDetails.address && (
              <div className="flex items-start">
                <svg className="w-4 h-4 text-neutral-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  {contactDetails.address}
                  {contactDetails.city && `, ${contactDetails.city}`}
                  {contactDetails.country && `, ${contactDetails.country}`}
                </span>
              </div>
            )}
            {contactDetails.phone && (
              <div className="flex items-center">
                <svg className="w-4 h-4 text-neutral-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span>{formatPhoneNumber(contactDetails.phone)}</span>
              </div>
            )}
            {contactDetails.email && (
              <div className="flex items-center">
                <svg className="w-4 h-4 text-neutral-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>{contactDetails.email}</span>
              </div>
            )}
            {contactDetails.website && (
              <div className="flex items-center">
                <svg className="w-4 h-4 text-neutral-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{contactDetails.website}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-green-800 mb-1">Contact Information</h4>
            <p className="text-sm text-green-700">
              This information will be used on your invoices and for customer communication. 
              You can update these details later in your account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
