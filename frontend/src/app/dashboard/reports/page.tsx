'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  CreditCard,
  Users,
  AlertTriangle
} from 'lucide-react';
import {
  ReportType,
  ReportPeriod,
  ExportFormat,
  ReportQuery,
  reportService
} from '../../../services/report.service';

interface ReportTypeInfo {
  type: ReportType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function ReportsPage() {
  const [_availableReports, setAvailableReports] = useState<Array<{
    type: ReportType;
    name: string;
    description: string;
  }>>([]);
  const [selectedReport, setSelectedReport] = useState<ReportType>(ReportType.FINANCIAL_OVERVIEW);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(ReportPeriod.THIS_MONTH);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [includeComparison, setIncludeComparison] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const reportTypeInfo: Record<ReportType, ReportTypeInfo> = {
    [ReportType.FINANCIAL_OVERVIEW]: {
      type: ReportType.FINANCIAL_OVERVIEW,
      name: 'Financial Overview',
      description: 'Comprehensive overview of financial performance',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'bg-blue-500',
    },
    [ReportType.PROFIT_LOSS]: {
      type: ReportType.PROFIT_LOSS,
      name: 'Profit & Loss Statement',
      description: 'Detailed profit and loss analysis',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-green-500',
    },
    [ReportType.CASH_FLOW]: {
      type: ReportType.CASH_FLOW,
      name: 'Cash Flow Statement',
      description: 'Cash flow analysis and projections',
      icon: <DollarSign className="h-6 w-6" />,
      color: 'bg-purple-500',
    },
    [ReportType.ACCOUNTS_RECEIVABLE]: {
      type: ReportType.ACCOUNTS_RECEIVABLE,
      name: 'Accounts Receivable Aging',
      description: 'Outstanding invoices and payment status',
      icon: <CreditCard className="h-6 w-6" />,
      color: 'bg-yellow-500',
    },
    [ReportType.VAT_REPORT]: {
      type: ReportType.VAT_REPORT,
      name: 'VAT Report (ZRA Compliance)',
      description: 'VAT calculation for tax compliance',
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-red-500',
    },
    [ReportType.REVENUE_BREAKDOWN]: {
      type: ReportType.REVENUE_BREAKDOWN,
      name: 'Revenue Analysis',
      description: 'Detailed revenue breakdown and trends',
      icon: <PieChart className="h-6 w-6" />,
      color: 'bg-indigo-500',
    },
    [ReportType.EXPENSE_BREAKDOWN]: {
      type: ReportType.EXPENSE_BREAKDOWN,
      name: 'Expense Analysis',
      description: 'Detailed expense breakdown and trends',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'bg-orange-500',
    },
    [ReportType.CUSTOMER_ANALYSIS]: {
      type: ReportType.CUSTOMER_ANALYSIS,
      name: 'Customer Analysis',
      description: 'Customer performance and risk assessment',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-teal-500',
    },
  };

  useEffect(() => {
    loadAvailableReports();
  }, []);

  const loadAvailableReports = async () => {
    try {
      const reports = await reportService.getAvailableReportTypes();
      setAvailableReports(reports);
    } catch (err) {
      console.error('Failed to load available reports:', err);
    }
  };

  const generateReport = async (exportFormat?: ExportFormat) => {
    try {
      setLoading(true);
      setError(null);

      const query: ReportQuery = {
        type: selectedReport,
        period: selectedPeriod,
        includeComparison,
        exportFormat,
      };

      if (selectedPeriod === ReportPeriod.CUSTOM) {
        if (!customStartDate || !customEndDate) {
          throw new Error('Please select start and end dates for custom period');
        }
        query.startDate = customStartDate;
        query.endDate = customEndDate;
      }

      const report = await reportService.generateReport(query);

      if (exportFormat) {
        // Handle export - in a real implementation, this would trigger a download
        alert(`Export to ${exportFormat} requested. ${report.message || 'Download will start shortly.'}`);
      } else {
        setReportData(report);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const renderReportData = () => {
    if (!reportData) return null;

    switch (selectedReport) {
      case ReportType.FINANCIAL_OVERVIEW:
        return renderFinancialOverview();
      case ReportType.VAT_REPORT:
        return renderVatReport();
      case ReportType.ACCOUNTS_RECEIVABLE:
        return renderAccountsReceivable();
      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Data</h3>
            <pre className="text-sm text-gray-600 overflow-auto">
              {JSON.stringify(reportData.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const renderFinancialOverview = () => {
    const data = reportData.data;
    return (
      <div className="space-y-6">
        {/* Financial Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reportService.formatCurrency(data.financialMetrics.revenue)}
              </div>
              <div className="text-sm text-gray-500">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {reportService.formatCurrency(data.financialMetrics.expenses)}
              </div>
              <div className="text-sm text-gray-500">Expenses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reportService.formatCurrency(data.financialMetrics.profit)}
              </div>
              <div className="text-sm text-gray-500">Net Profit</div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        {data.revenueBreakdown && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers</h3>
            <div className="space-y-3">
              {data.revenueBreakdown.byCustomer.slice(0, 5).map((customer: any, _index: number) => (
                <div key={customer.customerId} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{customer.customerName}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {reportService.formatCurrency(customer.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {reportService.formatPercentage(customer.percentage)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVatReport = () => {
    const data = reportData.data;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">VAT Report</h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Sales VAT */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Sales VAT</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Standard Rated (16%)</span>
                <span className="text-sm font-medium">{reportService.formatCurrency(data.sales.standardRated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Zero Rated</span>
                <span className="text-sm font-medium">{reportService.formatCurrency(data.sales.zeroRated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Exempt</span>
                <span className="text-sm font-medium">{reportService.formatCurrency(data.sales.exempt)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium text-gray-900">Output VAT</span>
                <span className="text-sm font-bold text-green-600">{reportService.formatCurrency(data.sales.outputVat)}</span>
              </div>
            </div>
          </div>

          {/* Purchases VAT */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Purchases VAT</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Purchases</span>
                <span className="text-sm font-medium">{reportService.formatCurrency(data.purchases.totalPurchases)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium text-gray-900">Input VAT</span>
                <span className="text-sm font-bold text-blue-600">{reportService.formatCurrency(data.purchases.inputVat)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* VAT Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {reportService.formatCurrency(data.vatLiability)}
              </div>
              <div className="text-sm text-gray-500">VAT Liability</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reportService.formatCurrency(data.vatRefund)}
              </div>
              <div className="text-sm text-gray-500">VAT Refund</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAccountsReceivable = () => {
    const data = reportData.data;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Accounts Receivable Aging</h3>

        {/* Aging Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              {reportService.formatCurrency(data.current)}
            </div>
            <div className="text-sm text-gray-500">Current</div>
            <div className="text-xs text-gray-400">(0-30 days)</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-600">
              {reportService.formatCurrency(data.thirtyDays)}
            </div>
            <div className="text-sm text-gray-500">31-60 days</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">
              {reportService.formatCurrency(data.sixtyDays)}
            </div>
            <div className="text-sm text-gray-500">61-90 days</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">
              {reportService.formatCurrency(data.ninetyDays)}
            </div>
            <div className="text-sm text-gray-500">90+ days</div>
          </div>
        </div>

        {/* Detailed List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Overdue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.details.slice(0, 10).map((detail: any) => (
                <tr key={detail.invoiceId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {detail.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {detail.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {reportService.formatCurrency(detail.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {detail.daysOverdue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      detail.category === 'current' ? 'bg-green-100 text-green-800' :
                      detail.category === '30days' ? 'bg-yellow-100 text-yellow-800' :
                      detail.category === '60days' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {reportService.getAgingCategoryLabel(detail.category)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-600">
            Generate comprehensive financial reports for your business
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Report Selection Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Report Type</h3>
              <div className="space-y-2">
                {Object.values(reportTypeInfo).map((report) => (
                  <button
                    key={report.type}
                    onClick={() => setSelectedReport(report.type)}
                    className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
                      selectedReport === report.type
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'border-2 border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-white ${report.color}`}>
                      {report.icon}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{report.name}</div>
                      <div className="text-xs text-gray-500">{report.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Report Configuration and Results */}
          <div className="lg:col-span-3">
            {/* Configuration Panel */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Configuration</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Period Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriod)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.values(ReportPeriod).map(period => (
                      <option key={period} value={period}>
                        {reportService.getReportPeriodLabel(period)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Date Range */}
                {selectedPeriod === ReportPeriod.CUSTOM && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                {/* Include Comparison */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeComparison"
                    checked={includeComparison}
                    onChange={(e) => setIncludeComparison(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeComparison" className="ml-2 text-sm text-gray-700">
                    Include period comparison
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => generateReport()}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </button>

                <button
                  onClick={() => generateReport(ExportFormat.PDF)}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </button>

                <button
                  onClick={() => generateReport(ExportFormat.EXCEL)}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Report Results */}
            {reportData && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {reportTypeInfo[selectedReport].name}
                  </h3>
                  <div className="text-sm text-gray-500">
                    Generated: {reportService.formatDate(reportData.generatedAt)}
                  </div>
                </div>
                {renderReportData()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
