'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Dashboard, DashboardWidget } from '../../types/dashboard.types';
import { useDashboard } from '../../contexts/DashboardContext';
import { WidgetContainer } from './WidgetContainer';
import { DashboardToolbar } from './DashboardToolbar';
import { DashboardSidebar } from './DashboardSidebar';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';

// Import CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface EnhancedDashboardLayoutProps {
  dashboard: Dashboard;
  className?: string;
}

/**
 * Enhanced Dashboard Layout Component
 * Optimized for Zambian SME requirements with mobile-first design
 * Features:
 * - Responsive grid layout with mobile optimization
 * - Performance monitoring for low-bandwidth environments
 * - Real-time updates with efficient caching
 * - Zambian market-specific features
 */
export const EnhancedDashboardLayout: React.FC<EnhancedDashboardLayoutProps> = ({
  dashboard,
  className = '',
}) => {
  const { state, updateWidgetPosition, bulkUpdatePositions, setEditing } = useDashboard();
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<'normal' | 'low-bandwidth'>('normal');

  // Media queries for responsive design
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isLowBandwidth = useMediaQuery('(max-width: 768px) and (connection: slow-2g)');

  // Performance monitoring
  const { startMeasure, endMeasure, getMetrics } = usePerformanceMonitor();

  // Responsive breakpoints optimized for Zambian mobile usage
  const breakpoints = useMemo(() => ({
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0,
  }), []);

  // Grid columns for different breakpoints
  const cols = useMemo(() => ({
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2,
  }), []);

  // Row height optimized for mobile touch interfaces
  const rowHeight = useMemo(() => {
    if (isMobile) return 60;
    if (isTablet) return 80;
    return 100;
  }, [isMobile, isTablet]);

  // Initialize layouts from dashboard configuration
  useEffect(() => {
    if (dashboard?.widgets) {
      startMeasure('layout-initialization');
      
      const initialLayouts = generateLayoutsFromWidgets(dashboard.widgets);
      setLayouts(initialLayouts);
      
      endMeasure('layout-initialization');
    }
  }, [dashboard?.widgets, startMeasure, endMeasure]);

  // Detect low-bandwidth conditions and adjust performance mode
  useEffect(() => {
    if (isLowBandwidth || navigator.connection?.effectiveType === 'slow-2g') {
      setPerformanceMode('low-bandwidth');
    } else {
      setPerformanceMode('normal');
    }
  }, [isLowBandwidth]);

  // Generate layouts for all breakpoints from widget positions
  const generateLayoutsFromWidgets = useCallback((widgets: DashboardWidget[]) => {
    const layoutsByBreakpoint: { [key: string]: Layout[] } = {};
    
    Object.keys(breakpoints).forEach(breakpoint => {
      layoutsByBreakpoint[breakpoint] = widgets.map(widget => ({
        i: widget.id,
        x: widget.position?.x || 0,
        y: widget.position?.y || 0,
        w: widget.position?.w || (breakpoint === 'xs' || breakpoint === 'xxs' ? 2 : 4),
        h: widget.position?.h || 3,
        minW: breakpoint === 'xs' || breakpoint === 'xxs' ? 1 : 2,
        minH: 2,
        maxH: 8,
      }));
    });
    
    return layoutsByBreakpoint;
  }, [breakpoints]);

  // Handle layout changes with performance optimization
  const handleLayoutChange = useCallback((layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    startMeasure('layout-change');
    
    setLayouts(layouts);
    
    // Debounced bulk update to reduce API calls
    const updates = layout.map(item => ({
      id: item.i,
      position: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      },
    }));
    
    // Only update if in editing mode
    if (state.isEditing) {
      debouncedBulkUpdate(updates);
    }
    
    endMeasure('layout-change');
  }, [state.isEditing, startMeasure, endMeasure]);

  // Debounced bulk update function
  const debouncedBulkUpdate = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (updates: Array<{ id: string; position: any }>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        bulkUpdatePositions(dashboard.id, updates);
      }, 1000); // 1 second debounce
    };
  }, [dashboard.id, bulkUpdatePositions]);

  // Handle breakpoint changes
  const handleBreakpointChange = useCallback((breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
    
    // Adjust sidebar visibility based on breakpoint
    if (breakpoint === 'xs' || breakpoint === 'xxs') {
      setSidebarOpen(false);
    }
  }, []);

  // Toggle editing mode
  const toggleEditMode = useCallback(() => {
    setEditing(!state.isEditing);
  }, [state.isEditing, setEditing]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  // Render loading state
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Dashboard Error</h3>
        <p className="text-red-600 mt-1">{state.error}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`enhanced-dashboard-layout ${className}`}>
        {/* Dashboard Toolbar */}
        <DashboardToolbar
          dashboard={dashboard}
          isEditing={state.isEditing}
          onToggleEdit={toggleEditMode}
          onToggleSidebar={toggleSidebar}
          performanceMode={performanceMode}
          onPerformanceModeChange={setPerformanceMode}
        />

        <div className="dashboard-content-wrapper flex">
          {/* Sidebar */}
          {sidebarOpen && (
            <DashboardSidebar
              dashboard={dashboard}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              isMobile={isMobile}
            />
          )}

          {/* Main Dashboard Content */}
          <div className={`dashboard-main flex-1 ${sidebarOpen ? 'ml-64' : ''} ${isMobile ? 'ml-0' : ''}`}>
            {/* Performance indicator for low-bandwidth mode */}
            {performanceMode === 'low-bandwidth' && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Low-bandwidth mode active. Dashboard optimized for slower connections.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Layout */}
            <div className="dashboard-grid-container">
              <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={breakpoints}
                cols={cols}
                rowHeight={rowHeight}
                margin={isMobile ? [8, 8] : [16, 16]}
                containerPadding={isMobile ? [8, 8] : [16, 16]}
                isDraggable={state.isEditing && !isMobile}
                isResizable={state.isEditing && !isMobile}
                onLayoutChange={handleLayoutChange}
                onBreakpointChange={handleBreakpointChange}
                useCSSTransforms={true}
                preventCollision={false}
                compactType="vertical"
                autoSize={true}
                measureBeforeMount={false}
                // Performance optimizations
                transformScale={performanceMode === 'low-bandwidth' ? 0.9 : 1}
              >
                {dashboard.widgets.map(widget => (
                  <div key={widget.id} className="widget-wrapper">
                    <WidgetContainer
                      widget={widget}
                      dashboard={dashboard}
                      isEditing={state.isEditing}
                      performanceMode={performanceMode}
                      isMobile={isMobile}
                    />
                  </div>
                ))}
              </ResponsiveGridLayout>
            </div>
          </div>
        </div>

        {/* Performance metrics display (development mode) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs">
            <div>Breakpoint: {currentBreakpoint}</div>
            <div>Performance: {performanceMode}</div>
            <div>Widgets: {dashboard.widgets.length}</div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default EnhancedDashboardLayout;
