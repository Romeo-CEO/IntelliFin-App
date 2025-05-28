'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface InvitationDetails {
  email: string;
  role: string;
  organizationName: string;
  inviterName: string;
  expiresAt: string;
  isValid: boolean;
}

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');

  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  // Load invitation details
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setIsLoading(false);
      return;
    }

    const loadInvitationDetails = async () => {
      try {
        const response = await fetch(`/api/invitations/token/${token}`);
        if (!response.ok) {
          throw new Error('Invalid or expired invitation');
        }
        const data = await response.json();
        setInvitationDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitation');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitationDetails();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          phone: formData.phone || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }

      await response.json();

      // Store user data and redirect to login
      localStorage.setItem('invitationAccepted', 'true');
      router.push('/login?message=invitation-accepted');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitationDetails) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Invalid Invitation</h2>
          <p className="text-neutral-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!invitationDetails?.isValid) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Invitation Expired</h2>
          <p className="text-neutral-600 mb-6">
            This invitation has expired or has already been used. Please contact your administrator for a new invitation.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.94 6.412A2 2 0 002 8.108V16a2 2 0 002 2h12a2 2 0 002-2V8.108a2 2 0 00-.94-1.696l-6-3.75a2 2 0 00-2.12 0l-6 3.75zm2.615 2.423a1 1 0 10-1.11 1.664l5 3.333a1 1 0 001.11 0l5-3.333a1 1 0 00-1.11-1.664L10 12.027 5.555 8.835z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Join {invitationDetails.organizationName}
          </h1>
          <p className="text-neutral-600">
            {invitationDetails.inviterName} has invited you to join as a {invitationDetails.role}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
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

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={invitationDetails.email}
              disabled
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500"
            />
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+260 977 123 456"
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Password Fields */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={8}
            />
            <p className="mt-1 text-sm text-neutral-500">
              Must be at least 8 characters long
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Account...
              </div>
            ) : (
              'Accept Invitation & Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-500">
            By accepting this invitation, you agree to join {invitationDetails.organizationName} on IntelliFin.
          </p>
        </div>
      </div>
    </div>
  );
}
