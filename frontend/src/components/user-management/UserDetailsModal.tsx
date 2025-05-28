'use client';

import React from 'react';
import { useUserManagement, User, UserRole, UserStatus } from '../../contexts/UserManagementContext';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserDetailsModal({ isOpen, onClose }: UserDetailsModalProps) {
  const { selectedUser } = useUserManagement();

  if (!isOpen || !selectedUser) return null;

  const getRoleDisplayName = (role: UserRole): string => {
    const roleMap = {
      [UserRole.SUPER_ADMIN]: 'Super Admin',
      [UserRole.TENANT_ADMIN]: 'Organization Admin',
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.MANAGER]: 'Manager',
      [UserRole.USER]: 'User',
      [UserRole.VIEWER]: 'Viewer',
    };
    return roleMap[role] || role;
  };

  const getStatusDisplayName = (status: UserStatus): string => {
    const statusMap = {
      [UserStatus.ACTIVE]: 'Active',
      [UserStatus.INACTIVE]: 'Inactive',
      [UserStatus.SUSPENDED]: 'Suspended',
      [UserStatus.PENDING_VERIFICATION]: 'Pending Verification',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: UserStatus): string => {
    const colorMap = {
      [UserStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [UserStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
      [UserStatus.SUSPENDED]: 'bg-red-100 text-red-800',
      [UserStatus.PENDING_VERIFICATION]: 'bg-yellow-100 text-yellow-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">
            User Details
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Avatar and Basic Info */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 h-16 w-16">
              <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-medium">
                {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-neutral-900">
                {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <p className="text-neutral-600">{selectedUser.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.status)}`}>
                  {getStatusDisplayName(selectedUser.status)}
                </span>
                <span className="text-sm text-neutral-500">
                  {getRoleDisplayName(selectedUser.role)}
                </span>
              </div>
            </div>
          </div>

          {/* User Information */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Email Address
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-neutral-900">{selectedUser.email}</span>
                {selectedUser.emailVerified ? (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Unverified
                  </span>
                )}
              </div>
            </div>

            {selectedUser.phone && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone Number
                </label>
                <span className="text-sm text-neutral-900">{selectedUser.phone}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Role
              </label>
              <span className="text-sm text-neutral-900">{getRoleDisplayName(selectedUser.role)}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Status
              </label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.status)}`}>
                {getStatusDisplayName(selectedUser.status)}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Last Login
              </label>
              <span className="text-sm text-neutral-900">
                {selectedUser.lastLoginAt
                  ? new Date(selectedUser.lastLoginAt).toLocaleString()
                  : 'Never'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Member Since
              </label>
              <span className="text-sm text-neutral-900">
                {new Date(selectedUser.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Role Permissions Info */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-neutral-800 mb-2">Role Permissions</h4>
            <div className="text-sm text-neutral-600">
              {selectedUser.role === UserRole.TENANT_ADMIN && (
                <p>Full administrative access to the organization including user management, settings, and all features.</p>
              )}
              {selectedUser.role === UserRole.ADMIN && (
                <p>Administrative access with user management capabilities and access to most features.</p>
              )}
              {selectedUser.role === UserRole.MANAGER && (
                <p>Management access with approval authority and team oversight capabilities.</p>
              )}
              {selectedUser.role === UserRole.USER && (
                <p>Standard access for daily operations including creating invoices, managing customers, and basic reporting.</p>
              )}
              {selectedUser.role === UserRole.VIEWER && (
                <p>Read-only access to view data and reports without modification capabilities.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
