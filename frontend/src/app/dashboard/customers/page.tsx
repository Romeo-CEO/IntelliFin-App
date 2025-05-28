'use client';

import React, { useState } from 'react';
import { Customer, ImportResult } from '../../../services/customer.service';
import CustomerList from '../../../components/customers/CustomerList';
import CustomerForm from '../../../components/customers/CustomerForm';
import CustomerDetail from '../../../components/customers/CustomerDetail';
import CustomerImportExport from '../../../components/customers/CustomerImportExport';

type ModalType = 'form' | 'detail' | 'import-export' | null;

export default function CustomersPage() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveModal('detail');
  };

  const handleCustomerEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveModal('form');
  };

  const handleCustomerCreate = () => {
    setSelectedCustomer(null);
    setActiveModal('form');
  };

  const handleCustomerSave = (_customer: Customer) => {
    setActiveModal(null);
    setSelectedCustomer(null);
    // Trigger refresh of customer list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCustomerDelete = async (_customer: Customer) => {
    try {
      // The delete operation is handled in the detail component
      setActiveModal(null);
      setSelectedCustomer(null);
      // Trigger refresh of customer list
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const handleImportComplete = (result: ImportResult) => {
    if (result.imported > 0) {
      // Trigger refresh of customer list
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedCustomer(null);
  };

  const openImportExport = () => {
    setActiveModal('import-export');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Customer List */}
        <CustomerList
          key={refreshTrigger} // Force re-render when refreshTrigger changes
          onCustomerSelect={handleCustomerSelect}
          onCustomerEdit={handleCustomerEdit}
          onCustomerCreate={handleCustomerCreate}
        />

        {/* Add Import/Export button to the header */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={openImportExport}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Import/Export
          </button>
        </div>

        {/* Customer Form Modal */}
        <CustomerForm
          customer={selectedCustomer || undefined}
          onSave={handleCustomerSave}
          onCancel={closeModal}
          isOpen={activeModal === 'form'}
        />

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <CustomerDetail
            customerId={selectedCustomer.id}
            onEdit={handleCustomerEdit}
            onDelete={handleCustomerDelete}
            onClose={closeModal}
            isOpen={activeModal === 'detail'}
          />
        )}

        {/* Import/Export Modal */}
        <CustomerImportExport
          onImportComplete={handleImportComplete}
          onClose={closeModal}
          isOpen={activeModal === 'import-export'}
        />
      </div>
    </div>
  );
}
