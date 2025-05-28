import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  Shield,
  Settings,
  Calendar,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Activity,
} from 'lucide-react';
import { TaxCalculator } from '@/components/tax-management/TaxCalculator';
import { TaxComplianceDashboard } from '@/components/tax-management/TaxComplianceDashboard';
import { TaxConfigurationPanel } from '@/components/tax-management/TaxConfigurationPanel';
import { WithholdingTaxCertificates } from '@/components/tax-management/WithholdingTaxCertificates';
import { TaxAnalyticsDashboard } from '@/components/tax-management/TaxAnalyticsDashboard';
import { TaxAdjustments } from '@/components/tax-management/TaxAdjustments';
import { MobileTaxEntry } from '@/components/tax-management/MobileTaxEntry';
import { AdvancedTaxReporting } from '@/components/tax-management/AdvancedTaxReporting';
import { PerformanceMonitoring } from '@/components/tax-management/PerformanceMonitoring';

export function TaxManagementPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock data for overview cards
  const overviewStats = {
    complianceScore: 87,
    riskLevel: 'MEDIUM',
    criticalAlerts: 2,
    upcomingDeadlines: 3,
    totalTaxLiability: 45750.00,
    paidThisMonth: 12300.00,
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'bg-green-50 text-green-700 border-green-200';
      case 'MEDIUM': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Management</h1>
          <p className="text-muted-foreground">
            Comprehensive tax management and ZRA compliance for your business
          </p>
        </div>
        <Badge className={getRiskLevelColor(overviewStats.riskLevel)}>
          {overviewStats.riskLevel} RISK
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                <p className="text-2xl font-bold">{overviewStats.complianceScore}%</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-600">{overviewStats.criticalAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</p>
                <p className="text-2xl font-bold text-yellow-600">{overviewStats.upcomingDeadlines}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tax Liability</p>
                <p className="text-2xl font-bold">K{overviewStats.totalTaxLiability.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-10 min-w-max">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="withholding" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Withholding
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Adjustments
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="reporting" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="periods" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Periods
            </TabsTrigger>
            <TabsTrigger value="configuration" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Config
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Compliance Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <TaxComplianceDashboard />
        </TabsContent>

        {/* Tax Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <TaxCalculator />
        </TabsContent>

        {/* Withholding Tax Tab */}
        <TabsContent value="withholding" className="space-y-6">
          <WithholdingTaxCertificates />
        </TabsContent>

        {/* Tax Adjustments Tab */}
        <TabsContent value="adjustments" className="space-y-6">
          <TaxAdjustments />
        </TabsContent>

        {/* Tax Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <TaxAnalyticsDashboard />
        </TabsContent>

        {/* Mobile Tax Entry Tab */}
        <TabsContent value="mobile" className="space-y-6">
          <MobileTaxEntry />
        </TabsContent>

        {/* Advanced Tax Reporting Tab */}
        <TabsContent value="reporting" className="space-y-6">
          <AdvancedTaxReporting />
        </TabsContent>

        {/* Performance Monitoring Tab */}
        <TabsContent value="performance" className="space-y-6">
          <PerformanceMonitoring />
        </TabsContent>

        {/* Tax Periods Tab */}
        <TabsContent value="periods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tax Periods Management
              </CardTitle>
              <CardDescription>
                Manage tax periods, deadlines, and filing status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Tax Periods management coming soon</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This feature will allow you to manage tax periods, track deadlines, and monitor filing status
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <TaxConfigurationPanel />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common tax management tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <FileText className="h-8 w-8 text-blue-500 mb-2" />
              <h4 className="font-medium">Generate VAT Return</h4>
              <p className="text-sm text-muted-foreground">Prepare quarterly VAT return</p>
            </div>

            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <Calculator className="h-8 w-8 text-green-500 mb-2" />
              <h4 className="font-medium">Calculate PAYE</h4>
              <p className="text-sm text-muted-foreground">Calculate employee tax deductions</p>
            </div>

            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
              <h4 className="font-medium">Tax Analytics</h4>
              <p className="text-sm text-muted-foreground">View tax trends and insights</p>
            </div>

            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <Shield className="h-8 w-8 text-orange-500 mb-2" />
              <h4 className="font-medium">Compliance Check</h4>
              <p className="text-sm text-muted-foreground">Run comprehensive compliance audit</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Resources and support for tax management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h4 className="font-medium">Tax Guides</h4>
              <p className="text-sm text-muted-foreground">
                Comprehensive guides for Zambian tax compliance
              </p>
            </div>

            <div className="text-center p-4">
              <Calculator className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-medium">Video Tutorials</h4>
              <p className="text-sm text-muted-foreground">
                Step-by-step video tutorials for tax processes
              </p>
            </div>

            <div className="text-center p-4">
              <Shield className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h4 className="font-medium">Expert Support</h4>
              <p className="text-sm text-muted-foreground">
                Get help from our tax compliance experts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
