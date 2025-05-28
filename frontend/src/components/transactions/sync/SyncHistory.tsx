'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Bot,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Filter,
  Download
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SyncJob {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  isManual: boolean;
  startedAt: string;
  completedAt: string | null;
  transactionsProcessed: number | null;
  newTransactions: number | null;
  errorMessage: string | null;
}

interface AccountSyncHistory {
  account: {
    id: string;
    name: string;
    number: string;
    provider: string;
    isLinked: boolean;
    lastSyncAt: string | null;
    currentBalance: number | null;
    balanceUpdatedAt: string | null;
  };
  syncStatus: {
    isActive: boolean;
    activeJobs: number;
    recentJobs: SyncJob[];
  };
}

interface SyncHistoryFilters {
  accountId?: string;
  status?: string;
  isManual?: boolean;
  dateRange?: string;
}

export function SyncHistory({ accountId }: { accountId?: string }) {
  const [historyData, setHistoryData] = useState<AccountSyncHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SyncHistoryFilters>({});

  useEffect(() => {
    if (accountId) {
      fetchAccountSyncHistory(accountId);
    }
  }, [accountId]);

  const fetchAccountSyncHistory = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/transactions/sync/status/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sync history');
      }

      const data: AccountSyncHistory = await response.json();
      setHistoryData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sync history';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (startedAt: string, completedAt: string | null): string => {
    if (!completedAt) return 'Running...';
    
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();
    
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${Math.round(durationMs / 1000)}s`;
    } else {
      return `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Badge variant="default"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case 'COMPLETED':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'FAILED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const getTriggerIcon = (isManual: boolean) => {
    return isManual ? (
      <User className="w-4 h-4 text-blue-600" title="Manual sync" />
    ) : (
      <Bot className="w-4 h-4 text-green-600" title="Automatic sync" />
    );
  };

  const getFilteredJobs = (): SyncJob[] => {
    if (!historyData?.syncStatus.recentJobs) return [];
    
    let jobs = [...historyData.syncStatus.recentJobs];
    
    if (filters.status && filters.status !== 'all') {
      jobs = jobs.filter(job => job.status === filters.status);
    }
    
    if (filters.isManual !== undefined) {
      jobs = jobs.filter(job => job.isManual === filters.isManual);
    }
    
    if (filters.dateRange) {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (filters.dateRange) {
        case '24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return jobs;
      }
      
      jobs = jobs.filter(job => new Date(job.startedAt) >= cutoffDate);
    }
    
    return jobs;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading sync history...</span>
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
            onClick={() => accountId && fetchAccountSyncHistory(accountId)}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!historyData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No sync history available.</p>
      </div>
    );
  }

  const filteredJobs = getFilteredJobs();

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Account Overview</span>
          </CardTitle>
          <CardDescription>
            Current status and recent activity for {historyData.account.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Account Number</Label>
              <p className="font-medium">{historyData.account.number}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Current Balance</Label>
              <p className="font-medium">{formatCurrency(historyData.account.currentBalance)}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Last Sync</Label>
              <p className="font-medium">
                {historyData.account.lastSyncAt 
                  ? formatDateTime(historyData.account.lastSyncAt)
                  : 'Never'
                }
              </p>
            </div>
          </div>
          
          {historyData.syncStatus.isActive && (
            <Alert className="mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Sync is currently active with {historyData.syncStatus.activeJobs} job(s) running.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter Sync History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  status: value === 'all' ? undefined : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="RUNNING">Running</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="trigger-filter">Trigger</Label>
              <Select
                value={filters.isManual === undefined ? 'all' : filters.isManual ? 'manual' : 'automatic'}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  isManual: value === 'all' ? undefined : value === 'manual'
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All triggers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Triggers</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-filter">Date Range</Label>
              <Select
                value={filters.dateRange || 'all'}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: value === 'all' ? undefined : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({})}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>
                Recent synchronization jobs ({filteredJobs.length} of {historyData.syncStatus.recentJobs.length})
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  {getTriggerIcon(job.isManual)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">
                        {job.isManual ? 'Manual Sync' : 'Automatic Sync'}
                      </h4>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Started: {formatDateTime(job.startedAt)} • 
                      Duration: {formatDuration(job.startedAt, job.completedAt)}
                    </p>
                    {job.status === 'COMPLETED' && (
                      <p className="text-xs text-green-600">
                        {job.newTransactions || 0} new transactions, {job.transactionsProcessed || 0} total processed
                      </p>
                    )}
                    {job.status === 'FAILED' && job.errorMessage && (
                      <p className="text-xs text-red-600">
                        Error: {job.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {job.completedAt ? formatDateTime(job.completedAt) : 'In Progress'}
                  </p>
                </div>
              </div>
            ))}
            
            {filteredJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sync jobs found matching the current filters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SyncHistory;
