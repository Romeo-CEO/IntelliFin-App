import { apiClient } from './client';

export interface ComplianceScore {
  overall: number;
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
  type: 'OVERDUE_FILING' | 'OVERDUE_PAYMENT' | 'UPCOMING_DEADLINE' | 'MISSING_PERIOD' | 'PENALTY_APPLIED';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  description: string;
  taxType: string;
  dueDate?: string;
  amount?: number;
  actionRequired: string;
  createdAt: string;
}

export interface ComplianceReport {
  organizationId: string;
  reportDate: string;
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
  taxType: string;
  periodDescription: string;
  filingDeadline: string;
  paymentDeadline: string;
  daysUntilFiling: number;
  daysUntilPayment: number;
  estimatedAmount?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface ComplianceDashboard {
  complianceScore: ComplianceScore;
  alerts: {
    total: number;
    critical: number;
    items: ComplianceAlert[];
  };
  upcomingDeadlines: {
    total: number;
    urgent: number;
    items: DeadlineReminder[];
  };
  quickStats: {
    riskLevel: string;
    overallScore: number;
    criticalIssues: number;
    urgentDeadlines: number;
  };
  recommendations: string[];
}

export interface ComplianceHealthCheck {
  healthStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  complianceScore: number;
  riskLevel: string;
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
  lastChecked: string;
}

export interface ComplianceTrends {
  trends: Array<{
    month: string;
    score: number;
    filingCompliance: number;
    paymentCompliance: number;
    timeliness: number;
  }>;
  summary: {
    averageScore: number;
    improvement: number;
    bestMonth: {
      month: string;
      score: number;
    };
    worstMonth: {
      month: string;
      score: number;
    };
  };
}

export const taxComplianceApi = {
  // Compliance score endpoints
  async getComplianceScore() {
    return apiClient.get<ComplianceScore>('/tax-compliance/score');
  },

  async refreshComplianceScore() {
    return apiClient.post<ComplianceScore>('/tax-compliance/refresh-score');
  },

  // Compliance alerts endpoints
  async getComplianceAlerts() {
    return apiClient.get<ComplianceAlert[]>('/tax-compliance/alerts');
  },

  // Compliance report endpoints
  async getComplianceReport() {
    return apiClient.get<ComplianceReport>('/tax-compliance/report');
  },

  // Deadline management endpoints
  async getUpcomingDeadlines(days = 30) {
    return apiClient.get<DeadlineReminder[]>('/tax-compliance/deadlines', {
      params: { days },
    });
  },

  // Dashboard endpoints
  async getComplianceDashboard() {
    return apiClient.get<ComplianceDashboard>('/tax-compliance/dashboard');
  },

  // Health check endpoints
  async performHealthCheck() {
    return apiClient.get<ComplianceHealthCheck>('/tax-compliance/health-check');
  },

  // Trends and analytics endpoints
  async getComplianceTrends(months = 12) {
    return apiClient.get<ComplianceTrends>('/tax-compliance/trends', {
      params: { months },
    });
  },

  // Utility methods for frontend use
  getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'LOW':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CRITICAL':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  },

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'INFO':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  },

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'URGENT':
        return 'text-red-600 bg-red-50';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50';
      case 'LOW':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  },

  formatTaxType(taxType: string): string {
    const taxTypeLabels: Record<string, string> = {
      VAT: 'Value Added Tax',
      INCOME_TAX: 'Income Tax',
      PAYE: 'Pay As You Earn',
      WITHHOLDING_TAX: 'Withholding Tax',
      ADVANCE_TAX: 'Advance Tax',
      TURNOVER_TAX: 'Turnover Tax',
      PROPERTY_TAX: 'Property Transfer Tax',
      EXCISE_TAX: 'Excise Tax',
    };
    return taxTypeLabels[taxType] || taxType;
  },

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2,
    }).format(amount);
  },

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays === -1) return 'Yesterday';
    if (diffInDays > 0) return `In ${diffInDays} days`;
    return `${Math.abs(diffInDays)} days ago`;
  },

  getHealthStatusColor(status: string): string {
    switch (status) {
      case 'EXCELLENT':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'GOOD':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'FAIR':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'POOR':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CRITICAL':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  },

  getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  },
};
