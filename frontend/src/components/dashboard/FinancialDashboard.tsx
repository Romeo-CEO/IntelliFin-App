'use client';

import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  AlertTriangle,
  Calendar,
  RefreshCw,
  Download,
  Eye,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { 
  DashboardMetrics, 
  DashboardQuery, 
  ReportPeriod, 
  reportService 
} from '../../services/report.service';

interface FinancialDashboardProps {
  className?: string;
}

export default function FinancialDashboard({ className = '' }: FinancialDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(ReportPeriod.THIS_MONTH);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardMetrics();
  }, [selectedPeriod]);

  const loadDashboardMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const query: DashboardQuery = {
        period: selectedPeriod,
        includeComparison: true,
      };

      const data = await reportService.getDashboardMetrics(query);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardMetrics();
    setRefreshing(false);
  };

  const getMetricCard = (
    title: string,
    value: number,
    change?: { amount: number; percentage: number },
    icon: React.ReactNode,
    format: 'currency' | 'number' = 'currency'
  ) => {
    const formattedValue = format === 'currency' 
      ? reportService.formatCurrency(value)
      : value.toLocaleString();

    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white">
                {icon}
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                <dd className="text-lg font-medium text-gray-900">{formattedValue}</dd>
              </dl>
            </div>
          </div>
          {change && (
            <div className="mt-4">
              <div className="flex items-center">
                <div className={`flex items-center text-sm ${reportService.getChangeColor(change.amount)}`}>
                  {change.amount >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  <span className="font-medium">
                    {reportService.formatPercentage(Math.abs(change.percentage))}
                  </span>
                  <span className="ml-1">
                    ({change.amount >= 0 ? '+' : ''}{reportService.formatCurrency(change.amount)})
                  </span>
                </div>
                <div className="ml-2 text-sm text-gray-500">vs previous period</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && !metrics) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadDashboardMetrics}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        No dashboard data available
      </div>
    );
  }

  const healthScore = reportService.getHealthScore(metrics.financialMetrics);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Financial Dashboard</h1>
          <p className="text-sm text-gray-600">
            Overview of your business financial performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriod)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.values(ReportPeriod).filter(p => p !== ReportPeriod.CUSTOM).map(period => (
              <option key={period} value={period}>
                {reportService.getReportPeriodLabel(period)}
              </option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {getMetricCard(
          'Revenue',
          metrics.financialMetrics.revenue,
          metrics.periodComparison?.changes.revenue,
          <DollarSign className="h-5 w-5" />
        )}
        {getMetricCard(
          'Expenses',
          metrics.financialMetrics.expenses,
          metrics.periodComparison?.changes.expenses,
          <CreditCard className="h-5 w-5" />
        )}
        {getMetricCard(
          'Net Profit',
          metrics.financialMetrics.profit,
          metrics.periodComparison?.changes.profit,
          <TrendingUp className="h-5 w-5" />
        )}
        {getMetricCard(
          'Cash Balance',
          metrics.financialMetrics.cashBalance,
          metrics.periodComparison?.changes.cashBalance,
          <Activity className="h-5 w-5" />
        )}
      </div>

      {/* Business Health Score */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Business Health Score</h3>
              <p className="text-sm text-gray-500">Overall financial health assessment</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{healthScore.score}</div>
              <div className={`text-sm font-medium ${
                healthScore.status === 'excellent' ? 'text-green-600' :
                healthScore.status === 'good' ? 'text-blue-600' :
                healthScore.status === 'fair' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {healthScore.status.toUpperCase()}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {healthScore.factors.map((factor, index) => (
                <div key={index} className="text-center">
                  <div className="text-sm font-medium text-gray-900">{factor.factor}</div>
                  <div className="text-lg font-semibold text-gray-600">{Math.round(factor.score)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Breakdown */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Revenue by Customer</h3>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {metrics.revenueBreakdown.byCustomer.slice(0, 5).map((customer, index) => (
                <div key={customer.customerId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-green-500' :
                      index === 2 ? 'bg-yellow-500' :
                      index === 3 ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="text-sm text-gray-900 truncate max-w-32">{customer.customerName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {reportService.formatCurrency(customer.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {reportService.formatPercentage(customer.percentage)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cash Flow Trend */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Cash Flow Trend</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {metrics.cashFlow.operatingCashFlow.slice(-6).map((month, index) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {reportService.formatMonth(month.month)}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-green-600">
                      +{reportService.formatCurrency(month.inflow)}
                    </div>
                    <div className="text-sm text-red-600">
                      -{reportService.formatCurrency(month.outflow)}
                    </div>
                    <div className={`text-sm font-medium ${month.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {month.net >= 0 ? '+' : ''}{reportService.formatCurrency(month.net)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Receivable & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Accounts Receivable Aging */}
        <div className="lg:col-span-2 bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Accounts Receivable Aging</h3>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reportService.formatCurrency(metrics.accountsReceivable.current)}
                </div>
                <div className="text-sm text-gray-500">Current</div>
                <div className="text-xs text-gray-400">(0-30 days)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {reportService.formatCurrency(metrics.accountsReceivable.thirtyDays)}
                </div>
                <div className="text-sm text-gray-500">31-60 days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {reportService.formatCurrency(metrics.accountsReceivable.sixtyDays)}
                </div>
                <div className="text-sm text-gray-500">61-90 days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {reportService.formatCurrency(metrics.accountsReceivable.ninetyDays)}
                </div>
                <div className="text-sm text-gray-500">90+ days</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Total Outstanding</span>
                <span className="text-lg font-bold text-gray-900">
                  {reportService.formatCurrency(metrics.accountsReceivable.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Export VAT Report
              </button>
              <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Eye className="h-4 w-4 mr-2" />
                View P&L Statement
              </button>
              <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <BarChart3 className="h-4 w-4 mr-2" />
                Detailed Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      {metrics.periodComparison && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">Key Insights</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Revenue Growth</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Revenue {metrics.periodComparison.changes.revenue.amount >= 0 ? 'increased' : 'decreased'} by{' '}
                {reportService.formatPercentage(Math.abs(metrics.periodComparison.changes.revenue.percentage))} compared to the previous period.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Profit Margin</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Current profit margin is{' '}
                {reportService.formatPercentage(reportService.calculateProfitMargin(metrics.financialMetrics.profit, metrics.financialMetrics.revenue))}.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Outstanding Receivables</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {reportService.formatCurrency(metrics.accountsReceivable.total)} in outstanding receivables needs attention.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
