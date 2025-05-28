'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Dashboard, DashboardWidget, WidgetType } from '../../types/dashboard.types';
import { useDashboard } from '../../contexts/DashboardContext';
import { MetricCard } from './widgets/MetricCard';
import { ChartWidget } from './widgets/ChartWidget';
import { TableWidget } from './widgets/TableWidget';
import { ListWidget } from './widgets/ListWidget';
import { TextWidget } from './widgets/TextWidget';
import { CashFlowWidget } from './widgets/CashFlowWidget';
import { RevenueExpensesWidget } from './widgets/RevenueExpensesWidget';
import { KpiSummaryWidget } from './widgets/KpiSummaryWidget';
import { ReceivablesWidget } from './widgets/ReceivablesWidget';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

interface WidgetContainerProps {
  widget: DashboardWidget;
  dashboard: Dashboard;
  isEditing: boolean;
  className?: string;
}

/**
 * Container component for individual dashboard widgets
 * Handles widget rendering, editing controls, and error states
 */
export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  dashboard,
  isEditing,
  className = '',
}) => {
  const { deleteWidget, setSelectedWidget, updateWidget } = useDashboard();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Handle widget deletion
  const handleDelete = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete this widget?')) {
      try {
        await deleteWidget(widget.id);
      } catch (error) {
        console.error('Failed to delete widget:', error);
      }
    }
  }, [widget.id, deleteWidget]);

  // Handle widget editing
  const handleEdit = useCallback(() => {
    setSelectedWidget(widget);
  }, [widget, setSelectedWidget]);

  // Handle widget visibility toggle
  const handleToggleVisibility = useCallback(async () => {
    try {
      setIsLoading(true);
      await updateWidget(widget.id, {
        // This would typically call a separate visibility toggle endpoint
        configuration: {
          ...widget.configuration,
          isVisible: !widget.isVisible,
        },
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to toggle visibility');
    } finally {
      setIsLoading(false);
    }
  }, [widget.id, widget.configuration, widget.isVisible, updateWidget]);

  // Handle widget refresh
  const handleRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // This would typically call a refresh endpoint
      // For now, we'll just simulate a refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh widget');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Render appropriate widget component based on type
  const renderWidget = useMemo(() => {
    const commonProps = {
      widget,
      dashboard,
      isLoading,
      error,
      onRefresh: handleRefresh,
    };

    switch (widget.widgetType) {
      case WidgetType.METRIC_CARD:
        return <MetricCard {...commonProps} />;

      case WidgetType.CHART_LINE:
      case WidgetType.CHART_BAR:
      case WidgetType.CHART_PIE:
      case WidgetType.CHART_DOUGHNUT:
        return <ChartWidget {...commonProps} />;

      case WidgetType.TABLE:
        return <TableWidget {...commonProps} />;

      case WidgetType.LIST:
        return <ListWidget {...commonProps} />;

      case WidgetType.TEXT:
        return <TextWidget {...commonProps} />;

      // Step 18: Executive Dashboard Analytics Widgets
      case WidgetType.CASH_FLOW:
        return <CashFlowWidget {...commonProps} />;

      case WidgetType.REVENUE_EXPENSES:
        return <RevenueExpensesWidget {...commonProps} />;

      case WidgetType.KPI_SUMMARY:
        return <KpiSummaryWidget {...commonProps} />;

      case WidgetType.RECEIVABLES_AGING:
        return <ReceivablesWidget {...commonProps} />;

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">🔧</div>
              <div>Widget type not implemented</div>
              <div className="text-sm">{widget.widgetType}</div>
            </div>
          </div>
        );
    }
  }, [widget, dashboard, isLoading, error, handleRefresh]);

  // Widget menu items
  const menuItems = useMemo(() => [
    {
      label: 'Edit',
      icon: '✏️',
      onClick: handleEdit,
    },
    {
      label: 'Refresh',
      icon: '🔄',
      onClick: handleRefresh,
    },
    {
      label: widget.isVisible ? 'Hide' : 'Show',
      icon: widget.isVisible ? '👁️' : '🙈',
      onClick: handleToggleVisibility,
    },
    {
      label: 'Delete',
      icon: '🗑️',
      onClick: handleDelete,
      className: 'text-red-600 hover:text-red-700',
    },
  ], [widget.isVisible, handleEdit, handleRefresh, handleToggleVisibility, handleDelete]);

  return (
    <div className={`widget-container ${className} ${!widget.isVisible ? 'opacity-50' : ''}`}>
      {/* Widget Header */}
      <div className="widget-header">
        <div className="widget-title">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {widget.title}
          </h3>
          {widget.description && (
            <p className="text-xs text-gray-500 truncate">
              {widget.description}
            </p>
          )}
        </div>

        {/* Widget Controls */}
        {isEditing && (
          <div className="widget-controls">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Widget options"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border z-50">
                  <div className="py-1">
                    {menuItems.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          item.onClick();
                          setShowMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center space-x-2 ${item.className || ''}`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="widget-loading">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Widget Content */}
      <div className="widget-content">
        {error ? (
          <ErrorMessage
            title="Widget Error"
            message={error}
            onRetry={handleRefresh}
            compact
          />
        ) : (
          renderWidget
        )}
      </div>

      {/* Widget Footer */}
      {widget.refreshInterval && (
        <div className="widget-footer">
          <div className="text-xs text-gray-400">
            Refreshes every {Math.floor(widget.refreshInterval / 60)}m
          </div>
        </div>
      )}

      {/* Editing Overlay */}
      {isEditing && (
        <div className="widget-editing-overlay">
          <div className="absolute inset-0 border-2 border-dashed border-blue-300 rounded pointer-events-none" />
        </div>
      )}
    </div>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.widget-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.widget-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 16px 8px;
  border-bottom: 1px solid #f3f4f6;
  min-height: 48px;
}

.widget-title {
  flex: 1;
  min-width: 0;
}

.widget-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.widget-loading {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.widget-content {
  flex: 1;
  padding: 8px 16px 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.widget-footer {
  padding: 8px 16px;
  border-top: 1px solid #f3f4f6;
  background: #f9fafb;
}

.widget-editing-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.widget-container:hover .widget-controls {
  opacity: 1;
}

.widget-controls {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.widget-container.editing .widget-controls {
  opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .widget-header {
    padding: 8px 12px 6px;
    min-height: 40px;
  }

  .widget-content {
    padding: 6px 12px 12px;
  }

  .widget-footer {
    padding: 6px 12px;
  }
}
`;
