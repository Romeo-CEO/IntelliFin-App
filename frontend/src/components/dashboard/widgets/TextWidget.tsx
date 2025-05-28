'use client';

import React from 'react';
import { Dashboard, DashboardWidget } from '../../../types/dashboard.types';

interface TextWidgetProps {
  widget: DashboardWidget;
  dashboard: Dashboard;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * Text widget component for displaying rich text content
 * Placeholder implementation
 */
export const TextWidget: React.FC<TextWidgetProps> = ({
  widget,
  dashboard,
  isLoading,
  error,
  onRefresh,
}) => {
  if (error) {
    return (
      <div className="text-widget error">
        <div className="error-content">
          <div className="error-icon">📄</div>
          <div className="error-text">Failed to load text content</div>
          <button onClick={onRefresh} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-widget loading">
        <div className="loading-content">
          <div className="loading-spinner" />
          <div className="loading-text">Loading content...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-widget">
      <div className="text-placeholder">
        <div className="text-icon">📝</div>
        <div className="text-title">Text Content</div>
        <div className="text-description">
          Rich text implementation coming soon
        </div>
      </div>
    </div>
  );
};
