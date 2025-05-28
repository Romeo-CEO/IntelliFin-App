'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  History,
  Settings,
  Zap,
  Shield,
  Clock,
  TrendingUp
} from 'lucide-react';

import { SyncStatusDashboard } from '@/components/transactions/sync/SyncStatusDashboard';
import { SyncHistory } from '@/components/transactions/sync/SyncHistory';

export default function TransactionSyncPage() {
  const [selectedAccountId, _setSelectedAccountId] = useState<string | undefined>();

  const features = [
    {
      icon: <Zap className="h-6 w-6 text-blue-600" />,
      title: 'Real-time Synchronization',
      description: 'Automatic transaction import with real-time updates and monitoring',
    },
    {
      icon: <Shield className="h-6 w-6 text-green-600" />,
      title: 'Secure & Reliable',
      description: 'Bank-level security with automatic retry and error recovery mechanisms',
    },
    {
      icon: <Clock className="h-6 w-6 text-purple-600" />,
      title: 'Scheduled Syncing',
      description: 'Automated hourly syncs during business hours with comprehensive daily updates',
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-orange-600" />,
      title: 'Performance Optimized',
      description: 'Incremental sync algorithms optimized for low-bandwidth environments',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transaction Synchronization</h1>
            <p className="text-gray-600">
              Monitor and manage automatic transaction imports from your connected accounts
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary">Real-time</Badge>
          <Badge variant="outline">Automated</Badge>
          <Badge variant="outline">Secure</Badge>
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Sync Status</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Sync History</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <SyncStatusDashboard />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {selectedAccountId ? (
            <SyncHistory accountId={selectedAccountId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Sync History</CardTitle>
                <CardDescription>
                  Select an account from the Status tab to view detailed sync history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No account selected. Go to the Status tab and select an account to view its sync history.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>
                Configure synchronization preferences and schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Automatic Sync Schedule</CardTitle>
                      <CardDescription>
                        Current sync schedule configuration
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Hourly Sync</h4>
                        <p className="text-sm text-gray-600">
                          Every hour during business hours (8 AM - 8 PM, Africa/Lusaka timezone)
                        </p>
                        <Badge variant="default" className="mt-1">Active</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Daily Comprehensive Sync</h4>
                        <p className="text-sm text-gray-600">
                          Complete sync of all accounts daily at 2:00 AM
                        </p>
                        <Badge variant="default" className="mt-1">Active</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Balance Updates</h4>
                        <p className="text-sm text-gray-600">
                          Account balance updates every 30 minutes during business hours
                        </p>
                        <Badge variant="default" className="mt-1">Active</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Stale Account Recovery</h4>
                        <p className="text-sm text-gray-600">
                          Automatic sync for accounts not updated in 6+ hours, runs every 4 hours
                        </p>
                        <Badge variant="default" className="mt-1">Active</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sync Performance</CardTitle>
                      <CardDescription>
                        Optimization settings for low-bandwidth environments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Incremental Sync</h4>
                        <p className="text-sm text-gray-600">
                          Only sync new transactions since last successful sync
                        </p>
                        <Badge variant="default" className="mt-1">Enabled</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Batch Processing</h4>
                        <p className="text-sm text-gray-600">
                          Process transactions in batches of 100 for optimal performance
                        </p>
                        <Badge variant="default" className="mt-1">Enabled</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Retry Strategy</h4>
                        <p className="text-sm text-gray-600">
                          Exponential backoff with up to 5 retry attempts for failed syncs
                        </p>
                        <Badge variant="default" className="mt-1">Enabled</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Queue Management</h4>
                        <p className="text-sm text-gray-600">
                          Automatic cleanup of old jobs and queue optimization
                        </p>
                        <Badge variant="default" className="mt-1">Enabled</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Security & Compliance</CardTitle>
                    <CardDescription>
                      Security measures and compliance features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Token Security</h4>
                        <p className="text-sm text-gray-600">
                          AES-256-GCM encryption for all stored access tokens
                        </p>
                        <Badge variant="default" className="mt-1">Active</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Audit Logging</h4>
                        <p className="text-sm text-gray-600">
                          Complete audit trail of all sync operations and API calls
                        </p>
                        <Badge variant="default" className="mt-1">Active</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Data Retention</h4>
                        <p className="text-sm text-gray-600">
                          Sync job history retained for 30 days, compliant with Zambian regulations
                        </p>
                        <Badge variant="default" className="mt-1">Compliant</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Multi-tenant Isolation</h4>
                        <p className="text-sm text-gray-600">
                          Complete data isolation between organizations
                        </p>
                        <Badge variant="default" className="mt-1">Enforced</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
