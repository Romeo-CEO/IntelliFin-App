'use client';

import React, { useState, useEffect, useMemo } from 'react';

import { analyticsService, KpiMetrics, AnalyticsQuery } from '../../../services/analytics.service';
import { DashboardWidget } from '../../../types/dashboard.types';
import { ErrorMessage } from '../../common/ErrorMessage';
import { LoadingSpinner } from '../../common/LoadingSpinner';

interface KpiSummaryWidgetProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
}

interface KpiCardProps {
  title: string;
  value: string;
  trend?: number;
  icon: string;
  color: 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'gray';
  subtitle?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, icon, color, subtitle }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const trendInfo = trend !== undefined ? analyticsService.formatTrend(trend) : null;

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl">{icon}</div>
        {trendInfo && (
          <div className={`text-sm font-medium ${
            trendInfo.isNeutral 
              ? 'text-gray-600' 
              : trendInfo.isPositive 
                ? 'text-green-600' 
                : 'text-red-600'
          }`}>
            {trendInfo.value}
          </div>
        )}
      </div>
      <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
      <div className="text-xl font-bold mb-1">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500">{subtitle}</div>
      )}
    </div>
  );
};

export const KpiSummaryWidget: React.FC<KpiSummaryWidgetProps> = ({
  widget,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const [data, setData] = useState<KpiMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  // Get query parameters from widget configuration
  const query: AnalyticsQuery = useMemo(() => {
    const config = widget.configuration as any;
    const periodDates = analyticsService.getPeriodDates(selectedPeriod);
    
    return {
      startDate: config?.startDate || periodDates.startDate,
      endDate: config?.endDate || periodDates.endDate,
    };
  }, [widget.configuration, selectedPeriod]);

  // Load KPI data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getKpiSummary(query);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [query]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load KPI data"
        message={error}
        onRetry={loadData}
      />
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <div>No KPI data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
        
        {/* Period selector */}
        <div className="flex space-x-1">
          {(['week', 'month', 'quarter'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
        {/* Financial Metrics */}
        <KpiCard
          title="Total Revenue"
          value={analyticsService.formatCurrency(data.totalRevenue)}
          trend={data.revenueTrend}
          icon="💰"
          color="green"
        />
        
        <KpiCard
          title="Total Expenses"
          value={analyticsService.formatCurrency(data.totalExpenses)}
          trend={data.expensesTrend}
          icon="💸"
          color="red"
        />
        
        <KpiCard
          title="Net Profit"
          value={analyticsService.formatCurrency(data.netProfit)}
          trend={data.profitTrend}
          icon="📈"
          color={data.netProfit >= 0 ? 'green' : 'red'}
        />
        
        <KpiCard
          title="Profit Margin"
          value={analyticsService.formatPercentage(data.profitMargin)}
          icon="📊"
          color={data.profitMargin >= 0 ? 'green' : 'red'}
        />
        
        {/* Cash & Receivables */}
        <KpiCard
          title="Cash Balance"
          value={analyticsService.formatCurrency(data.cashBalance)}
          icon="🏦"
          color={data.cashBalance >= 0 ? 'blue' : 'red'}
        />
        
        <KpiCard
          title="Accounts Receivable"
          value={analyticsService.formatCurrency(data.accountsReceivable)}
          trend={data.receivablesTrend}
          icon="📋"
          color="yellow"
        />
        
        {/* Business Metrics */}
        <KpiCard
          title="Avg Invoice Value"
          value={analyticsService.formatCurrency(data.averageInvoiceValue)}
          icon="🧾"
          color="purple"
        />
        
        <KpiCard
          title="Payment Cycle"
          value={`${data.paymentCycleTime} days`}
          icon="⏱️"
          color="gray"
          subtitle="Average collection time"
        />
        
        {/* Volume Metrics */}
        <KpiCard
          title="Active Customers"
          value={data.customerCount.toString()}
          icon="👥"
          color="blue"
        />
        
        <KpiCard
          title="Invoices Issued"
          value={data.invoiceCount.toString()}
          icon="📄"
          color="gray"
          subtitle={`This ${selectedPeriod}`}
        />
      </div>

      {/* Performance Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Performance Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Revenue Growth:</span>
            <span className={`ml-2 font-medium ${
              data.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analyticsService.formatTrend(data.revenueTrend).value}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Expense Control:</span>
            <span className={`ml-2 font-medium ${
              data.expensesTrend <= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analyticsService.formatTrend(data.expensesTrend).value}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Profit Growth:</span>
            <span className={`ml-2 font-medium ${
              data.profitTrend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analyticsService.formatTrend(data.profitTrend).value}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Collection Efficiency:</span>
            <span className={`ml-2 font-medium ${
              data.paymentCycleTime <= 30 ? 'text-green-600' : 
              data.paymentCycleTime <= 45 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {data.paymentCycleTime <= 30 ? 'Excellent' : 
               data.paymentCycleTime <= 45 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        </div>
      </div>

      {/* Widget description */}
      {widget.description && (
        <div className="mt-4 text-sm text-gray-600">
          {widget.description}
        </div>
      )}
    </div>
  );
};
