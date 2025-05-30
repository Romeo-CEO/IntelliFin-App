'use client';

import React from 'react';

import { UserManagementPage } from '../../../components/user-management/UserManagementPage';
import { UserManagementProvider } from '../../../contexts/UserManagementContext';

export default function UsersPage() {
  return (
    <UserManagementProvider>
      <UserManagementPage />
    </UserManagementProvider>
  );
}
