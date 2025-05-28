import { apiClient } from './client';

export interface TaxCalculationRequest {
  taxType: string;
  amount: number;
  isInclusive?: boolean;
  effectiveDate?: string;
  metadata?: Record<string, any>;
}

export interface TaxCalculationResult {
  taxType: string;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  taxRate: number;
  isInclusive: boolean;
  effectiveDate: string;
  calculation: {
    baseAmount: number;
    applicableRate: number;
    exemptions: number;
    adjustments: number;
    finalTaxAmount: number;
  };
}

export interface TaxType {
  value: string;
  label: string;
  description: string;
}

export interface TaxRates {
  VAT: {
    standard: number;
    zeroRated: number;
    exempt: string;
  };
  WITHHOLDING_TAX: {
    standard: number;
    professionalServices: number;
    rent: number;
    interest: number;
    dividends: number;
  };
  INCOME_TAX: {
    corporate: number;
    brackets: Array<{
      min: number;
      max: number | string;
      rate: number;
    }>;
  };
  PAYE: {
    brackets: Array<{
      min: number;
      max: number | string;
      rate: number;
    }>;
  };
  TURNOVER_TAX: {
    rate: number;
    threshold: number;
  };
}

export const taxManagementApi = {
  // Tax calculation endpoints
  async calculateTax(request: TaxCalculationRequest) {
    return apiClient.post<TaxCalculationResult>('/tax-management/calculate', request);
  },

  async calculateVAT(amount: number, isInclusive = false, effectiveDate?: string) {
    return apiClient.post<TaxCalculationResult>('/tax-management/calculate/vat', {
      amount,
      isInclusive,
      effectiveDate,
    });
  },

  async calculateWithholdingTax(amount: number, serviceType?: string, effectiveDate?: string) {
    return apiClient.post<TaxCalculationResult>('/tax-management/calculate/withholding-tax', {
      amount,
      serviceType,
      effectiveDate,
    });
  },

  async calculateIncomeTax(taxableIncome: number, effectiveDate?: string) {
    return apiClient.post<TaxCalculationResult>('/tax-management/calculate/income-tax', {
      taxableIncome,
      effectiveDate,
    });
  },

  async calculatePAYE(grossSalary: number, effectiveDate?: string) {
    return apiClient.post<TaxCalculationResult>('/tax-management/calculate/paye', {
      grossSalary,
      effectiveDate,
    });
  },

  async calculateTurnoverTax(turnover: number, effectiveDate?: string) {
    return apiClient.post<TaxCalculationResult>('/tax-management/calculate/turnover-tax', {
      turnover,
      effectiveDate,
    });
  },

  // Tax configuration endpoints
  async getTaxTypes() {
    return apiClient.get<TaxType[]>('/tax-management/tax-types');
  },

  async getCurrentTaxRates() {
    return apiClient.get<TaxRates>('/tax-management/tax-rates');
  },

  // Tax periods endpoints
  async createTaxPeriod(data: {
    taxType: string;
    year: number;
    quarter?: number;
    month?: number;
    customPeriodStart?: string;
    customPeriodEnd?: string;
  }) {
    return apiClient.post('/tax-periods', data);
  },

  async getTaxPeriods(params?: {
    taxType?: string;
    year?: number;
    status?: string;
  }) {
    return apiClient.get('/tax-periods', { params });
  },

  async getTaxCalendar(year?: number) {
    return apiClient.get('/tax-periods/calendar', { params: { year } });
  },

  async closeTaxPeriod(periodId: string) {
    return apiClient.put(`/tax-periods/${periodId}/close`);
  },

  async markPeriodAsFiled(periodId: string, filingReference?: string) {
    return apiClient.put(`/tax-periods/${periodId}/file`, { filingReference });
  },

  async generatePeriodsForYear(year: number, taxTypes?: string[]) {
    return apiClient.post(`/tax-periods/generate/${year}`, { taxTypes });
  },

  async getCurrentPeriods() {
    return apiClient.get('/tax-periods/current');
  },

  async getOverduePeriods() {
    return apiClient.get('/tax-periods/overdue');
  },

  async getUpcomingPeriodDeadlines(days = 30) {
    return apiClient.get('/tax-periods/upcoming', { params: { days } });
  },

  async getTaxPeriodsSummary(year?: number) {
    return apiClient.get('/tax-periods/summary', { params: { year } });
  },

  // Tax obligations endpoints
  async createTaxObligation(data: {
    taxPeriodId: string;
    obligationType: string;
    amountDue: number;
    dueDate: string;
    description?: string;
  }) {
    return apiClient.post('/tax-obligations', data);
  },

  async getTaxObligations(params?: {
    taxPeriodId?: string;
    obligationType?: string;
    status?: string;
    overdue?: boolean;
    year?: number;
  }) {
    return apiClient.get('/tax-obligations', { params });
  },

  async updateTaxObligation(obligationId: string, data: {
    amountDue?: number;
    amountPaid?: number;
    status?: string;
    paymentMethod?: string;
    paymentReference?: string;
    penaltyAmount?: number;
    interestAmount?: number;
  }) {
    return apiClient.put(`/tax-obligations/${obligationId}`, data);
  },

  async recordObligationPayment(obligationId: string, data: {
    amount: number;
    paymentMethod: string;
    paymentReference?: string;
  }) {
    return apiClient.post(`/tax-obligations/${obligationId}/payment`, data);
  },

  async calculatePenalties() {
    return apiClient.post('/tax-obligations/calculate-penalties');
  },

  async getTaxObligationsSummary(year?: number) {
    return apiClient.get('/tax-obligations/summary', { params: { year } });
  },

  async getUpcomingObligations() {
    return apiClient.get('/tax-obligations/upcoming');
  },

  async getOverdueObligations() {
    return apiClient.get('/tax-obligations/overdue');
  },

  async getTaxObligationsDashboard() {
    return apiClient.get('/tax-obligations/dashboard');
  },

  async getObligationsByType(type: string, year?: number) {
    return apiClient.get(`/tax-obligations/by-type/${type}`, { params: { year } });
  },

  async getTaxObligationsAnalytics(year?: number) {
    return apiClient.get('/tax-obligations/analytics', { params: { year } });
  },

  // Withholding tax endpoints
  async createWithholdingCertificate(data: {
    taxPeriodId: string;
    supplierName: string;
    supplierTin?: string;
    serviceType: string;
    serviceDescription?: string;
    grossAmount: number;
    withholdingRate?: number;
    paymentDate: string;
  }) {
    return apiClient.post('/withholding-tax/certificates', data);
  },

  async getWithholdingCertificates(params?: {
    taxPeriodId?: string;
    supplierTin?: string;
    serviceType?: string;
    status?: string;
    year?: number;
    month?: number;
  }) {
    return apiClient.get('/withholding-tax/certificates', { params });
  },

  async submitWithholdingCertificate(certificateId: string) {
    return apiClient.put(`/withholding-tax/certificates/${certificateId}/submit`);
  },

  async bulkSubmitWithholdingCertificates(certificateIds: string[]) {
    return apiClient.post('/withholding-tax/certificates/bulk-submit', { certificateIds });
  },

  async getWithholdingSummary(year?: number, month?: number) {
    return apiClient.get('/withholding-tax/summary', { params: { year, month } });
  },

  async generateMonthlyWHTReturn(year: number, month: number) {
    return apiClient.get(`/withholding-tax/monthly-return/${year}/${month}`);
  },

  async getWithholdingServiceTypes() {
    return apiClient.get('/withholding-tax/service-types');
  },

  // Tax adjustment endpoints
  async createTaxAdjustment(data: {
    taxPeriodId: string;
    adjustmentType: string;
    originalAmount: number;
    adjustedAmount: number;
    reason: string;
    description?: string;
  }) {
    return apiClient.post('/tax-adjustments', data);
  },

  async getTaxAdjustments(params?: {
    taxPeriodId?: string;
    adjustmentType?: string;
    status?: string;
    year?: number;
    requestedBy?: string;
  }) {
    return apiClient.get('/tax-adjustments', { params });
  },

  async approveTaxAdjustment(adjustmentId: string, comments?: string) {
    return apiClient.put(`/tax-adjustments/${adjustmentId}/approve`, { comments });
  },

  async rejectTaxAdjustment(adjustmentId: string, comments: string) {
    return apiClient.put(`/tax-adjustments/${adjustmentId}/reject`, { comments });
  },

  async submitAdjustmentToZRA(adjustmentId: string) {
    return apiClient.put(`/tax-adjustments/${adjustmentId}/submit`);
  },

  async getPendingAdjustments() {
    return apiClient.get('/tax-adjustments/pending-approvals');
  },

  async autoApproveSmallAdjustments(threshold?: number) {
    return apiClient.post('/tax-adjustments/auto-approve', { threshold });
  },

  async getTaxAdjustmentSummary(year?: number) {
    return apiClient.get('/tax-adjustments/summary', { params: { year } });
  },

  async getAdjustmentTypes() {
    return apiClient.get('/tax-adjustments/types');
  },

  // Tax filing endpoints
  async prepareTaxFiling(data: {
    taxPeriodId: string;
    filingType: string;
  }) {
    return apiClient.post('/tax-filing/prepare', data);
  },

  async submitTaxFiling(filingId: string) {
    return apiClient.put(`/tax-filing/${filingId}/submit`);
  },

  async getTaxFilings(params?: {
    taxPeriodId?: string;
    filingType?: string;
    status?: string;
    year?: number;
  }) {
    return apiClient.get('/tax-filing', { params });
  },

  async generateVATReturn(taxPeriodId: string) {
    return apiClient.get(`/tax-filing/vat-return/${taxPeriodId}`);
  },

  async getTaxFilingSummary(year?: number) {
    return apiClient.get('/tax-filing/summary', { params: { year } });
  },

  async getFilingTypes() {
    return apiClient.get('/tax-filing/types');
  },

  async getFilingTemplate(filingType: string) {
    return apiClient.get(`/tax-filing/templates/${filingType}`);
  },
};
