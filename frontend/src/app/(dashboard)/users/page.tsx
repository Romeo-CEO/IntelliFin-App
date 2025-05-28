'use client';

import React from 'react';
import { UserManagementProvider } from '../../../contexts/UserManagementContext';
import { UserManagementPage } from '../../../components/user-management/UserManagementPage';

export default function UsersPage() {
  return (
    <UserManagementProvider>
      <UserManagementPage />
    </UserManagementProvider>
  );
}
