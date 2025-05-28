'use client';

import React from 'react';
import { Dashboard, DashboardWidget } from '../../../types/dashboard.types';

interface ChartWidgetProps {
  widget: DashboardWidget;
  dashboard: Dashboard;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * Chart widget component for displaying various chart types
 * Placeholder implementation - would integrate with charting library like Chart.js or Recharts
 */
export const ChartWidget: React.FC<ChartWidgetProps> = ({
  widget,
  dashboard,
  isLoading,
  error,
  onRefresh,
}) => {
  if (error) {
    return (
      <div className="chart-widget error">
        <div className="error-content">
          <div className="error-icon">📊</div>
          <div className="error-text">Failed to load chart data</div>
          <button onClick={onRefresh} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="chart-widget loading">
        <div className="loading-content">
          <div className="loading-spinner" />
          <div className="loading-text">Loading chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-widget">
      <div className="chart-placeholder">
        <div className="chart-icon">📈</div>
        <div className="chart-title">{widget.widgetType} Chart</div>
        <div className="chart-description">
          Chart implementation coming soon
        </div>
      </div>
    </div>
  );
};

// CSS styles
const styles = `
.chart-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.chart-widget.error {
  background: #fee2e2;
  color: #dc2626;
}

.chart-widget.loading {
  background: #f3f4f6;
}

.error-content,
.loading-content,
.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
}

.error-icon,
.chart-icon {
  font-size: 2rem;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.chart-description {
  font-size: 0.875rem;
  color: #6b7280;
}

.error-text,
.loading-text {
  font-size: 0.875rem;
  font-weight: 500;
}

.retry-button {
  padding: 6px 12px;
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

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
`;
