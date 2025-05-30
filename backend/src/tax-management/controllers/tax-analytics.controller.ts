import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TaxAnalyticsService } from '../services/tax-analytics.service';

@ApiTags('Tax Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-analytics')
export class TaxAnalyticsController {
  constructor(private readonly taxAnalyticsService: TaxAnalyticsService) {}

  @Get('trends')
  @ApiOperation({ summary: 'Get tax trend analysis' })
  @ApiQuery({
    name: 'months',
    required: false,
    type: Number,
    description: 'Number of months to analyze (default: 12)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trend analysis retrieved successfully',
  })
  async getTrendAnalysis(
    @Request() req: any,
    @Query('months', new ParseIntPipe({ optional: true })) months: number = 12
  ) {
    try {
      const trends = await this.taxAnalyticsService.generateTrendAnalysis(
        req.user.organizationId,
        months
      );

      return {
        success: true,
        data: trends,
        message: 'Tax trend analysis retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve trend analysis',
      };
    }
  }

  @Get('compliance-prediction')
  @ApiOperation({ summary: 'Predict compliance score for next period' })
  @ApiResponse({
    status: 200,
    description: 'Compliance prediction generated successfully',
  })
  async predictCompliance(@Request() req: any) {
    try {
      const prediction = await this.taxAnalyticsService.predictCompliance(
        req.user.organizationId
      );

      return {
        success: true,
        data: prediction,
        message: 'Compliance prediction generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate compliance prediction',
      };
    }
  }

  @Get('efficiency-metrics')
  @ApiOperation({ summary: 'Calculate tax efficiency metrics' })
  @ApiResponse({
    status: 200,
    description: 'Efficiency metrics calculated successfully',
  })
  async getEfficiencyMetrics(@Request() req: any) {
    try {
      const metrics = await this.taxAnalyticsService.calculateEfficiencyMetrics(
        req.user.organizationId
      );

      return {
        success: true,
        data: metrics,
        message: 'Tax efficiency metrics calculated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate efficiency metrics',
      };
    }
  }

  @Get('seasonal-analysis')
  @ApiOperation({ summary: 'Generate seasonal tax analysis' })
  @ApiResponse({
    status: 200,
    description: 'Seasonal analysis generated successfully',
  })
  async getSeasonalAnalysis(@Request() req: any) {
    try {
      const analysis = await this.taxAnalyticsService.generateSeasonalAnalysis(
        req.user.organizationId
      );

      return {
        success: true,
        data: analysis,
        message: 'Seasonal analysis generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate seasonal analysis',
      };
    }
  }

  @Get('risk-assessment')
  @ApiOperation({ summary: 'Assess tax risks' })
  @ApiResponse({
    status: 200,
    description: 'Risk assessment completed successfully',
  })
  async assessTaxRisks(@Request() req: any) {
    try {
      const assessment = await this.taxAnalyticsService.assessTaxRisks(
        req.user.organizationId
      );

      return {
        success: true,
        data: assessment,
        message: 'Tax risk assessment completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to assess tax risks',
      };
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive tax analytics dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Analytics dashboard data retrieved successfully',
  })
  async getAnalyticsDashboard(@Request() req: any) {
    try {
      // Get all analytics data for dashboard
      const [trends, prediction, metrics, seasonalAnalysis, riskAssessment] =
        await Promise.all([
          this.taxAnalyticsService.generateTrendAnalysis(
            req.user.organizationId,
            6
          ),
          this.taxAnalyticsService.predictCompliance(req.user.organizationId),
          this.taxAnalyticsService.calculateEfficiencyMetrics(
            req.user.organizationId
          ),
          this.taxAnalyticsService.generateSeasonalAnalysis(
            req.user.organizationId
          ),
          this.taxAnalyticsService.assessTaxRisks(req.user.organizationId),
        ]);

      const dashboardData = {
        overview: {
          currentComplianceScore:
            trends[trends.length - 1]?.complianceScore || 0,
          predictedScore: prediction.nextPeriod.predictedScore,
          riskLevel: riskAssessment.overallRisk,
          effectiveTaxRate: metrics.effectiveTaxRate,
        },
        trends: {
          complianceTrend: trends.map(t => ({
            period: t.period,
            score: t.complianceScore,
          })),
          taxLiabilityTrend: trends.map(t => ({
            period: t.period,
            amount: t.taxLiability,
          })),
        },
        prediction,
        metrics,
        seasonalInsights: {
          peakMonth: seasonalAnalysis.reduce((max, current) =>
            current.averageTaxLiability > max.averageTaxLiability
              ? current
              : max
          ),
          lowMonth: seasonalAnalysis.reduce((min, current) =>
            current.averageTaxLiability < min.averageTaxLiability
              ? current
              : min
          ),
          seasonalVariation:
            Math.max(...seasonalAnalysis.map(s => s.seasonalityIndex)) -
            Math.min(...seasonalAnalysis.map(s => s.seasonalityIndex)),
        },
        riskAssessment,
        recommendations: [
          ...prediction.nextPeriod.recommendations,
          ...riskAssessment.recommendations,
        ].slice(0, 5), // Top 5 recommendations
        lastUpdated: new Date(),
      };

      return {
        success: true,
        data: dashboardData,
        message: 'Tax analytics dashboard data retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve analytics dashboard data',
      };
    }
  }

