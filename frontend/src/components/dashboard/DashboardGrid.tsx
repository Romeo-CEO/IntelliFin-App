'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';

import { useDashboard } from '../../contexts/DashboardContext';
import { Dashboard, DashboardWidget, GridLayoutItem, ResponsiveGridLayouts } from '../../types/dashboard.types';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';

import { DashboardToolbar } from './DashboardToolbar';
import { WidgetContainer } from './WidgetContainer';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  dashboard: Dashboard;
  className?: string;
}

/**
 * Main dashboard grid component using react-grid-layout
 * Provides responsive, draggable, and resizable widget layout
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({
  dashboard,
  className = '',
}) => {
  const { state, bulkUpdatePositions, setEditing } = useDashboard();
  const [layouts, setLayouts] = useState<ResponsiveGridLayouts | null>(null);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');

  // Convert widgets to grid layout items
  const convertWidgetsToLayouts = useCallback((widgets: DashboardWidget[]): ResponsiveGridLayouts => {
    const createLayoutItems = (breakpoint: string): GridLayoutItem[] => {
      return widgets.map(widget => {
        const position = widget.position;
        const responsive = position.responsive || {};

        let dimensions = { width: position.width, height: position.height };

        // Apply responsive dimensions
        if (breakpoint === 'sm' && responsive.mobile) {
          dimensions = responsive.mobile;
        } else if (breakpoint === 'md' && responsive.tablet) {
          dimensions = responsive.tablet;
        }

        return {
          i: widget.id,
          x: position.x,
          y: position.y,
          w: dimensions.width,
          h: dimensions.height,
          minW: position.minWidth || 2,
          minH: position.minHeight || 2,
          maxW: position.maxWidth || 12,
          maxH: position.maxHeight || 8,
          static: !state.isEditing,
          isDraggable: state.isEditing,
          isResizable: state.isEditing,
        };
      });
    };

    return {
      lg: createLayoutItems('lg'),
      md: createLayoutItems('md'),
      sm: createLayoutItems('sm'),
      xs: createLayoutItems('xs'),
      xxs: createLayoutItems('xxs'),
    };
  }, [state.isEditing]);

  // Initialize layouts from dashboard widgets
  const initialLayouts = useMemo(() => {
    if (!dashboard.widgets || dashboard.widgets.length === 0) {
      return {
        lg: [],
        md: [],
        sm: [],
        xs: [],
        xxs: [],
      };
    }
    return convertWidgetsToLayouts(dashboard.widgets);
  }, [dashboard.widgets, convertWidgetsToLayouts]);

  // Update layouts when widgets change
  React.useEffect(() => {
    setLayouts(initialLayouts);
  }, [initialLayouts]);

  // Handle layout change
  const handleLayoutChange = useCallback((layout: Layout[], allLayouts: ResponsiveGridLayouts) => {
    if (!state.isEditing) return;

    setLayouts(allLayouts);

    // Convert layout back to widget positions and update
    const updates = layout.map(item => {
      const widget = dashboard.widgets.find(w => w.id === item.i);
      if (!widget) return null;

      const newPosition = {
        ...widget.position,
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
      };

      return {
        id: item.i,
        position: newPosition,
      };
    }).filter(Boolean) as Array<{ id: string; position: any }>;

    if (updates.length > 0) {
      // Debounce the update to avoid too many API calls
      const timeoutId = setTimeout(() => {
        bulkUpdatePositions(dashboard.id, updates);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [state.isEditing, dashboard.id, dashboard.widgets, bulkUpdatePositions]);

  // Handle breakpoint change
  const handleBreakpointChange = useCallback((breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
  }, []);

  // Grid breakpoints configuration
  const breakpoints = useMemo(() => ({
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0,
  }), []);

  // Grid columns configuration
  const cols = useMemo(() => ({
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2,
  }), []);

  // Grid row height
  const rowHeight = useMemo(() => {
    const baseHeight = 60;
    const spacing = dashboard.layout?.spacing || 16;
    return baseHeight + spacing;
  }, [dashboard.layout?.spacing]);

  // Handle edit mode toggle
  const handleEditToggle = useCallback(() => {
    setEditing(!state.isEditing);
  }, [state.isEditing, setEditing]);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (state.error) {
    return (
      <ErrorMessage
        title="Failed to load dashboard"
        message={state.error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!layouts) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`dashboard-grid ${className}`}>
      {/* Dashboard Toolbar */}
      <DashboardToolbar
        dashboard={dashboard}
        isEditing={state.isEditing}
        onEditToggle={handleEditToggle}
        currentBreakpoint={currentBreakpoint}
      />

      {/* Grid Layout */}
      <div className="dashboard-content">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          margin={[16, 16]}
          containerPadding={[16, 16]}
          isDraggable={state.isEditing}
          isResizable={state.isEditing}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          useCSSTransforms={true}
          preventCollision={false}
          compactType="vertical"
          autoSize={true}
        >
          {dashboard.widgets.map(widget => (
            <div key={widget.id} className="widget-wrapper">
              <WidgetContainer
                widget={widget}
                isEditing={state.isEditing}
                dashboard={dashboard}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Empty State */}
      {dashboard.widgets.length === 0 && (
        <div className="empty-dashboard">
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No widgets yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first widget to this dashboard.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleEditToggle}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Widget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Overlay */}
      {state.isEditing && (
        <div className="editing-overlay">
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div className="text-sm text-gray-700">
                Editing mode active - Drag and resize widgets
              </div>
              <button
                onClick={handleEditToggle}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.dashboard-grid {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.dashboard-content {
  padding: 1rem;
}

.widget-wrapper {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.widget-wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.empty-dashboard {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editing-overlay {
  pointer-events: none;
}

.editing-overlay > * {
  pointer-events: auto;
}

.react-grid-item.react-grid-placeholder {
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed rgba(59, 130, 246, 0.3);
  border-radius: 8px;
}

.react-grid-item.cssTransforms {
  transition-property: transform;
  transition-duration: 200ms;
  transition-timing-function: ease;
}

.react-grid-item.resizing {
  opacity: 0.8;
  z-index: 3;
}

.react-grid-item.react-draggable-dragging {
  transition: none;
  z-index: 3;
}

.react-grid-item > .react-resizable-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  bottom: 0;
  right: 0;
  background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZG90cyBmaWxsPSIjOTk5IiBjeD0iMSIgY3k9IjEiIHI9IjEiLz4KPGR0cyBmaWxsPSIjOTk5IiBjeD0iMSIgY3k9IjUiIHI9IjEiLz4KPGR0cyBmaWxsPSIjOTk5IiBjeD0iNSIgY3k9IjEiIHI9IjEiLz4KPGR0cyBmaWxsPSIjOTk5IiBjeD0iNSIgY3k9IjUiIHI9IjEiLz4KPC9zdmc+Cg==');
  background-position: bottom right;
  padding: 0 3px 3px 0;
  background-repeat: no-repeat;
  background-origin: content-box;
  box-sizing: border-box;
  cursor: se-resize;
}
`;
