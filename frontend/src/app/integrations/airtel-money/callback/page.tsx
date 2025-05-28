'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AirtelMoneyCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get parameters from URL
        const success = searchParams?.get('success');
        const error = searchParams?.get('error');
        const accountIdParam = searchParams?.get('accountId');

        if (error) {
          setStatus('error');
          setMessage(decodeURIComponent(error));
          toast.error(decodeURIComponent(error));
          return;
        }

        if (success === 'true' && accountIdParam) {
          setStatus('success');
          setAccountId(accountIdParam);
          setMessage('Your Airtel Money account has been successfully connected!');
          toast.success('Account connected successfully!');

          // Redirect to integrations page after a short delay
          setTimeout(() => {
            router.push('/dashboard/integrations/airtel-money');
          }, 3000);
          return;
        }

        // If we get here, something unexpected happened
        setStatus('error');
        setMessage('Invalid callback parameters received');
        toast.error('Invalid callback parameters');

      } catch (err) {
        setStatus('error');
        setMessage('An unexpected error occurred while processing the callback');
        toast.error('Callback processing failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  const handleReturnToDashboard = () => {
    router.push('/dashboard/integrations/airtel-money');
  };

  const handleTryAgain = () => {
    router.push('/dashboard/integrations/airtel-money');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            {status === 'loading' && (
              <div className="bg-blue-100 rounded-full p-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-100 rounded-full p-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>

          <CardTitle className="text-xl font-semibold">
            {status === 'loading' && 'Processing Connection...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>

          <CardDescription>
            {status === 'loading' && 'Please wait while we complete your Airtel Money account connection.'}
            {status === 'success' && 'Your account is now connected and ready to sync transactions.'}
            {status === 'error' && 'We encountered an issue connecting your account.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {message && (
            <Alert variant={status === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === 'success' && accountId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">What's Next?</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Your transactions will be automatically imported</li>
                <li>• Balance updates will sync regularly</li>
                <li>• You can categorize transactions in your dashboard</li>
                <li>• Set up automatic reconciliation rules</li>
              </ul>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Troubleshooting</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Ensure you have an active Airtel Money account</li>
                <li>• Check that you authorized the connection</li>
                <li>• Verify your internet connection is stable</li>
                <li>• Try connecting again in a few minutes</li>
              </ul>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            {status === 'loading' && (
              <div className="text-center text-sm text-gray-500">
                This may take a few moments...
              </div>
            )}

            {status === 'success' && (
              <>
                <Button onClick={handleReturnToDashboard} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
                <p className="text-center text-sm text-gray-500">
                  Redirecting automatically in a few seconds...
                </p>
              </>
            )}

            {status === 'error' && (
              <div className="space-y-2">
                <Button onClick={handleTryAgain} className="w-full">
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReturnToDashboard}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
