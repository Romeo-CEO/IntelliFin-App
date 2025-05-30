'use client';

import React from 'react';

import { ChartOfAccountsPage } from '../../../components/accounting/ChartOfAccountsPage';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { AccountingProvider } from '../../../contexts/AccountingContext';

export default function AccountingPage() {
  return (
    <DashboardLayout>
      <AccountingProvider>
        <div className="accounting-page">
          <ChartOfAccountsPage />
        </div>
      </AccountingProvider>
    </DashboardLayout>
  );
}
