'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  RefreshCw, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Loader2,
  Activity,
  TrendingUp,
  Database
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

interface SyncAccount {
  accountId: string;
  accountName: string;
  isLinked: boolean;
  lastSyncAt: string | null;
  currentBalance: number | null;
  syncStatus: 'idle' | 'syncing' | 'failed' | 'completed';
  lastSyncResult?: {
    success: boolean;
    newTransactions: number;
    totalProcessed: number;
    syncDuration: number;
    errors: string[];
  };
  activeJobs: number;
}

interface SyncSummary {
  totalAccounts: number;
  linkedAccounts: number;
  activeSyncs: number;
  lastGlobalSync: string | null;
}

interface SyncStatusData {
  accounts: SyncAccount[];
  summary: SyncSummary;
}

export function SyncStatusDashboard() {
  const [syncData, setSyncData] = useState<SyncStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSyncStatus();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchSyncStatus, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/transactions/sync/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }

      const data: SyncStatusData = await response.json();
      setSyncData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sync status';
      setError(errorMessage);
      if (!syncData) { // Only show toast if we don't have existing data
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualSync = async (accountIds?: string[]) => {
    try {
      setIsSyncing(true);

      const response = await fetch('/api/transactions/sync/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          accountIds,
          forceFullSync: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Sync scheduled for ${result.accountsScheduled} account(s)`);
        // Refresh status after a short delay
        setTimeout(fetchSyncStatus, 2000);
      } else {
        toast.error(result.message || 'Failed to schedule sync');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger sync';
      toast.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancelSync = async (accountId: string) => {
    try {
      const response = await fetch(`/api/transactions/sync/cancel/${accountId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel sync');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Sync cancelled successfully');
        fetchSyncStatus();
      } else {
        toast.error(result.message || 'Failed to cancel sync');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel sync';
      toast.error(errorMessage);
    }
  };

  const formatLastSync = (lastSyncAt: string | null): string => {
    if (!lastSyncAt) return 'Never';
    
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
    }).format(amount);
  };

  const getStatusBadge = (account: SyncAccount) => {
    switch (account.syncStatus) {
      case 'syncing':
        return <Badge variant="default"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Syncing</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Idle</Badge>;
    }
  };

  const getSyncProgress = (): number => {
    if (!syncData) return 0;
    const { activeSyncs, linkedAccounts } = syncData.summary;
    if (linkedAccounts === 0) return 0;
    return Math.round((activeSyncs / linkedAccounts) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading sync status...</span>
      </div>
    );
  }

  if (error && !syncData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSyncStatus}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transaction Sync Status</h2>
          <p className="text-gray-600">
            Monitor and manage transaction synchronization across all connected accounts
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsRefreshing(true);
              fetchSyncStatus();
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          
          <Button
            onClick={() => handleManualSync()}
            disabled={isSyncing || syncData?.summary.activeSyncs > 0}
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Sync All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{syncData?.summary.totalAccounts || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Linked Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{syncData?.summary.linkedAccounts || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Syncs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">{syncData?.summary.activeSyncs || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Global Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">
                {formatLastSync(syncData?.summary.lastGlobalSync || null)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Progress */}
      {syncData?.summary.activeSyncs > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Sync Progress</span>
            </CardTitle>
            <CardDescription>
              {syncData.summary.activeSyncs} of {syncData.summary.linkedAccounts} accounts currently syncing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={getSyncProgress()} className="w-full" />
            <p className="text-sm text-gray-500 mt-2">
              {getSyncProgress()}% of linked accounts are currently syncing
            </p>
          </CardContent>
        </Card>
      )}

      {/* Account List */}
      <Card>
        <CardHeader>
          <CardTitle>Account Sync Status</CardTitle>
          <CardDescription>
            Individual sync status for each connected account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {syncData?.accounts.map((account) => (
              <div key={account.accountId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h4 className="font-medium">{account.accountName}</h4>
                    <p className="text-sm text-gray-500">
                      Balance: {formatCurrency(account.currentBalance)} • 
                      Last sync: {formatLastSync(account.lastSyncAt)}
                    </p>
                    {account.lastSyncResult && (
                      <p className="text-xs text-gray-400">
                        Last sync: {account.lastSyncResult.newTransactions} new, 
                        {account.lastSyncResult.totalProcessed} total 
                        ({account.lastSyncResult.syncDuration}ms)
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusBadge(account)}
                  
                  {account.syncStatus === 'syncing' ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Pause className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Sync</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel the sync for {account.accountName}? 
                            This will stop the current synchronization process.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>No, Keep Syncing</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancelSync(account.accountId)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Yes, Cancel Sync
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualSync([account.accountId])}
                      disabled={!account.isLinked || isSyncing}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Sync
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {(!syncData?.accounts || syncData.accounts.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No accounts found. Connect an Airtel Money account to start syncing transactions.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SyncStatusDashboard;
