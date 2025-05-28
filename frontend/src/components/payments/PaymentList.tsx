'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Building,
  Link,
  Unlink
} from 'lucide-react';
import { Payment, PaymentQuery, PaymentMethod, paymentService } from '../../services/payment.service';

interface PaymentListProps {
  onPaymentSelect?: (payment: Payment) => void;
  onPaymentEdit?: (payment: Payment) => void;
  onPaymentCreate?: () => void;
  onReconcilePayment?: (payment: Payment) => void;
  selectable?: boolean;
  invoiceId?: string; // Filter by specific invoice
}

export default function PaymentList({
  onPaymentSelect,
  onPaymentEdit,
  onPaymentCreate,
  onReconcilePayment,
  selectable = false,
  invoiceId
}: PaymentListProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PaymentQuery>({
    page: 1,
    limit: 20,
    sortBy: 'paymentDate',
    sortOrder: 'desc',
    ...(invoiceId && { invoiceId }),
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const query: PaymentQuery = {
        ...filters,
        ...(searchTerm && { search: searchTerm }),
      };

      let response;
      if (invoiceId) {
        // Load payments for specific invoice
        const invoicePayments = await paymentService.getPaymentsByInvoiceId(invoiceId);
        response = {
          payments: invoicePayments,
          total: invoicePayments.length,
          page: 1,
          limit: invoicePayments.length,
          totalPages: 1,
        };
      } else {
        response = await paymentService.getPayments(query);
      }

      setPayments(response.payments);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, invoiceId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (newFilters: Partial<PaymentQuery>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePaymentAction = async (action: string, payment: Payment) => {
    switch (action) {
      case 'view':
        onPaymentSelect?.(payment);
        break;
      case 'edit':
        onPaymentEdit?.(payment);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete this payment?`)) {
          try {
            await paymentService.deletePayment(payment.id);
            loadPayments();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete payment');
          }
        }
        break;
      case 'reconcile':
        onReconcilePayment?.(payment);
        break;
    }
  };

  const handleSelectPayment = (paymentId: string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPayments.size === payments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(payments.map(p => p.id)));
    }
  };

  const getPaymentMethodBadge = (method: PaymentMethod) => {
    const color = paymentService.getPaymentMethodColor(method);
    const icon = paymentService.getPaymentMethodIcon(method);
    const label = paymentService.getPaymentMethodLabel(method);
    
    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      gray: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
        <span className="mr-1">{icon}</span>
        {label}
      </span>
    );
  };

  const getReconciliationStatus = (payment: Payment) => {
    if (paymentService.isReconciled(payment)) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
          <Link className="h-3 w-3 mr-1" />
          Reconciled
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          <Unlink className="h-3 w-3 mr-1" />
          Unreconciled
        </span>
      );
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!invoiceId && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-600">
              Track and manage customer payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPaymentCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      {!invoiceId && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && !invoiceId && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={filters.paymentMethod || ''}
                onChange={(e) => handleFilterChange({
                  paymentMethod: e.target.value as PaymentMethod || undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Methods</option>
                {Object.values(PaymentMethod).map(method => (
                  <option key={method} value={method}>
                    {paymentService.getPaymentMethodLabel(method)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date From
              </label>
              <input
                type="date"
                value={filters.paymentDateFrom || ''}
                onChange={(e) => handleFilterChange({ paymentDateFrom: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date To
              </label>
              <input
                type="date"
                value={filters.paymentDateTo || ''}
                onChange={(e) => handleFilterChange({ paymentDateTo: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.amountMin || ''}
                  onChange={(e) => handleFilterChange({ amountMin: parseFloat(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.amountMax || ''}
                  onChange={(e) => handleFilterChange({ amountMax: parseFloat(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payments</h3>
            <p className="mt-1 text-sm text-gray-500">
              {invoiceId ? 'No payments recorded for this invoice.' : 'Get started by recording your first payment.'}
            </p>
            {!invoiceId && (
              <div className="mt-6">
                <button
                  onClick={onPaymentCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Table Header */}
            {!invoiceId && (
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {selectable && (
                      <input
                        type="checkbox"
                        checked={selectedPayments.size === payments.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {total} payment{total !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {selectedPayments.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedPayments.size} selected
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Table Content */}
            <div className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => !selectable && onPaymentSelect?.(payment)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {selectable && (
                        <input
                          type="checkbox"
                          checked={selectedPayments.has(payment.id)}
                          onChange={() => handleSelectPayment(payment.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">
                                {paymentService.formatCurrency(payment.amount)}
                              </p>
                              {getPaymentMethodBadge(payment.paymentMethod)}
                              {getReconciliationStatus(payment)}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {payment.customer.name}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                {paymentService.formatShortDate(payment.paymentDate)}
                              </div>
                              {payment.reference && (
                                <div className="flex items-center text-xs text-gray-500">
                                  Ref: {payment.reference}
                                </div>
                              )}
                              {payment.invoice && (
                                <div className="flex items-center text-xs text-blue-600">
                                  Invoice: {payment.invoice.invoiceNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {paymentService.formatShortDate(payment.paymentDate)}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-gray-500 truncate max-w-32">
                            {payment.notes}
                          </p>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle dropdown menu
                          }}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {!invoiceId && totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(filters.page! - 1)}
                    disabled={filters.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(filters.page! + 1)}
                    disabled={filters.page === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(filters.page! - 1) * filters.limit! + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(filters.page! * filters.limit!, total)}
                      </span>{' '}
                      of <span className="font-medium">{total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(filters.page! - 1)}
                        disabled={filters.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              filters.page === page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handlePageChange(filters.page! + 1)}
                        disabled={filters.page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
