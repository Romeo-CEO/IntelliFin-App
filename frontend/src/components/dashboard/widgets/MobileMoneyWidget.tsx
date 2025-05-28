'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardWidget, Dashboard } from '../../../types/dashboard.types';
import { paymentService } from '../../../services/payment.service';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorMessage } from '../../common/ErrorMessage';
import { Chart } from '../../charts/Chart';
import { MetricCard } from './MetricCard';

interface MobileMoneyWidgetProps {
  widget: DashboardWidget;
  dashboard: Dashboard;
  isEditing?: boolean;
  performanceMode?: 'normal' | 'low-bandwidth';
  isMobile?: boolean;
}

interface MobileMoneyData {
  summary: {
    totalAmount: number;
    totalTransactions: number;
    averageTransaction: number;
    growthRate: number;
  };
  byProvider: Array<{
    provider: 'airtel' | 'mtn' | 'zamtel';
    name: string;
    amount: number;
    transactions: number;
    percentage: number;
    color: string;
  }>;
  recentTransactions: Array<{
    id: string;
    provider: string;
    amount: number;
    type: 'payment' | 'refund';
    status: 'completed' | 'pending' | 'failed';
    timestamp: string;
    customerName?: string;
  }>;
  trends: Array<{
    period: string;
    airtel: number;
    mtn: number;
    zamtel: number;
    total: number;
  }>;
  lastUpdated: string;
}

/**
 * Mobile Money Widget Component
 * Displays mobile money transaction data for Zambian market
 * Supports Airtel Money, MTN Mobile Money, and Zamtel Kwacha
 */
