'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Upload, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react';
import { Customer, CustomerQuery, customerService } from '../../services/customer.service';

interface CustomerListProps {
  onCustomerSelect?: (customer: Customer) => void;
  onCustomerEdit?: (customer: Customer) => void;
  onCustomerCreate?: () => void;
  selectable?: boolean;
}

export default function CustomerList({
  onCustomerSelect,
  onCustomerEdit,
  onCustomerCreate,
  selectable = false
}: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CustomerQuery>({
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const query: CustomerQuery = {
        ...filters,
        ...(searchTerm && { search: searchTerm }),
      };

      const response = await customerService.getCustomers(query);
      setCustomers(response.customers);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (newFilters: Partial<CustomerQuery>) => {
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

  const handleCustomerAction = async (action: string, customer: Customer) => {
    switch (action) {
      case 'view':
        onCustomerSelect?.(customer);
        break;
      case 'edit':
        onCustomerEdit?.(customer);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
          try {
            await customerService.deleteCustomer(customer.id);
            loadCustomers();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete customer');
          }
        }
        break;
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.id)));
    }
  };

  const handleExport = async () => {
    try {
      const blob = await customerService.exportCustomersToCsv();
      const filename = `customers_${new Date().toISOString().split('T')[0]}.csv`;
      customerService.downloadFile(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export customers');
    }
  };

  if (loading && customers.length === 0) {
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
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-600">
            Manage your customer database and relationships
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={onCustomerCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
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
              placeholder="Search customers..."
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
                value={filters.isActive?.toString() || ''}
                onChange={(e) => handleFilterChange({
                  isActive: e.target.value === '' ? undefined : e.target.value === 'true'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                placeholder="Filter by city"
                value={filters.city || ''}
                onChange={(e) => handleFilterChange({ city: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Has ZRA TIN
              </label>
              <select
                value={filters.hasZraTin?.toString() || ''}
                onChange={(e) => handleFilterChange({
                  hasZraTin: e.target.value === '' ? undefined : e.target.value === 'true'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Items per page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange({ limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Customer List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first customer.
            </p>
            <div className="mt-6">
              <button
                onClick={onCustomerCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
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
                      checked={selectedCustomers.size === customers.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {total} customer{total !== 1 ? 's' : ''}
                  </span>
                </div>
                {selectedCustomers.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedCustomers.size} selected
                  </span>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => !selectable && onCustomerSelect?.(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {selectable && (
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(customer.id)}
                          onChange={() => handleSelectCustomer(customer.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Building className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {customer.name}
                              </p>
                              {customer.isActive ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            {customer.contactPerson && (
                              <p className="text-sm text-gray-500 truncate">
                                {customer.contactPerson}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-1">
                              {customer.email && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {customer.phone}
                                </div>
                              )}
                              {customer.city && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {customer.city}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {customer.zraTin && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ZRA TIN
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {customer.paymentTerms} days
                      </span>
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
