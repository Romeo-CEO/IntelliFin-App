'use client';

import React, { useEffect, useState } from 'react';

import { useUserManagement } from '../../contexts/UserManagementContext';

import { InvitationsList } from './InvitationsList';
import { InviteUserModal } from './InviteUserModal';
import { UserDetailsModal } from './UserDetailsModal';
import { UsersList } from './UsersList';

export function UserManagementPage() {
  const {
    loadUsers,
    loadInvitations,
    isLoadingUsers,
    isLoadingInvitations,
    usersError,
    invitationsError,
    canInviteUsers,
  } = useUserManagement();

  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadUsers();
    loadInvitations();
  }, [loadUsers, loadInvitations]);

  const tabs = [
    {
      id: 'users' as const,
      name: 'Team Members',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
    },
    {
      id: 'invitations' as const,
      name: 'Pending Invitations',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.94 6.412A2 2 0 002 8.108V16a2 2 0 002 2h12a2 2 0 002-2V8.108a2 2 0 00-.94-1.696l-6-3.75a2 2 0 00-2.12 0l-6 3.75zm2.615 2.423a1 1 0 10-1.11 1.664l5 3.333a1 1 0 001.11 0l5-3.333a1 1 0 00-1.11-1.664L10 12.027 5.555 8.835z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900">
              User Management
            </h1>
            <p className="mt-2 text-neutral-600">
              Manage team members and send invitations to new users
            </p>
          </div>
          
          {canInviteUsers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Invite User
            </button>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {(usersError || invitationsError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-700 font-medium">Error</span>
          </div>
          {usersError && <p className="text-red-600 mt-1">{usersError}</p>}
          {invitationsError && <p className="text-red-600 mt-1">{invitationsError}</p>}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        {activeTab === 'users' && (
          <div>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-neutral-600">Loading users...</span>
              </div>
            ) : (
              <UsersList onUserSelect={() => setShowUserDetails(true)} />
            )}
          </div>
        )}

        {activeTab === 'invitations' && (
          <div>
            {isLoadingInvitations ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-neutral-600">Loading invitations...</span>
              </div>
            ) : (
              <InvitationsList />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showUserDetails && (
        <UserDetailsModal
          isOpen={showUserDetails}
          onClose={() => setShowUserDetails(false)}
        />
      )}
    </div>
  );
}
