import { apiClient } from './client';

export const taxAnalyticsApi = {
  // Trend analysis
  async getTrendAnalysis(months: number = 12) {
    return apiClient.get('/tax-analytics/trends', { params: { months } });
  },

  // Compliance prediction
  async predictCompliance() {
    return apiClient.get('/tax-analytics/compliance-prediction');
  },

  // Efficiency metrics
  async getEfficiencyMetrics() {
    return apiClient.get('/tax-analytics/efficiency-metrics');
  },

  // Seasonal analysis
  async getSeasonalAnalysis() {
    return apiClient.get('/tax-analytics/seasonal-analysis');
  },

  // Risk assessment
  async assessTaxRisks() {
    return apiClient.get('/tax-analytics/risk-assessment');
  },

  // Comprehensive dashboard
  async getAnalyticsDashboard() {
    return apiClient.get('/tax-analytics/dashboard');
  },

  // Benchmarking
  async getBenchmarking() {
    return apiClient.get('/tax-analytics/benchmarking');
  },

  // AI insights
  async getTaxInsights() {
    return apiClient.get('/tax-analytics/insights');
  },
};
