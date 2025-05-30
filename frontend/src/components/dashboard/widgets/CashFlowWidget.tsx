'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';

import { analyticsService, CashFlowAnalytics, AnalyticsQuery } from '../../../services/analytics.service';
import { DashboardWidget } from '../../../types/dashboard.types';
import { ErrorMessage } from '../../common/ErrorMessage';
import { LoadingSpinner } from '../../common/LoadingSpinner';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CashFlowWidgetProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
}

export const CashFlowWidget: React.FC<CashFlowWidgetProps> = ({
  widget,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const [data, setData] = useState<CashFlowAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

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

  // Load cash flow data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getCashFlowAnalytics(query);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cash flow data');
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

    return {
      labels: data.data.map(item => {
        const date = new Date(item.period);
        return date.toLocaleDateString('en-ZM', { 
          month: 'short', 
          day: 'numeric',
          year: selectedPeriod === 'quarter' ? 'numeric' : undefined,
        });
      }),
      datasets: [
        {
          label: 'Cash Inflow',
          data: data.data.map(item => item.inflow),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Cash Outflow',
          data: data.data.map(item => item.outflow),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Net Cash Flow',
          data: data.data.map(item => item.netFlow),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [data, selectedPeriod]);

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
        title="Failed to load cash flow data"
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
          <div>No cash flow data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
        
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Total Inflow</div>
          <div className="text-lg font-bold text-green-700">
            {analyticsService.formatCurrency(data.summary.totalInflow)}
          </div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="text-sm text-red-600 font-medium">Total Outflow</div>
          <div className="text-lg font-bold text-red-700">
            {analyticsService.formatCurrency(data.summary.totalOutflow)}
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Net Cash Flow</div>
          <div className={`text-lg font-bold ${
            data.summary.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {analyticsService.formatCurrency(data.summary.netCashFlow)}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-600 font-medium">Current Balance</div>
          <div className={`text-lg font-bold ${
            data.summary.currentBalance >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {analyticsService.formatCurrency(data.summary.currentBalance)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {chartData && (
          <Line data={chartData} options={chartOptions} />
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
