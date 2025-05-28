'use client';

import React from 'react';
import { Dashboard, DashboardWidget } from '../../../types/dashboard.types';

interface TableWidgetProps {
  widget: DashboardWidget;
  dashboard: Dashboard;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * Table widget component for displaying tabular data
 * Placeholder implementation
 */
export const TableWidget: React.FC<TableWidgetProps> = ({
  widget,
  dashboard,
  isLoading,
  error,
  onRefresh,
}) => {
  if (error) {
    return (
      <div className="table-widget error">
        <div className="error-content">
          <div className="error-icon">📋</div>
          <div className="error-text">Failed to load table data</div>
          <button onClick={onRefresh} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="table-widget loading">
        <div className="loading-content">
          <div className="loading-spinner" />
          <div className="loading-text">Loading table...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-widget">
      <div className="table-placeholder">
        <div className="table-icon">📊</div>
        <div className="table-title">Data Table</div>
        <div className="table-description">
          Table implementation coming soon
        </div>
      </div>
    </div>
  );
};
