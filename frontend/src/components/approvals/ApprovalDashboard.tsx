'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { usePendingApprovals, useApprovalStats, useApprovalWorkflow } from '@/hooks/useApprovals';
import { ApprovalRequestStatus, ApprovalPriority } from '@/types/approval';
import { formatCurrency } from '@/lib/utils';
import { PendingApprovalsList } from './PendingApprovalsList';
import { ApprovalRequestsList } from './ApprovalRequestsList';
import { ApprovalStatsChart } from './ApprovalStatsChart';

interface ApprovalDashboardProps {
  userRole: string;
}

export function ApprovalDashboard({ userRole }: ApprovalDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState('pending');

  // Hooks
  const { tasks: pendingTasks, total: pendingTotal, isLoading: pendingLoading } = usePendingApprovals();
  const { stats, isLoading: statsLoading } = useApprovalStats();
  const { getStatusBadgeProps, getPriorityBadgeProps, isOverdue, getTimeUntilDue } = useApprovalWorkflow();

  // Calculate dashboard metrics
  const overdueCount = pendingTasks.filter(task =>
    isOverdue(task.approvalRequest.dueDate)
  ).length;

  const urgentCount = pendingTasks.filter(task =>
    task.approvalRequest.priority === ApprovalPriority.URGENT
  ).length;

  const todayCount = pendingTasks.filter(task => {
    const today = new Date().toDateString();
    return new Date(task.approvalRequest.submittedAt).toDateString() === today;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Dashboard</h1>
          <p className="text-muted-foreground">
            Manage expense approvals and workflow
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTotal}</div>
            <p className="text-xs text-muted-foreground">
              {todayCount} submitted today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Priority</CardTitle>
            <XCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{urgentCount}</div>
            <p className="text-xs text-muted-foreground">
              High priority items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Approval Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${stats.averageApprovalTime.toFixed(1)}h` : '0h'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average processing time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search expenses, vendors, or requesters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value={ApprovalRequestStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={ApprovalRequestStatus.APPROVED}>Approved</SelectItem>
              <SelectItem value={ApprovalRequestStatus.REJECTED}>Rejected</SelectItem>
              <SelectItem value={ApprovalRequestStatus.CANCELLED}>Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value={ApprovalPriority.LOW}>Low</SelectItem>
              <SelectItem value={ApprovalPriority.NORMAL}>Normal</SelectItem>
              <SelectItem value={ApprovalPriority.HIGH}>High</SelectItem>
              <SelectItem value={ApprovalPriority.URGENT}>Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tab Content */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Expenses waiting for your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingApprovalsList
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                priorityFilter={priorityFilter}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Approval Requests</CardTitle>
              <CardDescription>
                Complete history of approval requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApprovalRequestsList
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                priorityFilter={priorityFilter}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Approval Statistics</CardTitle>
                <CardDescription>
                  Overview of approval metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.approvedRequests}
                        </div>
                        <div className="text-sm text-muted-foreground">Approved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {stats.rejectedRequests}
                        </div>
                        <div className="text-sm text-muted-foreground">Rejected</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Approval Rate</span>
                        <span className="text-sm font-medium">
                          {stats.totalRequests > 0
                            ? ((stats.approvedRequests / stats.totalRequests) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg. Processing Time</span>
                        <span className="text-sm font-medium">
                          {stats.averageApprovalTime.toFixed(1)} hours
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval Trends</CardTitle>
                <CardDescription>
                  Visual representation of approval data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApprovalStatsChart stats={stats} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      {overdueCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Overdue Approvals
            </CardTitle>
            <CardDescription className="text-red-700">
              You have {overdueCount} overdue approval{overdueCount > 1 ? 's' : ''} that require immediate attention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setActiveTab('pending')}
            >
              Review Overdue Items
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
