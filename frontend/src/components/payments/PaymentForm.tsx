'use client';

import { X, Save, AlertCircle, CheckCircle, DollarSign, Calendar, CreditCard } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Customer, customerService } from '../../services/customer.service';
import { Invoice, invoiceService } from '../../services/invoice.service';
import { Payment, CreatePaymentData, PaymentMethod, paymentService } from '../../services/payment.service';

interface PaymentFormProps {
  payment?: Payment;
  onSave: (payment: Payment) => void;
  onCancel: () => void;
  isOpen: boolean;
  preselectedInvoiceId?: string;
  preselectedCustomerId?: string;
}

interface FormData {
  invoiceId: string;
  customerId: string;
  transactionId: string;
  amount: string;
  currency: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string;
  notes: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function PaymentForm({ 
  payment, 
  onSave, 
  onCancel, 
  isOpen,
  preselectedInvoiceId,
  preselectedCustomerId
}: PaymentFormProps) {
  const [formData, setFormData] = useState<FormData>({
    invoiceId: preselectedInvoiceId || '',
    customerId: preselectedCustomerId || '',
    transactionId: '',
    amount: '',
    currency: 'ZMW',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: PaymentMethod.MOBILE_MONEY,
    reference: '',
    notes: '',
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isEditing = !!payment;

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      if (payment) {
        populateFormFromPayment(payment);
      }
    }
  }, [isOpen, payment]);

  useEffect(() => {
    if (formData.customerId) {
      loadCustomerInvoices(formData.customerId);
    } else {
      setInvoices([]);
      setSelectedInvoice(null);
    }
  }, [formData.customerId]);

  useEffect(() => {
    if (formData.invoiceId) {
      const invoice = invoices.find(inv => inv.id === formData.invoiceId);
      setSelectedInvoice(invoice || null);
    } else {
      setSelectedInvoice(null);
    }
  }, [formData.invoiceId, invoices]);

