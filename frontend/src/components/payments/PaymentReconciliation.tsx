'use client';

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Link, 
  Unlink,
  Eye,
  X,
  Search,
  Filter,
  Download,
  Clock,
  DollarSign,
  Calendar,
  Building,
  CreditCard
} from 'lucide-react';
import { 
  ReconciliationResult, 
  ReconciliationMatch, 
  Payment, 
  paymentService 
} from '../../services/payment.service';

interface PaymentReconciliationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentReconciliation({ isOpen, onClose }: PaymentReconciliationProps) {
  const [reconciliationData, setReconciliationData] = useState<ReconciliationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'automatic' | 'suggested' | 'unmatched'>('automatic');
  const [searchTerm, setSearchTerm] = useState('');
  const [applyingMatches, setApplyingMatches] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadReconciliationData();
    }
  }, [isOpen]);

  const loadReconciliationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await paymentService.getReconciliationSuggestions();
      setReconciliationData(data);
      
      // Auto-select high confidence matches
      const highConfidenceMatches = data.automaticMatches
        .filter(match => match.confidence >= 0.95)
        .map(match => `${match.paymentId}-${match.transactionId}`);
      setSelectedMatches(new Set(highConfidenceMatches));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchSelection = (match: ReconciliationMatch) => {
    const matchKey = `${match.paymentId}-${match.transactionId}`;
    const newSelected = new Set(selectedMatches);
    
    if (newSelected.has(matchKey)) {
      newSelected.delete(matchKey);
    } else {
      newSelected.add(matchKey);
    }
    
    setSelectedMatches(newSelected);
  };

  const handleSelectAll = (matches: ReconciliationMatch[]) => {
    const matchKeys = matches.map(match => `${match.paymentId}-${match.transactionId}`);
    const allSelected = matchKeys.every(key => selectedMatches.has(key));
    
    const newSelected = new Set(selectedMatches);
    
    if (allSelected) {
      matchKeys.forEach(key => newSelected.delete(key));
    } else {
      matchKeys.forEach(key => newSelected.add(key));
    }
    
    setSelectedMatches(newSelected);
  };

  const applySelectedMatches = async () => {
    if (!reconciliationData || selectedMatches.size === 0) return;

    try {
      setApplyingMatches(true);
      
      // Get selected matches from both automatic and suggested
      const allMatches = [...reconciliationData.automaticMatches, ...reconciliationData.suggestedMatches];
      const matchesToApply = allMatches.filter(match => 
        selectedMatches.has(`${match.paymentId}-${match.transactionId}`)
      );

      const result = await paymentService.applyAutomaticMatches(matchesToApply);
      
      // Reload data to reflect changes
      await loadReconciliationData();
      setSelectedMatches(new Set());
      
      // Show success message
      alert(`Successfully applied ${result.appliedCount} matches!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply matches');
    } finally {
      setApplyingMatches(false);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    return paymentService.calculateConfidenceColor(confidence);
  };

  const getConfidenceLabel = (confidence: number): string => {
    return paymentService.getConfidenceLabel(confidence);
  };

  const filterMatches = (matches: ReconciliationMatch[]): ReconciliationMatch[] => {
    if (!searchTerm) return matches;
    
    return matches.filter(match => 
      match.payment.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.transaction.externalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.transaction.counterpartyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const renderMatchCard = (match: ReconciliationMatch) => {
    const matchKey = `${match.paymentId}-${match.transactionId}`;
    const isSelected = selectedMatches.has(matchKey);
    const confidenceColor = getConfidenceColor(match.confidence);
    
    const colorClasses = {
      green: 'border-green-200 bg-green-50',
      yellow: 'border-yellow-200 bg-yellow-50',
      orange: 'border-orange-200 bg-orange-50',
      red: 'border-red-200 bg-red-50',
    };

    return (
      <div
        key={matchKey}
        className={`border rounded-lg p-4 ${isSelected ? 'ring-2 ring-blue-500' : ''} ${colorClasses[confidenceColor]}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleMatchSelection(match)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1 min-w-0">
              {/* Payment Info */}
              <div className="mb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Payment</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    confidenceColor === 'green' ? 'bg-green-100 text-green-800' :
                    confidenceColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    confidenceColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {Math.round(match.confidence * 100)}% {getConfidenceLabel(match.confidence)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span className="font-medium">{paymentService.formatCurrency(match.payment.amount)}</span>
                    <span>{match.payment.customer.name}</span>
                    <span>{paymentService.formatShortDate(match.payment.paymentDate)}</span>
                  </div>
                  {match.payment.reference && (
                    <div className="text-xs text-gray-500 mt-1">
                      Ref: {match.payment.reference}
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Info */}
              <div className="mb-3">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Transaction</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span className="font-medium">{paymentService.formatCurrency(match.transaction.amount)}</span>
                    <span>{match.transaction.counterpartyName || 'Unknown'}</span>
                    <span>{paymentService.formatShortDate(match.transaction.transactionDate)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {match.transaction.externalId}
                  </div>
                </div>
              </div>

              {/* Match Reason */}
              <div className="text-xs text-gray-500 bg-white bg-opacity-50 rounded p-2">
                <strong>Match Reason:</strong> {match.reason}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUnmatchedPayment = (payment: Payment) => (
    <div key={payment.id} className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <Unlink className="h-4 w-4 text-yellow-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">
              {paymentService.formatCurrency(payment.amount)}
            </span>
            <span className="text-sm text-gray-500">{payment.customer.name}</span>
            <span className="text-xs text-gray-400">
              {paymentService.formatShortDate(payment.paymentDate)}
            </span>
          </div>
          {payment.reference && (
            <div className="text-xs text-gray-500 mt-1">
              Ref: {payment.reference}
            </div>
          )}
        </div>
        <button className="text-blue-600 hover:text-blue-800">
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center space-x-3">
            <Link className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Payment Reconciliation</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadReconciliationData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Summary */}
        {reconciliationData && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-blue-900">Automatic Matches</div>
              <div className="text-2xl font-bold text-blue-600">{reconciliationData.summary.automaticMatches}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-yellow-900">Suggested Matches</div>
              <div className="text-2xl font-bold text-yellow-600">{reconciliationData.summary.suggestedMatches}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-red-900">Unmatched Payments</div>
              <div className="text-2xl font-bold text-red-600">{reconciliationData.summary.unmatchedPayments}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-900">Unmatched Transactions</div>
              <div className="text-2xl font-bold text-gray-600">{reconciliationData.summary.unmatchedTransactions}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        {selectedMatches.size > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">
                    {selectedMatches.size} match{selectedMatches.size !== 1 ? 'es' : ''} selected
                  </p>
                </div>
              </div>
              <button
                onClick={applySelectedMatches}
                disabled={applyingMatches}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {applyingMatches ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Applying...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Apply Selected Matches
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('automatic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'automatic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Automatic Matches ({reconciliationData?.automaticMatches.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('suggested')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'suggested'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Suggested Matches ({reconciliationData?.suggestedMatches.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('unmatched')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'unmatched'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Unmatched Payments ({reconciliationData?.unmatchedPayments.length || 0})
              </button>
            </nav>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments, transactions, or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : reconciliationData ? (
            <div className="space-y-4">
              {activeTab === 'automatic' && (
                <>
                  {reconciliationData.automaticMatches.length > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">
                        {filterMatches(reconciliationData.automaticMatches).length} automatic matches
                      </span>
                      <button
                        onClick={() => handleSelectAll(reconciliationData.automaticMatches)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                    </div>
                  )}
                  {filterMatches(reconciliationData.automaticMatches).map(renderMatchCard)}
                  {filterMatches(reconciliationData.automaticMatches).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No automatic matches found
                    </div>
                  )}
                </>
              )}

              {activeTab === 'suggested' && (
                <>
                  {reconciliationData.suggestedMatches.length > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">
                        {filterMatches(reconciliationData.suggestedMatches).length} suggested matches
                      </span>
                      <button
                        onClick={() => handleSelectAll(reconciliationData.suggestedMatches)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                    </div>
                  )}
                  {filterMatches(reconciliationData.suggestedMatches).map(renderMatchCard)}
                  {filterMatches(reconciliationData.suggestedMatches).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No suggested matches found
                    </div>
                  )}
                </>
              )}

              {activeTab === 'unmatched' && (
                <>
                  <div className="space-y-3">
                    {reconciliationData.unmatchedPayments.map(renderUnmatchedPayment)}
                  </div>
                  {reconciliationData.unmatchedPayments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No unmatched payments found
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Click refresh to load reconciliation data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
