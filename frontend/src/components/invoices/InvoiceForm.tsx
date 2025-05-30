'use client';

import { X, Save, Plus, Trash2, Calculator, AlertCircle, CheckCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Customer, customerService } from '../../services/customer.service';
import { Invoice, CreateInvoiceData, CreateInvoiceItemData, invoiceService } from '../../services/invoice.service';

interface InvoiceFormProps {
  invoice?: Invoice;
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface FormData {
  customerId: string;
  reference: string;
  issueDate: string;
  dueDate: string;
  discountAmount: string;
  currency: string;
  notes: string;
  terms: string;
  paymentInstructions: string;
  items: FormItemData[];
}

interface FormItemData {
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  discountRate: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function InvoiceForm({ invoice, onSave, onCancel, isOpen }: InvoiceFormProps) {
  const [formData, setFormData] = useState<FormData>({
    customerId: '',
    reference: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    discountAmount: '0',
    currency: 'ZMW',
    notes: '',
    terms: 'Payment due within 30 days of invoice date.',
    paymentInstructions: '',
    items: [
      {
        description: '',
        quantity: '1',
        unitPrice: '0',
        vatRate: '16',
        discountRate: '0',
      },
    ],
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [totals, setTotals] = useState({
    subtotal: 0,
    totalDiscount: 0,
    totalVat: 0,
    grandTotal: 0,
  });

  const isEditing = !!invoice;

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      if (invoice) {
        populateFormFromInvoice(invoice);
      } else {
        // Set default due date (30 days from issue date)
        const issueDate = new Date(formData.issueDate);
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 30);
        setFormData(prev => ({
          ...prev,
          dueDate: dueDate.toISOString().split('T')[0],
        }));
      }
    }
  }, [isOpen, invoice]);

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.discountAmount]);

  const loadCustomers = async () => {
    try {
      const customerList = await customerService.getCustomersForSelect();
      setCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const populateFormFromInvoice = (invoice: Invoice) => {
    setFormData({
      customerId: invoice.customerId,
      reference: invoice.reference || '',
      issueDate: invoice.issueDate.split('T')[0],
      dueDate: invoice.dueDate.split('T')[0],
      discountAmount: invoice.discountAmount.toString(),
      currency: invoice.currency,
      notes: invoice.notes || '',
      terms: invoice.terms || '',
      paymentInstructions: invoice.paymentInstructions || '',
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        vatRate: item.vatRate.toString(),
        discountRate: item.discountRate?.toString() || '0',
      })),
    });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalVat = 0;

    formData.items.forEach(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const vatRate = parseFloat(item.vatRate) || 0;
      const discountRate = parseFloat(item.discountRate) || 0;

      const lineSubtotal = quantity * unitPrice;
      const lineDiscount = lineSubtotal * (discountRate / 100);
      const lineTotal = lineSubtotal - lineDiscount;
      const lineVat = lineTotal * (vatRate / 100);

      subtotal += lineTotal;
      totalDiscount += lineDiscount;
      totalVat += lineVat;
    });

    // Apply invoice-level discount
    const invoiceDiscount = parseFloat(formData.discountAmount) || 0;
    const subtotalAfterDiscount = subtotal - invoiceDiscount;
    totalDiscount += invoiceDiscount;

    // Recalculate VAT on discounted amount
    if (invoiceDiscount > 0) {
      totalVat = 0;
      formData.items.forEach(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const vatRate = parseFloat(item.vatRate) || 0;
        const discountRate = parseFloat(item.discountRate) || 0;

        const lineSubtotal = quantity * unitPrice;
        const lineDiscount = lineSubtotal * (discountRate / 100);
        const lineTotal = lineSubtotal - lineDiscount;
        
        // Apply proportional invoice discount
        const itemProportion = lineTotal / subtotal;
        const itemInvoiceDiscount = invoiceDiscount * itemProportion;
        const finalLineTotal = lineTotal - itemInvoiceDiscount;
        const lineVat = finalLineTotal * (vatRate / 100);

        totalVat += lineVat;
      });
    }

    const grandTotal = subtotalAfterDiscount + totalVat;

    setTotals({
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalVat: Math.round(totalVat * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }

    if (!formData.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    // Date validation
    if (formData.issueDate && formData.dueDate) {
      const issueDate = new Date(formData.issueDate);
      const dueDate = new Date(formData.dueDate);
      if (dueDate <= issueDate) {
        newErrors.dueDate = 'Due date must be after issue date';
      }
    }

    // Items validation
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    formData.items.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`item_${index}_description`] = 'Description is required';
      }

      const quantity = parseFloat(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      }

      const unitPrice = parseFloat(item.unitPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        newErrors[`item_${index}_unitPrice`] = 'Unit price must be 0 or greater';
      }

      const vatRate = parseFloat(item.vatRate);
      if (isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
        newErrors[`item_${index}_vatRate`] = 'VAT rate must be between 0 and 100';
      }

      const discountRate = parseFloat(item.discountRate);
      if (isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
        newErrors[`item_${index}_discountRate`] = 'Discount rate must be between 0 and 100';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleItemChange = (index: number, field: keyof FormItemData, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));

    // Clear error for this field
    const errorKey = `item_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: '1',
          unitPrice: '0',
          vatRate: '16',
          discountRate: '0',
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
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
      const invoiceData: CreateInvoiceData = {
        customerId: formData.customerId,
        reference: formData.reference || undefined,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        discountAmount: parseFloat(formData.discountAmount) || 0,
        currency: formData.currency,
        notes: formData.notes || undefined,
        terms: formData.terms || undefined,
        paymentInstructions: formData.paymentInstructions || undefined,
        items: formData.items.map((item, index) => ({
          description: item.description.trim(),
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          vatRate: parseFloat(item.vatRate),
          discountRate: parseFloat(item.discountRate) || 0,
          sortOrder: index,
        })),
      };

      let savedInvoice: Invoice;
      if (isEditing) {
        savedInvoice = await invoiceService.updateInvoice(invoice.id, invoiceData);
      } else {
        savedInvoice = await invoiceService.createInvoice(invoiceData);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onSave(savedInvoice);
      }, 1000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
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
                  Invoice {isEditing ? 'updated' : 'created'} successfully!
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
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer *
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => handleInputChange('customerId', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.customerId ? 'border-red-300' : 'border-gray-300'
                }`}
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reference/PO Number
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="PO-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Issue Date *
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => handleInputChange('issueDate', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.issueDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.issueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.issueDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.dueDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Invoice Items</h4>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Item {index + 1}</h5>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_description`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Service or product description"
                      />
                      {errors[`item_${index}_description`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_description`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_quantity`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_quantity`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Unit Price (ZMW) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_unitPrice`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors[`item_${index}_unitPrice`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_unitPrice`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        VAT Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={item.vatRate}
                        onChange={(e) => handleItemChange(index, 'vatRate', e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_vatRate`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors[`item_${index}_vatRate`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_vatRate`]}</p>
                      )}
                    </div>
                  </div>

                  {/* Item Total Display */}
                  <div className="mt-3 text-right">
                    <p className="text-sm text-gray-600">
                      Line Total: {invoiceService.formatCurrency(
                        invoiceService.calculateLineTotal(
                          parseFloat(item.quantity) || 0,
                          parseFloat(item.unitPrice) || 0,
                          parseFloat(item.discountRate) || 0
                        ).lineTotal
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900 flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Invoice Totals
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Invoice Discount (ZMW)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discountAmount}
                  onChange={(e) => handleInputChange('discountAmount', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{invoiceService.formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Discount:</span>
                  <span>-{invoiceService.formatCurrency(totals.totalDiscount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT:</span>
                  <span>{invoiceService.formatCurrency(totals.totalVat)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>{invoiceService.formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Terms & Conditions
              </label>
              <textarea
                value={formData.terms}
                onChange={(e) => handleInputChange('terms', e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Payment terms and conditions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Instructions
              </label>
              <textarea
                value={formData.paymentInstructions}
                onChange={(e) => handleInputChange('paymentInstructions', e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="How customers should pay (bank details, mobile money, etc.)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes for the customer..."
              />
            </div>
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
                  {isEditing ? 'Update Invoice' : 'Create Invoice'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
