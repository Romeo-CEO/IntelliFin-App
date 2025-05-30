'use client';

import React from 'react';

import { useOnboarding } from '../../contexts/OnboardingContext';

// Zambian banks
const ZAMBIAN_BANKS = [
  'Zanaco Bank',
  'Standard Chartered Bank Zambia',
  'Stanbic Bank Zambia',
  'First National Bank Zambia',
  'Barclays Bank Zambia',
  'Indo Zambia Bank',
  'Atlas Mara Bank Zambia',
  'Access Bank Zambia',
  'Citibank Zambia',
  'Bank of China Zambia',
  'United Bank for Africa Zambia',
  'Ecobank Zambia',
  'AB Bank Zambia',
  'Other',
];

export function BankingInfoForm() {
  const { data, updateBankingInfo } = useOnboarding();
  const { bankingInfo } = data;

  const handleInputChange = (field: string, value: string) => {
    updateBankingInfo({ [field]: value });
  };

  const handleAccountNumberChange = (value: string) => {
    // Allow only alphanumeric characters, hyphens, and spaces
    const cleanValue = value.replace(/[^a-zA-Z0-9\-\s]/g, '');
    updateBankingInfo({ bankAccountNumber: cleanValue });
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
            <h4 className="text-sm font-medium text-blue-800 mb-1">Optional Information</h4>
            <p className="text-sm text-blue-700">
              Banking information is optional but recommended for payment processing and financial reconciliation. 
              You can add or update this information later.
            </p>
          </div>
        </div>
      </div>

      {/* Bank Name */}
      <div>
        <label htmlFor="bankName" className="block text-sm font-medium text-neutral-700 mb-2">
          Bank Name
        </label>
        <div className="relative">
          <input
            type="text"
            id="bankName"
            data-testid="bank-name"
            value={bankingInfo.bankName || ''}
            onChange={(e) => handleInputChange('bankName', e.target.value)}
            placeholder="Select or enter bank name"
            list="zambian-banks"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <datalist id="zambian-banks">
            {ZAMBIAN_BANKS.map((bank) => (
              <option key={bank} value={bank} />
            ))}
          </datalist>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Name of your primary business bank
        </p>
      </div>

      {/* Bank Account Number */}
      <div>
        <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-neutral-700 mb-2">
          Bank Account Number
        </label>
        <input
          type="text"
          id="bankAccountNumber"
          data-testid="bank-account-number"
          value={bankingInfo.bankAccountNumber || ''}
          onChange={(e) => handleAccountNumberChange(e.target.value)}
          placeholder="Enter your bank account number"
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <p className="mt-1 text-sm text-neutral-500">
          Your business bank account number
        </p>
      </div>

      {/* Bank Branch */}
      <div>
        <label htmlFor="bankBranch" className="block text-sm font-medium text-neutral-700 mb-2">
          Bank Branch
        </label>
        <input
          type="text"
          id="bankBranch"
          data-testid="bank-branch"
          value={bankingInfo.bankBranch || ''}
          onChange={(e) => handleInputChange('bankBranch', e.target.value)}
          placeholder="Enter bank branch name or location"
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <p className="mt-1 text-sm text-neutral-500">
          Branch name or location where your account is held
        </p>
      </div>

      {/* Banking Information Preview */}
      {(bankingInfo.bankName || bankingInfo.bankAccountNumber || bankingInfo.bankBranch) && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-neutral-800 mb-3">Banking Information Preview</h4>
          <div className="space-y-2 text-sm text-neutral-600">
            {bankingInfo.bankName && (
              <div className="flex items-center">
                <svg className="w-4 h-4 text-neutral-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path
                    fillRule="evenodd"
                    d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span><strong>Bank:</strong> {bankingInfo.bankName}</span>
              </div>
            )}
            {bankingInfo.bankAccountNumber && (
              <div className="flex items-center">
                <svg className="w-4 h-4 text-neutral-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                  <path d="M6 6a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V6z" />
                </svg>
                <span><strong>Account:</strong> {bankingInfo.bankAccountNumber}</span>
              </div>
            )}
            {bankingInfo.bankBranch && (
              <div className="flex items-center">
                <svg className="w-4 h-4 text-neutral-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span><strong>Branch:</strong> {bankingInfo.bankBranch}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Notice */}
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
            <h4 className="text-sm font-medium text-yellow-800 mb-1">Security & Privacy</h4>
            <p className="text-sm text-yellow-700">
              Your banking information is encrypted and stored securely. We never store sensitive information 
              like PINs or passwords. This information is only used for payment reconciliation and reporting.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits of Adding Banking Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-green-800 mb-1">Benefits of Adding Banking Information</h4>
            <ul className="text-sm text-green-700 space-y-1 mt-2">
              <li>• Automatic reconciliation of bank transactions</li>
              <li>• Better cash flow tracking and reporting</li>
              <li>• Streamlined payment processing</li>
              <li>• Enhanced financial insights and analytics</li>
              <li>• Simplified tax reporting and compliance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Skip Option */}
      <div className="text-center">
        <p className="text-sm text-neutral-500">
          You can skip this step and add banking information later in your account settings.
        </p>
      </div>
    </div>
  );
}
