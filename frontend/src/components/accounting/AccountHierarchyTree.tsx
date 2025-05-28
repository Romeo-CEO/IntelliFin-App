'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Edit, 
  Eye, 
  DollarSign,
  Building2,
  CreditCard,
  Receipt,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Account } from '../../services/accounting.service';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';

interface AccountHierarchyTreeProps {
  accounts: Account[];
  searchTerm: string;
  filterType: string;
  onAccountSelect: (account: Account) => void;
  onAccountEdit: (account: Account) => void;
  selectedAccount: Account | null;
  className?: string;
}

interface TreeNodeProps {
  account: Account;
  level: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (account: Account) => void;
  onEdit: (account: Account) => void;
  isSelected: boolean;
  searchTerm: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  account,
  level,
  isExpanded,
  onToggle,
  onSelect,
  onEdit,
  isSelected,
  searchTerm,
}) => {
  const hasChildren = account.childAccounts && account.childAccounts.length > 0;
  const indentStyle = { paddingLeft: `${level * 24}px` };

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

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-medium">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="tree-node">
      <div 
        className={`tree-node-content ${isSelected ? 'selected' : ''}`}
        style={indentStyle}
        onClick={() => onSelect(account)}
      >
        <div className="node-expand">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="expand-button"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          ) : (
            <div className="expand-spacer" />
          )}
        </div>

        <div className="node-icon">
          <div className={`icon-wrapper ${getAccountTypeColor(account.accountType)}`}>
            {getAccountTypeIcon(account.accountType)}
          </div>
        </div>

        <div className="node-info">
          <div className="account-header">
            <span className="account-code">
              {highlightSearchTerm(account.accountCode, searchTerm)}
            </span>
            <span className="account-name">
              {highlightSearchTerm(account.accountName, searchTerm)}
            </span>
          </div>
          
          <div className="account-meta">
            <Badge variant="outline" className="type-badge">
              {account.accountType}
            </Badge>
            
            {account.isBankAccount && (
              <Badge variant="secondary" className="special-badge">
                Bank
              </Badge>
            )}
            
            {account.isTaxAccount && (
              <Badge variant="secondary" className="special-badge">
                Tax
              </Badge>
            )}
            
            {!account.isActive && (
              <Badge variant="destructive" className="special-badge">
                Inactive
              </Badge>
            )}
          </div>
        </div>

        <div className="node-balance">
          <span className={`balance-amount ${account.currentBalance >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(account.currentBalance)}
          </span>
        </div>

        <div className="node-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
            className="action-button"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {account.childAccounts?.map((childAccount) => (
            <TreeNodeContainer
              key={childAccount.id}
              account={childAccount}
              level={level + 1}
              onSelect={onSelect}
              onEdit={onEdit}
              isSelected={isSelected}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TreeNodeContainer: React.FC<{
  account: Account;
  level: number;
  onSelect: (account: Account) => void;
  onEdit: (account: Account) => void;
  isSelected: boolean;
  searchTerm: string;
}> = ({ account, level, onSelect, onEdit, isSelected, searchTerm }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <TreeNode
      account={account}
      level={level}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      onSelect={onSelect}
      onEdit={onEdit}
      isSelected={isSelected}
      searchTerm={searchTerm}
    />
  );
};

export const AccountHierarchyTree: React.FC<AccountHierarchyTreeProps> = ({
  accounts,
  searchTerm,
  filterType,
  onAccountSelect,
  onAccountEdit,
  selectedAccount,
  className = '',
}) => {
  // Filter accounts based on search term and type
  const filteredAccounts = useMemo(() => {
    if (!searchTerm && filterType === 'all') {
      return accounts;
    }

    const filterAccount = (account: Account): Account | null => {
      const matchesSearch = !searchTerm || 
        account.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.accountName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || account.accountType === filterType;

      // Filter children recursively
      const filteredChildren = account.childAccounts
        ?.map(child => filterAccount(child))
        .filter(Boolean) as Account[] || [];

      // Include account if it matches criteria or has matching children
      if ((matchesSearch && matchesType) || filteredChildren.length > 0) {
        return {
          ...account,
          childAccounts: filteredChildren,
        };
      }

      return null;
    };

    return accounts
      .map(account => filterAccount(account))
      .filter(Boolean) as Account[];
  }, [accounts, searchTerm, filterType]);

  if (filteredAccounts.length === 0) {
    return (
      <Card className={`empty-state ${className}`}>
        <div className="empty-content">
          <Building2 className="empty-icon" />
          <h3>No accounts found</h3>
          <p>
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No accounts have been created yet. Create your first account to get started.'
            }
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`account-hierarchy-tree ${className}`}>
      <div className="tree-header">
        <h3>Account Hierarchy</h3>
        <p>Showing {filteredAccounts.length} account groups</p>
      </div>
      
      <div className="tree-content">
        {filteredAccounts.map((account) => (
          <TreeNodeContainer
            key={account.id}
            account={account}
            level={0}
            onSelect={onAccountSelect}
            onEdit={onAccountEdit}
            isSelected={selectedAccount?.id === account.id}
            searchTerm={searchTerm}
          />
        ))}
      </div>
    </Card>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.account-hierarchy-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-neutral-300);
}

.tree-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.tree-header p {
  color: var(--color-neutral-700);
  font-size: 0.875rem;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-node-content {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin: 2px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.tree-node-content:hover {
  background-color: var(--color-neutral-100);
}

.tree-node-content.selected {
  background-color: var(--color-primary);
  color: white;
}

.tree-node-content.selected .account-code,
.tree-node-content.selected .account-name {
  color: white;
}

.node-expand {
  width: 24px;
  display: flex;
  justify-content: center;
}

.expand-button {
  width: 20px;
  height: 20px;
  padding: 0;
}

.expand-spacer {
  width: 20px;
}

.node-icon {
  margin-right: 12px;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.node-info {
  flex: 1;
  min-width: 0;
}

.account-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.account-code {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-neutral-900);
}

.account-name {
  font-weight: 500;
  color: var(--color-neutral-900);
}

.account-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.type-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
}

.special-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
}

.node-balance {
  margin-right: 12px;
  text-align: right;
}

.balance-amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.balance-amount.positive {
  color: var(--color-semantic-success);
}

.balance-amount.negative {
  color: var(--color-semantic-error);
}

.node-actions {
  display: flex;
  gap: 4px;
}

.action-button {
  width: 32px;
  height: 32px;
  padding: 0;
}

.tree-children {
  margin-left: 12px;
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
  .tree-node-content {
    padding: 12px 8px;
  }
  
  .account-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .node-balance {
    margin-right: 8px;
  }
  
  .balance-amount {
    font-size: 0.875rem;
  }
}
`;