export const MobileMoneyWidget: React.FC<MobileMoneyWidgetProps> = ({
  widget,
  dashboard,
  isEditing = false,
  performanceMode = 'normal',
  isMobile = false,
}) => {
  const [data, setData] = useState<MobileMoneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Widget configuration
  const config = widget.configuration || {};
  const {
    providers = ['airtel', 'mtn', 'zamtel'],
    period = 'last_30_days',
    showBreakdown = true,
    includeTransactionCount = true,
    showTrends = true,
    currency = 'ZMW',
  } = config;

  // Provider configurations
  const providerConfig = {
    airtel: { name: 'Airtel Money', color: '#E60012', icon: '📱' },
    mtn: { name: 'MTN Mobile Money', color: '#FFCC00', icon: '💰' },
    zamtel: { name: 'Zamtel Kwacha', color: '#00A651', icon: '💳' },
  };

  // Load mobile money data
  const loadMobileMoneyData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const mobileMoneyData = await paymentService.getMobileMoneySummary({
        providers,
        period,
        includeBreakdown: showBreakdown,
        includeTrends: showTrends,
        includeRecent: true,
        forceRefresh,
      });

      setData(mobileMoneyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mobile money data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [providers, period, showBreakdown, showTrends]);

  // Initial data load
  useEffect(() => {
    loadMobileMoneyData();
  }, [loadMobileMoneyData]);

  // Auto-refresh
  useEffect(() => {
    if (widget.refreshInterval && widget.refreshInterval > 0) {
      const interval = setInterval(() => {
        loadMobileMoneyData();
      }, widget.refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [widget.refreshInterval, loadMobileMoneyData]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMobileMoneyData(true);
  }, [loadMobileMoneyData]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, [currency]);

  // Format number
  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-ZM').format(num);
  }, []);

  // Prepare pie chart data for provider breakdown
  const pieChartData = useMemo(() => {
    if (!data?.byProvider) return null;

    return {
      labels: data.byProvider.map(provider => provider.name),
      datasets: [{
        data: data.byProvider.map(provider => provider.amount),
        backgroundColor: data.byProvider.map(provider => provider.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    };
  }, [data?.byProvider]);

  // Prepare trends chart data
  const trendsChartData = useMemo(() => {
    if (!data?.trends) return null;

    return {
      labels: data.trends.map(item => item.period),
      datasets: [
        {
          label: 'Airtel Money',
          data: data.trends.map(item => item.airtel),
          borderColor: providerConfig.airtel.color,
          backgroundColor: `${providerConfig.airtel.color}20`,
          tension: 0.4,
        },
        {
          label: 'MTN Mobile Money',
          data: data.trends.map(item => item.mtn),
          borderColor: providerConfig.mtn.color,
          backgroundColor: `${providerConfig.mtn.color}20`,
          tension: 0.4,
        },
        {
          label: 'Zamtel Kwacha',
          data: data.trends.map(item => item.zamtel),
          borderColor: providerConfig.zamtel.color,
          backgroundColor: `${providerConfig.zamtel.color}20`,
          tension: 0.4,
        },
      ],
    };
  }, [data?.trends]);

  // Chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !isMobile || performanceMode === 'normal',
        position: 'bottom' as const,
      },
      tooltip: {
        enabled: performanceMode === 'normal',
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = formatCurrency(context.parsed || context.parsed.y);
            return `${label}: ${value}`;
          },
        },
      },
    },
    animation: {
      duration: performanceMode === 'low-bandwidth' ? 0 : 1000,
    },
  }), [isMobile, performanceMode, formatCurrency]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="mobile-money-widget loading">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <LoadingSpinner size="md" message="Loading mobile money data..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="mobile-money-widget error">
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
    <div className={`mobile-money-widget ${isMobile ? 'mobile' : ''} ${performanceMode}`}>
      {/* Widget Header */}
      <div className="widget-header">
        <h3 className="widget-title">
          📱 {widget.title}
        </h3>
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
        {/* Summary Metrics */}
        {data?.summary && (
          <div className="summary-section">
            <div className="metrics-grid">
              <MetricCard
                title="Total Amount"
                value={formatCurrency(data.summary.totalAmount)}
                trend={data.summary.growthRate}
                trendLabel={`${data.summary.growthRate >= 0 ? '+' : ''}${data.summary.growthRate.toFixed(1)}%`}
                color="blue"
                size="sm"
              />
              {includeTransactionCount && (
                <MetricCard
                  title="Transactions"
                  value={formatNumber(data.summary.totalTransactions)}
                  color="green"
                  size="sm"
                />
              )}
              <MetricCard
                title="Avg Transaction"
                value={formatCurrency(data.summary.averageTransaction)}
                color="purple"
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Provider Breakdown */}
        {data?.byProvider && showBreakdown && (
          <div className="breakdown-section">
            <h4 className="section-title">Provider Breakdown</h4>
            
            {/* Provider List */}
            <div className="providers-list">
              {data.byProvider.map((provider, index) => (
                <div key={index} className="provider-item">
                  <div className="provider-info">
                    <span className="provider-icon" style={{ color: provider.color }}>
                      {providerConfig[provider.provider]?.icon || '📱'}
                    </span>
                    <span className="provider-name">{provider.name}</span>
                  </div>
                  <div className="provider-stats">
                    <span className="provider-amount">{formatCurrency(provider.amount)}</span>
                    <span className="provider-percentage">({provider.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            {pieChartData && performanceMode === 'normal' && !isMobile && (
              <div className="chart-container" style={{ height: '200px' }}>
                <Chart
                  type="pie"
                  data={pieChartData}
                  options={chartOptions}
                />
              </div>
            )}
          </div>
        )}

        {/* Trends Chart */}
        {trendsChartData && showTrends && performanceMode === 'normal' && (
          <div className="trends-section">
            <h4 className="section-title">Trends by Provider</h4>
            <div className="chart-container" style={{ height: isMobile ? '200px' : '250px' }}>
              <Chart
                type="line"
                data={trendsChartData}
                options={chartOptions}
              />
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <div className="recent-transactions-section">
            <h4 className="section-title">Recent Transactions</h4>
            <div className="transactions-list">
              {data.recentTransactions.slice(0, isMobile ? 3 : 5).map((transaction, index) => (
                <div key={index} className="transaction-item">
                  <div className="transaction-info">
                    <span className="transaction-provider">
                      {providerConfig[transaction.provider as keyof typeof providerConfig]?.icon || '📱'}
                      {transaction.provider.toUpperCase()}
                    </span>
                    {transaction.customerName && (
                      <span className="transaction-customer">{transaction.customerName}</span>
                    )}
                  </div>
                  <div className="transaction-details">
                    <span className="transaction-amount">
                      {formatCurrency(transaction.amount)}
                    </span>
                    <span className={`transaction-status ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                  <div className="transaction-time">
                    {new Date(transaction.timestamp).toLocaleString('en-ZM', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <button className="action-button primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Process Payment
          </button>
          <button className="action-button secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMoneyWidget;
