import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxObligationStatus, TaxPeriodStatus, TaxType } from '@prisma/client';
import { TaxPeriodService } from './tax-period.service';
import { TaxObligationService } from './tax-obligation.service';

export interface ComplianceScore {
  overall: number; // 0-100
  breakdown: {
    filing: number;
    payment: number;
    timeliness: number;
    accuracy: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ComplianceAlert {
  id: string;
  type:
    | 'OVERDUE_FILING'
    | 'OVERDUE_PAYMENT'
    | 'UPCOMING_DEADLINE'
    | 'MISSING_PERIOD'
    | 'PENALTY_APPLIED';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  description: string;
  taxType: TaxType;
  dueDate?: Date;
  amount?: number;
  actionRequired: string;
  createdAt: Date;
}

export interface ComplianceReport {
  organizationId: string;
  reportDate: Date;
  score: ComplianceScore;
  alerts: ComplianceAlert[];
  summary: {
    totalPeriods: number;
    filedPeriods: number;
    overduePeriods: number;
    totalObligations: number;
    paidObligations: number;
    overdueObligations: number;
    totalPenalties: number;
  };
  recommendations: string[];
}

export interface DeadlineReminder {
  taxType: TaxType;
  periodDescription: string;
  filingDeadline: Date;
  paymentDeadline: Date;
  daysUntilFiling: number;
  daysUntilPayment: number;
  estimatedAmount?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

@Injectable()
export class TaxComplianceService {
  private readonly logger = new Logger(TaxComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taxPeriodService: TaxPeriodService,
    private readonly taxObligationService: TaxObligationService
  ) {}

  /**
   * Calculate compliance score for organization
   */
  async calculateComplianceScore(
    organizationId: string
  ): Promise<ComplianceScore> {
    try {
      this.logger.log(
        `Calculating compliance score for organization: ${organizationId}`
      );

      const currentYear = new Date().getFullYear();
      const periods = await this.taxPeriodService.getTaxPeriods(
        organizationId,
        undefined,
        currentYear
      );
      const obligations = await this.taxObligationService.getObligations(
        organizationId,
        { year: currentYear }
      );

      // Calculate filing compliance (40% weight)
      const filingScore = this.calculateFilingScore(periods);

      // Calculate payment compliance (40% weight)
      const paymentScore = this.calculatePaymentScore(obligations);

      // Calculate timeliness (15% weight)
      const timelinessScore = this.calculateTimelinessScore(
        periods,
        obligations
      );

      // Calculate accuracy (5% weight) - simplified for now
      const accuracyScore = 95; // Assume high accuracy for now

      const overall = Math.round(
        filingScore * 0.4 +
          paymentScore * 0.4 +
          timelinessScore * 0.15 +
          accuracyScore * 0.05
      );

      const riskLevel = this.determineRiskLevel(overall);

      const score: ComplianceScore = {
        overall,
        breakdown: {
          filing: filingScore,
          payment: paymentScore,
          timeliness: timelinessScore,
          accuracy: accuracyScore,
        },
        riskLevel,
      };

      this.logger.log(
        `Compliance score calculated: ${overall}% (${riskLevel})`
      );
      return score;
    } catch (error: any) {
      this.logger.error(
        `Failed to calculate compliance score: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Generate compliance alerts
   */
  async generateComplianceAlerts(
    organizationId: string
  ): Promise<ComplianceAlert[]> {
    try {
      this.logger.log(
        `Generating compliance alerts for organization: ${organizationId}`
      );

      const alerts: ComplianceAlert[] = [];
      const now = new Date();

      // Get overdue periods
      const overduePeriods = await this.prisma.taxPeriod.findMany({
        where: {
          organizationId,
          filingDeadline: { lt: now },
          status: { not: TaxPeriodStatus.FILED },
        },
      });

      // Generate overdue filing alerts
      overduePeriods.forEach(period => {
        alerts.push({
          id: `overdue-filing-${period.id}`,
          type: 'OVERDUE_FILING',
          severity: 'ERROR',
          title: `Overdue ${period.taxType} Filing`,
          description: `${period.taxType} return for ${this.formatPeriod(period)} is overdue`,
          taxType: period.taxType,
          dueDate: period.filingDeadline,
          actionRequired: 'File tax return immediately to avoid penalties',
          createdAt: now,
        });
      });

      // Get overdue obligations
      const overdueObligations = await this.taxObligationService.getObligations(
        organizationId,
        { overdue: true }
      );

      // Generate overdue payment alerts
      overdueObligations.forEach(obligation => {
        const outstanding =
          obligation.amountDue.toNumber() - obligation.amountPaid.toNumber();
        if (outstanding > 0) {
          alerts.push({
            id: `overdue-payment-${obligation.id}`,
            type: 'OVERDUE_PAYMENT',
            severity: 'ERROR',
            title: `Overdue Tax Payment`,
            description: `Payment of K${outstanding.toFixed(2)} is overdue`,
            taxType: obligation.taxPeriod?.taxType || TaxType.VAT,
            dueDate: obligation.dueDate,
            amount: outstanding,
            actionRequired:
              'Make payment immediately to avoid additional penalties',
            createdAt: now,
          });
        }
      });

      // Get upcoming deadlines (next 7 days)
      const upcomingDeadlines = await this.getUpcomingDeadlines(
        organizationId,
        7
      );

      // Generate upcoming deadline alerts
      upcomingDeadlines.forEach(deadline => {
        const severity = deadline.daysUntilFiling <= 3 ? 'WARNING' : 'INFO';
        alerts.push({
          id: `upcoming-${deadline.taxType}-${deadline.filingDeadline.getTime()}`,
          type: 'UPCOMING_DEADLINE',
          severity,
          title: `Upcoming ${deadline.taxType} Deadline`,
          description: `${deadline.periodDescription} filing due in ${deadline.daysUntilFiling} days`,
          taxType: deadline.taxType,
          dueDate: deadline.filingDeadline,
          amount: deadline.estimatedAmount,
          actionRequired: 'Prepare and file tax return',
          createdAt: now,
        });
      });

      // Sort alerts by severity and date
      alerts.sort((a, b) => {
        const severityOrder = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
      });

      this.logger.log(`Generated ${alerts.length} compliance alerts`);
      return alerts;
    } catch (error: any) {
      this.logger.error(
        `Failed to generate compliance alerts: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(
    organizationId: string
  ): Promise<ComplianceReport> {
    try {
      this.logger.log(
        `Generating compliance report for organization: ${organizationId}`
      );

      const score = await this.calculateComplianceScore(organizationId);
      const alerts = await this.generateComplianceAlerts(organizationId);
      const summary = await this.generateComplianceSummary(organizationId);
      const recommendations = this.generateRecommendations(score, alerts);

      const report: ComplianceReport = {
        organizationId,
        reportDate: new Date(),
        score,
        alerts,
        summary,
        recommendations,
      };

      this.logger.log('Compliance report generated successfully');
      return report;
    } catch (error: any) {
      this.logger.error(
        `Failed to generate compliance report: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get upcoming deadlines
   */
  async getUpcomingDeadlines(
    organizationId: string,
    days: number = 30
  ): Promise<DeadlineReminder[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const periods = await this.prisma.taxPeriod.findMany({
        where: {
          organizationId,
          filingDeadline: {
            gte: new Date(),
            lte: futureDate,
          },
          status: { not: TaxPeriodStatus.FILED },
        },
        orderBy: { filingDeadline: 'asc' },
      });

      const reminders: DeadlineReminder[] = periods.map(period => {
        const now = new Date();
        const daysUntilFiling = Math.ceil(
          (period.filingDeadline.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        const daysUntilPayment = Math.ceil(
          (period.paymentDeadline.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'LOW';
        if (daysUntilFiling <= 3) priority = 'URGENT';
        else if (daysUntilFiling <= 7) priority = 'HIGH';
        else if (daysUntilFiling <= 14) priority = 'MEDIUM';

        return {
          taxType: period.taxType,
          periodDescription: this.formatPeriod(period),
          filingDeadline: period.filingDeadline,
          paymentDeadline: period.paymentDeadline,
          daysUntilFiling,
          daysUntilPayment,
          priority,
        };
      });

      return reminders;
    } catch (error: any) {
      this.logger.error(
        `Failed to get upcoming deadlines: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Calculate filing compliance score
   */
  private calculateFilingScore(periods: any[]): number {
    if (periods.length === 0) return 100;

    const filedPeriods = periods.filter(
      p => p.status === TaxPeriodStatus.FILED
    ).length;
    return Math.round((filedPeriods / periods.length) * 100);
  }

  /**
   * Calculate payment compliance score
   */
  private calculatePaymentScore(obligations: any[]): number {
    if (obligations.length === 0) return 100;

    const paidObligations = obligations.filter(
      o => o.status === TaxObligationStatus.COMPLETED
    ).length;
    return Math.round((paidObligations / obligations.length) * 100);
  }

  /**
   * Calculate timeliness score
   */
  private calculateTimelinessScore(periods: any[], obligations: any[]): number {
    const now = new Date();
    let timelyCount = 0;
    let totalCount = 0;

    // Check filing timeliness
    periods.forEach(period => {
      if (period.status === TaxPeriodStatus.FILED) {
        totalCount++;
        if (period.filedAt <= period.filingDeadline) {
          timelyCount++;
        }
      }
    });

    // Check payment timeliness
    obligations.forEach(obligation => {
      if (obligation.status === TaxObligationStatus.COMPLETED) {
        totalCount++;
        if (obligation.paidAt <= obligation.dueDate) {
          timelyCount++;
        }
      }
    });

    return totalCount > 0 ? Math.round((timelyCount / totalCount) * 100) : 100;
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(
    score: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 90) return 'LOW';
    if (score >= 75) return 'MEDIUM';
    if (score >= 60) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Generate compliance summary
   */
  private async generateComplianceSummary(organizationId: string) {
    const currentYear = new Date().getFullYear();
    const periods = await this.taxPeriodService.getTaxPeriods(
      organizationId,
      undefined,
      currentYear
    );
    const obligationSummary =
      await this.taxObligationService.getObligationSummary(
        organizationId,
        currentYear
      );

    return {
      totalPeriods: periods.length,
      filedPeriods: periods.filter(p => p.status === TaxPeriodStatus.FILED)
        .length,
      overduePeriods: periods.filter(
        p => p.filingDeadline < new Date() && p.status !== TaxPeriodStatus.FILED
      ).length,
      totalObligations: obligationSummary.totalObligations,
      paidObligations:
        obligationSummary.byStatus[TaxObligationStatus.COMPLETED]?.count || 0,
      overdueObligations: obligationSummary.totalOverdue,
      totalPenalties: 0, // Will be calculated from actual penalty data
    };
  }

  /**
   * Generate recommendations based on compliance status
   */
  private generateRecommendations(
    score: ComplianceScore,
    alerts: ComplianceAlert[]
  ): string[] {
    const recommendations: string[] = [];

    if (score.overall < 75) {
      recommendations.push(
        'Improve overall tax compliance by addressing overdue filings and payments'
      );
    }

    if (score.breakdown.filing < 80) {
      recommendations.push(
        'Set up automated reminders for tax filing deadlines'
      );
    }

    if (score.breakdown.payment < 80) {
      recommendations.push(
        'Establish a tax payment schedule to avoid late payments'
      );
    }

    if (alerts.some(a => a.type === 'OVERDUE_FILING')) {
      recommendations.push(
        'File all overdue tax returns immediately to minimize penalties'
      );
    }

    if (alerts.some(a => a.type === 'OVERDUE_PAYMENT')) {
      recommendations.push(
        'Make all overdue tax payments to avoid additional interest charges'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Maintain current compliance standards and continue monitoring deadlines'
      );
    }

    return recommendations;
  }

  /**
   * Format period description
   */
  private formatPeriod(period: any): string {
    if (period.quarter) {
      return `Q${period.quarter} ${period.year}`;
    }
    if (period.month) {
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return `${monthNames[period.month - 1]} ${period.year}`;
    }
    return `${period.year}`;
  }
}
