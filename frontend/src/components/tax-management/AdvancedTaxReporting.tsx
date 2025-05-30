import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  FileImage,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';


import { useToast } from '@/hooks/use-toast';

interface ZRAComplianceReport {
  organizationInfo: {
    name: string;
    tin: string;
    address: string;
  };
  reportPeriod: {
    startDate: string;
    endDate: string;
    taxYear: number;
  };
  taxSummary: {
    totalTaxLiability: number;
    totalTaxPaid: number;
    totalPenalties: number;
    netTaxPosition: number;
  };
  complianceMetrics: {
    filingComplianceRate: number;
    paymentComplianceRate: number;
    overallComplianceScore: number;
    riskLevel: string;
  };
  recommendations: string[];
}

interface ExecutiveDashboard {
  kpis: {
    effectiveTaxRate: number;
    taxBurdenRatio: number;
    complianceScore: number;
    automationRate: number;
    costOfCompliance: number;
  };
  trends: {
    taxLiabilityTrend: Array<{ period: string; amount: number }>;
    complianceTrend: Array<{ period: string; score: number }>;
  };
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    actionRequired: string;
  }>;
}

export function AdvancedTaxReporting() {
  const [activeReport, setActiveReport] = useState('compliance');
  const [reportPeriod, setReportPeriod] = useState('current-year');
  const [complianceReport, setComplianceReport] = useState<ZRAComplianceReport | null>(null);
  const [executiveDashboard, setExecutiveDashboard] = useState<ExecutiveDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReportData();
  }, [activeReport, reportPeriod]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);

      if (activeReport === 'compliance') {
        await loadComplianceReport();
      } else if (activeReport === 'executive') {
        await loadExecutiveDashboard();
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadComplianceReport = async () => {
    // TODO: Replace with actual API call
    // const response = await taxReportingApi.generateZRAComplianceReport(reportPeriod);
    
    // Mock data
    const mockReport: ZRAComplianceReport = {
      organizationInfo: {
        name: 'Sample Business Ltd',
        tin: '1000000001',
        address: 'Lusaka, Zambia',
      },
      reportPeriod: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        taxYear: 2024,
      },
      taxSummary: {
        totalTaxLiability: 125000,
        totalTaxPaid: 118000,
        totalPenalties: 2500,
        netTaxPosition: 7000,
      },
      complianceMetrics: {
        filingComplianceRate: 95,
        paymentComplianceRate: 92,
        overallComplianceScore: 93,
        riskLevel: 'LOW',
      },
      recommendations: [
        'Settle outstanding tax obligations to avoid additional penalties',
        'Implement automated filing reminders for upcoming deadlines',
        'Consider quarterly tax planning sessions to optimize cash flow',
      ],
    };

    setComplianceReport(mockReport);
  };

  const loadExecutiveDashboard = async () => {
    // TODO: Replace with actual API call
    // const response = await taxReportingApi.generateExecutiveDashboard();
    
    // Mock data
    const mockDashboard: ExecutiveDashboard = {
      kpis: {
        effectiveTaxRate: 28.5,
        taxBurdenRatio: 32.1,
        complianceScore: 93,
        automationRate: 78,
        costOfCompliance: 6500,
      },
      trends: {
        taxLiabilityTrend: [
          { period: 'Q1', amount: 28000 },
          { period: 'Q2', amount: 32000 },
          { period: 'Q3', amount: 35000 },
          { period: 'Q4', amount: 30000 },
        ],
        complianceTrend: [
          { period: 'Q1', score: 88 },
          { period: 'Q2', score: 91 },
          { period: 'Q3', score: 95 },
          { period: 'Q4', score: 93 },
        ],
      },
      alerts: [
        {
          type: 'DEADLINE',
          severity: 'HIGH',
          message: 'VAT return due in 5 days',
          actionRequired: 'Prepare and submit Q4 VAT return',
        },
        {
          type: 'COMPLIANCE',
          severity: 'MEDIUM',
          message: 'Withholding tax certificates pending submission',
          actionRequired: 'Submit 3 pending certificates to ZRA',
        },
      ],
    };

    setExecutiveDashboard(mockDashboard);
  };

  const generateReport = async (format: 'PDF' | 'XML' | 'CSV') => {
    try {
      setIsGenerating(true);

      // TODO: Replace with actual API call
      // const response = await taxReportingApi.exportReport(activeReport, reportPeriod, format);
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'Report Generated',
        description: `${activeReport} report generated in ${format} format`,
      });

      // TODO: Trigger download
      // downloadFile(response.data.content, response.data.filename, response.data.mimeType);
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'LOW': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'MEDIUM': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
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
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Advanced Tax Reporting</h2>
          <p className="text-muted-foreground">
            Comprehensive tax reports and analytics for compliance and planning
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-year">Current Year</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
              <SelectItem value="current-quarter">Current Quarter</SelectItem>
              <SelectItem value="last-quarter">Last Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReport('PDF')}
              disabled={isGenerating}
            >
              <FileImage className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReport('CSV')}
              disabled={isGenerating}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReport('XML')}
              disabled={isGenerating}
            >
              <FileText className="h-4 w-4 mr-2" />
              XML
            </Button>
          </div>
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            ZRA Compliance
          </TabsTrigger>
          <TabsTrigger value="executive" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Executive Dashboard
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Tax Planning
          </TabsTrigger>
        </TabsList>

        {/* ZRA Compliance Report */}
        <TabsContent value="compliance" className="space-y-6">
          {complianceReport && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tax Liability</p>
                        <p className="text-2xl font-bold">
                          K{complianceReport.taxSummary.totalTaxLiability.toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tax Paid</p>
                        <p className="text-2xl font-bold">
                          K{complianceReport.taxSummary.totalTaxPaid.toLocaleString()}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                        <p className="text-2xl font-bold">
                          {complianceReport.complianceMetrics.overallComplianceScore}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                        <Badge className={getRiskLevelColor(complianceReport.complianceMetrics.riskLevel)}>
                          {complianceReport.complianceMetrics.riskLevel}
                        </Badge>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Compliance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Metrics</CardTitle>
                  <CardDescription>
                    Filing and payment compliance rates for {complianceReport.reportPeriod.taxYear}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Filing Compliance</span>
                        <span>{complianceReport.complianceMetrics.filingComplianceRate}%</span>
                      </div>
                      <Progress value={complianceReport.complianceMetrics.filingComplianceRate} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Payment Compliance</span>
                        <span>{complianceReport.complianceMetrics.paymentComplianceRate}%</span>
                      </div>
                      <Progress value={complianceReport.complianceMetrics.paymentComplianceRate} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Score</span>
                        <span>{complianceReport.complianceMetrics.overallComplianceScore}%</span>
                      </div>
                      <Progress value={complianceReport.complianceMetrics.overallComplianceScore} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Recommendations</CardTitle>
                  <CardDescription>
                    Actions to improve tax compliance and reduce risks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceReport.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-blue-800">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Executive Dashboard */}
        <TabsContent value="executive" className="space-y-6">
          {executiveDashboard && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Effective Tax Rate</p>
                      <p className="text-2xl font-bold">{executiveDashboard.kpis.effectiveTaxRate}%</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Tax Burden Ratio</p>
                      <p className="text-2xl font-bold">{executiveDashboard.kpis.taxBurdenRatio}%</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                      <p className="text-2xl font-bold">{executiveDashboard.kpis.complianceScore}%</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Automation Rate</p>
                      <p className="text-2xl font-bold">{executiveDashboard.kpis.automationRate}%</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Compliance Cost</p>
                      <p className="text-2xl font-bold">K{executiveDashboard.kpis.costOfCompliance.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trends Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tax Liability Trend</CardTitle>
                    <CardDescription>Quarterly tax liability over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={executiveDashboard.trends.taxLiabilityTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`K${Number(value).toLocaleString()}`, 'Tax Liability']} />
                        <Bar dataKey="amount" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Trend</CardTitle>
                    <CardDescription>Compliance score progression</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={executiveDashboard.trends.complianceTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Compliance Score']} />
                        <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Alerts</CardTitle>
                  <CardDescription>Important notifications requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {executiveDashboard.alerts.map((alert, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{alert.message}</span>
                            <Badge variant="outline" className="text-xs">
                              {alert.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.actionRequired}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tax Planning */}
        <TabsContent value="planning" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Tax Planning Report</h3>
                <p className="text-muted-foreground mb-4">
                  Advanced tax planning features coming soon
                </p>
                <Button variant="outline">
                  Request Planning Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
