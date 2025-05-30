'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { taxService } from '../../../services/tax.service';
import { DashboardWidget, Dashboard } from '../../../types/dashboard.types';
import { Badge } from '../../common/Badge';
import { ErrorMessage } from '../../common/ErrorMessage';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { ProgressBar } from '../../common/ProgressBar';

interface ZambianComplianceWidgetProps {
  widget: DashboardWidget;
  dashboard: Dashboard;
  isEditing?: boolean;
  performanceMode?: 'normal' | 'low-bandwidth';
  isMobile?: boolean;
}

interface ComplianceData {
  overallScore: number;
  zraStatus: {
    connected: boolean;
    lastSync: string;
    status: 'active' | 'inactive' | 'error';
  };
  vatCompliance: {
    currentPeriod: string;
    dueDate: string;
    status: 'filed' | 'pending' | 'overdue';
    amount: number;
  };
  taxReturns: {
    monthly: { status: string; dueDate: string };
    annual: { status: string; dueDate: string };
  };
  upcomingDeadlines: Array<{
    type: string;
    description: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
  lastUpdated: string;
}

/**
 * Zambian Compliance Widget Component
 * Displays ZRA compliance status and tax-related information
 * Optimized for Zambian SME tax requirements
 */
export const ZambianComplianceWidget: React.FC<ZambianComplianceWidgetProps> = ({
  widget,
  dashboard,
  isEditing = false,
  performanceMode = 'normal',
  isMobile = false,
}) => {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Widget configuration
  const config = widget.configuration || {};
  const {
    showZraStatus = true,
    includeVatSummary = true,
    showUpcomingDeadlines = true,
    complianceScore = true,
    period = 'current_quarter',
  } = config;

  // Load compliance data
  const loadComplianceData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const complianceData = await taxService.getComplianceStatus({
        period,
        includeZraStatus: showZraStatus,
        includeVatSummary,
        includeDeadlines: showUpcomingDeadlines,
        forceRefresh,
      });

      setData(complianceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, showZraStatus, includeVatSummary, showUpcomingDeadlines]);

  // Initial data load
  useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  // Auto-refresh
  useEffect(() => {
    if (widget.refreshInterval && widget.refreshInterval > 0) {
      const interval = setInterval(() => {
        loadComplianceData();
      }, widget.refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [widget.refreshInterval, loadComplianceData]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadComplianceData(true);
  }, [loadComplianceData]);

  // Get compliance score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'filed':
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
      case 'error':
      case 'inactive':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get days until deadline
  const getDaysUntilDeadline = (dateString: string) => {
    const deadline = new Date(dateString);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="zambian-compliance-widget loading">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <LoadingSpinner size="md" message="Loading compliance data..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="zambian-compliance-widget error">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          <button onClick={handleRefresh} className="refresh-button">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="widget-content">
          <ErrorMessage message={error} onRetry={handleRefresh} />
        </div>
      </div>
    );
  }

  return (
    <div className={`zambian-compliance-widget ${isMobile ? 'mobile' : ''} ${performanceMode}`}>
      {/* Widget Header */}
      <div className="widget-header">
        <h3 className="widget-title">{widget.title}</h3>
        <div className="widget-actions">
          {data?.lastUpdated && (
            <span className="last-updated">
              Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={handleRefresh} 
            className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
            disabled={refreshing}
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div className="widget-content">
        {/* Overall Compliance Score */}
        {data?.overallScore !== undefined && complianceScore && (
          <div className="compliance-score-section">
            <div className="score-header">
              <h4 className="section-title">🇿🇲 ZRA Compliance Score</h4>
              <span className={`score-value ${getScoreColor(data.overallScore)}`}>
                {data.overallScore}%
              </span>
            </div>
            <ProgressBar
              value={data.overallScore}
              max={100}
              color={getScoreColor(data.overallScore)}
              size="lg"
              showLabel={true}
            />
          </div>
        )}

        {/* ZRA Connection Status */}
        {data?.zraStatus && showZraStatus && (
          <div className="zra-status-section">
            <h4 className="section-title">ZRA Integration Status</h4>
            <div className="status-item">
              <div className="status-info">
                <span className="status-label">Connection:</span>
                <Badge variant={getStatusVariant(data.zraStatus.status)}>
                  {data.zraStatus.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              {data.zraStatus.lastSync && (
                <div className="status-detail">
                  Last sync: {formatDate(data.zraStatus.lastSync)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VAT Compliance */}
        {data?.vatCompliance && includeVatSummary && (
          <div className="vat-compliance-section">
            <h4 className="section-title">VAT Compliance</h4>
            <div className="vat-info">
              <div className="vat-item">
                <span className="vat-label">Current Period:</span>
                <span className="vat-value">{data.vatCompliance.currentPeriod}</span>
              </div>
              <div className="vat-item">
                <span className="vat-label">Status:</span>
                <Badge variant={getStatusVariant(data.vatCompliance.status)}>
                  {data.vatCompliance.status.toUpperCase()}
                </Badge>
              </div>
              <div className="vat-item">
                <span className="vat-label">Due Date:</span>
                <span className="vat-value">{formatDate(data.vatCompliance.dueDate)}</span>
              </div>
              {data.vatCompliance.amount > 0 && (
                <div className="vat-item">
                  <span className="vat-label">Amount Due:</span>
                  <span className="vat-value amount">
                    {formatCurrency(data.vatCompliance.amount)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tax Returns Status */}
        {data?.taxReturns && (
          <div className="tax-returns-section">
            <h4 className="section-title">Tax Returns</h4>
            <div className="returns-grid">
              <div className="return-item">
                <span className="return-type">Monthly Return</span>
                <Badge variant={getStatusVariant(data.taxReturns.monthly.status)}>
                  {data.taxReturns.monthly.status}
                </Badge>
                <span className="return-due">
                  Due: {formatDate(data.taxReturns.monthly.dueDate)}
                </span>
              </div>
              <div className="return-item">
                <span className="return-type">Annual Return</span>
                <Badge variant={getStatusVariant(data.taxReturns.annual.status)}>
                  {data.taxReturns.annual.status}
                </Badge>
                <span className="return-due">
                  Due: {formatDate(data.taxReturns.annual.dueDate)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Deadlines */}
        {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 && showUpcomingDeadlines && (
          <div className="deadlines-section">
            <h4 className="section-title">⏰ Upcoming Deadlines</h4>
            <div className="deadlines-list">
              {data.upcomingDeadlines.slice(0, isMobile ? 3 : 5).map((deadline, index) => {
                const daysUntil = getDaysUntilDeadline(deadline.dueDate);
                return (
                  <div key={index} className={`deadline-item priority-${deadline.priority}`}>
                    <div className="deadline-info">
                      <span className="deadline-type">{deadline.type}</span>
                      <span className="deadline-description">{deadline.description}</span>
                    </div>
                    <div className="deadline-timing">
                      <span className="deadline-date">{formatDate(deadline.dueDate)}</span>
                      <span className={`deadline-days ${daysUntil <= 7 ? 'urgent' : ''}`}>
                        {daysUntil > 0 ? `${daysUntil} days` : 'Overdue'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data?.recommendations && data.recommendations.length > 0 && (
          <div className="recommendations-section">
            <h4 className="section-title">💡 Recommendations</h4>
            <div className="recommendations-list">
              {data.recommendations.slice(0, isMobile ? 2 : 3).map((recommendation, index) => (
                <div key={index} className="recommendation-item">
                  <span className="recommendation-text">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <button className="action-button primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            File VAT Return
          </button>
          <button className="action-button secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZambianComplianceWidget;
