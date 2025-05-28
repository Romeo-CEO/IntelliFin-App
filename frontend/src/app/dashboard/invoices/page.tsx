'use client';

import React, { useState } from 'react';
import { Invoice } from '../../../services/invoice.service';
import InvoiceList from '../../../components/invoices/InvoiceList';
import InvoiceForm from '../../../components/invoices/InvoiceForm';
import InvoiceDetail from '../../../components/invoices/InvoiceDetail';

type ModalType = 'form' | 'detail' | null;

export default function InvoicesPage() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleInvoiceSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setActiveModal('detail');
  };

  const handleInvoiceEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setActiveModal('form');
  };

  const handleInvoiceCreate = () => {
    setSelectedInvoice(null);
    setActiveModal('form');
  };

  const handleInvoiceSave = (_invoice: Invoice) => {
    setActiveModal(null);
    setSelectedInvoice(null);
    // Trigger refresh of invoice list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleInvoiceDelete = async (_invoice: Invoice) => {
    try {
      // The delete operation is handled in the detail component
      setActiveModal(null);
      setSelectedInvoice(null);
      // Trigger refresh of invoice list
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedInvoice(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Invoice List */}
        <InvoiceList
          key={refreshTrigger} // Force re-render when refreshTrigger changes
          onInvoiceSelect={handleInvoiceSelect}
          onInvoiceEdit={handleInvoiceEdit}
          onInvoiceCreate={handleInvoiceCreate}
        />

        {/* Invoice Form Modal */}
        <InvoiceForm
          invoice={selectedInvoice || undefined}
          onSave={handleInvoiceSave}
          onCancel={closeModal}
          isOpen={activeModal === 'form'}
        />

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <InvoiceDetail
            invoiceId={selectedInvoice.id}
            onEdit={handleInvoiceEdit}
            onDelete={handleInvoiceDelete}
            onClose={closeModal}
            isOpen={activeModal === 'detail'}
          />
        )}
      </div>
    </div>
  );
}
