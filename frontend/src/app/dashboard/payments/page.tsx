'use client';

import React, { useState } from 'react';
import { Payment } from '../../../services/payment.service';
import PaymentList from '../../../components/payments/PaymentList';
import PaymentForm from '../../../components/payments/PaymentForm';
import PaymentReconciliation from '../../../components/payments/PaymentReconciliation';

type ModalType = 'form' | 'reconciliation' | null;

export default function PaymentsPage() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePaymentSelect = (payment: Payment) => {
    // For now, just edit the payment when selected
    // In the future, we could add a detail view
    handlePaymentEdit(payment);
  };

  const handlePaymentEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setActiveModal('form');
  };

  const handlePaymentCreate = () => {
    setSelectedPayment(null);
    setActiveModal('form');
  };

  const handleReconcilePayment = (_payment: Payment) => {
    // Open reconciliation modal with focus on this payment
    setActiveModal('reconciliation');
  };

  const handlePaymentSave = (_payment: Payment) => {
    setActiveModal(null);
    setSelectedPayment(null);
    // Trigger refresh of payment list
    setRefreshTrigger(prev => prev + 1);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedPayment(null);
  };

  const openReconciliation = () => {
    setActiveModal('reconciliation');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Reconciliation Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-600">
              Track and manage customer payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openReconciliation}
              className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Reconcile Payments
            </button>
          </div>
        </div>

        {/* Main Payment List */}
        <PaymentList
          key={refreshTrigger} // Force re-render when refreshTrigger changes
          onPaymentSelect={handlePaymentSelect}
          onPaymentEdit={handlePaymentEdit}
          onPaymentCreate={handlePaymentCreate}
          onReconcilePayment={handleReconcilePayment}
        />

        {/* Payment Form Modal */}
        <PaymentForm
          payment={selectedPayment || undefined}
          onSave={handlePaymentSave}
          onCancel={closeModal}
          isOpen={activeModal === 'form'}
        />

        {/* Payment Reconciliation Modal */}
        <PaymentReconciliation
          isOpen={activeModal === 'reconciliation'}
          onClose={closeModal}
        />
      </div>
    </div>
  );
}
