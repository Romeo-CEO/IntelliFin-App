'use client';

import React, { useMemo } from 'react';

import { Dashboard, DashboardWidget, MetricCardConfig } from '../../../types/dashboard.types';

interface MetricCardProps {
  widget: DashboardWidget;
  dashboard: Dashboard;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * Metric card widget component for displaying key performance indicators
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  widget,
  dashboard,
  isLoading,
  error,
  onRefresh,
}) => {
  const config = widget.configuration as MetricCardConfig;

  // Mock data - in real implementation, this would come from the data source
  const mockData = useMemo(() => ({
    value: 125000,
    previousValue: 118000,
    trend: 'up' as 'up' | 'down' | 'neutral',
    trendPercentage: 5.9,
    label: 'Total Revenue',
    period: 'This Month',
    currency: 'ZMW',
  }), []);

  // Format value based on configuration
  const formatValue = (value: number): string => {
    const format = config.format || 'currency';
    const precision = config.precision || 2;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-ZM', {
          style: 'currency',
          currency: mockData.currency,
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(value);

      case 'percentage':
        return `${value.toFixed(precision)}%`;

      case 'number':
      default:
        return new Intl.NumberFormat('en-ZM', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(value);
    }
  };

  // Calculate trend
  const trendData = useMemo(() => {
    if (!config.showTrend || !mockData.previousValue) return null;

    const change = mockData.value - mockData.previousValue;
    const percentage = (change / mockData.previousValue) * 100;

    return {
      change,
      percentage,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      formattedChange: formatValue(Math.abs(change)),
      formattedPercentage: `${Math.abs(percentage).toFixed(1)}%`,
    };
  }, [mockData, config.showTrend, config.format, config.precision]);

  // Get trend icon and color
  const getTrendDisplay = () => {
    if (!trendData) return null;

    const { direction, formattedPercentage } = trendData;

    const icons = {
      up: '↗️',
      down: '↘️',
      neutral: '➡️',
    };

    const colors = {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-600',
    };

    return {
      icon: icons[direction],
      color: colors[direction],
      text: formattedPercentage,
    };
  };

  const trendDisplay = getTrendDisplay();

  if (error) {
    return (
      <div className="metric-card error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <div className="error-text">Failed to load data</div>
          <button onClick={onRefresh} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card">
      {/* Main Value */}
      <div className="metric-value">
        {isLoading ? (
          <div className="loading-skeleton">
            <div className="skeleton-line large" />
          </div>
        ) : (
          <span className="value-text">
            {formatValue(mockData.value)}
          </span>
        )}
      </div>

      {/* Label and Period */}
      <div className="metric-label">
        <div className="label-text">{mockData.label}</div>
        <div className="period-text">{mockData.period}</div>
      </div>

      {/* Trend Information */}
      {config.showTrend && trendDisplay && !isLoading && (
        <div className="metric-trend">
          <div className={`trend-indicator ${trendDisplay.color}`}>
            <span className="trend-icon">{trendDisplay.icon}</span>
            <span className="trend-text">{trendDisplay.text}</span>
          </div>
          <div className="trend-period">
            vs {config.trendPeriod || 'previous period'}
          </div>
        </div>
      )}

      {/* Comparison */}
      {config.showComparison && !isLoading && (
        <div className="metric-comparison">
          <div className="comparison-label">
            {config.comparisonPeriod || 'Previous period'}:
          </div>
          <div className="comparison-value">
            {formatValue(mockData.previousValue)}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.metric-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
}

.metric-card.error {
  background: #fee2e2;
  color: #dc2626;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  gap: 8px;
}

.error-icon {
  font-size: 1.5rem;
}

.error-text {
  font-size: 0.875rem;
  font-weight: 500;
}

.retry-button {
  padding: 4px 12px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}

.retry-button:hover {
  background: #b91c1c;
}

.metric-value {
  margin-bottom: 8px;
}

.value-text {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  display: block;
}

.metric-label {
  margin-bottom: 12px;
}

.label-text {
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0.9;
}

.period-text {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 2px;
}

.metric-trend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.trend-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.trend-icon {
  font-size: 1rem;
}

.trend-period {
  font-size: 0.75rem;
  opacity: 0.7;
}

.metric-comparison {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 0.75rem;
}

.comparison-label {
  opacity: 0.7;
}

.comparison-value {
  font-weight: 600;
}

.loading-skeleton {
  height: 2rem;
  display: flex;
  align-items: center;
}

.skeleton-line {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.skeleton-line.large {
  height: 1.5rem;
  width: 80%;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .metric-card {
    padding: 12px;
  }

  .value-text {
    font-size: 1.5rem;
  }

  .metric-trend,
  .metric-comparison {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}

/* Color variations based on widget configuration */
.metric-card.theme-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.metric-card.theme-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.metric-card.theme-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.metric-card.theme-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}
`;
