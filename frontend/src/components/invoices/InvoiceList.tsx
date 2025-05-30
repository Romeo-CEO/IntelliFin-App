'use client';

import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Send,
  DollarSign,
  Calendar,
  AlertTriangle,
  FileText,
  Building
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Invoice, InvoiceQuery, InvoiceStatus, ZraSubmissionStatus, invoiceService } from '../../services/invoice.service';

interface InvoiceListProps {
  onInvoiceSelect?: (invoice: Invoice) => void;
  onInvoiceEdit?: (invoice: Invoice) => void;
  onInvoiceCreate?: () => void;
  selectable?: boolean;
}

export default function InvoiceList({
  onInvoiceSelect,
  onInvoiceEdit,
  onInvoiceCreate,
  selectable = false
}: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<InvoiceQuery>({
    page: 1,
    limit: 20,
    sortBy: 'issueDate',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const query: InvoiceQuery = {
        ...filters,
        ...(searchTerm && { search: searchTerm }),
      };

      const response = await invoiceService.getInvoices(query);
      setInvoices(response.invoices);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (newFilters: Partial<InvoiceQuery>) => {
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

  const handleInvoiceAction = async (action: string, invoice: Invoice) => {
    switch (action) {
      case 'view':
        onInvoiceSelect?.(invoice);
        break;
      case 'edit':
        onInvoiceEdit?.(invoice);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
          try {
            await invoiceService.deleteInvoice(invoice.id);
            loadInvoices();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete invoice');
          }
        }
        break;
      case 'send':
        try {
          await invoiceService.sendInvoice(invoice.id);
          loadInvoices();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to send invoice');
        }
        break;
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map(i => i.id)));
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const color = invoiceService.getStatusColor(status);
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getZraStatusBadge = (status?: ZraSubmissionStatus) => {
    if (!status || status === ZraSubmissionStatus.NOT_SUBMITTED) return null;
    
    const color = invoiceService.getZraStatusColor(status);
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colorClasses[color]}`}>
        ZRA: {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-600">
            Manage your invoices and track payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onInvoiceCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
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

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({
                  status: e.target.value as InvoiceStatus || undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {Object.values(InvoiceStatus).map(status => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date From
              </label>
              <input
                type="date"
                value={filters.issueDateFrom || ''}
                onChange={(e) => handleFilterChange({ issueDateFrom: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date To
              </label>
              <input
                type="date"
                value={filters.issueDateTo || ''}
                onChange={(e) => handleFilterChange({ issueDateTo: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Show Overdue Only
              </label>
              <input
                type="checkbox"
                checked={filters.isOverdue || false}
                onChange={(e) => handleFilterChange({ isOverdue: e.target.checked || undefined })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
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

      {/* Invoice List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first invoice.
            </p>
            <div className="mt-6">
              <button
                onClick={onInvoiceCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={selectedInvoices.size === invoices.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {total} invoice{total !== 1 ? 's' : ''}
                  </span>
                </div>
                {selectedInvoices.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedInvoices.size} selected
                  </span>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => !selectable && onInvoiceSelect?.(invoice)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {selectable && (
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => handleSelectInvoice(invoice.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {invoice.invoiceNumber}
                              </p>
                              {getStatusBadge(invoice.status)}
                              {invoiceService.isOverdue(invoice) && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {invoice.customer.name}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                Due: {invoiceService.formatShortDate(invoice.dueDate)}
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <DollarSign className="h-3 w-3 mr-1" />
                                {invoiceService.formatCurrency(invoice.totalAmount)}
                              </div>
                              {invoice.zraSubmissionStatus && getZraStatusBadge(invoice.zraSubmissionStatus)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {invoiceService.formatCurrency(invoice.totalAmount)}
                        </p>
                        {invoice.paidAmount > 0 && (
                          <p className="text-xs text-green-600">
                            Paid: {invoiceService.formatCurrency(invoice.paidAmount)}
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
            {totalPages > 1 && (
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
