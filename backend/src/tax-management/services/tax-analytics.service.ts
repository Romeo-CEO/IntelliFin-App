import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxType, TaxPeriodStatus, TaxObligationStatus } from '@prisma/client';

export interface TaxTrendAnalysis {
  period: string;
  taxLiability: number;
  taxPaid: number;
  complianceScore: number;
  filingRate: number;
  paymentRate: number;
}

export interface CompliancePrediction {
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

export interface TaxEfficiencyMetrics {
  effectiveTaxRate: number;
  taxBurdenRatio: number;
  complianceCost: number;
  penaltyRatio: number;
  timeToFile: number;
  automationRate: number;
}

export interface TaxBenchmarking {
  organizationMetrics: TaxEfficiencyMetrics;
  industryAverage: TaxEfficiencyMetrics;
  percentileRanking: number;
  improvementAreas: string[];
}

export interface SeasonalAnalysis {
  month: number;
  monthName: string;
  averageTaxLiability: number;
  averageComplianceScore: number;
  filingVolume: number;
  seasonalityIndex: number;
}

export interface TaxRiskAssessment {
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

@Injectable()
export class TaxAnalyticsService {
  private readonly logger = new Logger(TaxAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate tax trend analysis
   */
  async generateTrendAnalysis(
    organizationId: string,
    months: number = 12,
  ): Promise<TaxTrendAnalysis[]> {
    try {
      this.logger.log(`Generating tax trend analysis for ${months} months`);

      const trends: TaxTrendAnalysis[] = [];
      const endDate = new Date();
      
      for (let i = months - 1; i >= 0; i--) {
        const periodStart = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
        const periodEnd = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 0);
        
        const periodData = await this.getPeriodMetrics(organizationId, periodStart, periodEnd);
        
        trends.push({
          period: periodStart.toISOString().substring(0, 7), // YYYY-MM format
          taxLiability: periodData.taxLiability,
          taxPaid: periodData.taxPaid,
          complianceScore: periodData.complianceScore,
          filingRate: periodData.filingRate,
          paymentRate: periodData.paymentRate,
        });
      }

      this.logger.log('Tax trend analysis generated successfully');
      return trends;
    } catch (error) {
      this.logger.error(`Failed to generate trend analysis: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Predict compliance score for next period
   */
  async predictCompliance(organizationId: string): Promise<CompliancePrediction> {
    try {
      this.logger.log(`Predicting compliance for organization: ${organizationId}`);

      // Get historical data for trend analysis
      const trends = await this.generateTrendAnalysis(organizationId, 6);
      
      // Calculate trend factors
      const historicalTrend = this.calculateTrend(trends.map(t => t.complianceScore));
      const seasonalAdjustment = this.calculateSeasonalAdjustment(trends);
      const currentPerformance = trends[trends.length - 1]?.complianceScore || 0;
      
      // Get upcoming deadlines impact
      const upcomingDeadlines = await this.getUpcomingDeadlinesImpact(organizationId);
      
      // Predict next period score
      const baseScore = currentPerformance;
      const trendAdjustment = historicalTrend * 0.3;
      const seasonalAdj = seasonalAdjustment * 0.2;
      const deadlineImpact = upcomingDeadlines * 0.1;
      
      const predictedScore = Math.max(0, Math.min(100, 
        baseScore + trendAdjustment + seasonalAdj - deadlineImpact
      ));

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (predictedScore >= 90) riskLevel = 'LOW';
      else if (predictedScore >= 75) riskLevel = 'MEDIUM';
      else if (predictedScore >= 60) riskLevel = 'HIGH';
      else riskLevel = 'CRITICAL';

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(
        predictedScore,
        historicalTrend,
        upcomingDeadlines
      );

      // Calculate confidence based on data quality and consistency
      const confidence = this.calculatePredictionConfidence(trends);

      const prediction: CompliancePrediction = {
        nextPeriod: {
          period: this.getNextPeriodString(),
          predictedScore: Math.round(predictedScore),
          riskLevel,
          recommendations,
        },
        factors: {
          historicalTrend,
          seasonalAdjustment,
          currentPerformance,
          upcomingDeadlines,
        },
        confidence,
      };

      this.logger.log(`Compliance prediction completed: ${predictedScore}% (${riskLevel})`);
      return prediction;
    } catch (error) {
      this.logger.error(`Failed to predict compliance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate tax efficiency metrics
   */
  async calculateEfficiencyMetrics(organizationId: string): Promise<TaxEfficiencyMetrics> {
    try {
      this.logger.log(`Calculating tax efficiency metrics for organization: ${organizationId}`);

      const currentYear = new Date().getFullYear();
      
      // Get annual tax data
      const taxData = await this.getAnnualTaxData(organizationId, currentYear);
      
      // Calculate metrics
      const effectiveTaxRate = taxData.totalRevenue > 0 ? 
        (taxData.totalTaxPaid / taxData.totalRevenue) * 100 : 0;
      
      const taxBurdenRatio = taxData.totalProfit > 0 ? 
        (taxData.totalTaxPaid / taxData.totalProfit) * 100 : 0;
      
      const complianceCost = taxData.complianceExpenses || 0;
      
      const penaltyRatio = taxData.totalTaxPaid > 0 ? 
        (taxData.totalPenalties / taxData.totalTaxPaid) * 100 : 0;
      
      const timeToFile = taxData.averageFilingTime || 0;
      
      const automationRate = taxData.totalFilings > 0 ? 
        (taxData.automatedFilings / taxData.totalFilings) * 100 : 0;

      const metrics: TaxEfficiencyMetrics = {
        effectiveTaxRate,
        taxBurdenRatio,
        complianceCost,
        penaltyRatio,
        timeToFile,
        automationRate,
      };

      this.logger.log('Tax efficiency metrics calculated successfully');
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to calculate efficiency metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate seasonal analysis
   */
  async generateSeasonalAnalysis(organizationId: string): Promise<SeasonalAnalysis[]> {
    try {
      this.logger.log(`Generating seasonal analysis for organization: ${organizationId}`);

      const seasonalData: SeasonalAnalysis[] = [];
      
      for (let month = 1; month <= 12; month++) {
        const monthData = await this.getMonthlyAverages(organizationId, month);
        
        seasonalData.push({
          month,
          monthName: new Date(2024, month - 1, 1).toLocaleString('default', { month: 'long' }),
          averageTaxLiability: monthData.averageTaxLiability,
          averageComplianceScore: monthData.averageComplianceScore,
          filingVolume: monthData.filingVolume,
          seasonalityIndex: monthData.seasonalityIndex,
        });
      }

      this.logger.log('Seasonal analysis generated successfully');
      return seasonalData;
    } catch (error) {
      this.logger.error(`Failed to generate seasonal analysis: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Assess tax risks
   */
  async assessTaxRisks(organizationId: string): Promise<TaxRiskAssessment> {
    try {
      this.logger.log(`Assessing tax risks for organization: ${organizationId}`);

      const riskFactors = [];
      let totalRiskScore = 0;

      // Check compliance history
      const complianceHistory = await this.getComplianceHistory(organizationId);
      if (complianceHistory.averageScore < 80) {
        riskFactors.push({
          factor: 'Poor Compliance History',
          impact: 'HIGH' as const,
          probability: 0.8,
          mitigation: 'Implement automated compliance monitoring and regular reviews',
        });
        totalRiskScore += 30;
      }

      // Check overdue obligations
      const overdueCount = await this.getOverdueObligationsCount(organizationId);
      if (overdueCount > 0) {
        riskFactors.push({
          factor: 'Overdue Tax Obligations',
          impact: 'HIGH' as const,
          probability: 1.0,
          mitigation: 'Immediately settle overdue obligations and set up payment reminders',
        });
        totalRiskScore += 25;
      }

      // Check penalty history
      const penaltyHistory = await this.getPenaltyHistory(organizationId);
      if (penaltyHistory.totalPenalties > 0) {
        riskFactors.push({
          factor: 'Previous Tax Penalties',
          impact: 'MEDIUM' as const,
          probability: 0.6,
          mitigation: 'Review processes to prevent future penalties and ensure timely compliance',
        });
        totalRiskScore += 15;
      }

      // Check filing consistency
      const filingConsistency = await this.getFilingConsistency(organizationId);
      if (filingConsistency < 90) {
        riskFactors.push({
          factor: 'Inconsistent Filing Pattern',
          impact: 'MEDIUM' as const,
          probability: 0.7,
          mitigation: 'Establish regular filing schedules and automated reminders',
        });
        totalRiskScore += 10;
      }

      // Determine overall risk level
      let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (totalRiskScore >= 50) overallRisk = 'CRITICAL';
      else if (totalRiskScore >= 30) overallRisk = 'HIGH';
      else if (totalRiskScore >= 15) overallRisk = 'MEDIUM';
      else overallRisk = 'LOW';

      // Generate recommendations
      const recommendations = this.generateRiskRecommendations(riskFactors, overallRisk);

      const assessment: TaxRiskAssessment = {
        overallRisk,
        riskFactors,
        riskScore: totalRiskScore,
        recommendations,
      };

      this.logger.log(`Tax risk assessment completed: ${overallRisk} risk (${totalRiskScore} points)`);
      return assessment;
    } catch (error) {
      this.logger.error(`Failed to assess tax risks: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get period metrics for trend analysis
   */
  private async getPeriodMetrics(organizationId: string, start: Date, end: Date) {
    // TODO: Implement actual data retrieval from database
    // For now, return mock data with some variation
    const baseScore = 85 + Math.random() * 10;
    return {
      taxLiability: 10000 + Math.random() * 5000,
      taxPaid: 9000 + Math.random() * 4000,
      complianceScore: baseScore,
      filingRate: 90 + Math.random() * 10,
      paymentRate: 85 + Math.random() * 15,
    };
  }

  /**
   * Calculate trend from historical data
   */
  private calculateTrend(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    const recent = scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);
    const older = scores.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, scores.length - 3);
    
    return recent - older;
  }

  /**
   * Calculate seasonal adjustment
   */
  private calculateSeasonalAdjustment(trends: TaxTrendAnalysis[]): number {
    // Simplified seasonal calculation
    const currentMonth = new Date().getMonth() + 1;
    const seasonalFactors = [0, -2, 1, 5, 2, -1, -3, 1, 2, 3, -1, 4]; // Mock seasonal factors
    return seasonalFactors[currentMonth - 1] || 0;
  }

  /**
   * Get upcoming deadlines impact
   */
  private async getUpcomingDeadlinesImpact(organizationId: string): Promise<number> {
    // TODO: Calculate actual impact based on upcoming deadlines
    return Math.random() * 5; // Mock impact score
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(
    predictedScore: number,
    trend: number,
    deadlineImpact: number,
  ): string[] {
    const recommendations: string[] = [];

    if (predictedScore < 70) {
      recommendations.push('Urgent: Implement comprehensive compliance review process');
    }

    if (trend < -5) {
      recommendations.push('Address declining compliance trend with process improvements');
    }

    if (deadlineImpact > 3) {
      recommendations.push('Set up automated reminders for upcoming tax deadlines');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current compliance standards and monitor regularly');
    }

    return recommendations;
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(trends: TaxTrendAnalysis[]): number {
    if (trends.length < 3) return 50;
    
    // Calculate variance in compliance scores
    const scores = trends.map(t => t.complianceScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    
    // Lower variance = higher confidence
    const confidence = Math.max(60, Math.min(95, 100 - variance));
    return Math.round(confidence);
  }

  /**
   * Get next period string
   */
  private getNextPeriodString(): string {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().substring(0, 7);
  }

  /**
   * Get annual tax data
   */
  private async getAnnualTaxData(organizationId: string, year: number) {
    // TODO: Implement actual data retrieval
    return {
      totalRevenue: 500000,
      totalProfit: 100000,
      totalTaxPaid: 35000,
      totalPenalties: 1000,
      complianceExpenses: 5000,
      totalFilings: 12,
      automatedFilings: 8,
      averageFilingTime: 2.5,
    };
  }

  /**
   * Get monthly averages
   */
  private async getMonthlyAverages(organizationId: string, month: number) {
    // TODO: Implement actual data retrieval
    return {
      averageTaxLiability: 8000 + Math.random() * 4000,
      averageComplianceScore: 85 + Math.random() * 10,
      filingVolume: 3 + Math.floor(Math.random() * 3),
      seasonalityIndex: 1 + (Math.random() - 0.5) * 0.4,
    };
  }

  /**
   * Get compliance history
   */
  private async getComplianceHistory(organizationId: string) {
    // TODO: Implement actual data retrieval
    return {
      averageScore: 82,
      totalPeriods: 12,
      onTimeFiling: 10,
    };
  }

  /**
   * Get overdue obligations count
   */
  private async getOverdueObligationsCount(organizationId: string): Promise<number> {
    return await this.prisma.taxObligation.count({
      where: {
        organizationId,
        dueDate: { lt: new Date() },
        status: { not: TaxObligationStatus.COMPLETED },
      },
    });
  }

  /**
   * Get penalty history
   */
  private async getPenaltyHistory(organizationId: string) {
    // TODO: Implement actual data retrieval
    return {
      totalPenalties: 500,
      penaltyCount: 2,
    };
  }

  /**
   * Get filing consistency
   */
  private async getFilingConsistency(organizationId: string): Promise<number> {
    // TODO: Calculate actual filing consistency
    return 88; // Mock consistency percentage
  }

  /**
   * Generate risk recommendations
   */
  private generateRiskRecommendations(riskFactors: any[], overallRisk: string): string[] {
    const recommendations: string[] = [];

    if (overallRisk === 'CRITICAL') {
      recommendations.push('Immediate action required: Engage tax compliance expert');
    }

    riskFactors.forEach(factor => {
      recommendations.push(factor.mitigation);
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue current practices and monitor regularly');
    }

    return recommendations;
  }
}
