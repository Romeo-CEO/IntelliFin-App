'use client';

import React from 'react';
import { AccountingProvider } from '../../../contexts/AccountingContext';
import { ChartOfAccountsPage } from '../../../components/accounting/ChartOfAccountsPage';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

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
