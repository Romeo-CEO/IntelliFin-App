'use client';

import React, { useState } from 'react';
import { useUserManagement, User, UserRole, UserStatus } from '../../contexts/UserManagementContext';

interface UsersListProps {
  onUserSelect: (user: User) => void;
}

export function UsersList({ onUserSelect }: UsersListProps) {
  const {
    users,
    selectUser,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    canManageUsers,
    canDeleteUsers,
  } = useUserManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleUserClick = (user: User) => {
    selectUser(user);
    onUserSelect(user);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
    } catch (error) {
      console.error('Failed to update user role:', error);
      // TODO: Show error toast
    }
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    try {
      await updateUserStatus(userId, newStatus);
    } catch (error) {
      console.error('Failed to update user status:', error);
      // TODO: Show error toast
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser(userId);
      } catch (error) {
        console.error('Failed to delete user:', error);
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
    <div className="p-6">
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-neutral-700 mb-1">
            Search Users
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Role Filter */}
        <div>
          <label htmlFor="roleFilter" className="block text-sm font-medium text-neutral-700 mb-1">
            Filter by Role
          </label>
          <select
            id="roleFilter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Roles</option>
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {getRoleDisplayName(role)}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="statusFilter" className="block text-sm font-medium text-neutral-700 mb-1">
            Filter by Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.values(UserStatus).map((status) => (
              <option key={status} value={status}>
                {getStatusDisplayName(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-neutral-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No users found</h3>
          <p className="text-neutral-600">
            {searchTerm || roleFilter || statusFilter
              ? 'Try adjusting your search criteria'
              : 'No users have been added yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-neutral-50 cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-neutral-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canManageUsers ? (
                      <select
                        value={user.role}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRoleChange(user.id, e.target.value as UserRole);
                        }}
                        className="text-sm border border-neutral-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {Object.values(UserRole).map((role) => (
                          <option key={role} value={role}>
                            {getRoleDisplayName(role)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-neutral-900">
                        {getRoleDisplayName(user.role)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canManageUsers ? (
                      <select
                        value={user.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(user.id, e.target.value as UserStatus);
                        }}
                        className={`text-sm border border-neutral-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getStatusColor(user.status)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {Object.values(UserStatus).map((status) => (
                          <option key={status} value={status}>
                            {getStatusDisplayName(status)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {getStatusDisplayName(user.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClick(user);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      {canDeleteUsers && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
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
