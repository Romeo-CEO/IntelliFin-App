'use client';

import React, { useState, useEffect } from 'react';
import { 
  Edit, 
  X, 
  Building2,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  Hash,
  FileText,
  Activity,
  Eye
} from 'lucide-react';
import { Account } from '../../services/accounting.service';
import { accountingService } from '../../services/accounting.service';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AccountDetailsProps {
  account: Account;
  onEdit: (account: Account) => void;
  onClose: () => void;
  className?: string;
}

export const AccountDetails: React.FC<AccountDetailsProps> = ({
  account,
  onEdit,
  onClose,
  className = '',
}) => {
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [accountBalance, setAccountBalance] = useState<any>(null);

  useEffect(() => {
    const loadAccountData = async () => {
      try {
        setLoadingTransactions(true);
        
        // Load recent transactions and current balance
        const [ledgerResponse, balanceResponse] = await Promise.all([
          accountingService.getAccountLedger(account.id),
          accountingService.getAccountBalance(account.id),
        ]);
        
        setRecentTransactions(ledgerResponse.slice(0, 10)); // Last 10 transactions
        setAccountBalance(balanceResponse);
      } catch (error) {
        console.error('Failed to load account data:', error);
      } finally {
        setLoadingTransactions(false);
      }
    };

    loadAccountData();
  }, [account.id]);

  const getAccountTypeIcon = (accountType: string) => {
    switch (accountType) {
      case 'ASSET':
        return <Building2 className="w-5 h-5" />;
      case 'LIABILITY':
        return <CreditCard className="w-5 h-5" />;
      case 'EQUITY':
        return <DollarSign className="w-5 h-5" />;
      case 'REVENUE':
        return <TrendingUp className="w-5 h-5" />;
      case 'EXPENSE':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Receipt className="w-5 h-5" />;
    }
  };

  const getAccountTypeColor = (accountType: string) => {
    switch (accountType) {
      case 'ASSET':
        return 'text-blue-600 bg-blue-100';
      case 'LIABILITY':
        return 'text-red-600 bg-red-100';
      case 'EQUITY':
        return 'text-purple-600 bg-purple-100';
      case 'REVENUE':
        return 'text-green-600 bg-green-100';
      case 'EXPENSE':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className={`account-details ${className}`}>
      {/* Header */}
      <div className="details-header">
        <div className="header-content">
          <div className="account-info">
            <div className={`account-icon ${getAccountTypeColor(account.accountType)}`}>
              {getAccountTypeIcon(account.accountType)}
            </div>
            <div className="account-title">
              <h2 className="account-name">{account.accountName}</h2>
              <p className="account-code">{account.accountCode}</p>
            </div>
          </div>
          
          <div className="header-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(account)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Account Status */}
        <div className="account-status">
          <Badge variant={account.isActive ? 'default' : 'secondary'}>
            {account.isActive ? 'Active' : 'Inactive'}
          </Badge>
          
          <Badge variant="outline">
            {account.accountType}
          </Badge>
          
          {account.isBankAccount && (
            <Badge variant="secondary">Bank Account</Badge>
          )}
          
          {account.isTaxAccount && (
            <Badge variant="secondary">Tax Account</Badge>
          )}
          
          {account.isSystem && (
            <Badge variant="outline">System Account</Badge>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="details-tabs">
        <TabsList className="tabs-list">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="tab-content">
          <div className="overview-content">
            {/* Balance Card */}
            <Card className="balance-card">
              <div className="balance-header">
                <h3>Current Balance</h3>
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div className="balance-amount">
                <span className={`amount ${account.currentBalance >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(account.currentBalance)}
                </span>
                <span className="currency">{account.currency}</span>
              </div>
              {accountBalance && (
                <div className="balance-meta">
                  <span>As of {formatDate(accountBalance.asOfDate)}</span>
                </div>
              )}
            </Card>

            {/* Account Properties */}
            <div className="properties-grid">
              <div className="property-item">
                <Hash className="property-icon" />
                <div className="property-content">
                  <span className="property-label">Account Code</span>
                  <span className="property-value">{account.accountCode}</span>
                </div>
              </div>

              <div className="property-item">
                <Receipt className="property-icon" />
                <div className="property-content">
                  <span className="property-label">Account Type</span>
                  <span className="property-value">{account.accountType}</span>
                </div>
              </div>

              {account.accountSubType && (
                <div className="property-item">
                  <FileText className="property-icon" />
                  <div className="property-content">
                    <span className="property-label">Sub Type</span>
                    <span className="property-value">{account.accountSubType}</span>
                  </div>
                </div>
              )}

              <div className="property-item">
                <Activity className="property-icon" />
                <div className="property-content">
                  <span className="property-label">Normal Balance</span>
                  <span className="property-value">{account.normalBalance}</span>
                </div>
              </div>

              <div className="property-item">
                <Calendar className="property-icon" />
                <div className="property-content">
                  <span className="property-label">Created</span>
                  <span className="property-value">{formatDate(account.createdAt)}</span>
                </div>
              </div>

              <div className="property-item">
                <Calendar className="property-icon" />
                <div className="property-content">
                  <span className="property-label">Last Updated</span>
                  <span className="property-value">{formatDate(account.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Bank Account Details */}
            {account.isBankAccount && (account.accountNumber || account.bankName) && (
              <Card className="bank-details">
                <h3>Bank Account Details</h3>
                <div className="bank-info">
                  {account.accountNumber && (
                    <div className="bank-item">
                      <span className="bank-label">Account Number:</span>
                      <span className="bank-value">{account.accountNumber}</span>
                    </div>
                  )}
                  {account.bankName && (
                    <div className="bank-item">
                      <span className="bank-label">Bank Name:</span>
                      <span className="bank-value">{account.bankName}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Description */}
            {account.description && (
              <Card className="description-card">
                <h3>Description</h3>
                <p>{account.description}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="tab-content">
          <div className="transactions-content">
            <div className="transactions-header">
              <h3>Recent Transactions</h3>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>

            {loadingTransactions ? (
              <div className="loading-container">
                <LoadingSpinner />
                <p>Loading transactions...</p>
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="transactions-list">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div className="transaction-date">
                      {formatDate(transaction.entryDate)}
                    </div>
                    <div className="transaction-description">
                      {transaction.description}
                    </div>
                    <div className="transaction-amounts">
                      {transaction.debitAmount > 0 && (
                        <span className="debit-amount">
                          Dr {formatCurrency(transaction.debitAmount)}
                        </span>
                      )}
                      {transaction.creditAmount > 0 && (
                        <span className="credit-amount">
                          Cr {formatCurrency(transaction.creditAmount)}
                        </span>
                      )}
                    </div>
                    <div className="transaction-balance">
                      {formatCurrency(transaction.runningBalance)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-transactions">
                <Receipt className="empty-icon" />
                <p>No transactions found for this account.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hierarchy" className="tab-content">
          <div className="hierarchy-content">
            {account.parentAccount && (
              <div className="parent-account">
                <h3>Parent Account</h3>
                <div className="account-link">
                  <span className="account-code">{account.parentAccount.accountCode}</span>
                  <span className="account-name">{account.parentAccount.accountName}</span>
                </div>
              </div>
            )}

            {account.childAccounts && account.childAccounts.length > 0 && (
              <div className="child-accounts">
                <h3>Child Accounts ({account.childAccounts.length})</h3>
                <div className="child-list">
                  {account.childAccounts.map((child) => (
                    <div key={child.id} className="account-link">
                      <span className="account-code">{child.accountCode}</span>
                      <span className="account-name">{child.accountName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!account.parentAccount && (!account.childAccounts || account.childAccounts.length === 0) && (
              <div className="no-hierarchy">
                <Building2 className="empty-icon" />
                <p>This account has no parent or child accounts.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
