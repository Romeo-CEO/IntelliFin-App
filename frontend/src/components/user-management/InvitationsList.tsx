'use client';

import React, { useState } from 'react';

import { useUserManagement, Invitation, InvitationStatus, UserRole } from '../../contexts/UserManagementContext';

export function InvitationsList() {
  const {
    invitations,
    resendInvitation,
    cancelInvitation,
    canInviteUsers,
  } = useUserManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | ''>('');

  // Filter invitations based on search and filters
  const filteredInvitations = invitations.filter((invitation) => {
    const matchesSearch = 
      invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invitation.inviterName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || invitation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleResendInvitation = async (id: string) => {
    try {
      await resendInvitation(id);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      // TODO: Show error toast
    }
  };

  const handleCancelInvitation = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this invitation?')) {
      try {
        await cancelInvitation(id);
        // TODO: Show success toast
      } catch (error) {
        console.error('Failed to cancel invitation:', error);
        // TODO: Show error toast
      }
    }
  };

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

  const getStatusDisplayName = (status: InvitationStatus): string => {
    const statusMap = {
      [InvitationStatus.PENDING]: 'Pending',
      [InvitationStatus.ACCEPTED]: 'Accepted',
      [InvitationStatus.EXPIRED]: 'Expired',
      [InvitationStatus.CANCELLED]: 'Cancelled',
      [InvitationStatus.RESENT]: 'Resent',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: InvitationStatus): string => {
    const colorMap = {
      [InvitationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [InvitationStatus.ACCEPTED]: 'bg-green-100 text-green-800',
      [InvitationStatus.EXPIRED]: 'bg-red-100 text-red-800',
      [InvitationStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
      [InvitationStatus.RESENT]: 'bg-blue-100 text-blue-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const isExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  };

  const canResend = (invitation: Invitation): boolean => {
    return canInviteUsers && 
           (invitation.status === InvitationStatus.PENDING || 
            invitation.status === InvitationStatus.EXPIRED ||
            invitation.status === InvitationStatus.RESENT);
  };

  const canCancel = (invitation: Invitation): boolean => {
    return canInviteUsers && 
           invitation.status === InvitationStatus.PENDING;
  };

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-neutral-700 mb-1">
            Search Invitations
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by email or inviter..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="statusFilter" className="block text-sm font-medium text-neutral-700 mb-1">
            Filter by Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvitationStatus | '')}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.values(InvitationStatus).map((status) => (
              <option key={status} value={status}>
                {getStatusDisplayName(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invitations Table */}
      {filteredInvitations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-neutral-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M2.94 6.412A2 2 0 002 8.108V16a2 2 0 002 2h12a2 2 0 002-2V8.108a2 2 0 00-.94-1.696l-6-3.75a2 2 0 00-2.12 0l-6 3.75zm2.615 2.423a1 1 0 10-1.11 1.664l5 3.333a1 1 0 001.11 0l5-3.333a1 1 0 00-1.11-1.664L10 12.027 5.555 8.835z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No invitations found</h3>
          <p className="text-neutral-600">
            {searchTerm || statusFilter
              ? 'Try adjusting your search criteria'
              : 'No invitations have been sent yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Invited By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredInvitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-neutral-300 flex items-center justify-center text-neutral-600 text-sm font-medium">
                          {invitation.email.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-neutral-900">
                          {invitation.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {getRoleDisplayName(invitation.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invitation.status)}`}>
                      {getStatusDisplayName(invitation.status)}
                    </span>
                    {invitation.status === InvitationStatus.PENDING && isExpired(invitation.expiresAt) && (
                      <span className="ml-2 text-xs text-red-600">(Expired)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {invitation.inviterName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {canResend(invitation) && (
                        <button
                          onClick={() => handleResendInvitation(invitation.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Resend
                        </button>
                      )}
                      {canCancel(invitation) && (
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      )}
                      {invitation.status === InvitationStatus.ACCEPTED && (
                        <span className="text-green-600">Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
