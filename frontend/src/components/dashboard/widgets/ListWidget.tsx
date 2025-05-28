'use client';

import React from 'react';
import { Dashboard, DashboardWidget } from '../../../types/dashboard.types';

interface ListWidgetProps {
  widget: DashboardWidget;
  dashboard: Dashboard;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * List widget component for displaying list data
 * Placeholder implementation
 */
export const ListWidget: React.FC<ListWidgetProps> = ({
  widget,
  dashboard,
  isLoading,
  error,
  onRefresh,
}) => {
  if (error) {
    return (
      <div className="list-widget error">
        <div className="error-content">
          <div className="error-icon">📝</div>
          <div className="error-text">Failed to load list data</div>
          <button onClick={onRefresh} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="list-widget loading">
        <div className="loading-content">
          <div className="loading-spinner" />
          <div className="loading-text">Loading list...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="list-widget">
      <div className="list-placeholder">
        <div className="list-icon">📋</div>
        <div className="list-title">Data List</div>
        <div className="list-description">
          List implementation coming soon
        </div>
      </div>
    </div>
  );
};
