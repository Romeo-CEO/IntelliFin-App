import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import { analyticsService } from '../../../../services/analytics.service';
import { EnhancedAnalyticsWidget } from '../EnhancedAnalyticsWidget';

// Mock the analytics service
jest.mock('../../../../services/analytics.service', () => ({
  analyticsService: {
    getEnhancedAnalytics: jest.fn(),
    formatCurrency: jest.fn((amount) => `ZMW ${amount.toLocaleString()}`),
    formatPercentage: jest.fn((value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`),
  },
}));

// Mock Chart component
jest.mock('../../../charts/Chart', () => ({
  Chart: ({ type, data, options }: any) => (
    <div data-testid="mock-chart" data-chart-type={type}>
      Chart with {data?.datasets?.length || 0} datasets
    </div>
  ),
}));

// Mock other components
jest.mock('../../common/LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message: string }) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
}));

jest.mock('../../common/ErrorMessage', () => ({
  ErrorMessage: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div data-testid="error-message">
      {message}
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

jest.mock('./MetricCard', () => ({
  MetricCard: ({ title, value, trend, color }: any) => (
    <div data-testid="metric-card" data-title={title} data-value={value} data-trend={trend} data-color={color}>
      {title}: {value}
    </div>
  ),
}));

const mockWidget = {
  id: 'widget-123',
  dashboardId: 'dashboard-456',
  widgetType: 'ENHANCED_ANALYTICS' as any,
  title: 'Enhanced Analytics',
  description: 'Advanced analytics with forecasting',
  position: { x: 0, y: 0, w: 6, h: 4 },
  configuration: {
    analysisType: 'overview',
    period: 'last_6_months',
    includeForecasts: true,
    includeAnomalies: true,
    showTrends: true,
    currency: 'ZMW',
  },
  refreshInterval: 300,
  isVisible: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockDashboard = {
  id: 'dashboard-456',
  organizationId: 'org-789',
  name: 'Test Dashboard',
  isDefault: false,
  isPublic: true,
  layout: {},
  creator: { id: 'user-1', name: 'Test User' },
  widgets: [mockWidget],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockAnalyticsData = {
  kpis: {
    totalRevenue: 100000,
    totalExpenses: 60000,
    netProfit: 40000,
    profitMargin: 40,
    revenueGrowth: 15,
    expenseGrowth: 8,
  },
  trends: {
    revenue: [
      { period: 'Jan', amount: 80000 },
      { period: 'Feb', amount: 90000 },
      { period: 'Mar', amount: 100000 },
    ],
    expenses: [
      { period: 'Jan', amount: 50000 },
      { period: 'Feb', amount: 55000 },
      { period: 'Mar', amount: 60000 },
    ],
  },
  forecasts: {
    revenue: [
      { period: 'Apr', amount: 110000 },
      { period: 'May', amount: 115000 },
    ],
    expenses: [
      { period: 'Apr', amount: 65000 },
      { period: 'May', amount: 67000 },
    ],
  },
  anomalies: [
    {
      type: 'revenue_spike',
      description: 'Unusual revenue increase detected',
      severity: 'medium',
    },
  ],
  lastUpdated: '2024-01-15T10:30:00Z',
};

describe('EnhancedAnalyticsWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (analyticsService.getEnhancedAnalytics as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
      />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('renders analytics data successfully', async () => {
    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue(mockAnalyticsData);

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    // Check KPI cards
    expect(screen.getByTestId('metric-card')).toBeInTheDocument();
    
    // Check chart rendering
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
    expect(screen.getByTestId('mock-chart')).toHaveAttribute('data-chart-type', 'line');

    // Check anomalies section
    expect(screen.getByText('⚠️ Anomalies Detected')).toBeInTheDocument();
    expect(screen.getByText('Unusual revenue increase detected')).toBeInTheDocument();

    // Check forecasts section
    expect(screen.getByText('📈 Forecasts')).toBeInTheDocument();
  });

  it('handles error state correctly', async () => {
    const errorMessage = 'Failed to load analytics data';
    (analyticsService.getEnhancedAnalytics as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue(mockAnalyticsData);

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button');
    fireEvent.click(refreshButton);

    expect(analyticsService.getEnhancedAnalytics).toHaveBeenCalledTimes(2);
    expect(analyticsService.getEnhancedAnalytics).toHaveBeenLastCalledWith({
      type: 'overview',
      period: 'last_6_months',
      includeForecasts: true,
      includeAnomalies: true,
      includeKpis: true,
      includeTrends: true,
      forceRefresh: true,
    });
  });

  it('adapts to mobile mode', async () => {
    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue(mockAnalyticsData);

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
        isMobile={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    const widget = screen.getByText('Enhanced Analytics').closest('.enhanced-analytics-widget');
    expect(widget).toHaveClass('mobile');
  });

  it('adapts to low-bandwidth mode', async () => {
    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue(mockAnalyticsData);

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
        performanceMode="low-bandwidth"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    const widget = screen.getByText('Enhanced Analytics').closest('.enhanced-analytics-widget');
    expect(widget).toHaveClass('low-bandwidth');
  });

  it('excludes forecasts when not configured', async () => {
    const widgetWithoutForecasts = {
      ...mockWidget,
      configuration: {
        ...mockWidget.configuration,
        includeForecasts: false,
      },
    };

    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue({
      ...mockAnalyticsData,
      forecasts: undefined,
    });

    render(
      <EnhancedAnalyticsWidget
        widget={widgetWithoutForecasts}
        dashboard={mockDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    expect(screen.queryByText('📈 Forecasts')).not.toBeInTheDocument();
  });

  it('excludes anomalies when not configured', async () => {
    const widgetWithoutAnomalies = {
      ...mockWidget,
      configuration: {
        ...mockWidget.configuration,
        includeAnomalies: false,
      },
    };

    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue({
      ...mockAnalyticsData,
      anomalies: undefined,
    });

    render(
      <EnhancedAnalyticsWidget
        widget={widgetWithoutAnomalies}
        dashboard={mockDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    expect(screen.queryByText('⚠️ Anomalies Detected')).not.toBeInTheDocument();
  });

  it('formats currency correctly for Zambian market', async () => {
    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue(mockAnalyticsData);
    (analyticsService.formatCurrency as jest.Mock).mockImplementation(
      (amount) => `ZMW ${amount.toLocaleString()}`
    );

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    expect(analyticsService.formatCurrency).toHaveBeenCalledWith(100000);
    expect(analyticsService.formatCurrency).toHaveBeenCalledWith(60000);
    expect(analyticsService.formatCurrency).toHaveBeenCalledWith(40000);
  });

  it('handles auto-refresh when configured', async () => {
    jest.useFakeTimers();
    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue(mockAnalyticsData);

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    // Initial load
    expect(analyticsService.getEnhancedAnalytics).toHaveBeenCalledTimes(1);

    // Fast-forward time to trigger auto-refresh
    jest.advanceTimersByTime(300000); // 5 minutes

    await waitFor(() => {
      expect(analyticsService.getEnhancedAnalytics).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('displays last updated timestamp', async () => {
    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue(mockAnalyticsData);

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });

  it('limits anomalies display on mobile', async () => {
    const dataWithManyAnomalies = {
      ...mockAnalyticsData,
      anomalies: [
        { type: 'anomaly1', description: 'Anomaly 1', severity: 'high' },
        { type: 'anomaly2', description: 'Anomaly 2', severity: 'medium' },
        { type: 'anomaly3', description: 'Anomaly 3', severity: 'low' },
        { type: 'anomaly4', description: 'Anomaly 4', severity: 'medium' },
      ],
    };

    (analyticsService.getEnhancedAnalytics as jest.Mock).mockResolvedValue(dataWithManyAnomalies);

    render(
      <EnhancedAnalyticsWidget
        widget={mockWidget}
        dashboard={mockDashboard}
        isMobile={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Analytics')).toBeInTheDocument();
    });

    // Should only show first 2 anomalies on mobile
    expect(screen.getByText('Anomaly 1')).toBeInTheDocument();
    expect(screen.getByText('Anomaly 2')).toBeInTheDocument();
    expect(screen.queryByText('Anomaly 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Anomaly 4')).not.toBeInTheDocument();
  });
});
