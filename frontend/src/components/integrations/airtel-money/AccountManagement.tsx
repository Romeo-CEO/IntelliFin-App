'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Smartphone, 
  RefreshCw, 
  Unlink, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Loader2,
  Plus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { AccountLinking } from './AccountLinking';

interface MobileMoneyAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  isLinked: boolean;
  lastSyncAt: string | null;
  currentBalance: number | null;
}

interface ConnectionStatus {
  hasLinkedAccounts: boolean;
  accountCount: number;
  accounts: MobileMoneyAccount[];
}

export function AccountManagement() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [showLinking, setShowLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/integrations/airtel-money/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch connection status');
      }

      const data: ConnectionStatus = await response.json();
      setConnectionStatus(data);
      
      // Show linking component if no accounts are connected
      if (!data.hasLinkedAccounts && data.accountCount === 0) {
        setShowLinking(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load accounts';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async (accountId: string) => {
    try {
      setIsRefreshing(accountId);

      const response = await fetch(`/api/integrations/airtel-money/refresh/${accountId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Token refreshed successfully');
        await fetchConnectionStatus();
      } else {
        toast.error(result.message || 'Failed to refresh token');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh token';
      toast.error(errorMessage);
    } finally {
      setIsRefreshing(null);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      setIsDisconnecting(accountId);

      const response = await fetch(`/api/integrations/airtel-money/disconnect/${accountId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect account');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Account disconnected successfully');
        await fetchConnectionStatus();
      } else {
        toast.error(result.message || 'Failed to disconnect account');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect account';
      toast.error(errorMessage);
    } finally {
      setIsDisconnecting(null);
    }
  };

  const handleLinkingSuccess = async (accountId: string) => {
    toast.success('Account linked successfully!');
    setShowLinking(false);
    await fetchConnectionStatus();
  };

  const handleLinkingError = (error: string) => {
    toast.error(error);
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
    }).format(amount);
  };

  const formatLastSync = (lastSyncAt: string | null): string => {
    if (!lastSyncAt) return 'Never';
    
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Recently';
    }
  };

  const getStatusBadge = (account: MobileMoneyAccount) => {
    if (!account.isLinked) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
    }
    
    if (!account.lastSyncAt) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending Sync</Badge>;
    }
    
    const lastSync = new Date(account.lastSyncAt);
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync > 24) {
      return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Sync Needed</Badge>;
    }
    
    return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading accounts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchConnectionStatus}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (showLinking || !connectionStatus?.hasLinkedAccounts) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Connect Your Airtel Money Account</h2>
          <p className="text-gray-600 mb-6">
            Link your Airtel Money account to automatically import transactions and track your business finances
          </p>
        </div>
        
        <AccountLinking 
          onSuccess={handleLinkingSuccess}
          onError={handleLinkingError}
        />
        
        {connectionStatus?.accountCount > 0 && (
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setShowLinking(false)}
            >
              View Existing Accounts
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Airtel Money Accounts</h2>
          <p className="text-gray-600">
            Manage your connected Airtel Money accounts
          </p>
        </div>
        
        <Button onClick={() => setShowLinking(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      <div className="grid gap-4">
        {connectionStatus?.accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{account.accountName || 'Airtel Money Account'}</CardTitle>
                    <CardDescription>{account.accountNumber}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(account)}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p className="text-lg font-semibold">{formatCurrency(account.currentBalance)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Sync</p>
                  <p className="text-lg font-semibold">{formatLastSync(account.lastSyncAt)}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshToken(account.id)}
                  disabled={isRefreshing === account.id || !account.isLinked}
                >
                  {isRefreshing === account.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDisconnecting === account.id}
                    >
                      {isDisconnecting === account.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4 mr-2" />
                      )}
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to disconnect this Airtel Money account? 
                        This will stop automatic transaction syncing and you'll need to reconnect to resume the service.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDisconnectAccount(account.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AccountManagement;
