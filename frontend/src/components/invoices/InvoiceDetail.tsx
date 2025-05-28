'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Edit, 
  Trash2, 
  Send, 
  DollarSign, 
  Download, 
  Calendar, 
  Building, 
  Mail, 
  Phone, 
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  QrCode,
  Receipt
} from 'lucide-react';
import { Invoice, InvoiceStatus, ZraSubmissionStatus, invoiceService } from '../../services/invoice.service';

interface InvoiceDetailProps {
  invoiceId: string;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function InvoiceDetail({ 
  invoiceId, 
  onEdit, 
  onDelete, 
  onClose, 
  isOpen 
}: InvoiceDetailProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadInvoiceDetails();
    }
  }, [isOpen, invoiceId]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const invoiceData = await invoiceService.getInvoiceById(invoiceId);
      setInvoice(invoiceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!invoice) return;

    try {
      setActionLoading(action);
      setError(null);

      switch (action) {
        case 'send':
          await invoiceService.sendInvoice(invoice.id);
          await loadInvoiceDetails();
          break;
        case 'submitZra':
          // TODO: Get organization TIN from settings
          const organizationTin = '1234567890'; // Placeholder
          await invoiceService.submitToZra(invoice.id, organizationTin);
          await loadInvoiceDetails();
          break;
        case 'delete':
          if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
            onDelete(invoice);
          }
          break;
        case 'edit':
          onEdit(invoice);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} invoice`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePayment = async () => {
    if (!invoice || !paymentAmount) return;

    try {
      setActionLoading('payment');
      const amount = parseFloat(paymentAmount);
      await invoiceService.recordPayment(invoice.id, amount);
      await loadInvoiceDetails();
      setShowPaymentModal(false);
      setPaymentAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return <FileText className="h-5 w-5 text-gray-500" />;
      case InvoiceStatus.SENT:
        return <Send className="h-5 w-5 text-blue-500" />;
      case InvoiceStatus.PARTIALLY_PAID:
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case InvoiceStatus.PAID:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case InvoiceStatus.OVERDUE:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case InvoiceStatus.CANCELLED:
        return <XCircle className="h-5 w-5 text-gray-500" />;
      case InvoiceStatus.BAD_DEBT:
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getZraStatusIcon = (status?: ZraSubmissionStatus) => {
    if (!status || status === ZraSubmissionStatus.NOT_SUBMITTED) return null;
    
    switch (status) {
      case ZraSubmissionStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case ZraSubmissionStatus.ACCEPTED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ZraSubmissionStatus.REJECTED:
      case ZraSubmissionStatus.FAILED:
      case ZraSubmissionStatus.VALIDATION_FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Invoice Details</h3>
          <div className="flex items-center space-x-2">
            {invoice && (
              <>
                {invoiceService.canEdit(invoice) && (
                  <button
                    onClick={() => handleAction('edit')}
                    disabled={actionLoading === 'edit'}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                )}
                {invoiceService.canSend(invoice) && (
                  <button
                    onClick={() => handleAction('send')}
                    disabled={actionLoading === 'send'}
                    className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    {actionLoading === 'send' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send
                  </button>
                )}
                {invoiceService.canSubmitToZra(invoice) && (
                  <button
                    onClick={() => handleAction('submitZra')}
                    disabled={actionLoading === 'submitZra'}
                    className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
                  >
                    {actionLoading === 'submitZra' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                    ) : (
                      <Receipt className="h-4 w-4 mr-2" />
                    )}
                    Submit to ZRA
                  </button>
                )}
                {invoiceService.canRecordPayment(invoice) && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Payment
                  </button>
                )}
                {invoiceService.canDelete(invoice) && (
                  <button
                    onClick={() => handleAction('delete')}
                    className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                )}
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
          ) : invoice ? (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(invoice.status)}
                      <h2 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h2>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoiceService.getStatusColor(invoice.status) === 'green' ? 'bg-green-100 text-green-800' :
                        invoiceService.getStatusColor(invoice.status) === 'blue' ? 'bg-blue-100 text-blue-800' :
                        invoiceService.getStatusColor(invoice.status) === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        invoiceService.getStatusColor(invoice.status) === 'red' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                    </div>
                    {invoice.reference && (
                      <p className="text-sm text-gray-600 mt-1">Reference: {invoice.reference}</p>
                    )}
                    {invoice.zraSubmissionStatus && invoice.zraSubmissionStatus !== ZraSubmissionStatus.NOT_SUBMITTED && (
                      <div className="flex items-center space-x-2 mt-2">
                        {getZraStatusIcon(invoice.zraSubmissionStatus)}
                        <span className="text-sm text-gray-600">
                          ZRA Status: {invoice.zraSubmissionStatus.replace('_', ' ')}
                        </span>
                        {invoice.zraReceiptNumber && (
                          <span className="text-sm text-green-600">
                            (Receipt: {invoice.zraReceiptNumber})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">
                      {invoiceService.formatCurrency(invoice.totalAmount)}
                    </p>
                    {invoice.paidAmount > 0 && (
                      <p className="text-sm text-green-600">
                        Paid: {invoiceService.formatCurrency(invoice.paidAmount)}
                      </p>
                    )}
                    {invoiceService.calculateOutstandingAmount(invoice) > 0 && (
                      <p className="text-sm text-red-600">
                        Outstanding: {invoiceService.formatCurrency(invoiceService.calculateOutstandingAmount(invoice))}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Details Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Customer Information */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Customer Information
                    </h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{invoice.customer.name}</dd>
                      </div>
                      {invoice.customer.contactPerson && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                          <dd className="mt-1 text-sm text-gray-900">{invoice.customer.contactPerson}</dd>
                        </div>
                      )}
                      {invoice.customer.email && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            <a href={`mailto:${invoice.customer.email}`} className="hover:text-blue-600">
                              {invoice.customer.email}
                            </a>
                          </dd>
                        </div>
                      )}
                      {invoice.customer.phone && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            <a href={`tel:${invoice.customer.phone}`} className="hover:text-blue-600">
                              {invoice.customer.phone}
                            </a>
                          </dd>
                        </div>
                      )}
                      {invoice.customer.address && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Address</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-start">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                            <div>
                              {invoice.customer.address}
                              {invoice.customer.city && (
                                <div className="text-gray-600">
                                  {invoice.customer.city}, {invoice.customer.country}
                                </div>
                              )}
                            </div>
                          </dd>
                        </div>
                      )}
                      {invoice.customer.zraTin && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">ZRA TIN</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                            {invoice.customer.zraTin}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Invoice Information */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Invoice Information
                    </h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Issue Date</dt>
                        <dd className="mt-1 text-sm text-gray-900 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {invoiceService.formatDate(invoice.issueDate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                        <dd className="mt-1 text-sm text-gray-900 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {invoiceService.formatDate(invoice.dueDate)}
                          {invoiceService.isOverdue(invoice) && (
                            <AlertTriangle className="h-4 w-4 ml-2 text-red-500" />
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Currency</dt>
                        <dd className="mt-1 text-sm text-gray-900">{invoice.currency}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {invoiceService.formatDate(invoice.createdAt)}
                        </dd>
                      </div>
                      {invoice.zraQrCode && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">ZRA QR Code</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <QrCode className="h-4 w-4 mr-2 text-gray-400" />
                            Available
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Invoice Items</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            VAT
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoice.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {invoiceService.formatCurrency(item.unitPrice)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.vatRate}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {invoiceService.formatCurrency(item.lineTotal + item.vatAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Invoice Totals */}
                  <div className="mt-6 border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>{invoiceService.formatCurrency(invoice.subtotal)}</span>
                        </div>
                        {invoice.discountAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Discount:</span>
                            <span>-{invoiceService.formatCurrency(invoice.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span>VAT:</span>
                          <span>{invoiceService.formatCurrency(invoice.vatAmount)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t pt-2">
                          <span>Total:</span>
                          <span>{invoiceService.formatCurrency(invoice.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(invoice.terms || invoice.paymentInstructions || invoice.notes) && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Additional Information</h3>
                    <div className="space-y-4">
                      {invoice.terms && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Terms & Conditions</h4>
                          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
                        </div>
                      )}
                      {invoice.paymentInstructions && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Payment Instructions</h4>
                          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{invoice.paymentInstructions}</p>
                        </div>
                      )}
                      {invoice.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between pb-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Record Payment</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Payment Amount (ZMW)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice ? invoiceService.calculateOutstandingAmount(invoice) : 0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
                {invoice && (
                  <p className="mt-1 text-sm text-gray-500">
                    Outstanding: {invoiceService.formatCurrency(invoiceService.calculateOutstandingAmount(invoice))}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={!paymentAmount || actionLoading === 'payment'}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'payment' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Recording...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Record Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
