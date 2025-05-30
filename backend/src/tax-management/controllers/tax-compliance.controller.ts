import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
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
import { TaxComplianceService, ComplianceScore, ComplianceAlert, ComplianceReport, DeadlineReminder } from '../services/tax-compliance.service';
import { Logger } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthContext } from '../../auth/interfaces/auth.interface';
import { TaxAnalyticsService, TaxTrendAnalysis } from '../services/tax-analytics.service';

export interface ComplianceHealthCheck {
  healthStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  complianceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: {
    critical: number;
    warnings: number;
    urgentDeadlines: number;
  };
  breakdown: {
    filing: number;
    payment: number;
    timeliness: number;
    accuracy: number;
  };
  actionItems: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    description: string;
  }>;
  lastChecked: Date;
}

@ApiTags('Tax Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-compliance')
export class TaxComplianceController {
  constructor(
    private readonly taxComplianceService: TaxComplianceService,
    private readonly taxAnalyticsService: TaxAnalyticsService,
  ) {}

  @Get('score')
  @ApiOperation({ summary: 'Get compliance score for organization' })
  @ApiResponse({
    status: 200,
    description: 'Compliance score retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getComplianceScore(@Request() req: AuthContext): Promise<{ success: boolean; data: ComplianceScore | null; message: string; error?: string }> {
    try {
      const score = await this.taxComplianceService.calculateComplianceScore(
        req.tenant.id
      );

      return {
        success: true,
        data: score,
        message: 'Compliance score retrieved successfully',
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to retrieve compliance score',
      };
    }
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get compliance alerts for organization' })
  @ApiResponse({
    status: 200,
    description: 'Compliance alerts retrieved successfully',
  })
  async getComplianceAlerts(@Request() req: AuthContext): Promise<{ success: boolean; data: ComplianceAlert[] | null; message: string; error?: string }> {
    try {
      const alerts = await this.taxComplianceService.generateComplianceAlerts(
        req.tenant.id
      );

      return {
        success: true,
        data: alerts,
        message: 'Compliance alerts retrieved successfully',
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to retrieve compliance alerts',
      };
    }
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate comprehensive compliance report' })
  @ApiResponse({
    status: 200,
    description: 'Compliance report generated successfully',
  })
  async getComplianceReport(@Request() req: AuthContext): Promise<{ success: boolean; data: ComplianceReport | null; message: string; error?: string }> {
    try {
      const report = await this.taxComplianceService.generateComplianceReport(
        req.tenant.id
      );

      return {
        success: true,
        data: report,
        message: 'Compliance report generated successfully',
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to generate compliance report',
      };
    }
  }

  @Get('deadlines')
  @ApiOperation({ summary: 'Get upcoming tax deadlines' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look ahead (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming deadlines retrieved successfully',
  })
  async getUpcomingDeadlines(
    @Request() req: AuthContext,
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30
  ): Promise<{ success: boolean; data: DeadlineReminder[] | null; message: string; error?: string }> {
    try {
      const deadlines = await this.taxComplianceService.getUpcomingDeadlines(
        req.tenant.id,
        days
      );

      return {
        success: true,
        data: deadlines,
        message: 'Upcoming deadlines retrieved successfully',
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to retrieve upcoming deadlines',
      };
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get compliance dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Compliance dashboard data retrieved successfully',
  })
  async getComplianceDashboard(@Request() req: AuthContext): Promise<{ success: boolean; data: any | null; message: string; error?: string }> {
    try {
      // Get compliance score
      const score = await this.taxComplianceService.calculateComplianceScore(
        req.tenant.id
      );

      // Get alerts (limit to top 10)
      const allAlerts = await this.taxComplianceService.generateComplianceAlerts(
          req.tenant.id
        );
      const alerts = allAlerts.slice(0, 10);

      // Get upcoming deadlines (next 14 days)
      const upcomingDeadlines = await this.taxComplianceService.getUpcomingDeadlines(
          req.tenant.id,
          14
        );

      // Calculate quick stats
      const criticalAlerts = allAlerts.filter(
        a => a.severity === 'CRITICAL' || a.severity === 'ERROR'
      ).length;
      const urgentDeadlines = upcomingDeadlines.filter(
        d => d.priority === 'URGENT' || d.priority === 'HIGH'
      ).length;

      const dashboardData = {
        complianceScore: score,
        alerts: {
          total: allAlerts.length,
          critical: criticalAlerts,
          items: alerts,
        },
        upcomingDeadlines: {
          total: upcomingDeadlines.length,
          urgent: urgentDeadlines,
          items: upcomingDeadlines.slice(0, 5), // Top 5 upcoming
        },
        quickStats: {
          riskLevel: score.riskLevel,
          overallScore: score.overall,
          criticalIssues: criticalAlerts,
          urgentDeadlines,
        },
        recommendations: this.generateQuickRecommendations(score, allAlerts),
      };

      return {
        success: true,
        data: dashboardData,
        message: 'Compliance dashboard data retrieved successfully',
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to retrieve compliance dashboard data',
      };
    }
  }

  @Get('health-check')
  @ApiOperation({ summary: 'Perform compliance health check' })
  @ApiResponse({
    status: 200,
    description: 'Compliance health check completed successfully',
  })
  async performHealthCheck(@Request() req: AuthContext): Promise<{ success: boolean; data: ComplianceHealthCheck | null; message: string; error?: string }> {
    try {
      const score = await this.taxComplianceService.calculateComplianceScore(
        req.tenant.id
      );
      const alerts = await this.taxComplianceService.generateComplianceAlerts(
        req.tenant.id
      );
      const upcomingDeadlines = await this.taxComplianceService.getUpcomingDeadlines(
          req.tenant.id,
          7 // Next 7 days
        );

      // Categorize issues
      const criticalIssues = alerts.filter(
        a => a.severity === 'CRITICAL' || a.severity === 'ERROR'
      );
      const warnings = alerts.filter(a => a.severity === 'WARNING');
      const urgentDeadlines = upcomingDeadlines.filter(
        d => d.priority === 'URGENT'
      );

      // Determine overall health status
      let healthStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
      if (score.overall >= 95 && criticalIssues.length === 0) {
        healthStatus = 'EXCELLENT';
      } else if (score.overall >= 85 && criticalIssues.length <= 1) {
        healthStatus = 'GOOD';
      } else if (score.overall >= 70 && criticalIssues.length <= 3) {
        healthStatus = 'FAIR';
      } else if (score.overall >= 50) {
        healthStatus = 'POOR';
      } else {
        healthStatus = 'CRITICAL';
      }

      const healthCheck: ComplianceHealthCheck = {
        healthStatus,
        complianceScore: score.overall,
        riskLevel: score.riskLevel,
        issues: {
          critical: criticalIssues.length,
          warnings: warnings.length,
          urgentDeadlines: urgentDeadlines.length,
        },
        breakdown: {
          filing: score.breakdown.filing,
          payment: score.breakdown.payment,
          timeliness: score.breakdown.timeliness,
          accuracy: score.breakdown.accuracy,
        },
        actionItems: [
          ...criticalIssues.slice(0, 3).map(issue => ({
            priority: 'HIGH' as const,
            action: issue.actionRequired,
            description: issue.description,
          })),
          ...urgentDeadlines.slice(0, 2).map(deadline => ({
            priority: 'MEDIUM' as const,
            action: `Prepare ${deadline.taxType} filing`,
            description: `${deadline.periodDescription} due in ${deadline.daysUntilFiling} days`,
          })),
        ],
        lastChecked: new Date(),
      };

      return {
        success: true,
        data: healthCheck,
        message: 'Compliance health check completed successfully',
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to perform compliance health check',
      };
    }
  }

  @Post('refresh-score')
  @ApiOperation({ summary: 'Refresh compliance score calculation' })
  @ApiResponse({
    status: 200,
    description: 'Compliance score calculation refreshed successfully',
  })
  async refreshComplianceScore(@Request() req: AuthContext): Promise<{ success: boolean; data: ComplianceScore | null; message: string; error?: string }> {
    try {
      const score = await this.taxComplianceService.calculateComplianceScore(
        req.tenant.id
      );

      return {
        success: true,
        data: score,
        message: 'Compliance score calculation refreshed successfully',
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to refresh compliance score calculation',
      };
    }
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get compliance trends over time' })
  @ApiQuery({
    name: 'months',
    required: false,
    type: Number,
    description: 'Number of months to analyze (default: 12)',
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance trends retrieved successfully',
  })
  async getComplianceTrends(
    @Request() req: AuthContext,
    @Query('months', new ParseIntPipe({ optional: true })) months: number = 12
  ): Promise<{ success: boolean; data: { trends: TaxTrendAnalysis[], summary: any } | null; message: string; error?: string }> {
    try {
      const trends = await this.taxAnalyticsService.generateTrendAnalysis(
        req.tenant.id,
        months
      );

      return {
        success: true,
        data: {
          trends,
          summary: {
            averageScore:
              trends.reduce((sum, t) => sum + t.complianceScore, 0) / trends.length,
            improvement: trends[trends.length - 1].complianceScore - trends[0].complianceScore,
            bestMonth: trends.reduce((best, current) =>
              current.complianceScore > best.complianceScore ? current : best
            ),
            worstMonth: trends.reduce((worst, current) =>
              current.complianceScore < worst.complianceScore ? current : worst
            ),
          },
        },
        message: 'Compliance trends retrieved successfully',
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to retrieve compliance trends',
      };
    }
  }

  /**
   * Generate quick recommendations based on score and alerts
   */
  private generateQuickRecommendations(score: ComplianceScore, alerts: ComplianceAlert[]): string[] {
    const recommendations: string[] = [];

    if (score.overall < 70) {
      recommendations.push(
        'Urgent: Address critical compliance issues immediately'
      );
    }

    if (alerts.some(a => a.type === 'OVERDUE_FILING')) {
      recommendations.push('File all overdue tax returns to avoid penalties');
    }

    if (alerts.some(a => a.type === 'OVERDUE_PAYMENT')) {
      recommendations.push(
        'Make overdue tax payments to minimize interest charges'
      );
    }

    if (alerts.some(a => a.type === 'UPCOMING_DEADLINE')) {
      recommendations.push('Prepare for upcoming tax deadlines');
    }

    if (score.breakdown.timeliness < 80) {
      recommendations.push('Set up automated reminders for better timeliness');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current compliance standards');
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  }
}
