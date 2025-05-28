import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TaxComplianceService } from '../services/tax-compliance.service';

@ApiTags('Tax Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-compliance')
export class TaxComplianceController {
  constructor(private readonly taxComplianceService: TaxComplianceService) {}

  @Get('score')
  @ApiOperation({ summary: 'Get compliance score for organization' })
  @ApiResponse({ status: 200, description: 'Compliance score retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getComplianceScore(@Request() req: any) {
    try {
      const score = await this.taxComplianceService.calculateComplianceScore(req.user.organizationId);

      return {
        success: true,
        data: score,
        message: 'Compliance score retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve compliance score',
      };
    }
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get compliance alerts for organization' })
  @ApiResponse({ status: 200, description: 'Compliance alerts retrieved successfully' })
  async getComplianceAlerts(@Request() req: any) {
    try {
      const alerts = await this.taxComplianceService.generateComplianceAlerts(req.user.organizationId);

      return {
        success: true,
        data: alerts,
        message: 'Compliance alerts retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve compliance alerts',
      };
    }
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate comprehensive compliance report' })
  @ApiResponse({ status: 200, description: 'Compliance report generated successfully' })
  async getComplianceReport(@Request() req: any) {
    try {
      const report = await this.taxComplianceService.generateComplianceReport(req.user.organizationId);

      return {
        success: true,
        data: report,
        message: 'Compliance report generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate compliance report',
      };
    }
  }

  @Get('deadlines')
  @ApiOperation({ summary: 'Get upcoming tax deadlines' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look ahead (default: 30)' })
  @ApiResponse({ status: 200, description: 'Upcoming deadlines retrieved successfully' })
  async getUpcomingDeadlines(
    @Request() req: any,
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
  ) {
    try {
      const deadlines = await this.taxComplianceService.getUpcomingDeadlines(
        req.user.organizationId,
        days,
      );

      return {
        success: true,
        data: deadlines,
        message: 'Upcoming deadlines retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve upcoming deadlines',
      };
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get compliance dashboard data' })
  @ApiResponse({ status: 200, description: 'Compliance dashboard data retrieved successfully' })
  async getComplianceDashboard(@Request() req: any) {
    try {
      // Get compliance score
      const score = await this.taxComplianceService.calculateComplianceScore(req.user.organizationId);

      // Get alerts (limit to top 10)
      const allAlerts = await this.taxComplianceService.generateComplianceAlerts(req.user.organizationId);
      const alerts = allAlerts.slice(0, 10);

      // Get upcoming deadlines (next 14 days)
      const upcomingDeadlines = await this.taxComplianceService.getUpcomingDeadlines(
        req.user.organizationId,
        14,
      );

      // Calculate quick stats
      const criticalAlerts = allAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'ERROR').length;
      const urgentDeadlines = upcomingDeadlines.filter(d => d.priority === 'URGENT' || d.priority === 'HIGH').length;

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
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve compliance dashboard data',
      };
    }
  }

  @Get('health-check')
  @ApiOperation({ summary: 'Perform compliance health check' })
  @ApiResponse({ status: 200, description: 'Compliance health check completed successfully' })
  async performHealthCheck(@Request() req: any) {
    try {
      const score = await this.taxComplianceService.calculateComplianceScore(req.user.organizationId);
      const alerts = await this.taxComplianceService.generateComplianceAlerts(req.user.organizationId);
      const upcomingDeadlines = await this.taxComplianceService.getUpcomingDeadlines(
        req.user.organizationId,
        7, // Next 7 days
      );

      // Categorize issues
      const criticalIssues = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'ERROR');
      const warnings = alerts.filter(a => a.severity === 'WARNING');
      const urgentDeadlines = upcomingDeadlines.filter(d => d.priority === 'URGENT');

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

      const healthCheck = {
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
            priority: 'HIGH',
            action: issue.actionRequired,
            description: issue.description,
          })),
          ...urgentDeadlines.slice(0, 2).map(deadline => ({
            priority: 'MEDIUM',
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
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to perform compliance health check',
      };
    }
  }

  @Post('refresh-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh compliance score calculation' })
  @ApiResponse({ status: 200, description: 'Compliance score refreshed successfully' })
  async refreshComplianceScore(@Request() req: any) {
    try {
      const score = await this.taxComplianceService.calculateComplianceScore(req.user.organizationId);

      return {
        success: true,
        data: score,
        message: 'Compliance score refreshed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to refresh compliance score',
      };
    }
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get compliance trends over time' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to analyze (default: 12)' })
  @ApiResponse({ status: 200, description: 'Compliance trends retrieved successfully' })
  async getComplianceTrends(
    @Request() req: any,
    @Query('months', new ParseIntPipe({ optional: true })) months: number = 12,
  ) {
    try {
      // For now, return mock trend data
      // In a full implementation, this would analyze historical compliance data
      const trends = Array.from({ length: months }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (months - 1 - i));
        
        return {
          month: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
          score: Math.floor(Math.random() * 20) + 80, // Mock scores between 80-100
          filingCompliance: Math.floor(Math.random() * 15) + 85,
          paymentCompliance: Math.floor(Math.random() * 15) + 85,
          timeliness: Math.floor(Math.random() * 20) + 80,
        };
      });

      return {
        success: true,
        data: {
          trends,
          summary: {
            averageScore: trends.reduce((sum, t) => sum + t.score, 0) / trends.length,
            improvement: trends[trends.length - 1].score - trends[0].score,
            bestMonth: trends.reduce((best, current) => 
              current.score > best.score ? current : best
            ),
            worstMonth: trends.reduce((worst, current) => 
              current.score < worst.score ? current : worst
            ),
          },
        },
        message: 'Compliance trends retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve compliance trends',
      };
    }
  }

  /**
   * Generate quick recommendations based on score and alerts
   */
  private generateQuickRecommendations(score: any, alerts: any[]): string[] {
    const recommendations: string[] = [];

    if (score.overall < 70) {
      recommendations.push('Urgent: Address critical compliance issues immediately');
    }

    if (alerts.some(a => a.type === 'OVERDUE_FILING')) {
      recommendations.push('File all overdue tax returns to avoid penalties');
    }

    if (alerts.some(a => a.type === 'OVERDUE_PAYMENT')) {
      recommendations.push('Make overdue tax payments to minimize interest charges');
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
