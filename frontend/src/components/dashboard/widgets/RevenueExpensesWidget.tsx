'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { DashboardWidget } from '../../../types/dashboard.types';
import { analyticsService, RevenueExpensesAnalytics, AnalyticsQuery } from '../../../services/analytics.service';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ErrorMessage } from '../../common/ErrorMessage';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface RevenueExpensesWidgetProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
}

export const RevenueExpensesWidget: React.FC<RevenueExpensesWidgetProps> = ({
  widget,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const [data, setData] = useState<RevenueExpensesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [viewMode, setViewMode] = useState<'comparison' | 'profit'>('comparison');

  // Get query parameters from widget configuration
  const query: AnalyticsQuery = useMemo(() => {
    const config = widget.configuration as any;
    const periodDates = analyticsService.getPeriodDates(selectedPeriod);
    
    return {
      startDate: config?.startDate || periodDates.startDate,
      endDate: config?.endDate || periodDates.endDate,
      groupBy: selectedPeriod === 'week' ? 'day' : selectedPeriod === 'quarter' ? 'month' : 'week',
    };
  }, [widget.configuration, selectedPeriod]);

  // Load revenue vs expenses data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getRevenueExpensesAnalytics(query);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue vs expenses data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [query]);

  // Chart configuration
  const chartData = useMemo(() => {
    if (!data) return null;

    const labels = data.data.map(item => {
      const date = new Date(item.period);
      return date.toLocaleDateString('en-ZM', { 
        month: 'short', 
        day: 'numeric',
        year: selectedPeriod === 'quarter' ? 'numeric' : undefined,
      });
    });

    if (viewMode === 'comparison') {
      return {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: data.data.map(item => item.revenue),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
          },
          {
            label: 'Expenses',
            data: data.data.map(item => item.expenses),
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
          },
        ],
      };
    } else {
      return {
        labels,
        datasets: [
          {
            label: 'Profit',
            data: data.data.map(item => item.profit),
            backgroundColor: data.data.map(item => 
              item.profit >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
            ),
            borderColor: data.data.map(item => 
              item.profit >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
            ),
            borderWidth: 1,
          },
        ],
      };
    }
  }, [data, selectedPeriod, viewMode]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = analyticsService.formatCurrency(context.parsed.y);
            return `${label}: ${value}`;
          },
          afterLabel: (context: any) => {
            if (viewMode === 'comparison' && data) {
              const dataPoint = data.data[context.dataIndex];
              return `Profit Margin: ${analyticsService.formatPercentage(dataPoint.profitMargin)}`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Period',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Amount (ZMW)',
        },
        ticks: {
          callback: (value: any) => analyticsService.formatCurrency(value),
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load revenue vs expenses data"
        message={error}
        onRetry={loadData}
      />
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <div>No revenue vs expenses data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
        
        <div className="flex space-x-2">
          {/* View mode selector */}
          <div className="flex space-x-1">
            {(['comparison', 'profit'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {mode === 'comparison' ? 'Compare' : 'Profit'}
              </button>
            ))}
          </div>
          
          {/* Period selector */}
          <div className="flex space-x-1">
            {(['week', 'month', 'quarter'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Total Revenue</div>
          <div className="text-lg font-bold text-green-700">
            {analyticsService.formatCurrency(data.summary.totalRevenue)}
          </div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="text-sm text-red-600 font-medium">Total Expenses</div>
          <div className="text-lg font-bold text-red-700">
            {analyticsService.formatCurrency(data.summary.totalExpenses)}
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Total Profit</div>
          <div className={`text-lg font-bold ${
            data.summary.totalProfit >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {analyticsService.formatCurrency(data.summary.totalProfit)}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-600 font-medium">Avg Profit Margin</div>
          <div className={`text-lg font-bold ${
            data.summary.averageProfitMargin >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {analyticsService.formatPercentage(data.summary.averageProfitMargin)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {chartData && (
          <Bar data={chartData} options={chartOptions} />
        )}
      </div>

      {/* Widget description */}
      {widget.description && (
        <div className="mt-4 text-sm text-gray-600">
          {widget.description}
        </div>
      )}
    </div>
  );
};
