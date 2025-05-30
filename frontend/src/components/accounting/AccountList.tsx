'use client';

import { 
  Edit, 
  Eye, 
  ArrowUpDown,
  Building2,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { Account } from '../../services/accounting.service';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Table } from '../ui/table';

interface AccountListProps {
  accounts: Account[];
  onAccountSelect: (account: Account) => void;
  onAccountEdit: (account: Account) => void;
  selectedAccount: Account | null;
  className?: string;
}

type SortField = 'accountCode' | 'accountName' | 'accountType' | 'currentBalance' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const AccountList: React.FC<AccountListProps> = ({
  accounts,
  onAccountSelect,
  onAccountEdit,
  selectedAccount,
  className = '',
}) => {
  const [sortField, setSortField] = useState<SortField>('accountCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sort accounts
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle different data types
      if (sortField === 'currentBalance') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortField === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [accounts, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getAccountTypeIcon = (accountType: string) => {
    switch (accountType) {
      case 'ASSET':
        return <Building2 className="w-4 h-4" />;
      case 'LIABILITY':
        return <CreditCard className="w-4 h-4" />;
      case 'EQUITY':
        return <DollarSign className="w-4 h-4" />;
      case 'REVENUE':
        return <TrendingUp className="w-4 h-4" />;
      case 'EXPENSE':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const getAccountTypeColor = (accountType: string) => {
    switch (accountType) {
      case 'ASSET':
        return 'text-blue-600';
      case 'LIABILITY':
        return 'text-red-600';
      case 'EQUITY':
        return 'text-purple-600';
      case 'REVENUE':
        return 'text-green-600';
      case 'EXPENSE':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
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
    });
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="sort-button"
    >
      {children}
      <ArrowUpDown className="w-4 h-4 ml-2" />
      {sortField === field && (
        <span className="sort-indicator">
          {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </Button>
  );

  if (accounts.length === 0) {
    return (
      <Card className={`empty-state ${className}`}>
        <div className="empty-content">
          <Building2 className="empty-icon" />
          <h3>No accounts found</h3>
          <p>No accounts match your current search and filter criteria.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`account-list ${className}`}>
      <div className="list-header">
        <h3>Accounts List</h3>
        <p>Showing {accounts.length} accounts</p>
      </div>

      <div className="table-container">
        <table className="accounts-table">
          <thead>
            <tr>
              <th>
                <SortButton field="accountCode">Code</SortButton>
              </th>
              <th>
                <SortButton field="accountName">Account Name</SortButton>
              </th>
              <th>
                <SortButton field="accountType">Type</SortButton>
              </th>
              <th>Status</th>
              <th>
                <SortButton field="currentBalance">Balance</SortButton>
              </th>
              <th>
                <SortButton field="createdAt">Created</SortButton>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((account) => (
              <tr
                key={account.id}
                className={`account-row ${selectedAccount?.id === account.id ? 'selected' : ''}`}
                onClick={() => onAccountSelect(account)}
              >
                <td>
                  <div className="account-code">
                    <span className="code-text">{account.accountCode}</span>
                  </div>
                </td>
                
                <td>
                  <div className="account-name">
                    <div className="name-content">
                      <span className="name-text">{account.accountName}</span>
                      {account.description && (
                        <span className="description-text">{account.description}</span>
                      )}
                    </div>
                  </div>
                </td>
                
                <td>
                  <div className="account-type">
                    <div className={`type-icon ${getAccountTypeColor(account.accountType)}`}>
                      {getAccountTypeIcon(account.accountType)}
                    </div>
                    <span className="type-text">{account.accountType}</span>
                  </div>
                </td>
                
                <td>
                  <div className="account-status">
                    <Badge 
                      variant={account.isActive ? 'default' : 'secondary'}
                      className="status-badge"
                    >
                      {account.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    
                    {account.isBankAccount && (
                      <Badge variant="outline" className="special-badge">
                        Bank
                      </Badge>
                    )}
                    
                    {account.isTaxAccount && (
                      <Badge variant="outline" className="special-badge">
                        Tax
                      </Badge>
                    )}
                    
                    {account.isSystem && (
                      <Badge variant="outline" className="special-badge">
                        System
                      </Badge>
                    )}
                  </div>
                </td>
                
                <td>
                  <div className="account-balance">
                    <span className={`balance-amount ${account.currentBalance >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(account.currentBalance)}
                    </span>
                    <span className="balance-currency">{account.currency}</span>
                  </div>
                </td>
                
                <td>
                  <div className="created-date">
                    {formatDate(account.createdAt)}
                  </div>
                </td>
                
                <td>
                  <div className="account-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccountSelect(account);
                      }}
                      className="action-button"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccountEdit(account);
                      }}
                      className="action-button"
                      title="Edit Account"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.account-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-neutral-300);
}

.list-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.list-header p {
  color: var(--color-neutral-700);
  font-size: 0.875rem;
}

.table-container {
  flex: 1;
  overflow: auto;
}

.accounts-table {
  width: 100%;
  border-collapse: collapse;
}

.accounts-table th {
  background-color: var(--color-neutral-100);
  padding: 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid var(--color-neutral-300);
  position: sticky;
  top: 0;
  z-index: 1;
}

.accounts-table td {
  padding: 12px;
  border-bottom: 1px solid var(--color-neutral-200);
}

.account-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.account-row:hover {
  background-color: var(--color-neutral-100);
}

.account-row.selected {
  background-color: var(--color-primary);
  color: white;
}

.account-row.selected td {
  color: white;
}

.sort-button {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  font-weight: 600;
  color: var(--color-neutral-900);
}

.sort-indicator {
  margin-left: 4px;
  font-size: 0.75rem;
}

.account-code .code-text {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 0.875rem;
}

.account-name .name-content {
  display: flex;
  flex-direction: column;
}

.name-text {
  font-weight: 500;
  margin-bottom: 2px;
}

.description-text {
  font-size: 0.75rem;
  color: var(--color-neutral-600);
  line-height: 1.3;
}

.account-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  display: flex;
  align-items: center;
}

.type-text {
  font-size: 0.875rem;
  font-weight: 500;
}

.account-status {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.status-badge,
.special-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
}

.account-balance {
  text-align: right;
}

.balance-amount {
  display: block;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.balance-amount.positive {
  color: var(--color-semantic-success);
}

.balance-amount.negative {
  color: var(--color-semantic-error);
}

.balance-currency {
  font-size: 0.75rem;
  color: var(--color-neutral-600);
}

.created-date {
  font-size: 0.875rem;
  color: var(--color-neutral-700);
}

.account-actions {
  display: flex;
  gap: 4px;
}

.action-button {
  width: 32px;
  height: 32px;
  padding: 0;
}

.empty-state {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  text-align: center;
  max-width: 300px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--color-neutral-500);
  margin: 0 auto 16px;
}

.empty-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-content p {
  color: var(--color-neutral-700);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .accounts-table {
    font-size: 0.875rem;
  }
  
  .accounts-table th,
  .accounts-table td {
    padding: 8px;
  }
  
  .account-name .description-text {
    display: none;
  }
  
  .account-status {
    flex-direction: column;
  }
  
  .account-actions {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .table-container {
    overflow-x: auto;
  }
  
  .accounts-table {
    min-width: 800px;
  }
}
`;