  const loadCustomers = async () => {
    try {
      const customerList = await customerService.getCustomersForSelect();
      setCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadCustomerInvoices = async (customerId: string) => {
    try {
      // Load unpaid or partially paid invoices for the customer
      const response = await invoiceService.getInvoices({
        customerId,
        status: undefined, // Load all invoices, we'll filter in UI
        limit: 100,
      });
      setInvoices(response.invoices);
    } catch (error) {
      console.error('Failed to load customer invoices:', error);
    }
  };

  const populateFormFromPayment = (payment: Payment) => {
    setFormData({
      invoiceId: payment.invoiceId || '',
      customerId: payment.customerId,
      transactionId: payment.transactionId || '',
      amount: payment.amount.toString(),
      currency: payment.currency,
      paymentDate: payment.paymentDate.split('T')[0],
      paymentMethod: payment.paymentMethod,
      reference: payment.reference || '',
      notes: payment.notes || '',
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid payment amount is required';
    }

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    // Amount validation
    const amount = parseFloat(formData.amount);
    if (amount > 1000000) {
      newErrors.amount = 'Payment amount exceeds maximum limit (ZMW 1,000,000)';
    }

    // Invoice validation
    if (formData.invoiceId && selectedInvoice) {
      const outstandingAmount = invoiceService.calculateOutstandingAmount(selectedInvoice);
      if (amount > outstandingAmount) {
        newErrors.amount = `Payment amount cannot exceed outstanding amount (${paymentService.formatCurrency(outstandingAmount)})`;
      }
    }

    // Phone number validation for mobile money
    if (formData.paymentMethod === PaymentMethod.MOBILE_MONEY && formData.reference) {
      if (!paymentService.validateZambianPhoneNumber(formData.reference)) {
        newErrors.reference = 'Invalid Zambian phone number format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-populate reference for mobile money
    if (field === 'paymentMethod' && value === PaymentMethod.MOBILE_MONEY && !formData.reference) {
      const customer = customers.find(c => c.id === formData.customerId);
      if (customer?.phone) {
        setFormData(prev => ({ ...prev, reference: customer.phone }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const paymentData: CreatePaymentData = {
        invoiceId: formData.invoiceId || undefined,
        customerId: formData.customerId,
        transactionId: formData.transactionId || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      };

      let savedPayment: Payment;
      if (isEditing) {
        savedPayment = await paymentService.updatePayment(payment.id, paymentData);
      } else {
        savedPayment = await paymentService.createPayment(paymentData);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onSave(savedPayment);
      }, 1000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  const getOutstandingAmount = (): number => {
    if (!selectedInvoice) return 0;
    return invoiceService.calculateOutstandingAmount(selectedInvoice);
  };

  const getPaymentMethodHelperText = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.MOBILE_MONEY:
        return 'Enter the phone number used for the mobile money transaction';
      case PaymentMethod.BANK_TRANSFER:
        return 'Enter the bank reference or transaction ID';
      case PaymentMethod.CHECK:
        return 'Enter the check number';
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        return 'Enter the last 4 digits of the card (optional)';
      default:
        return 'Enter any reference number or identifier';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            {isEditing ? 'Edit Payment' : 'Record New Payment'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Payment {isEditing ? 'updated' : 'recorded'} successfully!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Customer *
            </label>
            <select
              value={formData.customerId}
              onChange={(e) => handleInputChange('customerId', e.target.value)}
              disabled={!!preselectedCustomerId}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.customerId ? 'border-red-300' : 'border-gray-300'
              } ${preselectedCustomerId ? 'bg-gray-100' : ''}`}
            >
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="mt-1 text-sm text-red-600">{errors.customerId}</p>
            )}
          </div>

          {/* Invoice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice (Optional)
            </label>
            <select
              value={formData.invoiceId}
              onChange={(e) => handleInputChange('invoiceId', e.target.value)}
              disabled={!!preselectedInvoiceId}
              className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                preselectedInvoiceId ? 'bg-gray-100' : ''
              }`}
            >
              <option value="">No specific invoice</option>
              {invoices.map(invoice => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {paymentService.formatCurrency(invoice.totalAmount)} 
                  {invoice.status !== 'PAID' && ` (Outstanding: ${paymentService.formatCurrency(invoiceService.calculateOutstandingAmount(invoice))})`}
                </option>
              ))}
            </select>
            {selectedInvoice && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Invoice Total:</span>
                  <span className="font-medium">{paymentService.formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Already Paid:</span>
                  <span className="font-medium">{paymentService.formatCurrency(selectedInvoice.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
                  <span>Outstanding:</span>
                  <span className="text-red-600">{paymentService.formatCurrency(getOutstandingAmount())}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Amount (ZMW) *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">ZMW</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedInvoice ? getOutstandingAmount() : 1000000}
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className={`block w-full pl-12 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
              {selectedInvoice && (
                <button
                  type="button"
                  onClick={() => handleInputChange('amount', getOutstandingAmount().toString())}
                  className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  Pay full outstanding amount
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Date *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.paymentDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.paymentDate && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentDate}</p>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Method *
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value as PaymentMethod)}
                className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.paymentMethod ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {Object.values(PaymentMethod).map(method => (
                  <option key={method} value={method}>
                    {paymentService.getPaymentMethodIcon(method)} {paymentService.getPaymentMethodLabel(method)}
                  </option>
                ))}
              </select>
            </div>
            {errors.paymentMethod && (
              <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reference/Transaction ID
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => handleInputChange('reference', e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.reference ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={
                formData.paymentMethod === PaymentMethod.MOBILE_MONEY ? '+260 97 123 4567' :
                formData.paymentMethod === PaymentMethod.BANK_TRANSFER ? 'TXN123456789' :
                'Reference number'
              }
            />
            <p className="mt-1 text-sm text-gray-500">
              {getPaymentMethodHelperText(formData.paymentMethod)}
            </p>
            {errors.reference && (
              <p className="mt-1 text-sm text-red-600">{errors.reference}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes about this payment..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || submitSuccess}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Payment' : 'Record Payment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
