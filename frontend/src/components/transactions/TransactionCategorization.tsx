'use client';

import { 
  Tag, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  X, 
  Loader2,
  Sparkles,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  counterpartyName: string;
  transactionDate: string;
  type: string;
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
    type: string;
    color: string;
  };
}

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  reason: string;
  ruleId?: string;
  ruleName?: string;
  score: number;
}

interface TransactionWithSuggestions extends Transaction {
  suggestions?: CategorySuggestion[];
  bestSuggestion?: CategorySuggestion;
  isProcessing?: boolean;
}

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
}

export function TransactionCategorization() {
  const [transactions, setTransactions] = useState<TransactionWithSuggestions[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    hasCategory: 'uncategorized',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [transactionsRes, categoriesRes] = await Promise.all([
        fetch('/api/transactions?limit=100&categoryId=null', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }),
        fetch('/api/categories', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }),
      ]);

      if (!transactionsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [transactionsData, categoriesData] = await Promise.all([
        transactionsRes.json(),
        categoriesRes.json(),
      ]);

      setTransactions(transactionsData.transactions || transactionsData);
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestions = async (transactionId: string) => {
    try {
      setTransactions(prev => prev.map(t => 
        t.id === transactionId ? { ...t, isProcessing: true } : t
      ));

      const response = await fetch(`/api/transactions/categorization/suggest/${transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ autoApply: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const result = await response.json();
      
      setTransactions(prev => prev.map(t => 
        t.id === transactionId 
          ? { 
              ...t, 
              suggestions: result.suggestions,
              bestSuggestion: result.bestSuggestion,
              isProcessing: false 
            }
          : t
      ));

      if (result.suggestions.length === 0) {
        toast.info('No category suggestions found for this transaction');
      }
    } catch (error) {
      toast.error('Failed to get suggestions');
      setTransactions(prev => prev.map(t => 
        t.id === transactionId ? { ...t, isProcessing: false } : t
      ));
    }
  };

  const applyCategory = async (transactionId: string, categoryId: string) => {
    try {
      const response = await fetch(`/api/transactions/categorization/apply/${transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ categoryId }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply category');
      }

      const category = categories.find(c => c.id === categoryId);
      
      setTransactions(prev => prev.map(t => 
        t.id === transactionId 
          ? { 
              ...t, 
              categoryId,
              category: category ? {
                id: category.id,
                name: category.name,
                type: category.type,
                color: category.color,
              } : undefined,
              suggestions: undefined,
              bestSuggestion: undefined,
            }
          : t
      ));

      toast.success('Category applied successfully');
    } catch (error) {
      toast.error('Failed to apply category');
    }
  };

  const bulkApplyCategory = async (categoryId: string) => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select transactions first');
      return;
    }

    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/transactions/categorization/apply/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          transactionIds: Array.from(selectedTransactions),
          categoryId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply category');
      }

      const result = await response.json();
      const category = categories.find(c => c.id === categoryId);
      
      setTransactions(prev => prev.map(t => 
        selectedTransactions.has(t.id)
          ? { 
              ...t, 
              categoryId,
              category: category ? {
                id: category.id,
                name: category.name,
                type: category.type,
                color: category.color,
              } : undefined,
              suggestions: undefined,
              bestSuggestion: undefined,
            }
          : t
      ));

      setSelectedTransactions(new Set());
      toast.success(`Category applied to ${result.updated} transaction(s)`);
    } catch (error) {
      toast.error('Failed to apply category');
    } finally {
      setIsProcessing(false);
    }
  };

  const autoCategorizeAll = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/transactions/categorization/auto-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ autoApply: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to auto-categorize');
      }

      const result = await response.json();
      toast.success(`Auto-categorized ${result.categorized} out of ${result.processed} transactions`);
      
      // Refresh data to show updated categories
      fetchData();
    } catch (error) {
      toast.error('Failed to auto-categorize transactions');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTransactionSelection = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const selectAllVisible = () => {
    const visibleIds = filteredTransactions.map(t => t.id);
    setSelectedTransactions(new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedTransactions(new Set());
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      'VERY_HIGH': 'bg-green-100 text-green-800',
      'HIGH': 'bg-blue-100 text-blue-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'LOW': 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={variants[confidence as keyof typeof variants] || variants.LOW}>
        {confidence.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!transaction.description?.toLowerCase().includes(searchLower) &&
          !transaction.counterpartyName?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (filters.type && transaction.type !== filters.type) {
      return false;
    }

    if (filters.hasCategory === 'categorized' && !transaction.categoryId) {
      return false;
    }

    if (filters.hasCategory === 'uncategorized' && transaction.categoryId) {
      return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading transactions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transaction Categorization</h2>
          <p className="text-gray-600">
            Organize your transactions with AI-powered categorization
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={autoCategorizeAll}
            disabled={isProcessing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Auto-Categorize All
          </Button>
          
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="DEPOSIT">Deposits</SelectItem>
                  <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                  <SelectItem value="PAYMENT">Payments</SelectItem>
                  <SelectItem value="TRANSFER">Transfers</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.hasCategory}
                onValueChange={(value) => setFilters(prev => ({ ...prev, hasCategory: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="categorized">Categorized</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setFilters({ search: '', type: '', hasCategory: 'uncategorized' })}
              >
                Clear Filters
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedTransactions.size > 0 && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedTransactions.size} transaction(s) selected
                </span>
                
                <div className="flex space-x-2">
                  <Select onValueChange={bulkApplyCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Apply category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}

            {/* Selection Actions */}
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={selectAllVisible}>
                Select All Visible
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear Selection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
          <CardDescription>
            Click "Get Suggestions" to see AI-powered category recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map(transaction => (
                <div key={transaction.id} className="border rounded-lg p-4 space-y-3">
                  {/* Transaction Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedTransactions.has(transaction.id)}
                        onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{transaction.description}</h4>
                          {transaction.type === 'DEPOSIT' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {transaction.counterpartyName} • {formatDate(transaction.transactionDate)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                      {transaction.category ? (
                        <div className="flex items-center space-x-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: transaction.category.color }}
                          />
                          <span className="text-sm">{transaction.category.name}</span>
                        </div>
                      ) : (
                        <Badge variant="outline">Uncategorized</Badge>
                      )}
                    </div>
                  </div>

                  {/* Suggestions */}
                  {transaction.suggestions && transaction.suggestions.length > 0 && (
                    <div className="space-y-2 pl-8">
                      <h5 className="text-sm font-medium text-gray-700">Suggestions:</h5>
                      {transaction.suggestions.slice(0, 3).map((suggestion, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ 
                                backgroundColor: categories.find(c => c.id === suggestion.categoryId)?.color || '#6B7280'
                              }}
                            />
                            <span className="text-sm font-medium">{suggestion.categoryName}</span>
                            {getConfidenceBadge(suggestion.confidence)}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{suggestion.reason}</span>
                            <Button
                              size="sm"
                              onClick={() => applyCategory(transaction.id, suggestion.categoryId)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Apply
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pl-8">
                    {!transaction.category && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => getSuggestions(transaction.id)}
                        disabled={transaction.isProcessing}
                      >
                        {transaction.isProcessing ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        Get Suggestions
                      </Button>
                    )}
                    
                    <Select onValueChange={(categoryId) => applyCategory(transaction.id, categoryId)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Manual category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions found matching your filters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TransactionCategorization;
