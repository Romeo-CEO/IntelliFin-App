'use client';

import { 
  Plus, 
  Search, 
  Settings,
  TreePine,
  List,
  RefreshCw
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAccounting } from '../../contexts/AccountingContext';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import { AccountDetails } from './AccountDetails';
import { AccountForm } from './AccountForm';
import { AccountHierarchyTree } from './AccountHierarchyTree';
import { AccountList } from './AccountList';
import { InitializeAccountsModal } from './InitializeAccountsModal';


interface ChartOfAccountsPageProps {
  className?: string;
}

export const ChartOfAccountsPage: React.FC<ChartOfAccountsPageProps> = ({ className = '' }) => {
  const {
    state,
    loadAccounts,
    loadAccountHierarchy,
    selectAccount,
    initializeChartOfAccounts,
    clearError,
    refreshData,
  } = useAccounting();

  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showInitializeModal, setShowInitializeModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadAccounts({ limit: 100 }),
          loadAccountHierarchy(),
        ]);
      } catch (error) {
        console.error('Failed to load chart of accounts data:', error);
      }
    };

    loadData();
  }, [loadAccounts, loadAccountHierarchy]);

  // Filter accounts based on search and type
  const filteredAccounts = state.accounts.filter(account => {
    const matchesSearch = searchTerm === '' || 
      account.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || account.accountType === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setShowAccountForm(true);
  };

  const handleEditAccount = (account: any) => {
    setEditingAccount(account);
    setShowAccountForm(true);
  };

  const handleAccountFormClose = () => {
    setShowAccountForm(false);
    setEditingAccount(null);
  };

  const handleAccountFormSuccess = () => {
    setShowAccountForm(false);
    setEditingAccount(null);
    refreshData();
  };

  const handleInitializeAccounts = async () => {
    try {
      await initializeChartOfAccounts(true);
      setShowInitializeModal(false);
    } catch (error) {
      console.error('Failed to initialize accounts:', error);
    }
  };

  const handleRefresh = () => {
    refreshData();
  };

  const accountTypeCounts = state.accounts.reduce((counts, account) => {
    counts[account.accountType] = (counts[account.accountType] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return (
    <div className={`chart-of-accounts-page ${className}`}>
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="page-title">Chart of Accounts</h1>
            <p className="page-description">
              Manage your organization's chart of accounts and account hierarchy
            </p>
          </div>
          
          <div className="header-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={state.accountsLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInitializeModal(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Initialize
            </Button>
            
            <Button
              onClick={handleCreateAccount}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{state.accounts.length}</div>
              <div className="summary-label">Total Accounts</div>
            </div>
          </Card>
          
          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{accountTypeCounts.ASSET || 0}</div>
              <div className="summary-label">Assets</div>
            </div>
          </Card>
          
          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{accountTypeCounts.LIABILITY || 0}</div>
              <div className="summary-label">Liabilities</div>
            </div>
          </Card>
          
          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{accountTypeCounts.EQUITY || 0}</div>
              <div className="summary-label">Equity</div>
            </div>
          </Card>
          
          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{accountTypeCounts.REVENUE || 0}</div>
              <div className="summary-label">Revenue</div>
            </div>
          </Card>
          
          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{accountTypeCounts.EXPENSE || 0}</div>
              <div className="summary-label">Expenses</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <ErrorMessage 
          message={state.error} 
          onDismiss={clearError}
          className="mb-6"
        />
      )}

      {/* Controls */}
      <div className="controls-section">
        <div className="search-filter-controls">
          <div className="search-control">
            <Search className="search-icon" />
            <Input
              placeholder="Search accounts by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <Select
            value={filterType}
            onValueChange={setFilterType}
          >
            <option value="all">All Types</option>
            <option value="ASSET">Assets</option>
            <option value="LIABILITY">Liabilities</option>
            <option value="EQUITY">Equity</option>
            <option value="REVENUE">Revenue</option>
            <option value="EXPENSE">Expenses</option>
          </Select>
        </div>

        <div className="view-controls">
          <div className="view-toggle">
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              <TreePine className="w-4 h-4 mr-2" />
              Tree View
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              List View
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {state.accountsLoading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Loading chart of accounts...</p>
          </div>
        ) : (
          <div className="accounts-content">
            <div className="accounts-view">
              {viewMode === 'tree' ? (
                <AccountHierarchyTree
                  accounts={state.accountHierarchy}
                  searchTerm={searchTerm}
                  filterType={filterType}
                  onAccountSelect={selectAccount}
                  onAccountEdit={handleEditAccount}
                  selectedAccount={state.selectedAccount}
                />
              ) : (
                <AccountList
                  accounts={filteredAccounts}
                  onAccountSelect={selectAccount}
                  onAccountEdit={handleEditAccount}
                  selectedAccount={state.selectedAccount}
                />
              )}
            </div>

            {state.selectedAccount && (
              <div className="account-details-panel">
                <AccountDetails
                  account={state.selectedAccount}
                  onEdit={handleEditAccount}
                  onClose={() => selectAccount(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Form Modal */}
      <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Account' : 'Create New Account'}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            account={editingAccount}
            onSuccess={handleAccountFormSuccess}
            onCancel={handleAccountFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* Initialize Accounts Modal */}
      <InitializeAccountsModal
        open={showInitializeModal}
        onOpenChange={setShowInitializeModal}
        onConfirm={handleInitializeAccounts}
      />
    </div>
  );
};
