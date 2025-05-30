'use client';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import React, { useState, useEffect, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';

import { analyticsService, ReceivablesAnalytics } from '../../../services/analytics.service';
import { DashboardWidget } from '../../../types/dashboard.types';
import { ErrorMessage } from '../../common/ErrorMessage';
import { LoadingSpinner } from '../../common/LoadingSpinner';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface ReceivablesWidgetProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
}

export const ReceivablesWidget: React.FC<ReceivablesWidgetProps> = ({
  widget,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const [data, setData] = useState<ReceivablesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'details'>('chart');

  // Load receivables data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getReceivablesAging();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receivables data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Chart configuration
  const chartData = useMemo(() => {
    if (!data) return null;

    const { aging } = data;
    
    return {
      labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
      datasets: [
        {
          data: [
            aging.current,
            aging.thirtyDays,
            aging.sixtyDays,
            aging.ninetyDays,
            aging.overNinety,
          ],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',   // Green - Current
            'rgba(59, 130, 246, 0.8)',  // Blue - 1-30 days
            'rgba(251, 191, 36, 0.8)',  // Yellow - 31-60 days
            'rgba(249, 115, 22, 0.8)',  // Orange - 61-90 days
            'rgba(239, 68, 68, 0.8)',   // Red - 90+ days
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(59, 130, 246)',
            'rgb(251, 191, 36)',
            'rgb(249, 115, 22)',
            'rgb(239, 68, 68)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [data]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = analyticsService.formatCurrency(context.parsed);
            const percentage = data ? ((context.parsed / data.aging.total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
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
        title="Failed to load receivables data"
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
          <div>No receivables data available</div>
        </div>
      </div>
    );
  }

  const { aging, insights } = data;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
        
        {/* View mode selector */}
        <div className="flex space-x-1">
          {(['chart', 'details'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Level Alert */}
      <div className={`mb-4 p-3 rounded-lg ${analyticsService.getRiskLevelBgColor(insights.riskLevel)}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Risk Level: </span>
            <span className={`font-bold ${analyticsService.getRiskLevelColor(insights.riskLevel)}`}>
              {insights.riskLevel.toUpperCase()}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Overdue: </span>
            {analyticsService.formatPercentage(insights.overduePercentage)}
          </div>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-6">
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-xs text-green-600 font-medium">Current</div>
              <div className="text-sm font-bold text-green-700">
                {analyticsService.formatCurrency(aging.current)}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-xs text-blue-600 font-medium">1-30 Days</div>
              <div className="text-sm font-bold text-blue-700">
                {analyticsService.formatCurrency(aging.thirtyDays)}
              </div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-xs text-yellow-600 font-medium">31-60 Days</div>
              <div className="text-sm font-bold text-yellow-700">
                {analyticsService.formatCurrency(aging.sixtyDays)}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-xs text-orange-600 font-medium">61-90 Days</div>
              <div className="text-sm font-bold text-orange-700">
                {analyticsService.formatCurrency(aging.ninetyDays)}
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-xs text-red-600 font-medium">90+ Days</div>
              <div className="text-sm font-bold text-red-700">
                {analyticsService.formatCurrency(aging.overNinety)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="w-full max-w-md">
              {chartData && (
                <Doughnut data={chartData} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Total */}
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">Total Outstanding</div>
            <div className="text-xl font-bold text-gray-900">
              {analyticsService.formatCurrency(aging.total)}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Details View */}
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Avg Days Overdue</div>
                  <div className="text-lg font-bold text-gray-900">
                    {insights.averageDaysOverdue.toFixed(0)} days
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Overdue Amount</div>
                  <div className="text-lg font-bold text-red-600">
                    {analyticsService.formatCurrency(
                      aging.thirtyDays + aging.sixtyDays + aging.ninetyDays + aging.overNinety
                    )}
                  </div>
                </div>
              </div>

              {/* Top Overdue Invoices */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Top Overdue Invoices</h4>
                <div className="space-y-2">
                  {aging.details
                    .filter(detail => detail.daysOverdue > 0)
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 5)
                    .map((detail, index) => (
                      <div key={detail.invoiceId} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{detail.customerName}</div>
                          <div className="text-xs text-gray-500">
                            Invoice #{detail.invoiceNumber}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">
                            {analyticsService.formatCurrency(detail.amount)}
                          </div>
                          <div className={`text-xs ${
                            detail.daysOverdue <= 30 ? 'text-yellow-600' :
                            detail.daysOverdue <= 60 ? 'text-orange-600' :
                            detail.daysOverdue <= 90 ? 'text-red-600' : 'text-red-700'
                          }`}>
                            {detail.daysOverdue} days overdue
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recommendations */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-700 mb-2">Recommendations</h4>
        <ul className="text-sm text-blue-600 space-y-1">
          {insights.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2">•</span>
              <span>{recommendation}</span>
            </li>
          ))}
        </ul>
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
