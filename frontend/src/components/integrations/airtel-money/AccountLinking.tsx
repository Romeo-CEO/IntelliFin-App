'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Smartphone, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConnectAccountResponse {
  authUrl: string;
  state: string;
}

interface AccountLinkingProps {
  onSuccess?: (accountId: string) => void;
  onError?: (error: string) => void;
}

export function AccountLinking({ onSuccess, onError }: AccountLinkingProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const validatePhoneNumber = (phone: string): boolean => {
    // Zambian phone number validation
    const phoneRegex = /^(\+260|0)?[97][0-9]{8}$/;
    const cleanPhone = phone.replace(/\s+/g, '');
    return phoneRegex.test(cleanPhone);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.startsWith('260')) {
      return `+${digits}`;
    } else if (digits.startsWith('0')) {
      return `+260${digits.substring(1)}`;
    } else if (digits.length === 9) {
      return `+260${digits}`;
    }
    
    return `+${digits}`;
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleConnect = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your Airtel Money phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid Zambian phone number (e.g., +260971234567 or 0971234567)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const response = await fetch('/api/integrations/airtel-money/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initiate connection');
      }

      const data: ConnectAccountResponse = await response.json();
      
      // Store state for callback validation
      sessionStorage.setItem('airtel_oauth_state', data.state);
      
      // Redirect to Airtel OAuth
      window.location.href = data.authUrl;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect account';
      setError(errorMessage);
      onError?.(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConnect();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <Smartphone className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl font-semibold">
          Connect Airtel Money
        </CardTitle>
        <CardDescription>
          Link your Airtel Money account to automatically import transactions and monitor your balance
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">
            Airtel Money Phone Number
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="+260971234567 or 0971234567"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="text-base"
            data-testid="phone-number-input"
          />
          <p className="text-sm text-gray-500">
            Enter the phone number associated with your Airtel Money account
          </p>
        </div>

        <Button
          onClick={handleConnect}
          disabled={isLoading || !phoneNumber.trim()}
          className="w-full"
          data-testid="connect-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect to Airtel Money
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            You'll be redirected to Airtel Money to authorize the connection
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Notice:</strong> IntelliFin uses bank-level security to protect your data. 
            We only access transaction history and balance information - we cannot initiate payments or transfers.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default AccountLinking;
