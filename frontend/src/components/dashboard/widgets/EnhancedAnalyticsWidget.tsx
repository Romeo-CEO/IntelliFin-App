'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { analyticsService } from '../../../services/analytics.service';
import { DashboardWidget, Dashboard } from '../../../types/dashboard.types';
import { Chart } from '../../charts/Chart';
import { ErrorMessage } from '../../common/ErrorMessage';
import { LoadingSpinner } from '../../common/LoadingSpinner';

import { MetricCard } from './MetricCard';

interface EnhancedAnalyticsWidgetProps {
  widget: DashboardWidget;
  performanceMode?: 'normal' | 'low-bandwidth';
  isMobile?: boolean;
}

interface AnalyticsData {
  forecasts?: {
    revenue: any[];
    expenses: any[];
  };
  anomalies?: any[];
  trends?: {
    revenue: any[];
    expenses: any[];
    profit: any[];
  };
  kpis?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    revenueGrowth: number;
    expenseGrowth: number;
  };
  lastUpdated?: string;
}

/**
 * Enhanced Analytics Widget Component
 * Integrates with Step 19 analytics engines for advanced insights
 * Optimized for Zambian SME requirements and mobile usage
 */
export const EnhancedAnalyticsWidget: React.FC<EnhancedAnalyticsWidgetProps> = ({
  widget,
  performanceMode = 'normal',
  isMobile = false,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Widget configuration
  const config = widget.configuration || {};
  const {
    analysisType = 'overview',
    period = 'last_6_months',
    includeForecasts = true,
    includeAnomalies = true,
    showTrends = true,
    currency = 'ZMW',
  } = config;

  // Load analytics data
  const loadAnalyticsData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const analyticsData = await analyticsService.getEnhancedAnalytics({
        type: analysisType,
        period,
        includeForecasts,
        includeAnomalies,
        includeKpis: true,
        includeTrends: showTrends,
        forceRefresh,
      });

      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [analysisType, period, includeForecasts, includeAnomalies, showTrends]);

  // Initial data load
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Auto-refresh based on widget configuration
  useEffect(() => {
    if (widget.refreshInterval && widget.refreshInterval > 0) {
      const interval = setInterval(() => {
        loadAnalyticsData();
      }, widget.refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [widget.refreshInterval, loadAnalyticsData]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalyticsData(true);
  }, [loadAnalyticsData]);

  // Format currency for Zambian market
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, [currency]);

  // Format percentage
  const formatPercentage = useCallback((value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }, []);

  // Prepare chart data for mobile optimization
  const chartData = useMemo(() => {
    if (!data?.trends) return null;

    const baseData = {
      labels: data.trends.revenue?.map((item: any) => item.period) || [],
      datasets: [
        {
          label: 'Revenue',
          data: data.trends.revenue?.map((item: any) => item.amount) || [],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Expenses',
          data: data.trends.expenses?.map((item: any) => item.amount) || [],
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
        },
      ],
    };

    // Add forecast data if available and enabled
    if (includeForecasts && data.forecasts) {
      baseData.datasets.push({
        label: 'Revenue Forecast',
        data: data.forecasts.revenue?.map((item: any) => item.amount) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderDash: [5, 5],
        tension: 0.4,
      });
    }

    return baseData;
  }, [data, includeForecasts]);

  // Chart options optimized for mobile
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !isMobile || performanceMode === 'normal',
        position: 'top' as const,
      },
      tooltip: {
        enabled: performanceMode === 'normal',
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatCurrency(value),
          maxTicksLimit: isMobile ? 4 : 6,
        },
        grid: {
          display: performanceMode === 'normal',
        },
      },
      x: {
        ticks: {
          maxTicksLimit: isMobile ? 4 : 8,
        },
        grid: {
          display: false,
        },
      },
    },
    animation: {
      duration: performanceMode === 'low-bandwidth' ? 0 : 1000,
    },
  }), [isMobile, performanceMode, formatCurrency]);

  // Render loading state
  if (loading) {
    return (
      <div className="enhanced-analytics-widget loading">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <LoadingSpinner size="md" message="Loading analytics..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="enhanced-analytics-widget error">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          <button onClick={handleRefresh} className="refresh-button">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="widget-content">
          <ErrorMessage message={error} onRetry={handleRefresh} />
        </div>
      </div>
    );
  }

  return (
    <div className={`enhanced-analytics-widget ${isMobile ? 'mobile' : ''} ${performanceMode}`}>
      {/* Widget Header */}
      <div className="widget-header">
        <h3 className="widget-title">{widget.title}</h3>
        <div className="widget-actions">
          {data?.lastUpdated && (
            <span className="last-updated">
              Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={handleRefresh} 
            className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
            disabled={refreshing}
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div className="widget-content">
        {/* KPI Summary */}
        {data?.kpis && (
          <div className="kpi-summary">
            <div className="kpi-grid">
              <MetricCard
                title="Revenue"
                value={formatCurrency(data.kpis.totalRevenue)}
                trend={data.kpis.revenueGrowth}
                trendLabel={formatPercentage(data.kpis.revenueGrowth)}
                color="green"
                size="sm"
              />
              <MetricCard
                title="Expenses"
                value={formatCurrency(data.kpis.totalExpenses)}
                trend={data.kpis.expenseGrowth}
                trendLabel={formatPercentage(data.kpis.expenseGrowth)}
                color="red"
                size="sm"
              />
              <MetricCard
                title="Net Profit"
                value={formatCurrency(data.kpis.netProfit)}
                trend={data.kpis.netProfit >= 0 ? 1 : -1}
                trendLabel={formatPercentage(data.kpis.profitMargin)}
                color={data.kpis.netProfit >= 0 ? 'green' : 'red'}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Trends Chart */}
        {chartData && showTrends && (
          <div className="trends-chart">
            <h4 className="chart-title">Revenue & Expense Trends</h4>
            <div className="chart-container" style={{ height: isMobile ? '200px' : '300px' }}>
              <Chart
                type="line"
                data={chartData}
                options={chartOptions}
              />
            </div>
          </div>
        )}

        {/* Anomalies Alert */}
        {data?.anomalies && data.anomalies.length > 0 && includeAnomalies && (
          <div className="anomalies-section">
            <h4 className="section-title">⚠️ Anomalies Detected</h4>
            <div className="anomalies-list">
              {data.anomalies.slice(0, isMobile ? 2 : 3).map((anomaly: any, index: number) => (
                <div key={index} className="anomaly-item">
                  <span className="anomaly-type">{anomaly.type}</span>
                  <span className="anomaly-description">{anomaly.description}</span>
                  <span className="anomaly-severity">{anomaly.severity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forecasts Summary */}
        {data?.forecasts && includeForecasts && (
          <div className="forecasts-section">
            <h4 className="section-title">📈 Forecasts</h4>
            <div className="forecast-summary">
              <div className="forecast-item">
                <span className="forecast-label">Next Month Revenue:</span>
                <span className="forecast-value">
                  {formatCurrency(data.forecasts.revenue?.[0]?.amount || 0)}
                </span>
              </div>
              <div className="forecast-item">
                <span className="forecast-label">Next Month Expenses:</span>
                <span className="forecast-value">
                  {formatCurrency(data.forecasts.expenses?.[0]?.amount || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAnalyticsWidget;
