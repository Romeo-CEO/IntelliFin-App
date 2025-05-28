import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  AlertTriangle,
  CheckCircle,
  Brain,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrendData {
  period: string;
  complianceScore: number;
  taxLiability: number;
  taxPaid: number;
  filingRate: number;
  paymentRate: number;
}

interface CompliancePrediction {
  nextPeriod: {
    period: string;
    predictedScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendations: string[];
  };
  factors: {
    historicalTrend: number;
    seasonalAdjustment: number;
    currentPerformance: number;
    upcomingDeadlines: number;
  };
  confidence: number;
}

interface EfficiencyMetrics {
  effectiveTaxRate: number;
  taxBurdenRatio: number;
  complianceCost: number;
  penaltyRatio: number;
  timeToFile: number;
  automationRate: number;
}

interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: Array<{
    factor: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    probability: number;
    mitigation: string;
  }>;
  riskScore: number;
  recommendations: string[];
}

export function TaxAnalyticsDashboard() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [prediction, setPrediction] = useState<CompliancePrediction | null>(null);
  const [metrics, setMetrics] = useState<EfficiencyMetrics | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API calls
      // const [trendsResponse, predictionResponse, metricsResponse, riskResponse] = await Promise.all([
      //   taxAnalyticsApi.getTrendAnalysis(6),
      //   taxAnalyticsApi.predictCompliance(),
      //   taxAnalyticsApi.getEfficiencyMetrics(),
      //   taxAnalyticsApi.assessTaxRisks(),
      // ]);

      // Mock data for demonstration
      const mockTrends: TrendData[] = [
        { period: '2024-01', complianceScore: 85, taxLiability: 45000, taxPaid: 43000, filingRate: 90, paymentRate: 95 },
        { period: '2024-02', complianceScore: 88, taxLiability: 48000, taxPaid: 47000, filingRate: 95, paymentRate: 98 },
        { period: '2024-03', complianceScore: 92, taxLiability: 52000, taxPaid: 52000, filingRate: 100, paymentRate: 100 },
        { period: '2024-04', complianceScore: 87, taxLiability: 49000, taxPaid: 46000, filingRate: 90, paymentRate: 94 },
        { period: '2024-05', complianceScore: 90, taxLiability: 51000, taxPaid: 50000, filingRate: 95, paymentRate: 98 },
        { period: '2024-06', complianceScore: 93, taxLiability: 53000, taxPaid: 53000, filingRate: 100, paymentRate: 100 },
      ];

      const mockPrediction: CompliancePrediction = {
        nextPeriod: {
          period: '2024-07',
          predictedScore: 91,
          riskLevel: 'LOW',
          recommendations: [
            'Maintain current compliance standards',
            'Continue automated filing processes',
            'Monitor upcoming VAT deadline',
          ],
        },
        factors: {
          historicalTrend: 2.5,
          seasonalAdjustment: -1.0,
          currentPerformance: 93,
          upcomingDeadlines: 2,
        },
        confidence: 87,
      };

      const mockMetrics: EfficiencyMetrics = {
        effectiveTaxRate: 28.5,
        taxBurdenRatio: 32.1,
        complianceCost: 6500,
        penaltyRatio: 1.2,
        timeToFile: 2.3,
        automationRate: 78,
      };

      const mockRiskAssessment: RiskAssessment = {
        overallRisk: 'LOW',
        riskFactors: [
          {
            factor: 'Seasonal Tax Increase',
            impact: 'MEDIUM',
            probability: 0.6,
            mitigation: 'Prepare cash flow for Q3 tax payments',
          },
        ],
        riskScore: 15,
        recommendations: [
          'Continue current compliance practices',
          'Monitor cash flow for upcoming payments',
        ],
      };

      setTrends(mockTrends);
      setPrediction(mockPrediction);
      setMetrics(mockMetrics);
      setRiskAssessment(mockRiskAssessment);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tax analytics data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    try {
      setIsRefreshing(true);
      await loadAnalyticsData();
      toast({
        title: 'Success',
        description: 'Analytics data refreshed successfully',
      });
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh analytics data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 0,
    }).format(amount);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tax Analytics</h2>
          <p className="text-muted-foreground">
            Advanced insights and predictions for tax compliance
          </p>
        </div>
        <Button
          onClick={refreshAnalytics}
          disabled={isRefreshing}
          variant="outline"
          data-testid="refresh-analytics-button"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Score</p>
                <p className="text-2xl font-bold">
                  {trends[trends.length - 1]?.complianceScore || 0}%
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Predicted Score</p>
                <p className="text-2xl font-bold">
                  {prediction?.nextPeriod.predictedScore || 0}%
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                <Badge className={getRiskLevelColor(riskAssessment?.overallRisk || 'LOW')}>
                  {riskAssessment?.overallRisk || 'LOW'}
                </Badge>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Automation Rate</p>
                <p className="text-2xl font-bold">{metrics?.automationRate || 0}%</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Compliance Trend
            </CardTitle>
            <CardDescription>
              Compliance score over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="complianceScore" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tax Liability Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tax Liability Trend
            </CardTitle>
            <CardDescription>
              Tax liability vs payments over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area 
                  type="monotone" 
                  dataKey="taxLiability" 
                  stackId="1"
                  stroke="#ef4444" 
                  fill="#ef4444"
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="taxPaid" 
                  stackId="2"
                  stroke="#22c55e" 
                  fill="#22c55e"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Prediction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Prediction
            </CardTitle>
            <CardDescription>
              Next period compliance forecast
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prediction && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {prediction.nextPeriod.predictedScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Predicted for {prediction.nextPeriod.period}
                  </div>
                  <Badge className={getRiskLevelColor(prediction.nextPeriod.riskLevel)}>
                    {prediction.nextPeriod.riskLevel} RISK
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Confidence</span>
                    <span>{prediction.confidence}%</span>
                  </div>
                  <Progress value={prediction.confidence} className="h-2" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Key Recommendations:</h4>
                  <ul className="text-sm space-y-1">
                    {prediction.nextPeriod.recommendations.slice(0, 3).map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Efficiency Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Efficiency Metrics
            </CardTitle>
            <CardDescription>
              Tax process efficiency indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Effective Tax Rate</span>
                      <span>{metrics.effectiveTaxRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.effectiveTaxRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Automation Rate</span>
                      <span>{metrics.automationRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.automationRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Penalty Ratio</span>
                      <span>{metrics.penaltyRatio.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(metrics.penaltyRatio * 10, 100)} className="h-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{metrics.timeToFile.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Avg. Filing Time (days)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{formatCurrency(metrics.complianceCost)}</div>
                    <div className="text-xs text-muted-foreground">Compliance Cost</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Assessment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Assessment
            </CardTitle>
            <CardDescription>
              Current tax compliance risks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {riskAssessment && (
              <div className="space-y-4">
                <div className="text-center">
                  <Badge className={getRiskLevelColor(riskAssessment.overallRisk)}>
                    {riskAssessment.overallRisk} RISK
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">
                    Risk Score: {riskAssessment.riskScore}/100
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Risk Factors:</h4>
                  {riskAssessment.riskFactors.length === 0 ? (
                    <div className="text-center py-4">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No significant risks detected</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {riskAssessment.riskFactors.map((factor, index) => (
                        <div key={index} className="p-2 border rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium">{factor.factor}</span>
                            <Badge variant="outline" className="text-xs">
                              {factor.impact}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{factor.mitigation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
