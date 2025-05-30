'use client';

import { 
  X, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Calendar, 
  CreditCard, 
  FileText,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  Receipt,
  TrendingUp
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Customer, customerService } from '../../services/customer.service';

interface CustomerDetailProps {
  customerId: string;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface CustomerStats {
  invoiceCount: number;
  paymentCount: number;
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  outstandingBalance: number;
}

export default function CustomerDetail({ 
  customerId, 
  onEdit, 
  onDelete, 
  onClose, 
  isOpen 
}: CustomerDetailProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      loadCustomerDetails();
    }
  }, [isOpen, customerId]);

  const loadCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const customerData = await customerService.getCustomerById(customerId, true);
      setCustomer(customerData);
      
      // Extract stats if available (from backend with includeStats=true)
      if ('_count' in customerData) {
        setStats({
          invoiceCount: (customerData as any)._count?.invoices || 0,
          paymentCount: (customerData as any)._count?.payments || 0,
          totalInvoiceAmount: (customerData as any).totalInvoiceAmount || 0,
          totalPaidAmount: (customerData as any).totalPaidAmount || 0,
          outstandingBalance: (customerData as any).outstandingBalance || 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (customer) {
      onEdit(customer);
    }
  };

  const handleDelete = () => {
    if (customer && window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
      onDelete(customer);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Customer Details</h3>
          <div className="flex items-center space-x-2">
            {customer && (
              <>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <XCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : customer ? (
            <div className="space-y-6">
              {/* Customer Header */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <Building className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
                    {customer.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </div>
                  {customer.contactPerson && (
                    <p className="text-lg text-gray-600 mt-1">{customer.contactPerson}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    {customer.email && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-4 w-4 mr-1" />
                        <a href={`mailto:${customer.email}`} className="hover:text-blue-600">
                          {customer.email}
                        </a>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-1" />
                        <a href={`tel:${customer.phone}`} className="hover:text-blue-600">
                          {customer.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Receipt className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Total Invoices
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {stats.invoiceCount}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <DollarSign className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Total Invoiced
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {formatCurrency(stats.totalInvoiceAmount)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Total Paid
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {formatCurrency(stats.totalPaidAmount)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <TrendingUp className="h-6 w-6 text-orange-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Outstanding
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {formatCurrency(stats.outstandingBalance)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Contact Information */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Contact Information
                    </h3>
                    <dl className="space-y-3">
                      {customer.email && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            <a href={`mailto:${customer.email}`} className="hover:text-blue-600">
                              {customer.email}
                            </a>
                          </dd>
                        </div>
                      )}
                      {customer.phone && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            <a href={`tel:${customer.phone}`} className="hover:text-blue-600">
                              {customer.phone}
                            </a>
                          </dd>
                        </div>
                      )}
                      {customer.address && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Address</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-start">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                            <div>
                              {customer.address}
                              {customer.city && (
                                <div className="text-gray-600">
                                  {customer.city}, {customer.country}
                                </div>
                              )}
                            </div>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Business Information */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Business Information
                    </h3>
                    <dl className="space-y-3">
                      {customer.zraTin && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">ZRA TIN</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                            {customerService.formatZraTin(customer.zraTin)}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                        <dd className="mt-1 text-sm text-gray-900 flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          {customer.paymentTerms} days
                        </dd>
                      </div>
                      {customer.creditLimit && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Credit Limit</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                            {formatCurrency(customer.creditLimit)}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created</dt>
                        <dd className="mt-1 text-sm text-gray-900 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(customer.createdAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {customer.notes && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Notes
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {customer.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
