'use client';

import {
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  Calendar,
  FileText,
  DollarSign,
  Building2,
  RefreshCw
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { ErrorMessage } from '../../../../components/common/ErrorMessage';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { AccountingProvider } from '../../../../contexts/AccountingContext';
import { accountingService, TrialBalance, BalanceSheet, IncomeStatement } from '../../../../services/accounting.service';

const FinancialReportsContent: React.FC = () => {
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date filters
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodFrom, setPeriodFrom] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [periodTo, setPeriodTo] = useState(new Date().toISOString().split('T')[0]);

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const [trialBalanceData, balanceSheetData, incomeStatementData] = await Promise.all([
        accountingService.getTrialBalance(asOfDate),
        accountingService.getBalanceSheet(asOfDate),
        accountingService.getIncomeStatement(periodFrom, periodTo),
      ]);

      setTrialBalance(trialBalanceData);
      setBalanceSheet(balanceSheetData);
      setIncomeStatement(incomeStatementData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="financial-reports-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="page-title">Financial Reports</h1>
            <p className="page-description">
              View trial balance, balance sheet, and income statement reports
            </p>
          </div>

          <div className="header-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={loadReports}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Date Controls */}
        <div className="date-controls">
          <div className="date-field">
            <label>As of Date:</label>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>

          <div className="date-field">
            <label>Period From:</label>
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
          </div>

          <div className="date-field">
            <label>Period To:</label>
            <Input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
          </div>

          <Button onClick={loadReports} disabled={loading}>
            Update Reports
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Main Content */}
      <div className="main-content">
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Loading financial reports...</p>
          </div>
        ) : (
          <Tabs defaultValue="trial-balance" className="reports-tabs">
            <TabsList className="tabs-list">
              <TabsTrigger value="trial-balance">
                <BarChart3 className="w-4 h-4 mr-2" />
                Trial Balance
              </TabsTrigger>
              <TabsTrigger value="balance-sheet">
                <Building2 className="w-4 h-4 mr-2" />
                Balance Sheet
              </TabsTrigger>
              <TabsTrigger value="income-statement">
                <TrendingUp className="w-4 h-4 mr-2" />
                Income Statement
              </TabsTrigger>
            </TabsList>

            {/* Trial Balance */}
            <TabsContent value="trial-balance" className="tab-content">
              <Card className="report-card">
                <div className="report-header">
                  <h2>Trial Balance</h2>
                  <p>As of {formatDate(asOfDate)}</p>
                  {trialBalance && (
                    <div className="balance-status">
                      {trialBalance.isBalanced ? (
                        <span className="balanced">✓ Balanced</span>
                      ) : (
                        <span className="unbalanced">⚠ Unbalanced</span>
                      )}
                    </div>
                  )}
                </div>

                {trialBalance && (
                  <div className="report-content">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Account Code</th>
                          <th>Account Name</th>
                          <th>Debit</th>
                          <th>Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trialBalance.accounts.map((account) => (
                          <tr key={account.accountId}>
                            <td>{account.accountCode}</td>
                            <td>{account.accountName}</td>
                            <td className="amount">
                              {account.debitTotal > 0 ? formatCurrency(account.debitTotal) : ''}
                            </td>
                            <td className="amount">
                              {account.creditTotal > 0 ? formatCurrency(account.creditTotal) : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="totals-row">
                          <td colSpan={2}><strong>Totals</strong></td>
                          <td className="amount"><strong>{formatCurrency(trialBalance.totalDebits)}</strong></td>
                          <td className="amount"><strong>{formatCurrency(trialBalance.totalCredits)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Balance Sheet */}
            <TabsContent value="balance-sheet" className="tab-content">
              <Card className="report-card">
                <div className="report-header">
                  <h2>Balance Sheet</h2>
                  <p>As of {formatDate(asOfDate)}</p>
                  {balanceSheet && (
                    <div className="balance-status">
                      {balanceSheet.isBalanced ? (
                        <span className="balanced">✓ Balanced</span>
                      ) : (
                        <span className="unbalanced">⚠ Unbalanced</span>
                      )}
                    </div>
                  )}
                </div>

                {balanceSheet && (
                  <div className="report-content balance-sheet">
                    <div className="balance-sheet-section">
                      <h3>Assets</h3>

                      <div className="subsection">
                        <h4>Current Assets</h4>
                        {balanceSheet.assets.currentAssets.map((asset) => (
                          <div key={asset.accountId} className="line-item">
                            <span>{asset.accountName}</span>
                            <span>{formatCurrency(asset.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="subsection">
                        <h4>Non-Current Assets</h4>
                        {balanceSheet.assets.nonCurrentAssets.map((asset) => (
                          <div key={asset.accountId} className="line-item">
                            <span>{asset.accountName}</span>
                            <span>{formatCurrency(asset.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="total-line">
                        <span><strong>Total Assets</strong></span>
                        <span><strong>{formatCurrency(balanceSheet.assets.totalAssets)}</strong></span>
                      </div>
                    </div>

                    <div className="balance-sheet-section">
                      <h3>Liabilities & Equity</h3>

                      <div className="subsection">
                        <h4>Current Liabilities</h4>
                        {balanceSheet.liabilities.currentLiabilities.map((liability) => (
                          <div key={liability.accountId} className="line-item">
                            <span>{liability.accountName}</span>
                            <span>{formatCurrency(liability.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="subsection">
                        <h4>Non-Current Liabilities</h4>
                        {balanceSheet.liabilities.nonCurrentLiabilities.map((liability) => (
                          <div key={liability.accountId} className="line-item">
                            <span>{liability.accountName}</span>
                            <span>{formatCurrency(liability.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="subtotal-line">
                        <span>Total Liabilities</span>
                        <span>{formatCurrency(balanceSheet.liabilities.totalLiabilities)}</span>
                      </div>

                      <div className="subsection">
                        <h4>Equity</h4>
                        {balanceSheet.equity.equityAccounts.map((equity) => (
                          <div key={equity.accountId} className="line-item">
                            <span>{equity.accountName}</span>
                            <span>{formatCurrency(equity.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="subtotal-line">
                        <span>Total Equity</span>
                        <span>{formatCurrency(balanceSheet.equity.totalEquity)}</span>
                      </div>

                      <div className="total-line">
                        <span><strong>Total Liabilities & Equity</strong></span>
                        <span><strong>{formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Income Statement */}
            <TabsContent value="income-statement" className="tab-content">
              <Card className="report-card">
                <div className="report-header">
                  <h2>Income Statement</h2>
                  <p>For the period {formatDate(periodFrom)} to {formatDate(periodTo)}</p>
                </div>

                {incomeStatement && (
                  <div className="report-content income-statement">
                    <div className="income-section">
                      <h3>Revenue</h3>

                      <div className="subsection">
                        <h4>Operating Revenue</h4>
                        {incomeStatement.revenue.operatingRevenue.map((revenue) => (
                          <div key={revenue.accountId} className="line-item">
                            <span>{revenue.accountName}</span>
                            <span>{formatCurrency(revenue.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="subsection">
                        <h4>Other Revenue</h4>
                        {incomeStatement.revenue.nonOperatingRevenue.map((revenue) => (
                          <div key={revenue.accountId} className="line-item">
                            <span>{revenue.accountName}</span>
                            <span>{formatCurrency(revenue.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="total-line">
                        <span><strong>Total Revenue</strong></span>
                        <span><strong>{formatCurrency(incomeStatement.revenue.totalRevenue)}</strong></span>
                      </div>
                    </div>

                    <div className="income-section">
                      <h3>Expenses</h3>

                      <div className="subsection">
                        <h4>Cost of Goods Sold</h4>
                        {incomeStatement.expenses.costOfGoodsSold.map((expense) => (
                          <div key={expense.accountId} className="line-item">
                            <span>{expense.accountName}</span>
                            <span>{formatCurrency(expense.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="subtotal-line">
                        <span>Gross Profit</span>
                        <span>{formatCurrency(incomeStatement.grossProfit)}</span>
                      </div>

                      <div className="subsection">
                        <h4>Operating Expenses</h4>
                        {incomeStatement.expenses.operatingExpenses.map((expense) => (
                          <div key={expense.accountId} className="line-item">
                            <span>{expense.accountName}</span>
                            <span>{formatCurrency(expense.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="subtotal-line">
                        <span>Operating Income</span>
                        <span>{formatCurrency(incomeStatement.operatingIncome)}</span>
                      </div>

                      <div className="subsection">
                        <h4>Other Expenses</h4>
                        {incomeStatement.expenses.nonOperatingExpenses.map((expense) => (
                          <div key={expense.accountId} className="line-item">
                            <span>{expense.accountName}</span>
                            <span>{formatCurrency(expense.balance)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="total-line">
                        <span><strong>Net Income</strong></span>
                        <span className={incomeStatement.netIncome >= 0 ? 'positive' : 'negative'}>
                          <strong>{formatCurrency(incomeStatement.netIncome)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default function FinancialReportsPage() {
  return (
    <DashboardLayout>
      <AccountingProvider>
        <FinancialReportsContent />
      </AccountingProvider>
    </DashboardLayout>
  );
}
