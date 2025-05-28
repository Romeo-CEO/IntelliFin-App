'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

export default function VerifyEmailPage() {
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const { verifyEmail, resendVerification, isLoading, user } = useAuth();

  useEffect(() => {
    if (token) {
      // Verify email with token
      verifyEmail(token)
        .then(() => {
          setVerificationStatus('success');
          setMessage('Your email has been verified successfully!');
        })
        .catch((error) => {
          setVerificationStatus('error');
          setMessage(error.message || 'Email verification failed');
        });
    } else if (user && !user.emailVerified) {
      // Show resend verification form
      setVerificationStatus('pending');
      setMessage('Please verify your email address to continue');
      setEmail(user.email);
    }
  }, [token, user, verifyEmail]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      await resendVerification(email);
    }
  };

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Email Verified!
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <Link
                href="/auth/login"
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continue to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Verification Failed
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/auth/login"
                  className="block w-full text-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Login
                </Link>
                <Link
                  href="/auth/register"
                  className="block w-full text-center py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Register Again
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending verification or resend form
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">IntelliFin</h1>
          <p className="mt-2 text-sm text-gray-600">
            Financial Management for Zambian SMEs
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Verify Your Email
            </h1>
            <p className="text-gray-600" data-testid="verification-message">
              {message || 'Please check your email and click the verification link.'}
            </p>
          </div>

          <form onSubmit={handleResendVerification} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              data-testid="resend-button"
              className={`
                w-full flex justify-center py-2 px-4 border border-transparent rounded-lg
                text-sm font-medium text-white
                ${isLoading || !email
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }
                transition-colors duration-200
              `}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : (
                'Resend Verification Email'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="text-sm text-blue-600 hover:text-blue-500"
              data-testid="back-to-login"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
