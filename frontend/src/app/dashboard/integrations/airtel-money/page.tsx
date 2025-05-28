'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Smartphone, Shield, Zap, BarChart3, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { AccountManagement } from '@/components/integrations/airtel-money/AccountManagement';

export default function AirtelMoneyIntegrationPage() {
  const searchParams = useSearchParams();
  const [hasProcessedCallback, setHasProcessedCallback] = useState(false);

  useEffect(() => {
    // Handle callback parameters from OAuth flow
    const success = searchParams?.get('success');
    const error = searchParams?.get('error');
    const accountId = searchParams?.get('accountId');

    if (!hasProcessedCallback && (success || error)) {
      setHasProcessedCallback(true);

      if (error) {
        toast.error(decodeURIComponent(error));
      } else if (success === 'true' && accountId) {
        toast.success('Account connected successfully!');
      }

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('error');
      url.searchParams.delete('accountId');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, hasProcessedCallback]);

  const features = [
    {
      icon: <Zap className="h-6 w-6 text-blue-600" />,
      title: 'Automatic Transaction Import',
      description: 'Seamlessly import all your Airtel Money transactions with real-time synchronization',
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-green-600" />,
      title: 'Balance Monitoring',
      description: 'Keep track of your account balance and get notified of important changes',
    },
    {
      icon: <Shield className="h-6 w-6 text-purple-600" />,
      title: 'Bank-Level Security',
      description: 'Your data is protected with enterprise-grade encryption and security measures',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Airtel Money Integration</h1>
            <p className="text-gray-600">
              Connect your Airtel Money account to streamline your financial management
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary">Mobile Money</Badge>
          <Badge variant="outline">Zambia</Badge>
          <Badge variant="outline">Real-time Sync</Badge>
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Important Information */}
      <Alert className="mb-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> To use this integration, you need an active Airtel Money account.
          IntelliFin will only access your transaction history and balance information - we cannot initiate
          payments or transfers from your account.
        </AlertDescription>
      </Alert>

      {/* Account Management */}
      <Card>
        <CardContent className="p-6">
          <AccountManagement />
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Common questions about Airtel Money integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">How secure is this integration?</h4>
            <p className="text-sm text-gray-600">
              We use OAuth 2.0 authentication and bank-level encryption to protect your data.
              IntelliFin can only read your transaction history and balance - we cannot access
              your PIN or initiate any transactions.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">How often are transactions synced?</h4>
            <p className="text-sm text-gray-600">
              Transactions are automatically synced every hour. You can also manually trigger
              a sync at any time from your account management page.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">What if I change my Airtel Money PIN?</h4>
            <p className="text-sm text-gray-600">
              Changing your PIN won't affect the integration. However, if you change your phone
              number, you'll need to reconnect your account.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Can I disconnect my account anytime?</h4>
            <p className="text-sm text-gray-600">
              Yes, you can disconnect your Airtel Money account at any time. This will stop
              automatic syncing, but your existing transaction data will remain in IntelliFin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
