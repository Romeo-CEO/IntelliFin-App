import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  CreditCard,
  RefreshCw,
  Shield,
  AlertCircle,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { taxComplianceApi } from '@/lib/api/tax-compliance';

import { useToast } from '@/hooks/use-toast';


interface ComplianceScore {
  overall: number;
  breakdown: {
    filing: number;
    payment: number;
    timeliness: number;
    accuracy: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ComplianceAlert {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  description: string;
  taxType: string;
  dueDate?: string;
  amount?: number;
  actionRequired: string;
}

interface DeadlineReminder {
  taxType: string;
  periodDescription: string;
  filingDeadline: string;
  paymentDeadline: string;
  daysUntilFiling: number;
  daysUntilPayment: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export function TaxComplianceDashboard() {
  const [complianceScore, setComplianceScore] = useState<ComplianceScore | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      setIsLoading(true);
      
      const [scoreResponse, alertsResponse, deadlinesResponse] = await Promise.all([
        taxComplianceApi.getComplianceScore(),
        taxComplianceApi.getComplianceAlerts(),
        taxComplianceApi.getUpcomingDeadlines(14), // Next 14 days
      ]);

      if (scoreResponse.success) {
        setComplianceScore(scoreResponse.data);
      }

      if (alertsResponse.success) {
        setAlerts(alertsResponse.data.slice(0, 10)); // Top 10 alerts
      }

      if (deadlinesResponse.success) {
        setUpcomingDeadlines(deadlinesResponse.data.slice(0, 5)); // Top 5 deadlines
      }

    } catch (error) {
      console.error('Failed to load compliance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load compliance data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshComplianceScore = async () => {
    try {
      setIsRefreshing(true);
      const response = await taxComplianceApi.refreshComplianceScore();
      
      if (response.success) {
        setComplianceScore(response.data);
        toast({
          title: 'Success',
          description: 'Compliance score refreshed successfully',
        });
      }
    } catch (error) {
      console.error('Failed to refresh compliance score:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh compliance score',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'ERROR': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Score Overview */}
      {complianceScore && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Tax Compliance Score
                </CardTitle>
                <CardDescription>
                  Overall compliance health and risk assessment
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshComplianceScore}
                disabled={isRefreshing}
                data-testid="refresh-score-button"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - complianceScore.overall / 100)}`}
                      className={`${
                        complianceScore.overall >= 90 ? 'text-green-500' :
                        complianceScore.overall >= 75 ? 'text-yellow-500' :
                        complianceScore.overall >= 60 ? 'text-orange-500' : 'text-red-500'
                      }`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{complianceScore.overall}%</span>
                  </div>
                </div>
                <Badge className={getRiskLevelColor(complianceScore.riskLevel)}>
                  {complianceScore.riskLevel} RISK
                </Badge>
              </div>

              {/* Breakdown Scores */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Filing Compliance</span>
                    <span>{complianceScore.breakdown.filing}%</span>
                  </div>
                  <Progress value={complianceScore.breakdown.filing} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Payment Compliance</span>
                    <span>{complianceScore.breakdown.payment}%</span>
                  </div>
                  <Progress value={complianceScore.breakdown.payment} className="h-2" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Timeliness</span>
                    <span>{complianceScore.breakdown.timeliness}%</span>
                  </div>
                  <Progress value={complianceScore.breakdown.timeliness} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Accuracy</span>
                    <span>{complianceScore.breakdown.accuracy}%</span>
                  </div>
                  <Progress value={complianceScore.breakdown.accuracy} className="h-2" />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">
                    {alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'ERROR').length} Critical Issues
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">
                    {upcomingDeadlines.filter(d => d.priority === 'URGENT' || d.priority === 'HIGH').length} Urgent Deadlines
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Compliance Alerts
            </CardTitle>
            <CardDescription>
              Issues requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No compliance issues</p>
                <p className="text-sm text-muted-foreground">All tax obligations are up to date</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Alert key={alert.id} className="border-l-4 border-l-red-500">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <AlertTitle className="text-sm font-medium">
                          {alert.title}
                        </AlertTitle>
                        <AlertDescription className="text-sm text-muted-foreground mt-1">
                          {alert.description}
                        </AlertDescription>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{alert.taxType}</span>
                          {alert.dueDate && (
                            <span>Due: {new Date(alert.dueDate).toLocaleDateString()}</span>
                          )}
                          {alert.amount && (
                            <span>Amount: K{alert.amount.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>
              Tax filing and payment deadlines in the next 14 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming deadlines</p>
                <p className="text-sm text-muted-foreground">All current obligations are met</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingDeadlines.map((deadline, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {deadline.taxType}
                      </TableCell>
                      <TableCell>
                        {deadline.periodDescription}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">
                            {new Date(deadline.filingDeadline).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {deadline.daysUntilFiling} days
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(deadline.priority)}>
                          {deadline.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