  @Get('benchmarking')
  @ApiOperation({ summary: 'Get tax benchmarking data' })
  @ApiResponse({
    status: 200,
    description: 'Benchmarking data retrieved successfully',
  })
  async getBenchmarking(@Request() req: any) {
    try {
      // Get organization metrics
      const organizationMetrics =
        await this.taxAnalyticsService.calculateEfficiencyMetrics(
          req.user.organizationId
        );

      // Mock industry averages (in real implementation, this would come from aggregated data)
      const industryAverage = {
        effectiveTaxRate: 32.5,
        taxBurdenRatio: 35.0,
        complianceCost: 8000,
        penaltyRatio: 2.1,
        timeToFile: 3.2,
        automationRate: 65.0,
      };

      // Calculate percentile ranking
      const metrics = [
        {
          name: 'effectiveTaxRate',
          org: organizationMetrics.effectiveTaxRate,
          industry: industryAverage.effectiveTaxRate,
          lowerIsBetter: true,
        },
        {
          name: 'taxBurdenRatio',
          org: organizationMetrics.taxBurdenRatio,
          industry: industryAverage.taxBurdenRatio,
          lowerIsBetter: true,
        },
        {
          name: 'complianceCost',
          org: organizationMetrics.complianceCost,
          industry: industryAverage.complianceCost,
          lowerIsBetter: true,
        },
        {
          name: 'penaltyRatio',
          org: organizationMetrics.penaltyRatio,
          industry: industryAverage.penaltyRatio,
          lowerIsBetter: true,
        },
        {
          name: 'timeToFile',
          org: organizationMetrics.timeToFile,
          industry: industryAverage.timeToFile,
          lowerIsBetter: true,
        },
        {
          name: 'automationRate',
          org: organizationMetrics.automationRate,
          industry: industryAverage.automationRate,
          lowerIsBetter: false,
        },
      ];

      let totalPercentile = 0;
      const improvementAreas: string[] = [];

      metrics.forEach(metric => {
        const isPerformingBetter = metric.lowerIsBetter
          ? metric.org < metric.industry
          : metric.org > metric.industry;

        if (isPerformingBetter) {
          totalPercentile += 75; // Above average
        } else {
          totalPercentile += 25; // Below average
          improvementAreas.push(metric.name);
        }
      });

      const percentileRanking = Math.round(totalPercentile / metrics.length);

      const benchmarking = {
        organizationMetrics,
        industryAverage,
        percentileRanking,
        improvementAreas: improvementAreas.map(area => {
          const areaLabels: Record<string, string> = {
            effectiveTaxRate:
              'Reduce effective tax rate through better tax planning',
            taxBurdenRatio: 'Optimize tax burden relative to profits',
            complianceCost: 'Reduce compliance costs through automation',
            penaltyRatio: 'Improve compliance to reduce penalties',
            timeToFile: 'Streamline filing processes to reduce time',
            automationRate: 'Increase automation to improve efficiency',
          };
          return areaLabels[area] || `Improve ${area}`;
        }),
        comparison: metrics.map(metric => ({
          metric: metric.name,
          organization: metric.org,
          industry: metric.industry,
          performance: metric.lowerIsBetter
            ? metric.org < metric.industry
              ? 'Better'
              : 'Worse'
            : metric.org > metric.industry
              ? 'Better'
              : 'Worse',
          difference: Math.abs(metric.org - metric.industry),
        })),
      };

      return {
        success: true,
        data: benchmarking,
        message: 'Tax benchmarking data retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve benchmarking data',
      };
    }
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-powered tax insights' })
  @ApiResponse({
    status: 200,
    description: 'Tax insights generated successfully',
  })
  async getTaxInsights(@Request() req: any) {
    try {
      // Get various analytics data
      const [trends, riskAssessment, metrics] = await Promise.all([
        this.taxAnalyticsService.generateTrendAnalysis(
          req.user.organizationId,
          12
        ),
        this.taxAnalyticsService.assessTaxRisks(req.user.organizationId),
        this.taxAnalyticsService.calculateEfficiencyMetrics(
          req.user.organizationId
        ),
      ]);

      // Generate insights based on data patterns
      const insights = [];

      // Trend insights
      const recentTrend = trends.slice(-3);
      const avgRecentCompliance =
        recentTrend.reduce((sum, t) => sum + t.complianceScore, 0) /
        recentTrend.length;

      if (avgRecentCompliance > 90) {
        insights.push({
          type: 'POSITIVE',
          title: 'Excellent Compliance Performance',
          description:
            'Your compliance score has been consistently high over the past 3 months.',
          impact: 'LOW_RISK',
          recommendation:
            'Maintain current processes and consider sharing best practices.',
        });
      } else if (avgRecentCompliance < 70) {
        insights.push({
          type: 'WARNING',
          title: 'Declining Compliance Trend',
          description: 'Your compliance score has been below 70% recently.',
          impact: 'HIGH_RISK',
          recommendation:
            'Immediate review of tax processes and implementation of corrective measures required.',
        });
      }

      // Efficiency insights
      if (metrics.automationRate < 50) {
        insights.push({
          type: 'OPPORTUNITY',
          title: 'Automation Opportunity',
          description: `Your automation rate is ${metrics.automationRate.toFixed(1)}%, below industry average.`,
          impact: 'EFFICIENCY',
          recommendation:
            'Consider implementing automated tax calculation and filing processes.',
        });
      }

      // Risk insights
      if (
        riskAssessment.overallRisk === 'HIGH' ||
        riskAssessment.overallRisk === 'CRITICAL'
      ) {
        insights.push({
          type: 'CRITICAL',
          title: 'High Tax Risk Detected',
          description: `Your overall tax risk level is ${riskAssessment.overallRisk}.`,
          impact: 'HIGH_RISK',
          recommendation:
            'Immediate attention required to address identified risk factors.',
        });
      }

      // Seasonal insights
      const currentMonth = new Date().getMonth() + 1;
      const seasonalFactors = [0, -2, 1, 5, 2, -1, -3, 1, 2, 3, -1, 4]; // Mock seasonal data
      if (seasonalFactors[currentMonth - 1] > 3) {
        insights.push({
          type: 'INFO',
          title: 'Peak Tax Season',
          description: 'This month typically has higher tax obligations.',
          impact: 'PLANNING',
          recommendation:
            'Ensure adequate cash flow planning for increased tax payments.',
        });
      }

      return {
        success: true,
        data: {
          insights,
          summary: {
            totalInsights: insights.length,
            criticalCount: insights.filter(i => i.type === 'CRITICAL').length,
            opportunityCount: insights.filter(i => i.type === 'OPPORTUNITY')
              .length,
            positiveCount: insights.filter(i => i.type === 'POSITIVE').length,
          },
          generatedAt: new Date(),
        },
        message: 'Tax insights generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate tax insights',
      };
    }
  }
}
